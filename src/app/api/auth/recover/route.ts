/**
 * POST /api/auth/recover
 *
 * Unauthenticated. Accepts a recovery code + new password, re-derives the DEK
 * using the recovery KEK, re-wraps it with the new password KEK, and resets
 * the password hash. Also rotates the recovery code (old code is consumed).
 *
 * Body: { recoveryCode: string, newPassword: string }
 * Returns: { ok: true, recoveryCode: string } — the new recovery code, shown once
 */

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { deriveKEK, wrapDEK, unwrapDEK, generateRecoveryCode, normalizeRecoveryCode } from "@/lib/crypto";
import { aesEncrypt } from "@/lib/crypto/aes";
import { isRateLimited, resetRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for") ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait 15 minutes and try again." },
      { status: 429 },
    );
  }

  const { recoveryCode, newPassword } = (await req.json()) as {
    recoveryCode?: string;
    newPassword?: string;
  };

  if (!recoveryCode || !newPassword) {
    return NextResponse.json(
      { error: "recoveryCode and newPassword are required" },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 },
    );
  }

  // Normalise and validate the recovery code format
  let normalizedCode: string;
  try {
    normalizedCode = normalizeRecoveryCode(recoveryCode);
  } catch {
    return NextResponse.json({ error: "Invalid recovery code format" }, { status: 400 });
  }

  const [keyStore, user] = await Promise.all([
    prisma.keyStore.findUnique({ where: { id: "singleton" } }),
    prisma.user.findFirst(),
  ]);

  if (!keyStore || !user) {
    return NextResponse.json({ error: "Setup incomplete" }, { status: 500 });
  }

  if (!keyStore.recoveryDek || !keyStore.recoveryDekSalt) {
    return NextResponse.json(
      { error: "No recovery code was set up for this account. Use your master password to log in." },
      { status: 400 },
    );
  }

  // Derive recovery KEK and unwrap DEK
  const recoverySalt = Buffer.from(keyStore.recoveryDekSalt, "base64");
  const recoveryKek = await deriveKEK(normalizedCode, recoverySalt);

  let dek: Buffer;
  try {
    dek = unwrapDEK(keyStore.recoveryDek, recoveryKek);
  } catch {
    // Wrong code — auth tag will fail
    return NextResponse.json({ error: "Recovery code is incorrect" }, { status: 400 });
  }

  resetRateLimit(ip);

  // Wrap DEK with the new password
  const newSalt = crypto.randomBytes(32);
  const newKek = await deriveKEK(newPassword, newSalt);
  const newEncryptedDek = wrapDEK(dek, newKek);

  // Rotate recovery code — old code is consumed, a fresh one is issued
  const newRecoveryCode = generateRecoveryCode();
  const newNormalizedCode = normalizeRecoveryCode(newRecoveryCode);
  const newRecoveryDekSalt = crypto.randomBytes(32);
  const newRecoveryKek = await deriveKEK(newNormalizedCode, newRecoveryDekSalt);
  const newRecoveryDek = wrapDEK(dek, newRecoveryKek);

  // Re-wrap backup DEK if present
  let newBackupDek: string | null = keyStore.backupDek ?? null;
  const backupSecret = process.env.BACKUP_SECRET;
  if (backupSecret && keyStore.backupDek) {
    const backupKey = crypto.createHash("sha256").update(backupSecret).digest();
    newBackupDek = aesEncrypt(dek, backupKey).toString("base64");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.keyStore.update({
      where: { id: "singleton" },
      data: {
        encryptedDek: newEncryptedDek,
        dekSalt: newSalt.toString("base64"),
        recoveryDek: newRecoveryDek,
        recoveryDekSalt: newRecoveryDekSalt.toString("base64"),
        ...(newBackupDek !== null ? { backupDek: newBackupDek } : {}),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    }),
  ]);

  return NextResponse.json({ ok: true, recoveryCode: newRecoveryCode });
}
