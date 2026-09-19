type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type PendingEntry = {
  promise: Promise<unknown>;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 30_000;
const MAX_ENTRIES = 500;

const store = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, PendingEntry>();

function now(): number {
  return Date.now();
}

function isExpired(entry: { expiresAt: number }): boolean {
  return entry.expiresAt <= now();
}

function sweep(): void {
  if (store.size < MAX_ENTRIES) return;
  for (const [key, entry] of Array.from(store.entries())) {
    if (isExpired(entry)) store.delete(key);
  }
  if (store.size >= MAX_ENTRIES) {
    let cursor = 0;
    for (const key of Array.from(store.keys())) {
      if (cursor++ < 50) store.delete(key);
      else break;
    }
  }
}

/**
 * Returns the cached value for `key` if it exists and has not expired.
 */
export function cacheGet<T>(key: string): T | undefined {
  sweep();
  const entry = store.get(key);
  if (!entry) return undefined;
  if (isExpired(entry)) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

/**
 * Stores `value` under `key` for `ttlMs` milliseconds.
 */
export function cacheSet<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): T {
  sweep();
  store.set(key, { value, expiresAt: now() + ttlMs });
  return value;
}

/**
 * Returns the cached value for `key`, or computes it with `factory` when missing.
 * Concurrent calls for the same key share a single in-flight promise so the
 * underlying work (e.g. database queries) runs only once.
 */
export async function cacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== undefined) return cached;

  const inflight = pending.get(key);
  if (inflight && !isExpired(inflight)) {
    return inflight.promise as Promise<T>;
  }

  const promise = (async () => {
    const value = await factory();
    store.set(key, { value, expiresAt: now() + ttlMs });
    pending.delete(key);
    return value;
  })().catch((error: unknown) => {
    pending.delete(key);
    throw error;
  });

  pending.set(key, { promise, expiresAt: now() + ttlMs });
  return promise;
}

/**
 * Removes every cache entry whose key starts with `prefix`.
 * Used to invalidate all read caches for a workspace after a mutation.
 */
export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Removes a single exact key from the cache.
 */
export function cacheInvalidateKey(key: string): void {
  store.delete(key);
}

/**
 * Clears the entire in-memory cache (e.g. used by tests).
 */
export function cacheClear(): void {
  store.clear();
  pending.clear();
}