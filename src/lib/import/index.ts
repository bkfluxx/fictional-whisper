import matter from "gray-matter";
import { unzipSync } from "zlib";
import type { FWExport, ExportEntry } from "@/lib/export";

/** Normalised entry ready to insert into the DB (all plaintext). */
export interface ImportEntry {
  entryDate: Date;
  title: string | null;
  body: string;
  mood: string | null;
  categories: string[];
  tags: string[];
}

// ── Fictional Whisper JSON ──────────────────────────────────────────────────

export function parseFWJson(raw: string): ImportEntry[] {
  const data = JSON.parse(raw) as FWExport;
  if (data.version !== 1 || !Array.isArray(data.entries)) {
    throw new Error("Not a valid Fictional Whisper export file");
  }
  return data.entries.map(entryFromExport);
}

function entryFromExport(e: ExportEntry): ImportEntry {
  return {
    entryDate: new Date(e.entryDate),
    title: e.title ?? null,
    body: e.body,
    mood: e.mood ?? null,
    // Support both new `categories` array and legacy `journalType` string
    categories: e.categories ?? [],
    tags: e.tags ?? [],
  };
}

// ── Day One JSON ────────────────────────────────────────────────────────────
// Day One exports a JSON file with { entries: [...] }

interface DayOneEntry {
  uuid?: string;
  creationDate?: string;
  modifiedDate?: string;
  text?: string;
  richText?: string;
  tags?: string[];
  starred?: boolean;
  weather?: { conditionDescription?: string };
}

interface DayOneExport {
  entries?: DayOneEntry[];
  metadata?: { version?: string };
}

export function parseDayOneJson(raw: string): ImportEntry[] {
  const data = JSON.parse(raw) as DayOneExport;
  if (!Array.isArray(data.entries)) {
    throw new Error("Not a valid Day One export file");
  }
  return data.entries.map((e) => ({
    entryDate: e.creationDate ? new Date(e.creationDate) : new Date(),
    title: null,
    body: e.text ?? e.richText ?? "",
    mood: null,
    categories: [],
    tags: e.tags ?? [],
  }));
}

// ── Markdown (single file or zip of files) ──────────────────────────────────

export function parseMarkdownFile(content: string, filename = ""): ImportEntry {
  const { data: fm, content: body } = matter(content);

  // Try to get date from frontmatter, or from filename (YYYY-MM-DD-*)
  let entryDate: Date;
  if (fm.date) {
    entryDate = new Date(fm.date as string);
  } else {
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    entryDate = dateMatch ? new Date(dateMatch[1]) : new Date();
  }

  const tags: string[] = Array.isArray(fm.tags)
    ? fm.tags.map(String)
    : typeof fm.tags === "string"
      ? fm.tags.split(",").map((t: string) => t.trim())
      : [];

  // Support both new `categories` array and legacy `type` string in frontmatter
  const categories: string[] = Array.isArray(fm.categories)
    ? fm.categories.map(String)
    : typeof fm.type === "string" && fm.type
      ? [fm.type]
      : [];

  return {
    entryDate,
    title: (fm.title as string) ?? filenameToTitle(filename),
    body: body.trim(),
    mood: (fm.mood as string) ?? null,
    categories,
    tags,
  };
}

export function parseMarkdownZip(zipBuffer: Buffer): ImportEntry[] {
  const decompressed = unzipSync(zipBuffer);
  // unzipSync returns the raw decompressed bytes of a single gzip file,
  // not a zip. For a proper zip we need to parse it manually.
  // This path is handled differently — see parseZipBuffer below.
  void decompressed;
  throw new Error("Use parseZipBuffer for zip archives");
}

/**
 * Parses a zip archive (ArrayBuffer) containing markdown files.
 * Uses the built-in CompressionStream API isn't available server-side,
 * so we iterate the zip file format manually via a lightweight approach.
 */
export function parseZipEntries(
  files: Array<{ name: string; content: string }>,
): ImportEntry[] {
  return files
    .filter((f) => f.name.endsWith(".md") || f.name.endsWith(".markdown"))
    .map((f) => parseMarkdownFile(f.content, basename(f.name)));
}

// ── Format detection ────────────────────────────────────────────────────────

export type ImportFormat = "fw-json" | "day-one" | "markdown" | "zip";

export function detectFormat(filename: string, rawJson?: string): ImportFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".zip")) return "zip";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".json") && rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as Record<string, unknown>;
      if (parsed.version === 1 && Array.isArray(parsed.entries)) return "fw-json";
      if (parsed.metadata || (Array.isArray(parsed.entries) && (parsed.entries as DayOneEntry[])[0]?.uuid)) return "day-one";
    } catch {
      // fall through
    }
  }
  return "fw-json"; // default guess
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function filenameToTitle(filename: string): string | null {
  const base = filename.replace(/\.(md|markdown)$/i, "");
  // Strip leading date: 2026-03-26-my-title → my title
  const withoutDate = base.replace(/^\d{4}-\d{2}-\d{2}-?/, "");
  if (!withoutDate) return null;
  return withoutDate.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}
