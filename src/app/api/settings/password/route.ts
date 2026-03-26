import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDEK, setDEK } from "@/lib/session/dek-store";
import { deriveKEK, wrapDEK, unwrapDEK } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.jti) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dek = getDEK(session.jti);
  if (!dek) {
    return NextResponse.json({ error: "Session expired — please log in again" }, { status: 401 });
  }

  const { currentPassword, newPassword } = (await req.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both fields are required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const [user, keyStore] = await Promise.all([
    prisma.user.findFirst(),
    prisma.keyStore.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!user || !keyStore) {
    return NextResponse.json({ error: "Setup incomplete" }, { status: 500 });
  }

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // Derive current KEK and verify it decrypts to the same DEK as in the session
  const currentSalt = Buffer.from(keyStore.dekSalt, "base64");
  const currentKek = await deriveKEK(currentPassword, currentSalt);
  let unwrapped: Buffer;
  try {
    unwrapped = unwrapDEK(keyStore.encryptedDek, currentKek);
  } catch {
    return NextResponse.json({ error: "Key derivation failed — password mismatch" }, { status: 400 });
  }

  if (!unwrapped.equals(dek)) {
    return NextResponse.json({ error: "Key integrity check failed" }, { status: 400 });
  }

  // Derive new KEK with a fresh salt and re-wrap the DEK
  const newSalt = crypto.randomBytes(32);
  const newKek = await deriveKEK(newPassword, newSalt);
  const newEncryptedDek = wrapDEK(dek, newKek);

  // Re-wrap backup DEK if present
  let newBackupDek: string | null = keyStore.backupDek ?? null;
  const backupSecret = process.env.BACKUP_SECRET;
  if (backupSecret && keyStore.backupDek) {
    const backupKey = crypto.createHash("sha256").update(backupSecret).digest();
    newBackupDek = require("@/lib/crypto/aes").aesEncrypt(dek, backupKey).toString("base64");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.keyStore.update({
      where: { id: "singleton" },
      data: {
        encryptedDek: newEncryptedDek,
        dekSalt: newSalt.toString("base64"),
        ...(newBackupDek !== null ? { backupDek: newBackupDek } : {}),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    }),
  ]);

  // DEK itself is unchanged — session stays valid, just update store entry
  setDEK(session.jti, dek);

  return NextResponse.json({ ok: true });
}
