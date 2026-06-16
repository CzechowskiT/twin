type CacheEntry<T> = { at: number; value: T };

export type RequestDeduperOptions = {
  defaultTtlMs?: number;
  /** Evict oldest entries when cache grows past this limit (prevents unbounded Map growth). */
  maxCacheEntries?: number;
};

/**
 * Coalesces identical read-only requests within a short TTL window.
 * Used for public-health, OAuth ops flags, and dashboard module config.
 */
export function createRequestDeduper(
  defaultTtlMs = 30_000,
  maxCacheEntries = 64,
) {
  const inflight = new Map<string, Promise<unknown>>();
  const cache = new Map<string, CacheEntry<unknown>>();

  function evictStale(now: number, ttlMs: number) {
    for (const [key, entry] of cache) {
      if (now - entry.at >= ttlMs) {
        cache.delete(key);
      }
    }
  }

  function trimToMax() {
    while (cache.size > maxCacheEntries) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }

  return function dedupe<T>(key: string, fn: () => Promise<T>, ttlMs = defaultTtlMs): Promise<T> {
    const now = Date.now();
    evictStale(now, ttlMs);

    const hit = cache.get(key);
    if (hit && now - hit.at < ttlMs) {
      return Promise.resolve(hit.value as T);
    }

    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = fn()
      .then((value) => {
        cache.set(key, { at: Date.now(), value });
        inflight.delete(key);
        evictStale(Date.now(), ttlMs);
        trimToMax();
        return value;
      })
      .catch((err) => {
        inflight.delete(key);
        throw err;
      });

    inflight.set(key, promise);
    return promise;
  };
}
