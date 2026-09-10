// All warning thresholds below are app reminders, never official weather alerts.
export const feeds = {
  weather: { name: '아산 기상', provider: 'Open-Meteo · 수치예보', symbol: '☀', link: 'https://open-meteo.com/',
    urls: ['https://api.open-meteo.com/v1/forecast?latitude=36.7898&longitude=127.0018&current=temperature_2m&hourly=precipitation_probability,wind_speed_10m&daily=temperature_2m_max&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=1'] },
  quakes: { name: '세계 지진', provider: 'USGS · 지진 목록', symbol: '⌁', link: 'https://earthquake.usgs.gov/earthquakes/map/',
    urls: ['https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'] },
  fx: { name: '기준 환율', provider: 'Frankfurter · ECB 기준', symbol: '₩', link: 'https://frankfurter.dev/v1/',
    urls: ['https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW', 'https://api.frankfurter.app/latest?from=USD&to=KRW'] }
};
const HOUR = 3600000, DAY = 24 * HOUR;
const number = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const requireValue = ok => { if (!ok) throw new Error('응답 형식을 확인할 수 없습니다.'); };
export const koreaDay = now => new Date(now + 9 * HOUR).toISOString().slice(0, 10);
const koreaTime = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? Date.parse(v + ':00+09:00') : NaN;
export function fresh(id, data, now = Date.now()) {
  if (id === 'weather') return data.day === koreaDay(now) && now - data.sourceTime <= 2 * HOUR && data.sourceTime - now <= HOUR;
  if (id === 'quakes') return now - data.sourceTime <= HOUR / 2 && data.sourceTime - now <= 5 * 60000;
  return now - data.sourceTime <= 7 * DAY && data.day <= koreaDay(now);
}
export function normalize(id, v, now = Date.now()) {
  let data;
  if (id === 'weather') {
    const { current: c, hourly: h, daily: d } = v || {};
    requireValue(c && h && d && v.timezone === 'Asia/Seoul');
    requireValue(number(c.temperature_2m, -90, 65) && number(d.temperature_2m_max?.[0], -90, 65));
    requireValue(v.current_units?.temperature_2m === '°C' && v.daily_units?.temperature_2m_max === '°C' && v.hourly_units?.wind_speed_10m === 'm/s' && v.hourly_units?.precipitation_probability === '%');
    requireValue(Array.isArray(h.time) && h.time.length === 24 && Array.isArray(h.precipitation_probability) && Array.isArray(h.wind_speed_10m));
    requireValue(h.precipitation_probability.length === 24 && h.wind_speed_10m.length === 24 && new Set(h.time).size === 24);
    requireValue(h.precipitation_probability.every(x => number(x, 0, 100)) && h.wind_speed_10m.every(x => number(x, 0, 150)));
    const sourceTime = koreaTime(c.time), day = d.time?.[0];
    requireValue(Number.isFinite(sourceTime) && typeof day === 'string' && h.time.every((t, i) => t === `${day}T${String(i).padStart(2, '0')}:00`));
    const rain = Math.max(...h.precipitation_probability), wind = Math.max(...h.wind_speed_10m), max = d.temperature_2m_max[0];
    const reasons = [rain >= 80 && '강수확률 80% 이상', wind >= 20 && '최대풍속 20m/s 이상', max >= 35 && '일최고기온 35℃ 이상'].filter(Boolean);
    data = { temperature: c.temperature_2m, max, rain, wind, day, sourceTime, reasons };
  } else if (id === 'quakes') {
    requireValue(v?.type === 'FeatureCollection' && Array.isArray(v.features) && number(v.metadata?.generated, 1, Number.MAX_SAFE_INTEGER));
    requireValue(v.metadata.status === 200 && v.metadata.count === v.features.length);
    requireValue(v.features.every(f => number(f.properties?.mag, 4.5, 10) && number(f.properties?.time, v.metadata.generated - DAY - 60000, v.metadata.generated + 60000) && typeof f.properties?.place === 'string'));
    const top = [...v.features].sort((a, b) => b.properties.mag - a.properties.mag)[0]?.properties;
    data = { count: v.features.length, magnitude: top?.mag ?? null, place: top?.place ?? null, eventTime: top?.time ?? null, sourceTime: v.metadata.generated };
  } else if (id === 'fx') {
    requireValue(v?.base === 'USD' && v.amount === 1 && number(v.rates?.KRW, 0.01, 1000000));
    requireValue(typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date));
    const sourceTime = Date.parse(v.date + 'T00:00:00+09:00');
    requireValue(Number.isFinite(sourceTime) && koreaDay(sourceTime) === v.date);
    data = { rate: v.rates.KRW, day: v.date, sourceTime };
  } else throw new Error('알 수 없는 자료입니다.');
  if (!fresh(id, data, now)) throw new Error('자료의 기준 시각이 오래되었거나 올바르지 않습니다.');
  return data;
}
export async function fetchFeed(id, { fetcher = fetch, now = Date.now, timeout = 7000 } = {}) {
  let lastError;
  for (const url of feeds[id].urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetcher(url, { signal: controller.signal, cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error('제공처에 연결할 수 없습니다.');
      return normalize(id, await response.json(), now());
    } catch (error) { lastError = error; }
    finally { clearTimeout(timer); }
  }
  throw lastError;
}
export function summarize(states) {
  const weather = states.weather;
  const failed = Object.values(states).filter(s => s.status === 'error').length;
  const loading = Object.values(states).some(s => s.status === 'loading');
  if (weather?.status === 'ok' && weather.data.reasons.length) return { tone: 'warn', word: '기상 주의', title: '오늘 예보, 한 번 더 확인하세요', body: weather.data.reasons.join(' · ') + '. 앱의 참고 기준입니다. 기상청 특보를 확인하세요.' };
  if (loading) return { tone: 'unknown', word: '확인 중', title: '자료를 확인하고 있습니다', body: '기상·지진·환율을 각각 확인합니다. 확인되지 않은 자료로 안전을 판단하지 않습니다.' };
  if (failed) return { tone: 'unknown', word: '확인 필요', title: failed === 3 ? '현재 자료를 확인할 수 없습니다' : `${failed}개 자료를 확인할 수 없습니다`, body: '아래 카드에서 다시 시도하거나 출처를 직접 확인하세요. 자료 부족은 안전을 뜻하지 않습니다.' };
  return { tone: 'normal', word: '기준 미만', title: '아산 기상, 참고 기준 미만', body: '오늘 예보가 앱의 주의 기준 미만입니다. 세계 지진·환율은 참고 정보이며 지역 안전을 판정하지 않습니다.' };
}
