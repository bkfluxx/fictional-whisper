import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { queryTokens } from "@/lib/search/hmac-index";

const BATCH_SIZE = 200;
const SNIPPET_LENGTH = 200;
const HMAC_THRESHOLD = 5000; // use HMAC index above this corpus size

interface SearchResult {
  id: string;
  title: string | null;
  entryDate: string;
  snippet: string;
}

/** POST /api/search  body: { query: string } */
export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const { query } = await req.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const totalCount = await prisma.entry.count();
  const results: SearchResult[] = [];

  if (totalCount > HMAC_THRESHOLD) {
    // Large corpus: use HMAC index to narrow candidates, then decrypt-confirm
    const candidateIds = await queryTokens(query, process.env.SEARCH_HMAC_SECRET!);
    if (!candidateIds || candidateIds.length === 0) {
      return NextResponse.json([]);
    }

    const entries = await prisma.entry.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, title: true, body: true, entryDate: true },
      orderBy: { entryDate: "desc" },
    });

    for (const e of entries) {
      const body = decryptString(e.body, dek);
      const snippet = extractSnippet(body, query);
      if (snippet !== null) {
        results.push({
          id: e.id,
          title: e.title ? decryptString(e.title, dek) : null,
          entryDate: e.entryDate.toISOString(),
          snippet,
        });
      }
    }
  } else {
    // Small corpus: full decrypt-then-scan in batches
    let skip = 0;
    while (true) {
      const batch = await prisma.entry.findMany({
        select: { id: true, title: true, body: true, entryDate: true },
        orderBy: { entryDate: "desc" },
        take: BATCH_SIZE,
        skip,
      });
      if (batch.length === 0) break;

      for (const e of batch) {
        const body = decryptString(e.body, dek);
        const snippet = extractSnippet(body, query);
        if (snippet !== null) {
          results.push({
            id: e.id,
            title: e.title ? decryptString(e.title, dek) : null,
            entryDate: e.entryDate.toISOString(),
            snippet,
          });
        }
      }

      skip += BATCH_SIZE;
    }
  }

  return NextResponse.json(results.slice(0, 50)); // cap at 50 results
}

/** Returns a ~200-char snippet around the first match, or null if no match. */
function extractSnippet(text: string, query: string): string | null {
  const lower = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lower.indexOf(lowerQuery);
  if (idx === -1) return null;

  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + SNIPPET_LENGTH - 80);
  const snippet = text.slice(start, end);
  return (start > 0 ? "…" : "") + snippet + (end < text.length ? "…" : "");
}
