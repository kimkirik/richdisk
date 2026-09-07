/** Bounded, expiring values; concurrent misses share work without caching failures. */
export function createAsyncCache<T>(capacity: number, now = Date.now) {
  const values = new Map<string, { value: T; expires: number }>();
  const pending = new Map<string, { promise: Promise<T>; listeners: Set<(value: T) => void>; latest?: T }>();
  const notify = (listener: (value: T) => void, value: T) => { try { listener(value); } catch { /* A disconnected listener must not interrupt shared work. */ } };
  return {
    async get(key: string, load: (progress: (value: T) => void) => Promise<T>, lifetime: (value: T) => number, onProgress?: (value: T) => void) {
      const cached = values.get(key);
      if (cached && cached.expires > now()) {
        values.delete(key); values.set(key, cached);
        return { value: cached.value, status: "HIT" as const };
      }
      values.delete(key);
      const existing = pending.get(key);
      if (existing) {
        if (onProgress) {
          existing.listeners.add(onProgress);
          if (existing.latest !== undefined) notify(onProgress, existing.latest);
        }
        try { return { value: await existing.promise, status: "COALESCED" as const }; }
        finally { if (onProgress) existing.listeners.delete(onProgress); }
      }
      const listeners = new Set<(value: T) => void>();
      if (onProgress) listeners.add(onProgress);
      const job: { promise: Promise<T>; listeners: Set<(value: T) => void>; latest?: T } = {
        listeners,
        promise: Promise.resolve().then(() => load(value => {
          job.latest = value;
          for (const listener of listeners) notify(listener, value);
        })),
      };
      pending.set(key, job);
      try {
        const value = await job.promise;
        const ttl = lifetime(value);
        if (ttl > 0) {
          for (const [id, entry] of values) if (entry.expires <= now()) values.delete(id);
          values.set(key, { value, expires: now() + ttl });
          while (values.size > capacity) values.delete(values.keys().next().value!);
        }
        return { value, status: "MISS" as const };
      } finally {
        pending.delete(key);
      }
    },
  };
}
