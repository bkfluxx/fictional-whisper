/**
 * POST /api/auth/totp/verify
 * Body: { code: string, secret: string }
 *
 * Verifies the TOTP code against the provided secret.
 * If valid, saves the secret to the User record (enabling 2FA).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import speakeasy from "speakeasy";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code, secret } = (await req.json()) as {
    code?: string;
    secret?: string;
  };

  if (!code || !secret) {
    return NextResponse.json(
      { error: "code and secret are required" },
      { status: 400 },
    );
  }

  const valid = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: code.replace(/\s/g, ""),
    window: 1,
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId as string },
    data: { totpSecret: secret },
  });

  return NextResponse.json({ ok: true });
}
