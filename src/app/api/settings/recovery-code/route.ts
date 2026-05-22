/**
 * POST /api/settings/recovery-code
 *
 * Session required. Verifies the current password, then generates a fresh
 * recovery code, re-wraps the DEK with it, and stores the result.
 * Returns the new code once — it is never stored in plaintext.
 *
 * Body: { currentPassword: string }
 * Returns: { recoveryCode: string }
 */

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDEK } from "@/lib/session/dek-store";
import { deriveKEK, wrapDEK, unwrapDEK, generateRecoveryCode, normalizeRecoveryCode } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.jti) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dek = getDEK(session.jti);
  if (!dek) {
    return NextResponse.json(
      { error: "Session expired — please log in again" },
      { status: 401 },
    );
  }

  const { currentPassword } = (await req.json()) as { currentPassword?: string };
  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required" }, { status: 400 });
  }

  const [user, keyStore] = await Promise.all([
    prisma.user.findFirst(),
    prisma.keyStore.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!user || !keyStore) {
    return NextResponse.json({ error: "Setup incomplete" }, { status: 500 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // Integrity check: re-derive KEK and verify it matches the session DEK
  const currentSalt = Buffer.from(keyStore.dekSalt, "base64");
  const currentKek = await deriveKEK(currentPassword, currentSalt);
  let unwrapped: Buffer;
  try {
    unwrapped = unwrapDEK(keyStore.encryptedDek, currentKek);
  } catch {
    return NextResponse.json({ error: "Key derivation failed" }, { status: 400 });
  }
  if (!unwrapped.equals(dek)) {
    return NextResponse.json({ error: "Key integrity check failed" }, { status: 400 });
  }

  // Generate new recovery code and wrap DEK with it
  const newRecoveryCode = generateRecoveryCode();
  const normalizedCode = normalizeRecoveryCode(newRecoveryCode);
  const newRecoveryDekSalt = crypto.randomBytes(32);
  const newRecoveryKek = await deriveKEK(normalizedCode, newRecoveryDekSalt);
  const newRecoveryDek = wrapDEK(dek, newRecoveryKek);

  await prisma.keyStore.update({
    where: { id: "singleton" },
    data: {
      recoveryDek: newRecoveryDek,
      recoveryDekSalt: newRecoveryDekSalt.toString("base64"),
    },
  });

  return NextResponse.json({ recoveryCode: newRecoveryCode });
}
