/**
 * Simple in-process sliding-window rate limiter.
 * Used to protect the login route from brute-force attacks.
 * Single-user app — no Redis needed.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

// Clean up expired windows periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, w] of windows) {
    if (w.resetAt < now) windows.delete(key);
  }
}, WINDOW_MS);

/**
 * Returns true if the given key (e.g. IP address) has exceeded the limit.
 * Increments the counter on every call.
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const w = windows.get(key);

  if (!w || w.resetAt < now) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  w.count += 1;
  return w.count > MAX_ATTEMPTS;
}

/** Resets the counter for a key (call on successful login). */
export function resetRateLimit(key: string): void {
  windows.delete(key);
}
