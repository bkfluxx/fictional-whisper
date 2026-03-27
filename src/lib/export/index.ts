import archiver from "archiver";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";

export interface ExportEntry {
  id: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  body: string;
  mood: string | null;
  categories: string[];
  tags: string[];
}

export interface FWExport {
  version: 1;
  exportedAt: string;
  entries: ExportEntry[];
}

/** Decrypt all entries and return them as plain objects. */
async function decryptAllEntries(dek: Buffer): Promise<ExportEntry[]> {
  const rows = await prisma.entry.findMany({
    include: { tags: { select: { name: true } } },
    orderBy: { entryDate: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    entryDate: row.entryDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    title: row.title ? decryptString(row.title, dek) : null,
    body: decryptString(row.body, dek),
    mood: row.mood,
    categories: row.categories,
    tags: row.tags.map((t) => t.name),
  }));
}

/** Returns a JSON Buffer containing all entries in the FW export format. */
export async function exportJSON(dek: Buffer): Promise<Buffer> {
  const entries = await decryptAllEntries(dek);
  const payload: FWExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
  };
  return Buffer.from(JSON.stringify(payload, null, 2), "utf8");
}

/**
 * Returns a zip Buffer containing one Markdown file per entry.
 * Files are named YYYY-MM-DD-<slug>.md and include YAML frontmatter.
 * Compatible with Obsidian vault import.
 */
export async function exportMarkdownZip(dek: Buffer): Promise<Buffer> {
  const entries = await decryptAllEntries(dek);

  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 6 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    for (const entry of entries) {
      const date = entry.entryDate.slice(0, 10); // YYYY-MM-DD
      const slug = slugify(entry.title ?? "entry");
      const filename = `${date}-${slug}.md`;
      const content = buildMarkdownFile(entry);
      archive.append(content, { name: filename });
    }

    archive.finalize();
  });
}

function buildMarkdownFile(entry: ExportEntry): string {
  const fm: Record<string, unknown> = {
    id: entry.id,
    date: entry.entryDate.slice(0, 10),
    created: entry.createdAt,
    updated: entry.updatedAt,
  };
  if (entry.title) fm.title = entry.title;
  if (entry.mood) fm.mood = entry.mood;
  if (entry.categories.length) fm.categories = entry.categories;
  if (entry.tags.length) fm.tags = entry.tags;

  const frontmatter = Object.entries(fm)
    .map(([k, v]) =>
      Array.isArray(v)
        ? `${k}: [${(v as string[]).map((s) => `"${s}"`).join(", ")}]`
        : `${k}: ${JSON.stringify(v)}`,
    )
    .join("\n");

  return `---\n${frontmatter}\n---\n\n${entry.body}\n`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "entry";
}
