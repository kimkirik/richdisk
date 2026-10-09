// A bounded, four-neighbour static connectivity screen, not a hydraulic model.
// Each value is the lowest water level with a known path from an ocean seed.
// Unknown cells and the analysis boundary are barriers, never implicit sea seeds.
export function connectedThresholds(heights, cover, seeds, width) {
  const size = heights.length;
  if (!Number.isInteger(width) || width < 1 || size % width || cover.length !== size || seeds.length !== size) throw Error('Invalid connectivity raster');
  const result = new Float32Array(size).fill(Infinity), visited = new Uint8Array(size);
  const heap = [], costs = [];
  function push(index, cost) {
    let i = heap.length; heap.push(index); costs.push(cost);
    while (i) {const p = (i - 1) >>> 1; if (costs[p] <= cost) break; heap[i] = heap[p]; costs[i] = costs[p]; i = p;}
    heap[i] = index; costs[i] = cost;
  }
  function pop() {
    const first = heap[0], cost = costs[0], last = heap.pop(), lastCost = costs.pop();
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && costs[child + 1] < costs[child]) child++;
        if (costs[child] >= lastCost) break;
        heap[i] = heap[child]; costs[i] = costs[child]; i = child;
      }
      heap[i] = last; costs[i] = lastCost;
    }
    return [first, cost];
  }
  for (let i = 0; i < size; i++) {
    if (seeds[i] && cover[i] === 2) {visited[i] = 1; result[i] = -Infinity; push(i, -Infinity);}
  }
  function visit(i, cost) {
    if (visited[i] || !cover[i] || (cover[i] !== 2 && !Number.isFinite(heights[i]))) return;
    visited[i] = 1;
    // No supported scenario/experiment exceeds 70 m. Higher barriers stay closed.
    // National ground DEMs intentionally omit water; known permanent water
    // is traversable, but lakes never become seeds and missing LAND stays closed.
    const next = cover[i] === 2 ? cost : Math.max(cost, heights[i]);
    if (next > 70) return;
    result[i] = next; push(i, next);
  }
  while (heap.length) {
    const [i, cost] = pop(), x = i % width;
    if (x) visit(i - 1, cost);
    if (x + 1 < width) visit(i + 1, cost);
    if (i >= width) visit(i - width, cost);
    if (i + width < size) visit(i + width, cost);
  }
  return result;
}

export function tileNeighbours({x, y, z}) {
  const n = 2 ** z, tiles = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (y + dy >= 0 && y + dy < n) tiles.push({x: (x + dx + n) % n, y: y + dy, z, dx, dy});
  }
  return tiles;
}

export function connectTile(parts, tileSize = 256) {
  const width = tileSize * 3, heights = new Float32Array(width * width).fill(NaN);
  const cover = new Uint8Array(heights.length), seeds = new Uint8Array(heights.length);
  for (const {dx, dy, tile} of parts) {
    if (!tile) continue; // Failed/missing neighbours cannot create a path.
    for (let row = 0; row < tileSize; row++) {
      const target = ((dy + 1) * tileSize + row) * width + (dx + 1) * tileSize, start = row * tileSize;
      heights.set(tile.heights.subarray(start, start + tileSize), target);
      cover.set(tile.cover.subarray(start, start + tileSize), target);
      seeds.set(tile.seeds.subarray(start, start + tileSize), target);
    }
  }
  const joined = connectedThresholds(heights, cover, seeds, width), result = new Float32Array(tileSize * tileSize);
  for (let row = 0; row < tileSize; row++) result.set(joined.subarray((tileSize + row) * width + tileSize, (tileSize + row) * width + tileSize * 2), row * tileSize);
  return result;
}
