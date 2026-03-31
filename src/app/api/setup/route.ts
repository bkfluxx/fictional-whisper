/**
 * First-run setup endpoints. No authentication required — the user
 * does not yet exist when these are called.
 *
 * GET  /api/setup          → { configured: boolean }
 * POST /api/setup          → creates KeyStore + User + AppSettings, returns { ok: true }
 */

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { deriveKEK, generateDEK, wrapDEK } from "@/lib/crypto";
import { aesEncrypt } from "@/lib/crypto/aes";

export async function GET() {
  const existing = await prisma.keyStore.findUnique({
    where: { id: "singleton" },
    select: { id: true },
  });
  return NextResponse.json({ configured: !!existing });
}

export async function POST(req: NextRequest) {
  // Guard: one-time only
  const existing = await prisma.keyStore.findUnique({
    where: { id: "singleton" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Already configured" }, { status: 409 });
  }

  const { password } = (await req.json()) as { password?: string };
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  // Replicate scripts/create-user.ts key derivation
  const dekSalt = crypto.randomBytes(32);
  const kek = await deriveKEK(password, dekSalt);
  const dek = generateDEK();
  const encryptedDek = wrapDEK(dek, kek);

  // Wrap DEK with BACKUP_SECRET if configured
  let backupDek: string | null = null;
  const backupSecret = process.env.BACKUP_SECRET;
  if (backupSecret) {
    const backupKey = crypto.createHash("sha256").update(backupSecret).digest();
    backupDek = aesEncrypt(dek, backupKey).toString("base64");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.keyStore.create({
      data: {
        id: "singleton",
        encryptedDek,
        dekSalt: dekSalt.toString("base64"),
        backupDek,
      },
    }),
    prisma.user.create({ data: { passwordHash } }),
    prisma.appSettings.create({ data: { id: "singleton" } }),
  ]);

  return NextResponse.json({ ok: true });
}
