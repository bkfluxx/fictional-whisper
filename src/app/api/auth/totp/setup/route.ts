/**
 * GET  /api/auth/totp/setup  — returns { enabled: boolean }
 * POST /api/auth/totp/setup  — generates a new TOTP secret and QR code data URL
 *                              Does NOT save the secret yet; call /verify to confirm.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId as string } });
  return NextResponse.json({ enabled: !!user?.totpSecret });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generated = speakeasy.generateSecret({ length: 20, name: "Aura" });
  const secret = generated.base32;
  const otpauthUrl = generated.otpauth_url ?? speakeasy.otpauthURL({ secret, label: "Aura", encoding: "base32" });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 200 });

  return NextResponse.json({ secret, qrDataUrl });
}
