"use client";

import { useState } from "react";

interface Digest {
  id: string;
  weekStart: string;
  content: string;
  entryCount: number;
  createdAt: string;
}

interface DigestSectionProps {
  /** Latest digest already fetched server-side (null if none yet) */
  initial: Digest | null;
  /** All digests fetched server-side */
  all: Digest[];
}

function formatWeek(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function DigestCard({ digest }: { digest: Digest }) {
  const [open, setOpen] = useState(false);
  const weekLabel = `Week of ${formatWeek(digest.weekStart)}`;

  return (
    <div className="border border-foreground/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-foreground/5 transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{weekLabel}</span>
        <span className="text-xs text-foreground/40">
          {digest.entryCount} {digest.entryCount === 1 ? "entry" : "entries"}{" "}
          <span className="ml-1">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-foreground/10">
          <pre className="whitespace-pre-wrap text-sm text-foreground/80 font-sans leading-relaxed">
            {digest.content}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function DigestSection({ initial, all }: DigestSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [latest, setLatest] = useState<Digest | null>(initial);
  const [history, setHistory] = useState<Digest[]>(all);
  const [error, setError] = useState<string | null>(null);
  const [includePrivate, setIncludePrivate] = useState(false);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includePrivate }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }
      if (!res.ok) {
        setError((data.error as string) ?? "Failed to generate digest");
        return;
      }
      if (data.skipped) {
        setError("No entries this week yet — write something first!");
        return;
      }
      const fresh: Digest = {
        id: crypto.randomUUID(),
        weekStart: data.weekStart as string,
        content: data.content as string,
        entryCount: data.entryCount as number,
        createdAt: new Date().toISOString(),
      };
      setLatest(fresh);
      // Replace existing entry for this week in history, or prepend
      setHistory((prev) => {
        const filtered = prev.filter((d) => d.weekStart !== data.weekStart);
        return [fresh, ...filtered];
      });
    } catch {
      setError("Something went wrong — is Ollama running?");
    } finally {
      setGenerating(false);
    }
  }

  // Determine if we have a digest for the current week
  const thisWeekStart = (() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    return d.toISOString().slice(0, 10);
  })();
  const hasThisWeek =
    latest?.weekStart.slice(0, 10) === thisWeekStart;

  const pastDigests = history.filter(
    (d) => d.weekStart.slice(0, 10) !== thisWeekStart,
  );

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest">
          Weekly digest
        </h2>
        <button
          onClick={generate}
          disabled={generating}
          className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "Generating…" : hasThisWeek ? "Regenerate" : "Generate this week"}
        </button>
      </div>

      <div className="flex items-center gap-2.5 mb-4">
        <button
          onClick={() => setIncludePrivate((v) => !v)}
          className={`relative inline-flex shrink-0 h-6 w-11 items-center rounded-full transition-colors ${
            includePrivate ? "bg-primary" : "bg-muted"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            includePrivate ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
        <span className="text-xs text-foreground/50">Include private entries</span>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
      )}

      {latest && hasThisWeek ? (
        <div className="bg-foreground/5 rounded-lg px-4 py-4 mb-4">
          <p className="text-xs text-foreground/40 mb-3">
            Week of {formatWeek(latest.weekStart)} · {latest.entryCount}{" "}
            {latest.entryCount === 1 ? "entry" : "entries"}
          </p>
          <pre className="whitespace-pre-wrap text-sm text-foreground/80 font-sans leading-relaxed">
            {latest.content}
          </pre>
        </div>
      ) : !generating ? (
        <p className="text-sm text-foreground/30 mb-4">
          No digest yet this week — click &ldquo;Generate this week&rdquo; to reflect on your entries.
        </p>
      ) : null}

      {pastDigests.length > 0 && (
        <>
          <p className="text-xs text-foreground/30 uppercase tracking-widest mb-2">
            Past digests
          </p>
          <div className="space-y-2">
            {pastDigests.map((d) => (
              <DigestCard key={d.id} digest={d} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
