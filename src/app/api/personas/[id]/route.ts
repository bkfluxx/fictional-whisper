/**
 * PUT    /api/personas/[id]  — update a custom persona
 * DELETE /api/personas/[id]  — delete a custom persona
 *
 * Built-in personas (id starts with "builtin:") cannot be modified here.
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (id.startsWith("builtin:")) {
    return NextResponse.json({ error: "Built-in personas cannot be edited" }, { status: 400 });
  }

  const { name, description, systemPrompt } = (await req.json()) as {
    name?: string;
    description?: string;
    systemPrompt?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!systemPrompt?.trim()) {
    return NextResponse.json({ error: "systemPrompt is required" }, { status: 400 });
  }

  const existing = await prisma.persona.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.persona.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      systemPrompt: systemPrompt.trim(),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ persona: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (id.startsWith("builtin:")) {
    return NextResponse.json({ error: "Built-in personas cannot be deleted" }, { status: 400 });
  }

  const existing = await prisma.persona.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.persona.delete({ where: { id } });

  // If this was the active persona, clear it
  await prisma.appSettings.updateMany({
    where: { id: "singleton", activePersonaId: id },
    data: { activePersonaId: null },
  });

  return NextResponse.json({ ok: true });
}
