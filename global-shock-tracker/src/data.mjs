// Boundary checks shared by the UI and regression tests. No investment rules here.
const DAY = 86400000;
export function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export async function fetchJson(
  url,
  { signal, timeoutMs = 25000, ...options } = {},
) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { Accept: "application/json", ...options.headers },
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        `데이터 연결 실패 (${response.status}). 잠시 후 다시 시도해주세요.`,
      );
    try {
      return await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new Error(
        "데이터 응답 형식이 올바르지 않습니다. 다시 시도해주세요.",
      );
    }
  } catch (error) {
    if (timedOut)
      throw new Error(
        "25초 안에 응답이 도착하지 않았습니다. 다시 시도해주세요.",
      );
    if (signal?.aborted) throw error;
    if (error instanceof TypeError)
      throw new Error("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export function validateSignals(payload) {
  if (payload?.status !== "ok")
    throw new Error("투자 신호를 불러오지 못했습니다.");
  for (const kind of ["gold", "btc", "cash"]) {
    const signal = payload[kind];
    const levels =
      kind === "cash"
        ? ["normal", "caution", "high", "cash-first"]
        : ["wait", "watch", "buy", "strong-buy"];
    if (
      !signal ||
      !validDate(signal.asOf) ||
      !levels.includes(signal.level) ||
      typeof signal.label !== "string" ||
      typeof signal.summary !== "string" ||
      !Number.isFinite(signal.strength) ||
      signal.strength < 0 ||
      signal.strength > 100 ||
      !Array.isArray(signal.factors) ||
      signal.factors.some((f) => !f || typeof f.label !== "string")
    ) {
      throw new Error(
        "일부 신호 데이터가 누락되었거나 올바르지 않습니다. 다시 시도해주세요.",
      );
    }
  }
  for (const kind of ["gold", "btc"]) {
    if (
      payload[kind].asset !== kind ||
      !["score", "priceUsd", "priceKrw", "dxy", "usdKrw"].every((key) =>
        Number.isFinite(payload[kind][key]),
      )
    )
      throw new Error("신호 기준 시세가 올바르지 않습니다. 다시 시도해주세요.");
  }
  if (
    !["sp500", "btcUsd", "vix", "dxy"].every((key) =>
      Number.isFinite(payload.cash.market?.[key]),
    )
  )
    throw new Error(
      "현금방어 기준 시세가 올바르지 않습니다. 다시 시도해주세요.",
    );
  if (!Number.isFinite(Date.parse(payload.fetchedAt)))
    throw new Error("신호 확인 시간을 확인할 수 없습니다.");
  return payload;
}
export function staleSignal(payload, now = Date.now()) {
  return (
    !payload ||
    now - Date.parse(payload.fetchedAt) > 30 * 60000 ||
    ["gold", "btc", "cash"].some(
      (k) =>
        !validDate(payload[k]?.asOf) ||
        now - Date.parse(`${payload[k].asOf}T23:59:59Z`) > 4 * DAY,
    )
  );
}
export function normalizeEvent(
  payload,
  { eventId, eventDate, windowId, ids, now = Date.now() },
) {
  if (
    !payload ||
    payload.eventId !== eventId ||
    payload.eventDate !== eventDate ||
    payload.window?.id !== windowId ||
    !Array.isArray(payload.series)
  ) {
    throw new Error(
      "요청한 사건·기간과 데이터 응답이 일치하지 않습니다. 다시 시도해주세요.",
    );
  }
  const elapsed = Math.floor((now - Date.parse(eventDate)) / DAY);
  const after = Number(windowId.split("-")[1]);
  const before = Number(windowId.split("-")[0]);
  return ids.map((id) => {
    const entry = payload.series.find((s) => s?.id === id);
    const unavailable = {
      id,
      status: "unavailable",
      points: [],
      summary: null,
    };
    if (
      entry?.status !== "ok" ||
      !Array.isArray(entry.points) ||
      !validDate(entry.baseDate) ||
      entry.baseDate >= eventDate
    )
      return unavailable;
    // Reject malformed points instead of plotting NaN or silently accepting a different date axis.
    if (
      entry.points.some(
        (p) =>
          !p ||
          !validDate(p.date) ||
          !Number.isFinite(p.day) ||
          !Number.isFinite(p.change) ||
          !Number.isFinite(p.value) ||
          p.value <= 0 ||
          Math.round((Date.parse(p.date) - Date.parse(eventDate)) / DAY) !==
            p.day,
      )
    )
      return unavailable;
    const points = [
      ...new Map(
        entry.points
          .filter((p) => p.day >= -before && p.day <= Math.min(after, elapsed))
          .map((p) => [p.date, p]),
      ).values(),
    ].sort((a, b) => a.day - b.day);
    if (!points.length) return unavailable;
    const post = points.filter((p) => p.day >= 0);
    const at = (day) =>
      elapsed < day || after < day
        ? null
        : (post.filter((p) => p.day <= day).at(-1) ?? null);
    return {
      ...entry,
      points,
      summary: {
        first: post[0] ?? null,
        d7: at(7),
        d30: at(30),
        d90: at(90),
        end: points.at(-1),
      },
    };
  });
}
export function formatChecked(value) {
  if (!Number.isFinite(Date.parse(value))) return "확인 시간 없음";
  return (
    new Intl.DateTimeFormat("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(new Date(value)) + " KST"
  );
}
export function safeStorage(storage) {
  const memory = new Map();
  return {
    getItem(key) {
      try {
        return storage().getItem(key);
      } catch {
        return memory.get(key) ?? null;
      }
    },
    setItem(key, value) {
      memory.set(key, String(value));
      try {
        storage().setItem(key, String(value));
      } catch {}
    },
    removeItem(key) {
      memory.delete(key);
      try {
        storage().removeItem(key);
      } catch {}
    },
  };
}
