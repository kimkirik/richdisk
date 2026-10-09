import {createLru} from './core.mjs';

// Natural Earth is ONLY a conservative offshore seed, never the land boundary.
// Fill each ring independently so inland lakes/holes do not become ocean seeds.
// A ~1 km exclusion around its coarse coastline further reduces false seeds.
export function createOceanSeedReader(fetchJson) {
  let indexPromise; const cache = createLru(8);
  return async function readOceanSeeds(coords, cover) {
    if (!cover.includes(2)) return new Uint8Array(cover.length);
    if (!indexPromise) indexPromise = fetchJson('/richdisk/earthquake-radar/sea-level/land-index.json').then(d => new Set(d.tiles)).catch(e => {indexPromise = null; throw e;});
    const index = await indexPromise, factor = 2 ** (coords.z - 5), key = `${Math.floor(coords.x / factor)}-${Math.floor(coords.y / factor)}`;
    let data = cache.get(key);
    if (!data) {data = index.has(key) ? await fetchJson(`/richdisk/earthquake-radar/sea-level/land/${key}.json`) : {rings: []}; cache.set(key, data);}
    const canvas = new OffscreenCanvas(256, 256), ctx = canvas.getContext('2d', {willReadFrequently: true});
    const n = 2 ** coords.z, lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (coords.y + .5) / n)));
    ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
    ctx.lineWidth = 2000 / (40075016.686 * Math.cos(lat) / (n * 256));
    for (const ring of data.rings) {
      ctx.beginPath();
      ring.forEach(([x, y], i) => {const px = (x * n - coords.x) * 256, py = (y * n - coords.y) * 256; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);});
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const rgba = ctx.getImageData(0, 0, 256, 256).data, seeds = new Uint8Array(cover.length);
    for (let i = 0; i < seeds.length; i++) seeds[i] = cover[i] === 2 && rgba[i * 4 + 3] === 0 ? 1 : 0;
    return seeds;
  };
}
