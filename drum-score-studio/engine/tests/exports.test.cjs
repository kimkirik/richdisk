const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../../app.js"), "utf8").split('ui.audioFile.addEventListener("change"')[0];

function setup() {
  const context = { document: { querySelector: () => ({}), querySelectorAll: () => [] }, console, Blob };
  vm.createContext(context);
  vm.runInContext(source + '\ndownloadBlob = (blob) => { globalThis.captured = blob; };', context);
  return context;
}

test("large performance MIDI preserves all raw onsets and velocity without spread overflow", async () => {
  const context = setup();
  vm.runInContext(`state.bpm = 137.25;
    state.proResult = { events: Array.from({length: 30000}, (_, i) => ({
      time: .017 + i * .019, instrument: i % 2 ? "kick" : "snare", confidence: .8, velocity: 73
    })) }; exportMidi(true);`, context);
  const bytes = new Uint8Array(await context.captured.arrayBuffer());
  let index = 22, ticks = 0, count = 0, lastTime = 0;
  const tempo = Math.round(60000000 / 137.25);
  function variable() {
    let value = 0, byte;
    do { byte = bytes[index++]; value = (value << 7) | (byte & 0x7f); } while (byte & 0x80);
    return value;
  }
  while (index < bytes.length) {
    ticks += variable();
    const status = bytes[index++];
    if (status === 0xff) {
      index++;
      const length = variable();
      index += length;
    } else {
      const pitch = bytes[index++], velocity = bytes[index++];
      if (status === 0x99) {
        assert.equal(velocity, 73);
        assert.ok([36, 38].includes(pitch));
        lastTime = ticks / 480 * tempo / 1000000;
        assert.ok(Math.abs(lastTime - (.017 + count * .019)) < .001);
        count++;
      }
    }
  }
  assert.equal(count, 30000);
  assert.ok(lastTime > 569);
});

test("generic and specific drums have unique MusicXML instrument IDs", async () => {
  const context = setup();
  vm.runInContext('state.totalSteps = 16; addEvent(0, "tom"); addEvent(2, "tomMid"); addEvent(4, "cymbal"); addEvent(8, "crash"); exportMusicXml();', context);
  const xml = await context.captured.text();
  const ids = [...xml.matchAll(/<score-instrument id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of xml.matchAll(/<instrument id="([^"]+)"/g)) assert.ok(ids.includes(match[1]));
});
