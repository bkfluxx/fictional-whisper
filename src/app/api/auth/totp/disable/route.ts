/**
 * POST /api/auth/totp/disable
 * Body: { code: string }
 *
 * Verifies the current TOTP code then clears the secret (disables 2FA).
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

  const { code } = (await req.json()) as { code?: string };
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
  });

  if (!user?.totpSecret) {
    return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
  }

  const valid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token: code.replace(/\s/g, ""),
    window: 1,
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId as string },
    data: { totpSecret: null },
  });

  return NextResponse.json({ ok: true });
}
