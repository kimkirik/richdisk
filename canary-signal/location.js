import {validCoordinates} from './weather.js?v=3.1';
export function positionToLocation(position, now = Date.now()) {
  const coords = position?.coords;
  if (!validCoordinates(coords) || typeof coords.accuracy !== 'number' || !Number.isFinite(coords.accuracy) || coords.accuracy < 0 || !Number.isFinite(position.timestamp) || now - position.timestamp > 120000 || position.timestamp - now > 60000) throw new Error('유효한 최신 위치를 확인하지 못했습니다. 위치를 다시 확인해 주세요.');
  return {latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy,acquired:position.timestamp,label:'현재 위치',mode:'gps'};
}
export function locationError(error) {
  if (error.code === 1) return '위치 권한이 꺼져 있습니다. 브라우저의 사이트 설정과 기기의 위치 서비스를 허용한 뒤 다시 눌러 주세요.';
  if (error.code === 2) return '기기에서 위치를 찾지 못했습니다. 위치 서비스를 켜고 창가나 실외에서 다시 시도해 주세요.';
  if (error.code === 3) return '위치 확인 시간이 초과됐습니다. 위치 서비스와 네트워크를 확인한 뒤 다시 시도해 주세요.';
  return error.message || '현재 위치를 확인하지 못했습니다.';
}
export async function locate(geolocation, now = Date.now) {
  if (!geolocation) throw new Error('이 브라우저는 위치 확인을 지원하지 않습니다. Safari 또는 Chrome에서 열어 주세요.');
  const request = enableHighAccuracy => new Promise((resolve,reject)=> {
    const timeout = enableHighAccuracy ? 10000 : 6000;
    // A watchdog covers embedded browsers that never deliver either callback.
    const timer = setTimeout(()=>reject({code:3}),timeout+1000);
    const done = fn => value => {clearTimeout(timer);fn(value);};
    try { geolocation.getCurrentPosition(done(resolve),done(reject),{enableHighAccuracy,timeout,maximumAge:0}); }
    catch(error) {clearTimeout(timer);reject(error);}
  });
  try { return positionToLocation(await request(true),now()); }
  catch(error) {
    if (error.code !== 2 && error.code !== 3) throw error;
    return positionToLocation(await request(false),now());
  }
}
