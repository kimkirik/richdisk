const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('phone requests stay on the private Mac origin, including file downloads', async () => {
  const calls = [];
  const context = {
    location: { origin: 'https://mac.example.ts.net', hostname: 'mac.example.ts.net', port: '' },
    AbortController, setTimeout, clearTimeout,
    fetch: async url => {
      calls.push(url);
      return { ok: true, json: async () => ({service: 'drum-score-engine', protocolVersion: 1}),
        blob: async () => 'wav' };
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../pro-client.js'), 'utf8'), context);
  await context.DrumPro.connect();
  await context.DrumPro.file('abc', 'drums.wav');
  assert.deepEqual(calls, ['https://mac.example.ts.net/api/health',
    'https://mac.example.ts.net/api/jobs/abc/files/drums.wav']);
});

const result = { schemaVersion: 1, duration: 8, bpm: 120, events: [
  { instrument: 'kick', time: 0.5, confidence: 0.8, velocity: 90 },
], beatTimes: [0.5, 1], warnings: [] };
const identifier = 'a'.repeat(32);
const completed = { state: 'completed', progress: 100, detail: 'done', result };
function client(handler, overrides = {}) {
  const calls = [];
  const context = {
    location: { origin: 'https://mac.example.ts.net' }, AbortController, FormData, Blob,
    crypto: { randomUUID: () => identifier },
    // Only polling delays are shortened; request timeout timers remain real.
    setTimeout: (fn, ms) => setTimeout(fn, ms < 10000 ? 0 : ms), clearTimeout,
    fetch: async (url, options) => {
      calls.push({ url, method: options.method || 'GET' });
      const data = await handler(url, options, calls);
      return { ok: !data.status, status: data.status, json: async () => data,
        blob: async () => new Blob(['wav']) };
    }, ...overrides,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../pro-client.js'), 'utf8'), context);
  return { api: context.DrumPro, calls };
}

test('reload resumes the recorded job without uploading or cancelling it', async () => {
  const { api, calls } = client(async () => completed);
  let recorded;
  const output = await api.analyze(null, { jobId: identifier }, () => {}, id => { recorded = id; });
  assert.equal(output.id, identifier);
  assert.equal(recorded, identifier);
  assert.ok(calls.every(call => call.method === 'GET'));
});

test('polling survives network loss and server errors without cancelling or duplicating work', async () => {
  const progress = [];
  const { api, calls } = client(async (_url, _options, history) => {
    if (history.length === 1) throw new TypeError('offline');
    if (history.length === 2) return { status: 503, detail: 'temporarily busy' };
    if (history.length === 3) return { state: 'running', progress: 40, detail: 'separating' };
    return completed;
  });
  const output = await api.monitor(identifier, (percent, detail) => progress.push({ percent, detail }));
  assert.equal(output.result, result);
  assert.equal(calls.length, 4);
  assert.ok(calls.every(call => call.method === 'GET'));
  assert.ok(progress.some(p => p.detail.includes('계속됩니다')));
});

test('lost upload response recovers the same id and submits only once', async () => {
  let saved = false;
  const { api, calls } = client(async (url, options) => {
    assert.ok(saved, 'job id must be persisted before POST');
    if (url.endsWith('/api/health')) return { service: 'drum-score-engine', protocolVersion: 1, resumableJobs: true };
    if (options.method === 'POST') {
      assert.equal(options.body.get('client_id'), identifier);
      throw new TypeError('lost response');
    }
    return completed;
  });
  const output = await api.analyze(new Blob(['audio']), { sensitivity: 62, inputIsDrums: false, bpm: null },
    () => {}, async id => { assert.equal(id, identifier); saved = true; });
  assert.equal(output.id, identifier);
  assert.equal(calls.filter(c => c.method === 'POST').length, 1);
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 0);
});

test('old engine can finish existing jobs but never receives a non-idempotent new upload during update', async () => {
  const { api, calls } = client(async () => ({ service: 'drum-score-engine', protocolVersion: 1 }));
  await assert.rejects(api.analyze(new Blob(['audio']), {}, () => {}, () => {}), e => e.status === 409);
  assert.ok(calls.every(call => call.method === 'GET'));
});

test('only explicit cancellation deletes a job', async () => {
  const { api, calls } = client(async () => ({ state: 'running' }));
  await assert.rejects(api.monitor(identifier, () => {}, () => true), e => e.jobState === 'cancelled');
  assert.deepEqual(calls.map(c => c.method), ['DELETE']);
});

test('cancel works while reconnecting to an old job and downloading a stem', async () => {
  let cancelled = false;
  const { api } = client(async () => { cancelled = true; throw new TypeError('offline'); });
  await assert.rejects(api.analyze(null, { jobId: identifier }, () => {}, () => {}, () => cancelled),
    e => e.jobState === 'cancelled');
  cancelled = false;
  await assert.rejects(api.file(identifier, 'drums.wav', () => {}, () => cancelled),
    e => e.jobState === 'cancelled');
});

test('returning from a hidden tab reads the existing job without any new submission', async () => {
  const doc = { hidden: true, addEventListener: (_name, fn) => {
    doc.hidden = false; setTimeout(fn, 0);
  }, removeEventListener() {} };
  const { api, calls } = client(async () => completed, { document: doc });
  await api.monitor(identifier, () => {});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
});
