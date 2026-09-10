import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const source = readFileSync(
  new URL("../gold-alert-sw.js", import.meta.url),
  "utf8",
);
function setup() {
  const scope = "https://example.test/richdisk/global-shock-tracker/";
  const records = new Map();
  const notices = [];
  const listeners = {};
  const opened = [];
  let requests = 0;
  const cache = {
    match: async (key) =>
      records.has(key) ? new Response(records.get(key)) : undefined,
    put: async (key, response) => records.set(key, await response.text()),
    delete: async (key) => records.delete(key),
  };
  const payload = {
    status: "ok",
    fetchedAt: new Date().toISOString(),
    btc: {
      level: "buy",
      label: "관심",
      strength: 80,
      summary: "test",
      asOf: new Date().toISOString().slice(0, 10),
    },
  };
  const context = vm.createContext({
    URL,
    Response,
    AbortController,
    setTimeout,
    clearTimeout,
    caches: { open: async () => cache },
    fetch: async () => {
      requests++;
      return new Response(JSON.stringify(payload));
    },
    self: {
      registration: {
        scope,
        showNotification: async (...args) => notices.push(args),
      },
      location: { hostname: "example.test" },
      addEventListener: (name, fn) => {
        listeners[name] = fn;
      },
      clients: {
        matchAll: async () => [],
        openWindow: async (url) => opened.push(url),
      },
    },
  });
  vm.runInContext(source, context);
  const check = () => vm.runInContext('checkMarketSignal("btc")', context);
  return {
    scope,
    records,
    notices,
    listeners,
    opened,
    payload,
    check,
    requests: () => requests,
  };
}
test("disabled alert does not request data; enabled alert deduplicates with the page cache", async () => {
  const s = setup();
  await s.check();
  assert.equal(s.requests(), 0);
  s.records.set(s.scope + "__market_signal_alert_enabled__/btc", "on");
  await s.check();
  await s.check();
  assert.equal(s.notices.length, 1);
  s.records.delete(s.scope + "__market_signal_alert_state__/btc");
  await s.check();
  assert.equal(s.notices.length, 1, "14-day cooldown survives state reset");
});
test("stale observations never send current alerts", async () => {
  const s = setup();
  s.records.set(s.scope + "__market_signal_alert_enabled__/btc", "on");
  s.payload.btc.asOf = "2000-01-01";
  await s.check();
  assert.equal(s.notices.length, 0);
});
test("notification click cannot navigate outside the app scope", async () => {
  const s = setup();
  let pending;
  s.listeners.notificationclick({
    notification: { close() {}, data: { url: "https://unrelated.test/" } },
    waitUntil(p) {
      pending = p;
    },
  });
  await pending;
  assert.deepEqual(s.opened, [s.scope + "#gold-signal"]);
});
