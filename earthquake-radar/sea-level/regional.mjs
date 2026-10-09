import {SCENARIOS} from './core.mjs';
export const REGIONAL_SOURCE = 'https://sealevel.nasa.gov/projection-passthru/';
export function regionalCell(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -60 || lat >= 83) return null;
  // Matches the NASA tool's grid-selection convention, including western longitudes.
  return {lat: Math.floor(lat), lon: Math.floor(((lng + 180) % 360 + 360) % 360 - 180)};
}
export function regionalUrl({lat, lon}) {
  return REGIONAL_SOURCE + `?lat=${lat}&lon=${lon}&process=total&confidence=medium&data_layer=ssp`;
}
export function normalizeRegional(rows, cell, accessed) {
  if (!Array.isArray(rows)) throw Error('Regional data unavailable');
  const scenarios = {};
  for (const scenario of Object.keys(SCENARIOS)) {
    const matches = rows.filter(r => r.type === 'grid' && r.lat === cell.lat && r.lon === cell.lon && r.process === 'total' && r.confidence === 'medium' && r.scenario === scenario);
    if (matches.length !== 1) throw Error('Regional projection missing');
    const row = matches[0], years = row.year;
    if (!Array.isArray(years) || years.length !== 14 || !years.every((y, i) => y === 2020 + i * 10)) throw Error('Invalid regional years');
    for (const field of ['height_17', 'height_50', 'height_83']) {
      if (!Array.isArray(row[field]) || row[field].length !== years.length || !row[field].every(v => Number.isFinite(v) && Math.abs(v) < 20)) throw Error('Invalid regional levels');
    }
    if (!years.every((_, i) => row.height_17[i] <= row.height_50[i] && row.height_50[i] <= row.height_83[i])) throw Error('Invalid regional quantiles');
    scenarios[scenario] = Object.fromEntries(['year', 'height_17', 'height_50', 'height_83'].map(k => [k, row[k]]));
  }
  return {scope: 'regional', grid: cell, baseline: '1995–2014', confidence: 'medium', unit: 'm', accessed, source: regionalUrl(cell), sourcePage: 'https://sealevel.nasa.gov/ipcc-ar6-sea-level-projection-tool/', scenarios};
}
export function increasingProjection(data, scenario) {
  const row = data.scenarios[scenario];
  return ['height_50', 'height_83'].every(k => row[k].slice(1).every((v, i, values) => v >= 0 && (!i || v >= values[i - 1])));
}
export function createRegionalLoader(fetcher = fetch) {
  const cache = new Map();
  return async cell => {
    const key = `${cell.lat}/${cell.lon}`;
    if (cache.has(key)) return cache.get(key);
    const response = await fetcher(`/api/sea-projection?lat=${cell.lat}&lon=${cell.lon}`, {signal: AbortSignal.timeout(18000)});
    if (!response.ok) throw Error('Regional data unavailable');
    const data = await response.json();
    if (data.scope !== 'regional' || data.grid?.lat !== cell.lat || data.grid?.lon !== cell.lon || data.unit !== 'm' || data.baseline !== '1995–2014') throw Error('Regional grid mismatch');
    // Validate the same numerical contract at the client boundary as at the API.
    normalizeRegional(Object.entries(data.scenarios).map(([scenario, row]) => ({...row, scenario, ...cell, type: 'grid', process: 'total', confidence: 'medium'})), cell, data.accessed);
    cache.set(key, data); if (cache.size > 12) cache.delete(cache.keys().next().value);
    return data;
  };
}
