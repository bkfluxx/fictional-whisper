/**
 * Short-lived in-memory store for two-step login challenge tokens.
 *
 * Flow:
 *   1. /api/auth/check-password verifies the password, derives the DEK,
 *      and calls createChallenge() → returns a single-use token.
 *   2. The login page passes that token (+ optional TOTP code) to NextAuth.
 *   3. authorize() calls peekChallenge() to validate, then invalidateChallenge()
 *      on success (or recordTotpFailure() on wrong code).
 *
 * Tokens expire after 5 minutes. After 3 wrong TOTP codes the challenge is
 * automatically invalidated and the user must restart from the password step.
 */

import crypto from "node:crypto";

interface Challenge {
  userId: string;
  dek: Buffer;
  requires2fa: boolean;
  expiresAt: number;
  totpAttempts: number;
}

const challenges = new Map<string, Challenge>();

// Purge expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of challenges) {
    if (v.expiresAt < now) challenges.delete(k);
  }
}, 60_000);

export function createChallenge(
  userId: string,
  dek: Buffer,
  requires2fa: boolean,
): string {
  const token = crypto.randomBytes(32).toString("hex");
  challenges.set(token, {
    userId,
    dek,
    requires2fa,
    expiresAt: Date.now() + 5 * 60 * 1000,
    totpAttempts: 0,
  });
  return token;
}

/** Returns the challenge without consuming it (allows TOTP retries). */
export function peekChallenge(token: string): Challenge | null {
  const c = challenges.get(token);
  if (!c || c.expiresAt < Date.now()) {
    challenges.delete(token);
    return null;
  }
  return c;
}

/** Permanently removes the challenge (call on success). */
export function invalidateChallenge(token: string): void {
  challenges.delete(token);
}

/**
 * Records a failed TOTP attempt.
 * Returns true if the challenge is now dead (>= 3 failures → auto-invalidated).
 */
export function recordTotpFailure(token: string): boolean {
  const c = challenges.get(token);
  if (!c) return true;
  c.totpAttempts += 1;
  if (c.totpAttempts >= 3) {
    challenges.delete(token);
    return true;
  }
  return false;
}
