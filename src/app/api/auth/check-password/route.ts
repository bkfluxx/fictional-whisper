/**
 * POST /api/auth/check-password
 *
 * Step 1 of two-step login. Verifies the password and issues a short-lived
 * challenge token (5 min, single-use for success / 3-attempt limit for TOTP).
 *
 * Response:
 *   { requires2fa: boolean, challengeToken: string }
 *
 * The client then either calls signIn("credentials", { challengeToken })
 * directly (no 2FA) or shows the TOTP input and calls
 * signIn("credentials", { challengeToken, totpCode }).
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { deriveKEK, unwrapDEK } from "@/lib/crypto";
import { isRateLimited, resetRateLimit } from "@/lib/rate-limit";
import { createChallenge } from "@/lib/totp-challenge";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
  }

  const { password } = (await req.json()) as { password?: string };
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const [user, keyStore] = await Promise.all([
    prisma.user.findFirst(),
    prisma.keyStore.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!user || !keyStore) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Password is correct — clear the rate limit and derive DEK for step 2
  resetRateLimit(ip);

  const salt = Buffer.from(keyStore.dekSalt, "base64");
  const kek = await deriveKEK(password, salt);
  const dek = unwrapDEK(keyStore.encryptedDek, kek);

  const requires2fa = !!user.totpSecret;
  const challengeToken = createChallenge(user.id, dek, requires2fa);

  return NextResponse.json({ requires2fa, challengeToken });
}
