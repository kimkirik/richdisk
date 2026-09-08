import test from "node:test";
import assert from "node:assert/strict";
import {
  EndingSequence,
  recordVictory,
  campaignSummary,
} from "../src/ending.js";
import { createGame, advance } from "../src/engine.js";

test("all game speeds show a three-second victory before results, without advancing combat", () => {
  for (const speed of [1, 2, 3]) {
    const game = createGame();
    Object.assign(game, { phase: "victory", speed, time: 123, core: 86 });
    const ending = new EndingSequence();
    for (let i = 0; i < 179; i++) {
      advance(game, 1 / 60);
      ending.advance(1 / 60);
    }
    assert.equal(ending.state, "victory");
    ending.advance(1 / 60);
    assert.equal(ending.state, "complete");
    assert.equal(game.time, 123);
    assert.equal(game.core, 86);
  }
});
test("finale connects every sector, hidden time is ignored, and skip finishes immediately", () => {
  const ending = new EndingSequence(true);
  for (let i = 0; i < 190; i++) ending.advance(1 / 60);
  assert.equal(ending.state, "finale");
  const before = ending.elapsed;
  ending.advance(300, true);
  assert.equal(ending.elapsed, before);
  for (let i = 0; i < 290; i++) ending.advance(1 / 60);
  assert.equal(ending.connected, 20);
  assert.equal(ending.finished, false);
  ending.skip();
  assert.equal(ending.state, "complete");
  assert.equal(ending.connected, 20);
  const direct = new EndingSequence(true);
  direct.skip();
  assert.equal(direct.connected, 20);
});
test("reduced motion bypasses both lengthy animation phases", () => {
  for (const finale of [false, true]) {
    const ending = new EndingSequence(finale, true);
    for (let i = 0; i < 48; i++) ending.advance(1 / 60);
    assert.equal(ending.state, "complete");
  }
});
test("completion persists before animation, practice cannot award it, and replay preserves first completion", () => {
  const progress = {
    unlocked: 20,
    stars: Object.fromEntries(Array.from({ length: 19 }, (_, i) => [i + 1, 3])),
  };
  const game = { phase: "victory", stage: { id: 20 }, core: 85, score: 98765 };
  const before = structuredClone(progress);
  assert.equal(recordVictory(progress, game, true, 1000), false);
  assert.deepEqual(progress, before);
  assert.equal(recordVictory(progress, game, false, 1000), true);
  assert.deepEqual(campaignSummary(progress), { stars: 59, cleared: 20 });
  assert.equal(progress.completedAt, 1000);
  assert.equal(progress.finalBestScore, 98765);
  recordVictory(progress, { ...game, core: 100, score: 99800 }, false, 2000);
  assert.equal(progress.completedAt, 1000);
  assert.equal(progress.finalBestScore, 99800);
  assert.equal(campaignSummary(progress).stars, 60);
  const partial = { unlocked: 20, stars: {} };
  recordVictory(partial, game, false, 1000);
  assert.equal(partial.completedAt, undefined);
  assert.equal(
    recordVictory(progress, { ...game, phase: "defeat" }, false),
    false,
  );
});
