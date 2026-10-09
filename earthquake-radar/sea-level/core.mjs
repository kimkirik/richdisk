export const SCENARIOS = {ssp126: '저배출 · SSP1-2.6', ssp245: '중간 · SSP2-4.5', ssp370: '고배출 · SSP3-7.0'};
export const EXPERIMENTS = {thwaites: {label: '스웨이츠 빙하', metres: .65}, westAntarctic: {label: '서남극 전체', metres: 3.3}, allIce: {label: '모든 육상빙하', metres: 70}};
export const DARK = [240, 60, 50, 220];
export const LIGHT = [255, 170, 45, 185];
export const ADDED = [255, 155, 35, 245];
export const UNCONFIRMED = [210, 216, 222, 190];

export function projectionRange(data, scenario) {
  if (!Object.hasOwn(SCENARIOS, scenario)) throw Error('Unknown scenario');
  const years = data?.scenarios?.[scenario]?.year;
  if (!Array.isArray(years) || years.length < 2 || !years.every((y, i) => Number.isInteger(y) && y % 5 === 0 && (!i || y > years[i - 1]))) throw Error('Invalid projection years');
  const min = Math.max(2030, years[0]), max = years.at(-1);
  if (max < min) throw Error('Missing future projection');
  return {min, max};
}

export function projectionAt(data, scenario, year) {
  const {min, max} = projectionRange(data, scenario);
  if (!Number.isInteger(year) || year < min || year > max || year % 5) throw Error('Invalid sea level selection');
  const row = data.scenarios[scenario], years = row.year;
  const hi = years.findIndex(y => y >= year), lo = years[hi] === year ? hi : hi - 1;
  if (hi < 0 || lo < 0) throw Error('Missing projection anchor');
  const fraction = hi === lo ? 0 : (year - years[lo]) / (years[hi] - years[lo]);
  const value = key => row[key][lo] + (row[key][hi] - row[key][lo]) * fraction;
  return {median: value('height_50'), upper: value('height_83'), lower: value('height_17'), interpolated: lo !== hi, anchors: [years[lo], years[hi]]};
}

export function selectedLevels(data, scenario, year, experiment) {
  if (experiment) {
    if (!Object.hasOwn(EXPERIMENTS, experiment)) throw Error('Unknown experiment');
    // Independent experiment, never added to SSP projections (avoids double counting).
    return {median: EXPERIMENTS[experiment].metres, upper: EXPERIMENTS[experiment].metres, experiment};
  }
  return projectionAt(data, scenario, year);
}

// A user-selected sensitivity experiment, never an observed/predicted tide.
export function additionalWaterLevels(levels, metres = 0) {
  if (![0, .5, 1, 2].includes(metres)) throw Error('Invalid additional water level');
  if (levels.experiment && metres) throw Error('Cannot combine independent experiments');
  if (!metres) return {...levels};
  return {...levels, median: levels.median + metres, upper: levels.upper + metres,
    lower: levels.lower + metres, additionalMetres: metres};
}

// A fixed year determines the color, never the selected endpoint or click order.
// Alternate warm shades so adjacent intervals remain distinguishable.
// Color denotes the first-entry interval, never flood probability or severity.
export function intervalColor(year) {
  if (year === 2030) return DARK;
  const shade = ((year - 2035) / 5 * 13) % 24;
  return [255, 65 + Math.round(shade * 125 / 23), 35, 210];
}

export function projectionBands(data, scenario, year) {
  const {min} = projectionRange(data, scenario);
  projectionAt(data, scenario, year); // Reject unsupported endpoints before constructing bands.
  const bands = [];
  for (let end = min; end <= year; end += 5) {
    const upper = projectionAt(data, scenario, end).upper;
    if (!Number.isFinite(upper) || upper < 0 || bands.length && upper < bands.at(-1).upper) throw Error('Invalid interval projection');
    bands.push({year: end, upper, color: intervalColor(end)});
  }
  return bands;
}

export function decodeTerrain(rgba) {
  const heights = new Float32Array(rgba.length / 4);
  for (let i = 0; i < heights.length; i++) {
    const n = i * 4, h = rgba[n] * 256 + rgba[n + 1] + rgba[n + 2] / 256 - 32768;
    heights[i] = rgba[n + 3] === 0 || h <= -12000 || h > 9000 ? NaN : h;
  }
  return heights;
}

export function classifyTerrain(heights, landMask, levels, connection) {
  if (!Number.isFinite(levels.median) || !Number.isFinite(levels.upper) || levels.upper < levels.median || landMask.length !== heights.length || connection && connection.length !== heights.length) throw Error('Invalid terrain input');
  const pixels = new Uint8ClampedArray(heights.length * 4);
  let dark = 0, light = 0, unconfirmed = 0, added = 0, stepAdded = 0, stepPixel = -1, expansionAdded = 0, expansionPixel = -1;
  for (let i = 0; i < heights.length; i++) {
    const terrain = heights[i];
    if (!landMask[i] || !Number.isFinite(terrain) || terrain > levels.upper) continue;
    const h = connection ? Math.max(terrain, connection[i]) : terrain;
    if (h > levels.upper || Number.isNaN(h)) {
      unconfirmed++;
      // Preserve unconfirmed lowlands, distinct from connected candidates.
      // Comparison filters cannot claim their first year of sea connection.
      if (!levels.changesOnly && !levels.expansionOnly && ((i % 256 + Math.floor(i / 256)) % 6 < 2)) pixels.set(UNCONFIRMED, i * 4);
      continue;
    }
    const median = h <= levels.median;
    const isAdded = median && Number.isFinite(levels.baselineMedian) && h > levels.baselineMedian;
    // A newly included cell must have been outside BOTH candidate ranges five years earlier.
    const isStepAdded = Number.isFinite(levels.previousUpper) && h > levels.previousUpper;
    // Compare the entire candidate footprint (including the upper range), not
    // just cells changing from the light category to the median category.
    const isExpansion = Number.isFinite(levels.baselineUpper) && h > levels.baselineUpper;
    if (median) dark++; else light++;
    if (isAdded) added++;
    if (isStepAdded) {stepAdded++; if (stepPixel < 0) stepPixel = i;}
    if (isExpansion) {expansionAdded++; if (expansionPixel < 0) expansionPixel = i;}
    if (levels.changesOnly && !isStepAdded) continue;
    if (levels.expansionOnly && !isExpansion) continue;
    let color = levels.changesOnly || isAdded && levels.highlightAdded ? ADDED : median ? DARK : LIGHT;
    if (levels.highlightExpansion || levels.expansionOnly) color = isExpansion ? ADDED : [240, 60, 50, 125];
    if (levels.bands?.length) {
      // First threshold that includes this cell. Later years keep that exact color.
      let lo = 0, hi = levels.bands.length - 1;
      while (lo < hi) {const mid = (lo + hi) >>> 1; if (h <= levels.bands[mid].upper) hi = mid; else lo = mid + 1;}
      color = levels.bands[lo].color;
    }
    pixels.set(color, i * 4);
  }
  return {pixels, dark, light, unconfirmed, added, stepAdded, stepPixel, expansionAdded, expansionPixel};
}

export function validTile({x, y, z}) {
  return [x, y, z].every(Number.isInteger) && z >= 6 && z <= 14 && x >= 0 && y >= 0 && x < 2 ** z && y < 2 ** z;
}

export function polygonsForTile(polygons, {x, y, z}) {
  const n = 2 ** z, left = x / n, top = y / n, right = (x + 1) / n, bottom = (y + 1) / n;
  return polygons.filter(p => p.bbox[0] <= right && p.bbox[2] >= left && p.bbox[1] <= bottom && p.bbox[3] >= top);
}

export function createLru(limit) {
  const entries = new Map();
  return {get(key) {const value = entries.get(key); if (value) {entries.delete(key); entries.set(key, value);} return value;}, set(key, value) {entries.delete(key); entries.set(key, value); while (entries.size > limit) entries.delete(entries.keys().next().value);}, clear() {entries.clear();}, get size() {return entries.size;}};
}
