const assert = require("node:assert/strict");
const { test } = require("node:test");
const { buildGrid, quantize, nearestStep } = require("../../timing.js");

test("variable beats and leading silence preserve the absolute timeline", () => {
  const grid = buildGrid(4, 120, [1, 1.5, 2.1, 2.8, 3.5]);
  for (const time of [1, 1.5, 2.1, 2.8, 3.5]) assert.ok(Math.abs(grid[nearestStep(grid, time)] - time) < 1e-8);
  assert.ok(grid[0] <= 0);
  assert.ok(grid.at(-1) <= 4 && grid.at(-1) > 3.7);
});

test("small detection latency never inserts an extra leading beat", () => {
  const grid = buildGrid(2, 120, [.02, .52, 1.02, 1.52]);
  assert.equal(nearestStep(grid, .02), 0);
  assert.ok(grid.at(-1) <= 2);
});

test("simultaneous instruments survive, colliding rolls are reported, originals stay intact", () => {
  const grid = buildGrid(2, 120);
  const events = [
    { time: .5, instrument: "snare", confidence: .9 },
    { time: .5, instrument: "kick", confidence: .8 },
    { time: .53, instrument: "snare", confidence: .7 },
    { time: .7, instrument: "hat", confidence: .6 },
  ];
  const original = JSON.stringify(events);
  const result = quantize(events, grid);
  assert.equal(result.events.length, 3);
  assert.equal(result.collisions, 1);
  assert.equal(result.offGrid, 1);
  assert.equal(JSON.stringify(events), original);
});

test("manual tempo and phase corrections regrid without modifying raw onset times", () => {
  const grid = buildGrid(8, 90, [], .037);
  const time = .037 + (60 / 90) * 3;
  assert.equal(nearestStep(grid, time), 12);
  assert.throws(() => buildGrid(Infinity, 120));
});
