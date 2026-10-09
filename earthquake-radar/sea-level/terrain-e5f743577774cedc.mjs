//#region public/sea-level/core.mjs
const DARK = [
	18,
	85,
	217,
	210
];
const LIGHT = [
	107,
	203,
	255,
	165
];
const ADDED = [
	0,
	245,
	220,
	245
];
function decodeTerrain(rgba) {
	const heights = new Float32Array(rgba.length / 4);
	for (let i = 0; i < heights.length; i++) {
		const n = i * 4, h = rgba[n] * 256 + rgba[n + 1] + rgba[n + 2] / 256 - 32768;
		heights[i] = rgba[n + 3] === 0 || h <= -12e3 || h > 9e3 ? NaN : h;
	}
	return heights;
}
function classifyTerrain(heights, landMask, levels) {
	if (!Number.isFinite(levels.median) || !Number.isFinite(levels.upper) || levels.median < 0 || levels.upper < levels.median || landMask.length !== heights.length) throw Error("Invalid terrain input");
	const pixels = new Uint8ClampedArray(heights.length * 4);
	let dark = 0, light = 0, added = 0, stepAdded = 0, stepPixel = -1;
	for (let i = 0; i < heights.length; i++) {
		const h = heights[i];
		if (!landMask[i] || !Number.isFinite(h) || h > levels.upper) continue;
		const median = h <= levels.median;
		const isAdded = median && Number.isFinite(levels.baselineMedian) && h > levels.baselineMedian;
		const isStepAdded = Number.isFinite(levels.previousUpper) && h > levels.previousUpper;
		if (median) dark++;
		else light++;
		if (isAdded) added++;
		if (isStepAdded) {
			stepAdded++;
			if (stepPixel < 0) stepPixel = i;
		}
		if (levels.changesOnly && !isStepAdded) continue;
		const color = levels.changesOnly || isAdded && levels.highlightAdded ? ADDED : median ? DARK : LIGHT;
		pixels.set(color, i * 4);
	}
	return {
		pixels,
		dark,
		light,
		added,
		stepAdded,
		stepPixel
	};
}
function validTile({ x, y, z }) {
	return [
		x,
		y,
		z
	].every(Number.isInteger) && z >= 6 && z <= 13 && x >= 0 && y >= 0 && x < 2 ** z && y < 2 ** z;
}
function createLru(limit) {
	const entries = /* @__PURE__ */ new Map();
	return {
		get(key) {
			const value = entries.get(key);
			if (value) {
				entries.delete(key);
				entries.set(key, value);
			}
			return value;
		},
		set(key, value) {
			entries.delete(key);
			entries.set(key, value);
			while (entries.size > limit) entries.delete(entries.keys().next().value);
		},
		clear() {
			entries.clear();
		},
		get size() {
			return entries.size;
		}
	};
}
//#endregion
//#region public/sea-level/terrain-worker.mjs
const cache = createLru(40), landCache = createLru(12), jobs = /* @__PURE__ */ new Map(), controllers = /* @__PURE__ */ new Set();
let landPromise, running = 0, currentLevels, epoch = 0;
async function fetchTimed(url, format = "json", timeout = 18e3) {
	const controller = new AbortController();
	controllers.add(controller);
	const timer = setTimeout(() => controller.abort(), timeout);
	try {
		const response = await fetch(url, {
			signal: controller.signal,
			credentials: "omit",
			cache: "force-cache"
		});
		if (!response.ok) throw Error("Terrain data unavailable");
		return await response[format]();
	} finally {
		clearTimeout(timer);
		controllers.delete(controller);
	}
}
async function landData(coords) {
	if (!landPromise) landPromise = fetchTimed("./land-index.json").then((d) => new Set(d.tiles)).catch((e) => {
		landPromise = null;
		throw e;
	});
	const index = await landPromise, factor = 2 ** (coords.z - 5), key = `${Math.floor(coords.x / factor)}-${Math.floor(coords.y / factor)}`;
	if (!index.has(key)) return [];
	let promise = landCache.get(key);
	if (!promise) {
		promise = fetchTimed(`./land/${key}.json`).then((d) => [d]).catch((e) => {
			landCache.clear();
			throw e;
		});
		landCache.set(key, promise);
	}
	return promise;
}
async function loadTile(coords) {
	const key = `${coords.z}/${coords.x}/${coords.y}`, cached = cache.get(key);
	if (cached) return cached;
	const polygons = await landData(coords);
	const mask = new Uint8Array(256 * 256);
	if (!polygons.length) {
		const empty = {
			heights: new Float32Array(mask.length),
			mask
		};
		cache.set(key, empty);
		return empty;
	}
	const ctx = new OffscreenCanvas(256, 256).getContext("2d", { willReadFrequently: true });
	ctx.fillStyle = "#fff";
	const n = 2 ** coords.z;
	ctx.beginPath();
	for (const polygon of polygons) for (const ring of polygon.rings) {
		ring.forEach((point, i) => {
			const x = (point[0] * n - coords.x) * 256, y = (point[1] * n - coords.y) * 256;
			if (i) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
		});
		ctx.closePath();
	}
	ctx.fill("evenodd");
	const maskPixels = ctx.getImageData(0, 0, 256, 256).data;
	let landCount = 0;
	for (let i = 0; i < mask.length; i++) {
		mask[i] = maskPixels[i * 4 + 3] > 127 ? 1 : 0;
		landCount += mask[i];
	}
	if (!landCount) {
		const empty = {
			heights: new Float32Array(mask.length),
			mask
		};
		cache.set(key, empty);
		return empty;
	}
	const blob = await fetchTimed(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`, "blob");
	const bitmap = await createImageBitmap(blob, {
		colorSpaceConversion: "none",
		premultiplyAlpha: "none"
	});
	if (bitmap.width !== 256 || bitmap.height !== 256) {
		bitmap.close();
		throw Error("Unexpected terrain size");
	}
	ctx.clearRect(0, 0, 256, 256);
	ctx.drawImage(bitmap, 0, 0);
	bitmap.close();
	const value = {
		heights: decodeTerrain(ctx.getImageData(0, 0, 256, 256).data),
		mask
	};
	cache.set(key, value);
	return value;
}
function pump() {
	for (const [key, job] of jobs) {
		if (running >= 4) break;
		if (job.running) continue;
		job.running = true;
		running++;
		const generation = epoch;
		loadTile(job.coords).then((tile) => {
			if (generation !== epoch || jobs.get(key) !== job) return;
			const result = classifyTerrain(tile.heights, tile.mask, currentLevels);
			self.postMessage({
				type: "tile",
				key,
				revision: currentLevels.revision,
				...result
			}, [result.pixels.buffer]);
		}).catch(() => {
			if (generation === epoch && jobs.get(key) === job) self.postMessage({
				type: "error",
				key
			});
		}).finally(() => {
			running--;
			if (jobs.get(key) === job) jobs.delete(key);
			pump();
		});
	}
}
self.onmessage = ({ data }) => {
	if (data.type === "stop") {
		epoch++;
		jobs.clear();
		controllers.forEach((c) => c.abort());
		return;
	}
	if (data.type !== "render" || !Number.isFinite(data.levels?.median) || !Number.isFinite(data.levels?.upper)) return;
	currentLevels = data.levels;
	const desired = /* @__PURE__ */ new Set();
	for (const coords of data.tiles.slice(0, 100)) {
		if (!validTile(coords)) continue;
		const key = `${coords.z}/${coords.x}/${coords.y}`;
		desired.add(key);
		if (!jobs.has(key)) jobs.set(key, {
			coords,
			running: false
		});
	}
	for (const key of jobs.keys()) if (!desired.has(key)) jobs.delete(key);
	pump();
};
//#endregion
