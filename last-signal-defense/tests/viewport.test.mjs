import test from "node:test";
import assert from "node:assert/strict";
import { STAGES } from "../src/data.js";
import { projectPoint, padPercent, cameraMatrix } from "../src/viewport.js";
const apply = ([a, b, c, d, e, f], p) => ({
  x: a * p.x + c * p.y + e,
  y: b * p.x + d * p.y + f,
});
test("portrait camera and build buttons agree for every pad on all 20 maps", () => {
  for (const portrait of [false, true])
    for (const s of STAGES)
      for (const p of s.pads) {
        const w = portrait ? 355 : 960,
          h = portrait ? (w * 16) / 9 : (w * 9) / 16;
        const canvas = apply(cameraMatrix(w, h, portrait), p),
          hit = padPercent(p, portrait);
        assert.ok(Math.abs(canvas.x - (hit.left * w) / 100) < 1e-8);
        assert.ok(Math.abs(canvas.y - (hit.top * h) / 100) < 1e-8);
        assert.ok(
          hit.left > 0 && hit.left < 100 && hit.top > 0 && hit.top < 100,
        );
      }
});
test("portrait projection preserves path distances, endpoints and handedness", () => {
  for (const s of STAGES)
    for (const path of s.paths)
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1],
          b = path[i],
          p = projectPoint(a, true),
          q = projectPoint(b, true);
        assert.ok(
          Math.abs(
            Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(p.x - q.x, p.y - q.y),
          ) < 1e-8,
        );
      }
  assert.deepEqual(projectPoint({ x: 0, y: 0 }, true), { x: 720, y: 0 });
  assert.deepEqual(projectPoint({ x: 1280, y: 720 }, true), { x: 0, y: 1280 });
});
