import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { BUILT_IN_TEMPLATES } from "@/lib/templates";

/** GET /api/templates — built-in templates + user-created templates */
export async function GET() {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const userTemplates = await prisma.journalTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    builtIn: BUILT_IN_TEMPLATES,
    user: userTemplates,
  });
}

/** POST /api/templates — create a user template */
export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const { title, description, emoji, body, categories } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const template = await prisma.journalTemplate.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      emoji: emoji?.trim() || "📝",
      body: body.trim(),
      categories: categories ?? [],
    },
  });

  return NextResponse.json(template, { status: 201 });
}
