import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEvent,
  validateSignals,
  staleSignal,
  fetchJson,
  safeStorage,
  validDate,
} from "../src/data.mjs";
const point = (day, change = day) => ({
  day,
  change,
  value: 100 + change,
  date: new Date(Date.UTC(2026, 8, 1 + day)).toISOString().slice(0, 10),
});
const payload = (points) => ({
  eventId: "sample",
  eventDate: "2026-09-01",
  window: { id: "30-90" },
  series: [{ id: "btc", status: "ok", baseDate: "2026-08-31", points }],
});
const request = {
  eventId: "sample",
  eventDate: "2026-09-01",
  windowId: "30-90",
  ids: ["btc"],
  now: Date.parse("2026-09-10"),
};
test("a recent event does not claim future D+30/D+90 results", () => {
  const [s] = normalizeEvent(
    payload([point(-1), point(0), point(7), point(9)]),
    request,
  );
  assert.equal(s.summary.d7.day, 7);
  assert.equal(s.summary.d30, null);
  assert.equal(s.summary.d90, null);
});
test("historical checkpoints use actual trading dates", () => {
  const [s] = normalizeEvent(
    payload([point(-1), point(5), point(28), point(88)]),
    { ...request, now: Date.parse("2027-01-01") },
  );
  assert.equal(s.summary.d7.day, 5);
  assert.equal(s.summary.d30.day, 28);
  assert.equal(s.summary.d90.day, 88);
});
test("a mismatched event or window is rejected", () => {
  assert.throws(() =>
    normalizeEvent(payload([]), { ...request, eventId: "other" }),
  );
  assert.throws(() =>
    normalizeEvent(payload([]), { ...request, windowId: "90-180" }),
  );
});
test("bad numeric values, wrong day axes and missing assets are unavailable", () => {
  for (const p of [
    { ...point(1), change: NaN },
    { ...point(1), day: 7 },
    { ...point(1), value: null },
  ]) {
    assert.equal(
      normalizeEvent(payload([p]), request)[0].status,
      "unavailable",
    );
  }
  assert.equal(
    normalizeEvent(payload([point(1)]), { ...request, ids: ["gold"] })[0]
      .status,
    "unavailable",
  );
});
test("calendar validation rejects overflow dates", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
});
test("storage restrictions do not stop application startup", () => {
  const store = safeStorage(() => {
    throw Error("blocked");
  });
  store.setItem("a", "on");
  assert.equal(store.getItem("a"), "on");
  store.removeItem("a");
  assert.equal(store.getItem("a"), null);
});
test("incomplete signals fail clearly and old observations are stale", () => {
  assert.throws(() => validateSignals({ status: "ok" }));
  const s = {
    fetchedAt: "2026-09-10T00:00:00Z",
    gold: { asOf: "2026-09-10" },
    btc: { asOf: "2026-09-10" },
    cash: { asOf: "2026-09-01" },
  };
  assert.equal(staleSignal(s, Date.parse("2026-09-10T00:05Z")), true);
});
test("HTTP errors, malformed JSON, timeout during body and cancellation settle", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  await assert.rejects(fetchJson("https://example.test"), /503/);
  globalThis.fetch = async () => new Response("<html>");
  await assert.rejects(fetchJson("https://example.test"), /형식/);
  globalThis.fetch = async (_, { signal }) => ({
    ok: true,
    json: () =>
      new Promise((_, reject) => {
        if (signal.aborted) reject(signal.reason);
        else
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
      }),
  });
  await assert.rejects(
    fetchJson("https://example.test", { timeoutMs: 10 }),
    /응답/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    fetchJson("https://example.test", { signal: controller.signal }),
  );
});
