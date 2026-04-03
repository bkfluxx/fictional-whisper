/**
 * GET  /api/personas  — list all personas (built-ins + custom)
 * POST /api/personas  — create a custom persona
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUILT_IN_PERSONAS } from "@/lib/personas";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const custom = await prisma.persona.findMany({ orderBy: { createdAt: "asc" } });

  return NextResponse.json({
    builtIn: BUILT_IN_PERSONAS,
    custom: custom.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      systemPrompt: p.systemPrompt,
      isBuiltIn: false,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const persona = await prisma.persona.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      systemPrompt: systemPrompt.trim(),
    },
  });

  return NextResponse.json({ persona }, { status: 201 });
}
