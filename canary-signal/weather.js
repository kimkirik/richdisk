export const ASAN = Object.freeze({latitude:36.7898, longitude:127.0018, label:'아산시', mode:'default'});
const HOUR = 3600000;
const finite = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const day = time => new Date(time + 9 * HOUR).toISOString().slice(0,10);
const optional = (v, unit, expected, min, max) => unit === expected && finite(v,min,max) ? v : null;
export function validCoordinates(location) { return finite(location?.latitude,-90,90) && finite(location?.longitude,-180,180); }
export function weatherDescription(code, isDay = true) {
  if (code === 0) return isDay ? '맑음' : '맑은 밤';
  if ([1,2].includes(code)) return '구름 조금';
  if (code === 3) return '흐림';
  if ([45,48].includes(code)) return '안개';
  if ([51,53,55,56,57].includes(code)) return '이슬비';
  if ([61,63,65,66,67].includes(code)) return '비';
  if ([71,73,75,77].includes(code)) return '눈';
  if ([80,81,82].includes(code)) return '소나기';
  if ([85,86].includes(code)) return '눈 소나기';
  if ([95,96,99].includes(code)) return '뇌우';
  return '날씨 상태 미제공';
}
export function weatherRequestUrls(location = ASAN) {
  if (!validCoordinates(location)) throw new Error('위치 좌표를 확인할 수 없습니다.');
  const params = new URLSearchParams({latitude:location.latitude.toFixed(4),longitude:location.longitude.toFixed(4),current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',hourly:'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code',wind_speed_unit:'ms',timezone:'Asia/Seoul',forecast_days:'3',timeformat:'unixtime'});
  // JMA is an alternate model endpoint at the same provider, not an independent service.
  return ['forecast','jma'].map(endpoint => `https://api.open-meteo.com/v1/${endpoint}?${params}`);
}
export function normalizeWeather(v, now = Date.now()) {
  const c = v?.current, units = v?.current_units || {};
  if (!c || units.temperature_2m !== '°C' || units.time !== 'unixtime' || !finite(c.temperature_2m,-90,65) || !finite(c.time,1,1e12)) throw new Error('현재 기온 자료를 확인할 수 없습니다.');
  const sourceTime = c.time * 1000;
  if (now - sourceTime > 2 * HOUR || sourceTime - now > HOUR) throw new Error('현재 기온의 기준 시각이 오래되었거나 올바르지 않습니다.');
  const d = v.daily || {}, du = v.daily_units || {}, h = v.hourly || {}, hu = v.hourly_units || {};
  const validCode = v => finite(v,0,99) && Number.isInteger(v) ? v : null;
  const daily = du.time === 'unixtime' && Array.isArray(d.time) ? d.time.flatMap((time,i) => {
    if (!finite(time,1,1e12)) return [];
    const date = day(time * 1000);
    if (date < day(now) || time * 1000 > now + 3 * 24 * HOUR) return [];
    return [{day:date,time:time*1000,max:optional(d.temperature_2m_max?.[i],du.temperature_2m_max,'°C',-90,65),min:optional(d.temperature_2m_min?.[i],du.temperature_2m_min,'°C',-90,65),rain:optional(d.precipitation_probability_max?.[i],du.precipitation_probability_max,'%',0,100),wind:optional(d.wind_speed_10m_max?.[i],du.wind_speed_10m_max,'m/s',0,150),code:validCode(d.weather_code?.[i])}];
  }).slice(0,3) : [];
  const hourly = hu.time === 'unixtime' && Array.isArray(h.time) ? h.time.flatMap((time,i) => {
    if (!finite(time,1,1e12) || time * 1000 < Math.ceil(now / HOUR) * HOUR || time * 1000 > now + 24 * HOUR) return [];
    return [{time:time*1000,temperature:optional(h.temperature_2m?.[i],hu.temperature_2m,'°C',-90,65),rain:optional(h.precipitation_probability?.[i],hu.precipitation_probability,'%',0,100),precipitation:optional(h.precipitation?.[i],hu.precipitation,'mm',0,1000),code:validCode(h.weather_code?.[i])}];
  }).sort((a,b)=>a.time-b.time).slice(0,12) : [];
  const today = daily.find(item => item.day === day(now));
  const max = today?.max ?? null, rain = today?.rain ?? null, wind = today?.wind ?? null;
  const reasons = [rain !== null && rain >= 80 && '오늘 강수확률 80% 이상',wind !== null && wind >= 20 && '오늘 최대풍속 20m/s 이상',max !== null && max >= 35 && '오늘 최고기온 35℃ 이상'].filter(Boolean);
  const complete = [max,rain,wind].every(v => v !== null);
  return {temperature:c.temperature_2m,feels:optional(c.apparent_temperature,units.apparent_temperature,'°C',-100,80),humidity:optional(c.relative_humidity_2m,units.relative_humidity_2m,'%',0,100),currentWind:optional(c.wind_speed_10m,units.wind_speed_10m,'m/s',0,150),precipitation:optional(c.precipitation,units.precipitation,'mm',0,1000),code:validCode(c.weather_code),isDay:c.is_day !== 0,day:day(now),sourceTime,max,rain,wind,min:today?.min ?? null,reasons,complete,hourly,daily};
}
export async function fetchWeather({location = ASAN, fetcher = fetch, now = Date.now, timeout = 6500} = {}) {
  let lastError;
  const urls = weatherRequestUrls(location);
  for (let i=0;i<urls.length;i++) {
    const controller = new AbortController(), timer = setTimeout(()=>controller.abort(),timeout);
    try {
      const response = await fetcher(urls[i],{signal:controller.signal,cache:'no-store',credentials:'omit'});
      if (!response.ok) throw new Error(response.status === 429 ? '날씨 제공처가 요청을 제한했습니다. 잠시 후 다시 확인하세요.' : '날씨 제공처에 연결하지 못했습니다.');
      const data = normalizeWeather(await response.json(),now());
      return {...data,provider:i === 0 ? 'Open-Meteo · 자동 선택 모델' : 'Open-Meteo · JMA 대체 모델',location:{...location}};
    } catch(error) { lastError = error; }
    finally { clearTimeout(timer); }
  }
  throw lastError;
}
