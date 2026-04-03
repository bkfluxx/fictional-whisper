/**
 * GET   /api/settings/personas  — get personas feature settings
 * PATCH /api/settings/personas  — update personasEnabled and/or activePersonaId
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { personasEnabled: true, activePersonaId: true },
  });

  return NextResponse.json({
    personasEnabled: settings?.personasEnabled ?? false,
    activePersonaId: settings?.activePersonaId ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    personasEnabled?: boolean;
    activePersonaId?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.personasEnabled === "boolean") {
    data.personasEnabled = body.personasEnabled;
  }
  if ("activePersonaId" in body) {
    data.activePersonaId = body.activePersonaId ?? null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  return NextResponse.json({ ok: true });
}
