import {classifyTerrain, createLru, decodeTerrain, validTile} from './core.mjs';
import {createLandCoverReader} from './landcover.mjs';
import {createOceanSeedReader} from './ocean.mjs';
import {connectTile, tileNeighbours} from './connectivity.mjs';
import {summarizeTerrain} from './overview.mjs';
import {selectElevation, decodeGsi, cleanAhn, mercatorBounds} from './elevation.mjs';
import {fromArrayBuffer} from 'geotiff';

const cache = createLru(48), connectedCache = createLru(32), rawPending = new Map(), slots = [];
const jobs = new Map(), controllers = new Set(), readLandMask=createLandCoverReader({classified:true});
const readOceanSeeds = createOceanSeedReader(url => fetchTimed(url));
let fetching = 0;
let running = 0, currentLevels, epoch = 0;
async function fetchTimed(url, format = 'json', timeout = 18000) {
  const controller = new AbortController(); controllers.add(controller);
  const timer = setTimeout(() => controller.abort(), timeout);
  try {const response = await fetch(url, {signal: controller.signal, credentials: 'omit', cache: 'force-cache'}); if (!response.ok) throw Error('Terrain data unavailable'); return await response[format]();}
  finally {clearTimeout(timer); controllers.delete(controller);}
}
async function loadRawTile(coords) {
  const key = `${coords.z}/${coords.x}/${coords.y}`, cached = cache.get(key);
  if (cached) return cached;
  const controller=new AbortController();controllers.add(controller);
  const timeout=setTimeout(()=>controller.abort(),30000);
  let cover;
  try{cover=await readLandMask(coords,controller.signal);}finally{clearTimeout(timeout);controllers.delete(controller);}
  if (!cover.some(Boolean)) {const empty={heights:new Float32Array(cover.length).fill(NaN),cover,seeds:new Uint8Array(cover.length)};cache.set(key,empty);return empty;}
  const elevation = cover.some(v=>v===1||v===3) ? await selectElevation(coords,cover,readElevation) : {heights:new Float32Array(65536).fill(NaN),quality:null};
  const value = {...elevation, cover, seeds: await readOceanSeeds(coords, cover)};
  cache.set(key, value); return value;
}
async function readElevation(source, coords) {
  const key=`${coords.z}/${coords.x}/${coords.y}`;
  if(source==='ahn') {
    const buffer=await fetchTimed('/api/sea-elevation/ahn/'+key,'arrayBuffer');
    const tiff=await fromArrayBuffer(buffer),image=await tiff.getImage();
    const bbox=image.getBoundingBox(),expected=mercatorBounds(coords);
    if(image.getWidth()!==256||image.getHeight()!==256||image.getSamplesPerPixel()!==1||image.getGeoKeys().ProjectedCSTypeGeoKey!==3857||bbox.some((v,i)=>Math.abs(v-expected[i])>.01))throw Error('Misaligned AHN elevation');
    return cleanAhn(await image.readRasters({samples:[0],interleave:true}),image.getGDALNoData());
  }
  const url=source==='mapzen'?`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`:`https://cyberjapandata.gsi.go.jp/xyz/${source==='gsi5a'?'dem5a_png':'dem_png'}/${key}.png`;
  const blob=await fetchTimed(url,'blob');
  // RGB bytes encode heights. Browser color management must not change them.
  const bitmap=await createImageBitmap(blob,{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  if(bitmap.width!==256||bitmap.height!==256){bitmap.close();throw Error('Unexpected terrain size');}
  const canvas=new OffscreenCanvas(256,256),ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(bitmap,0,0);bitmap.close();
  const rgba=ctx.getImageData(0,0,256,256).data;
  return source==='mapzen'?decodeTerrain(rgba):decodeGsi(rgba);
}
function rawTile(coords) {
  const key = `${coords.z}/${coords.x}/${coords.y}`, cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  if (rawPending.has(key)) return rawPending.get(key);
  const generation = epoch;
  const promise = new Promise((resolve, reject) => {
    const start = () => {
      if (generation !== epoch) {reject(Error('Cancelled terrain')); slots.shift()?.(); return;}
      fetching++;
      loadRawTile(coords).then(resolve, reject).finally(() => {fetching--; slots.shift()?.();});
    };
    if (fetching < 4) start(); else slots.push(start);
  }).finally(() => {if (rawPending.get(key) === promise) rawPending.delete(key);});
  rawPending.set(key, promise); return promise;
}
async function loadTile(coords) {
  const key = `${coords.z}/${coords.x}/${coords.y}`, cached = connectedCache.get(key);
  if (cached) return cached;
  const parts = await Promise.all(tileNeighbours(coords).map(async part => ({...part, tile: await rawTile(part).catch(() => null)})));
  const center = parts.find(p => !p.dx && !p.dy)?.tile;
  if (!center) throw Error('Center terrain unavailable');
  const value = {heights: center.heights, mask: Uint8Array.from(center.cover, v => v === 1 ? 1 : 0), connection: connectTile(parts), quality:center.quality, partial: parts.some(p => !p.tile)};
  if (!value.partial) connectedCache.set(key, value);
  return value;
}
function pump() {
  for (const [key, job] of jobs) {
    if (running >= 2) break;
    if (job.running) continue;
    job.running = true; running++; const generation = epoch;
    loadTile(job.coords).then(tile => {
      if (generation !== epoch || jobs.get(key) !== job) return;
      const result = classifyTerrain(tile.heights, tile.mask, currentLevels, tile.connection);
      const overview = summarizeTerrain(tile);
      self.postMessage({type: 'tile', key, revision: currentLevels.revision, partial: Boolean(tile.partial), quality:tile.quality, overview, ...result}, [result.pixels.buffer, overview.buffer]);
    }).catch(() => {
      if (generation === epoch && jobs.get(key) === job) self.postMessage({type: 'error', key, revision: currentLevels.revision});
    }).finally(() => {running--; if (jobs.get(key) === job) jobs.delete(key); pump();});
  }
}
self.onmessage = ({data}) => {
  if (data.type === 'stop') {epoch++; jobs.clear(); controllers.forEach(c => c.abort()); return;}
  if (data.type !== 'render' || !Number.isFinite(data.levels?.median) || !Number.isFinite(data.levels?.upper)) return;
  currentLevels = data.levels;
  const desired = new Set();
  for (const coords of data.tiles.slice(0, 100)) {
    if (!validTile(coords)) continue;
    const key = `${coords.z}/${coords.x}/${coords.y}`; desired.add(key);
    if (!jobs.has(key)) jobs.set(key, {coords, running: false});
  }
  for (const key of jobs.keys()) if (!desired.has(key)) jobs.delete(key);
  pump();
};
