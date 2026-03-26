import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const STOP_WORDS = new Set([
  "the","and","for","are","but","not","you","all","any","can","had","her","was",
  "one","our","out","day","get","has","him","his","how","its","let","may","nor",
  "now","own","say","she","too","use","was","way","who","did","each","from","just",
  "know","like","long","make","many","more","most","much","must","name","only",
  "other","over","part","same","see","such","take","than","that","them","then",
  "there","they","this","time","two","very","well","were","what","when","which",
  "will","with","would","your",
]);

function tokenize(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w)),
  )];
}

function hmacToken(word: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(word).digest("hex");
}

/** Indexes all words in an entry's plaintext body as HMAC tokens. */
export async function indexEntry(
  entryId: string,
  plaintextBody: string,
  secret: string,
): Promise<void> {
  const words = tokenize(plaintextBody);
  if (words.length === 0) return;

  await prisma.searchToken.createMany({
    data: words.map((w) => ({
      entryId,
      token: hmacToken(w, secret),
    })),
    skipDuplicates: true,
  });
}

/** Deletes all search tokens for an entry (call before re-indexing). */
export async function deleteEntryTokens(entryId: string): Promise<void> {
  await prisma.searchToken.deleteMany({ where: { entryId } });
}

/**
 * Returns entry IDs that contain ALL of the query words (AND logic).
 * Returns null if the query is empty after tokenization.
 */
export async function queryTokens(
  query: string,
  secret: string,
): Promise<string[] | null> {
  const words = tokenize(query);
  if (words.length === 0) return null;

  const tokens = words.map((w) => hmacToken(w, secret));

  // For each token, get the set of matching entryIds, then intersect
  const sets = await Promise.all(
    tokens.map((token) =>
      prisma.searchToken
        .findMany({ where: { token }, select: { entryId: true } })
        .then((rows) => new Set(rows.map((r) => r.entryId))),
    ),
  );

  // Intersect all sets
  const [first, ...rest] = sets;
  const intersection = [...first].filter((id) => rest.every((s) => s.has(id)));
  return intersection;
}
