// IPCC AR6 WGI, Table 9.10 (printed p. 1305), §§9.6.3.4–5.
// Literal published values, not a fitted temperature-to-height formula.
export const WARMING_SOURCE = Object.freeze({
  title: 'IPCC AR6 · 표 9.10',
  url: 'https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_Chapter09.pdf#page=95',
  seaLevelBaseline: '1995–2014', temperatureBaseline: '1850–1900',
  checked: '2026-09-11',
});
export const WARMING_TEMPERATURES = Object.freeze([1.5, 2, 3, 4, 5]);
export const WARMING_HORIZONS = Object.freeze({
  '2050': Object.freeze({label: '2050년', year: 2050, timeScaleYears: null, confidence: 'medium', quantiles: true}),
  '2100': Object.freeze({label: '2100년', year: 2100, timeScaleYears: null, confidence: 'medium', quantiles: true}),
  'commitment2000': Object.freeze({label: '약 2,000년 규모', year: null, timeScaleYears: 2000, confidence: 'low', quantiles: false}),
  'commitment10000': Object.freeze({label: '약 10,000년 규모', year: null, timeScaleYears: 10000, confidence: 'low', quantiles: false}),
});
// Each row follows WARMING_TEMPERATURES. Tuple: [lower, median, upper].
// The millennial assessment ranges do NOT provide a median or quantiles.
const TABLE = Object.freeze(Object.fromEntries(Object.entries({
  '2050': [[.16,.18,.24],[.17,.20,.26],[.18,.21,.27],[.19,.22,.28],[.22,.25,.31]],
  '2100': [[.34,.44,.59],[.40,.51,.69],[.50,.61,.81],[.58,.70,.92],[.69,.81,1.05]],
  'commitment2000': [[2,null,3],[2,null,6],[4,null,10],[12,null,16],[19,null,22]],
  'commitment10000': [[6,null,7],[8,null,13],[10,null,24],[19,null,33],[28,null,37]],
}).map(([key,rows])=>[key,Object.freeze(rows.map(row=>Object.freeze(row)))])));

export function warmingProjection(temperature, horizon) {
  const index=WARMING_TEMPERATURES.indexOf(temperature);
  if(index<0 || !Object.hasOwn(WARMING_HORIZONS,horizon)) throw Error('원문에 없는 온도·시간 조합입니다.');
  const [lower,median,upper]=TABLE[horizon][index], profile=WARMING_HORIZONS[horizon];
  return {temperature,horizon,...profile,lower,median,upper,scope:'global',baseline:WARMING_SOURCE.seaLevelBaseline,
    temperatureDefinition:profile.year?'2081–2100 mean warming':'peak warming',interpolated:false};
}
export function warmingTerrainLevels(projection) {
  // Validate against the published record, so a mutated/unsupported value cannot
  // reach the map. "median" is the shared painter's inner threshold; in the
  // millennial mode it is explicitly labeled lower bound throughout the UI.
  const p=warmingProjection(projection.temperature,projection.horizon);
  if(['lower','median','upper'].some(key=>p[key]!==projection[key])) throw Error('해수면 원문 수치가 일치하지 않습니다.');
  return {median:p.median??p.lower,upper:p.upper,longTerm:true};
}
