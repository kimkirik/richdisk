import test from "node:test";
import assert from "node:assert/strict";
import { OrchestralAudio, scoreMix, SCORE_SECONDS } from "../src/music.js";
const game = (extra = {}) => ({
  phase: "build",
  wave: 0,
  core: 100,
  enemies: [],
  paused: false,
  ...extra,
});
test("score intensity follows battle and boss state, independently of game speed", () => {
  assert.deepEqual(scoreMix(game()), [0.86, 0, 0]);
  const first = game({ phase: "combat", wave: 1 });
  assert.ok(scoreMix(first)[1] > 0);
  assert.ok(
    scoreMix(game({ phase: "combat", wave: 3 }))[1] > scoreMix(first)[1],
  );
  assert.equal(
    scoreMix(
      game({ phase: "combat", wave: 1, enemies: [{ kind: "titan" }] }),
    )[2],
    1,
  );
  assert.equal(
    scoreMix(
      game({ phase: "combat", wave: 2, enemies: [{ kind: "sovereign" }] }),
    )[2],
    1,
  );
  assert.deepEqual(
    scoreMix({ ...first, speed: 1 }),
    scoreMix({ ...first, speed: 3 }),
  );
});
test("one lazy context starts three stems in sync and keeps mute/pause authoritative", async () => {
  const beforeContext = globalThis.AudioContext,
    beforeFetch = globalThis.fetch;
  const sources = [];
  let contexts = 0,
    requests = 0;
  const param = () => ({
    value: 0,
    cancelScheduledValues() {},
    setTargetAtTime(v) {
      this.value = v;
    },
  });
  const node = () => ({
    connect(other) {
      return other;
    },
    disconnect() {},
  });
  globalThis.AudioContext = class {
    constructor() {
      contexts++;
      this.currentTime = 1;
      this.state = "suspended";
      this.destination = node();
    }
    createGain() {
      return { ...node(), gain: param() };
    }
    createDynamicsCompressor() {
      return { ...node(), threshold: param(), knee: param(), ratio: param() };
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(24000) };
    }
    createBufferSource() {
      const s = {
        ...node(),
        start(t) {
          this.startedAt = t;
        },
      };
      sources.push(s);
      return s;
    }
    decodeAudioData() {
      return Promise.resolve({ duration: 48 });
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
    suspend() {
      this.state = "suspended";
      return Promise.resolve();
    }
  };
  globalThis.fetch = async () => {
    requests++;
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
  };
  try {
    const audio = new OrchestralAudio();
    assert.equal(contexts, 0);
    await Promise.all([audio.unlock(), audio.unlock()]);
    assert.equal(contexts, 1);
    assert.equal(requests, 3);
    assert.equal(sources.length, 3);
    assert.equal(new Set(sources.map((s) => s.startedAt)).size, 1);
    assert.ok(sources.every((s) => s.loop && s.loopEnd === SCORE_SECONDS));
    await audio.setEnabled(false);
    assert.equal(audio.master.gain.value, 0);
    await audio.setEnabled(true);
    assert.equal(sources.length, 3);
    audio.setScene(game({ paused: true }));
    assert.equal(audio.master.gain.value, 0);
    audio.setScene(game(), true);
    assert.equal(audio.master.gain.value, 0);
    audio.setScene(game());
    assert.ok(audio.master.gain.value > 0);
    clearTimeout(audio.suspendTimer);
  } finally {
    globalThis.AudioContext = beforeContext;
    globalThis.fetch = beforeFetch;
  }
});
