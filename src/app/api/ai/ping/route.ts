import { NextRequest, NextResponse } from "next/server";
import { isOllamaAvailable, listModels } from "@/lib/ollama";

/**
 * GET /api/ai/ping?url=<baseUrl>
 *
 * Public endpoint — no auth required. Used by the onboarding wizard to test
 * an Ollama URL before the user has a session with a loaded DEK.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url param required" }, { status: 400 });
  }

  const available = await isOllamaAvailable(url);
  const models = available ? await listModels(url).catch(() => []) : [];

  return NextResponse.json({ available, models });
}
