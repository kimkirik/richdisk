import test from "node:test";
import assert from "node:assert/strict";
import { bindPageLifecycle } from "../src/lifecycle.js";
import { createGame, startWave, setSpeed, advance } from "../src/engine.js";
import { OrchestralAudio } from "../src/music.js";
import { EndingSequence } from "../src/ending.js";

function setup(game) {
  const page = new EventTarget(),
    host = new EventTarget();
  page.hidden = false;
  const audio = new OrchestralAudio();
  let current = game,
    now = 0,
    last = 0;
  const ending = new EndingSequence(true);
  bindPageLifecycle({
    page,
    host,
    audio,
    getGame: () => current,
    resetClock: () => {
      last = now;
    },
    refresh: () => {},
  });
  const frame = (ms = 1000 / 60) => {
    now += ms;
    const dt = (now - last) / 1000;
    last = now;
    if (!page.hidden) {
      advance(current, dt);
      ending.advance(dt);
    }
  };
  const visibility = (hidden) => {
    page.hidden = hidden;
    page.dispatchEvent(new Event("visibilitychange"));
  };
  return {
    page,
    host,
    audio,
    ending,
    frame,
    visibility,
    elapse: (ms) => {
      now += ms;
    },
    replace: (g) => {
      current = g;
    },
  };
}

test("window return resumes every speed, preserves the battle, and discards hidden elapsed time", () => {
  for (const speed of [1, 2, 3]) {
    const game = createGame(1);
    startWave(game);
    setSpeed(game, speed);
    const h = setup(game);
    h.frame();
    const time = game.time;
    const state = {
      core: game.core,
      energy: game.energy,
      wave: game.wave,
      kills: game.kills,
    };
    for (let i = 0; i < 3; i++) {
      h.visibility(true);
      assert.equal(game.paused, false);
      assert.equal(h.audio.paused, true);
      h.elapse(60000); // Browser stops delivering animation frames while hidden.
      h.visibility(false);
      assert.equal(h.audio.paused, false);
    }
    assert.equal(game.time, time);
    assert.deepEqual(
      {
        core: game.core,
        energy: game.energy,
        wave: game.wave,
        kills: game.kills,
      },
      state,
    );
    h.frame(20);
    assert.ok(game.time > time);
    assert.ok(game.time - time <= speed * 0.02 + 1e-8);
    assert.equal(game.speed, speed);
  }
});

test("manual pause and a modal pause survive visibility, focus, and restored pages", () => {
  for (const phase of ["build", "combat", "victory"]) {
    const game = createGame();
    game.phase = phase;
    game.paused = true;
    const h = setup(game);
    h.visibility(true);
    h.elapse(120000);
    h.visibility(false);
    h.host.dispatchEvent(new Event("focus"));
    h.host.dispatchEvent(new Event("pageshow"));
    h.frame();
    assert.equal(game.paused, true);
    assert.equal(game.time, 0);
    assert.equal(h.audio.paused, true);
  }
});

test("restored pages resume the current stage and preserve the ending's position", () => {
  const original = createGame(1),
    current = createGame(20);
  const h = setup(original);
  h.visibility(true);
  h.replace(current);
  current.phase = "victory";
  current.accumulator = 0.01;
  h.elapse(300000);
  h.visibility(false);
  h.host.dispatchEvent(new Event("pageshow"));
  assert.equal(current.accumulator, 0);
  assert.equal(current.stage.id, 20);
  h.frame();
  assert.ok(h.ending.elapsed < 0.02);
  assert.equal(h.ending.state, "victory");
  assert.equal(current.paused, false);
});
