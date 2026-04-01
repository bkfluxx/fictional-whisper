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
    <div className="border border-base-content/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-base-content/5 transition-colors"
      >
        <span className="text-sm font-medium text-base-content">{weekLabel}</span>
        <span className="text-xs text-base-content/40">
          {digest.entryCount} {digest.entryCount === 1 ? "entry" : "entries"}{" "}
          <span className="ml-1">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-base-content/10">
          <pre className="whitespace-pre-wrap text-sm text-base-content/80 font-sans leading-relaxed">
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

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/digest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate digest");
        return;
      }
      if (data.skipped) {
        setError("No entries this week yet — write something first!");
        return;
      }
      const fresh: Digest = {
        id: crypto.randomUUID(),
        weekStart: data.weekStart,
        content: data.content,
        entryCount: data.entryCount,
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-widest">
          Weekly digest
        </h2>
        <button
          onClick={generate}
          disabled={generating}
          className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "Generating…" : hasThisWeek ? "Regenerate" : "Generate this week"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      {latest && hasThisWeek ? (
        <div className="bg-base-content/5 rounded-lg px-4 py-4 mb-4">
          <p className="text-xs text-base-content/40 mb-3">
            Week of {formatWeek(latest.weekStart)} · {latest.entryCount}{" "}
            {latest.entryCount === 1 ? "entry" : "entries"}
          </p>
          <pre className="whitespace-pre-wrap text-sm text-base-content/80 font-sans leading-relaxed">
            {latest.content}
          </pre>
        </div>
      ) : !generating ? (
        <p className="text-sm text-base-content/30 mb-4">
          No digest yet this week — click &ldquo;Generate this week&rdquo; to reflect on your entries.
        </p>
      ) : null}

      {pastDigests.length > 0 && (
        <>
          <p className="text-xs text-base-content/30 uppercase tracking-widest mb-2">
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
