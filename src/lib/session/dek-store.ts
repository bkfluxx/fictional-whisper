/**
 * Server-side in-memory DEK cache.
 *
 * The plaintext DEK lives here for the duration of a user session.
 * It is seeded at login and evicted when the session expires or the user logs out.
 *
 * Uses `global` as the backing store so that Next.js HMR in development
 * (which re-evaluates modules) does not wipe the cache between saves.
 *
 * IMPORTANT: This only works correctly with a single Node.js process.
 * If you ever run multiple replicas, replace this with a Redis-backed cache.
 */

interface CacheEntry {
  dek: Buffer;
  expiresAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __dekStore: Map<string, CacheEntry> | undefined;
}

const store: Map<string, CacheEntry> =
  global.__dekStore ?? (global.__dekStore = new Map());

// Purge expired entries every 15 minutes
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (entry.expiresAt < now) store.delete(key);
      }
    },
    15 * 60 * 1000,
  );
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — mirrors NextAuth maxAge

export function setDEK(sessionToken: string, dek: Buffer): void {
  store.set(sessionToken, { dek, expiresAt: Date.now() + SESSION_TTL_MS });
}

export function getDEK(sessionToken: string): Buffer | null {
  const entry = store.get(sessionToken);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(sessionToken);
    return null;
  }
  return entry.dek;
}

export function deleteDEK(sessionToken: string): void {
  store.delete(sessionToken);
}
