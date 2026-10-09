import {DARK, LIGHT, ADDED, intervalColor, projectionAt, selectedLevels, additionalWaterLevels} from './core.mjs';

// Presence summaries keep the position of an actual eligible cell. A marker
// is deliberately visible at small scales and never represents flooded area.
export function summarizeTerrain(tile, block = 8) {
  const points = [], {heights, mask, connection} = tile;
  for (let by = 0; by < 256; by += block) for (let bx = 0; bx < 256; bx += block) {
    let lowest = Infinity, at = -1;
    for (let y = by; y < Math.min(256, by + block); y++) for (let x = bx; x < Math.min(256, bx + block); x++) {
      const i = y * 256 + x, h = Math.max(heights[i], connection[i]);
      if (mask[i] && Number.isFinite(h) && h <= 70 && h < lowest) {lowest = h; at = i;}
    }
    if (at >= 0) points.push(at % 256, Math.floor(at / 256), lowest);
  }
  return Float32Array.from(points);
}

export function overviewLevels(data, options) {
  if(options.longTermLevels)return {...options.longTermLevels};
  const {scenario, year, experiment, extraWater, compareBaseline, changesOnly, expansionOnly, intervalColors} = options;
  const mapYear = compareBaseline && !experiment ? 2030 : year;
  const levels = additionalWaterLevels(selectedLevels(data, scenario, mapYear, experiment), extraWater);
  if (!experiment && !extraWater) {
    levels.baselineUpper = projectionAt(data, scenario, 2030).upper;
    levels.previousUpper = projectionAt(data, scenario, Math.max(2030, year - 5)).upper;
    levels.changesOnly = changesOnly; levels.expansionOnly = expansionOnly;
    levels.compare = !compareBaseline && year > 2030 && !intervalColors;
    if (intervalColors && !compareBaseline) levels.bands = Array.from({length:(year-2030)/5+1},(_,i)=>({year:2030+i*5,upper:projectionAt(data,scenario,2030+i*5).upper}));
  }
  return levels;
}
export function overviewColor(height, levels) {
  if (!Number.isFinite(height) || height > levels.upper) return null;
  if (levels.changesOnly && height <= levels.previousUpper || levels.expansionOnly && height <= levels.baselineUpper) return null;
  if (levels.bands) return intervalColor(levels.bands.find(b=>height<=b.upper)?.year ?? 2030);
  if (levels.changesOnly || levels.expansionOnly) return ADDED;
  if (levels.compare) return height > levels.baselineUpper ? ADDED : DARK;
  return height <= levels.median ? DARK : LIGHT;
}

export function validateOverview(manifest, buffer) {
  if (manifest.schema !== 2 || manifest.zoom !== 6 || !manifest.buckets || buffer.byteLength !== manifest.points * 6) throw Error('Invalid overview data');
  const values = new Uint16Array(buffer), buckets = new Map();
  let count = 0;
  for (const [key, [offset, length]] of Object.entries(manifest.buckets)) {
    const [x,y] = key.split('/').map(Number);
    if (![x,y,offset,length].every(Number.isInteger) || x<0 || x>=16 || y<0 || y>=16 || offset !== count || length<0 || offset+length>manifest.points) throw Error('Invalid overview bucket');
    buckets.set(key, values.subarray(offset*3,(offset+length)*3)); count += length;
  }
  if (count !== manifest.points) throw Error('Incomplete overview index');
  return {buckets, points:count, zoom:6};
}
export function createOverviewReader(fetcher = fetch) {
  let promise;
  return () => promise ||= (async()=>{
    const response = await fetcher('/richdisk/earthquake-radar/sea-level/overview-index.json',{signal:AbortSignal.timeout(18000)});
    if (!response.ok) throw Error('Overview index unavailable');
    const manifest = await response.json();
    if (!/^\/sea-level\/overview-[a-f0-9]{16}\.bin$/.test(manifest.url)) throw Error('Invalid overview URL');
    const file = await fetcher(manifest.url,{signal:AbortSignal.timeout(25000)});
    if (!file.ok) throw Error('Overview data unavailable');
    return validateOverview(manifest,await file.arrayBuffer());
  })().catch(error=>{promise=null;throw error;});
}

export function overviewTilePoints(index, coords) {
  const n = 2 ** coords.z, left = coords.x/n, top = coords.y/n, right=(coords.x+1)/n, bottom=(coords.y+1)/n;
  const parts=[];
  for(let y=Math.floor(top*16);y<Math.ceil(bottom*16);y++)for(let x=Math.floor(left*16);x<Math.ceil(right*16);x++){
    const bucket=index.buckets.get(`${x}/${y}`);if(bucket)parts.push(bucket);
  }
  return {parts,left,top,right,bottom,n};
}
