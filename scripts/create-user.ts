#!/usr/bin/env tsx
/**
 * First-run setup script. Run once before starting the app:
 *   npx tsx scripts/create-user.ts
 *
 * This script:
 *   1. Prompts for a password (or reads from FW_PASSWORD env var for automation)
 *   2. Generates a random DEK salt
 *   3. Derives KEK = Argon2id(password, salt)
 *   4. Generates a random DEK
 *   5. Wraps DEK with KEK → stores in KeyStore
 *   6. If BACKUP_SECRET is set, also wraps DEK with it → stores as backupDek
 *   7. Hashes password with bcrypt → stores in User
 */

import crypto from "node:crypto";
import readline from "node:readline";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { deriveKEK, generateDEK, wrapDEK } from "../src/lib/crypto/index";
import { aesEncrypt } from "../src/lib/crypto/aes";

const prisma = new PrismaClient();

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const existing = await prisma.keyStore.findUnique({
    where: { id: "singleton" },
  });
  if (existing) {
    console.error(
      "A user already exists. To reset, wipe the database first (danger!).",
    );
    process.exit(1);
  }

  const password =
    process.env.FW_PASSWORD || (await prompt("Set master password: "));
  if (!password || password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  console.log("Deriving key (this may take a moment on slower hardware)…");

  const dekSalt = crypto.randomBytes(32);
  const kek = await deriveKEK(password, dekSalt);
  const dek = generateDEK();
  const encryptedDek = wrapDEK(dek, kek);

  // Optional backup DEK: wrap the DEK with BACKUP_SECRET so the cron job
  // can encrypt pg_dump output without needing the user to be logged in.
  let backupDek: string | null = null;
  const backupSecret = process.env.BACKUP_SECRET;
  if (backupSecret) {
    const backupKey = crypto
      .createHash("sha256")
      .update(backupSecret)
      .digest();
    backupDek = aesEncrypt(dek, backupKey).toString("base64");
    console.log("BACKUP_SECRET found — backup DEK stored.");
  } else {
    console.warn(
      "BACKUP_SECRET not set — scheduled backups will be unencrypted (not recommended).",
    );
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

  console.log("✓ User created. You can now start the app.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
