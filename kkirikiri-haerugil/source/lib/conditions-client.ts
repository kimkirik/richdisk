/** Shared validation for selected conditions and comparison rankings. */
export function validateConditions(value: unknown, location: string, date: string, now = Date.now()) {
  if (!value || typeof value !== "object") throw new Error("자료 형식 오류");
  const data = value as Record<string, unknown>;
  if (data.date !== date || data.locationId !== location || !data.sourceStatus || !Array.isArray(data.tides) || !data.weather) {
    throw new Error("요청한 날짜·장소와 응답 불일치");
  }
  const age = now - Date.parse(String(data.updatedAt));
  if (!Number.isFinite(age) || age < -60_000 || age > 10 * 60_000) throw new Error("오래된 자료입니다. 다시 조회해 주세요.");
}

export async function fetchConditions<T>(location: string, date: string, signal: AbortSignal, onProgress?: (data: T) => void): Promise<T> {
  const response = await fetch(`/api/conditions?location=${encodeURIComponent(location)}&date=${date}&basis=accuracy-v12${onProgress ? "&stream=1" : ""}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("자료 조회 실패");
  if (onProgress && response.headers.get("Content-Type")?.includes("application/x-ndjson") && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", final: T | undefined;
    try {
      while (true) {
        signal.throwIfAborted();
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        if (buffer.length > 256_000) throw new Error("자료 응답 크기 초과");
        const lines = buffer.split("\n"); buffer = lines.pop()!;
        for (const line of lines) {
          if (!line.trim()) continue;
          const message = JSON.parse(line) as { data?: unknown; complete?: boolean; error?: string };
          if (message.error) throw new Error(message.error);
          validateConditions(message.data, location, date);
          signal.throwIfAborted();
          if (message.complete) final = message.data as T;
          else onProgress(message.data as T);
        }
        if (done) break;
      }
      if (!final || buffer.trim()) throw new Error("자료 갱신이 중단되었습니다");
      return final;
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
  const data: unknown = await response.json();
  validateConditions(data, location, date);
  return data as T;
}

/** Keep only a small set of fresh comparison results in memory, never in localStorage. */
export function createComparisonCache<T>() {
  const values = new Map<string, { value: T; expires: number }>();
  return async (location: string, date: string, signal: AbortSignal): Promise<T> => {
    signal.throwIfAborted();
    const key = `${location}:${date}`;
    const cached = values.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    values.delete(key);
    const value = await fetchConditions<T>(location, date, signal);
    signal.throwIfAborted();
    const data = value as { updatedAt: string; sourceStatus: { tide: boolean; weather: boolean } };
    if (data.sourceStatus.tide && data.sourceStatus.weather) {
      values.set(key, { value, expires: Math.min(Date.now() + 2 * 60_000, Date.parse(data.updatedAt) + 5 * 60_000) });
      while (values.size > 60) values.delete(values.keys().next().value!);
    }
    return value;
  };
}

/** Start at most `concurrency` requests; cancelling a batch also discards queued work. */
export async function mapConcurrent<T, R>(items: readonly T[], concurrency: number, signal: AbortSignal, visit: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      signal.throwIfAborted();
      const index = next++;
      results[index] = await visit(items[index]);
    }
  }));
  signal.throwIfAborted();
  return results;
}
