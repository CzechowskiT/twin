type CacheEntry<T> = { at: number; value: T };

/**
 * Coalesces identical read-only requests within a short TTL window.
 * Used for public-health, OAuth ops flags, and dashboard module config.
 */
export function createRequestDeduper(defaultTtlMs = 30_000) {
  const inflight = new Map<string, Promise<unknown>>();
  const cache = new Map<string, CacheEntry<unknown>>();

  return function dedupe<T>(key: string, fn: () => Promise<T>, ttlMs = defaultTtlMs): Promise<T> {
    const now = Date.now();
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
