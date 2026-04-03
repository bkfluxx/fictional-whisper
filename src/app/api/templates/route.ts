import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { BUILT_IN_TEMPLATES } from "@/lib/templates";

/**
 * GET /api/templates
 * Returns built-in template definitions, override rows keyed by builtinId,
 * and user-created templates.
 */
export async function GET() {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const dbTemplates = await prisma.journalTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });

  // Split into override rows and user-created rows
  const overrideRows = dbTemplates.filter((t) => t.builtinId !== null);
  const userTemplates = dbTemplates.filter((t) => t.builtinId === null);

  // Build a map: builtinId → override row
  const overrides: Record<string, typeof overrideRows[number]> = {};
  for (const row of overrideRows) {
    overrides[row.builtinId!] = row;
  }

  return NextResponse.json({
    builtIn: BUILT_IN_TEMPLATES,
    overrides,
    user: userTemplates,
  });
}

/**
 * POST /api/templates
 * Creates or updates a template.
 * - With builtinId: upserts an override row for a built-in template.
 * - Without builtinId: creates a new user template.
 */
export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const { title, description, emoji, body, categories, builtinId, hidden } =
    await req.json();

  // Upserting a built-in override
  if (builtinId) {
    const existing = await prisma.journalTemplate.findUnique({
      where: { builtinId },
    });
    const data = {
      title: title?.trim() ?? "",
      description: description?.trim() || null,
      emoji: emoji?.trim() || "📝",
      body: body?.trim() ?? "",
      categories: categories ?? [],
      hidden: hidden ?? false,
      updatedAt: new Date(),
    };
    let row;
    if (existing) {
      row = await prisma.journalTemplate.update({ where: { builtinId }, data });
    } else {
      row = await prisma.journalTemplate.create({
        data: { ...data, builtinId },
      });
    }
    return NextResponse.json(row, { status: 200 });
  }

  // Creating a new user template
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
