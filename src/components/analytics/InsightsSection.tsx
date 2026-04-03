"use client";

import { useState } from "react";

interface Insight {
  content: string;
  entryCount: number;
  rangeFrom: string;
  rangeTo: string;
  generatedAt: string;
}

interface InsightsSectionProps {
  initial: Insight | null;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function InsightsSection({ initial }: InsightsSectionProps) {
  const [insight, setInsight] = useState<Insight | null>(initial);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range state — defaults to last 30 days
  const [from, setFrom] = useState(
    initial ? initial.rangeFrom.slice(0, 10) : thirtyDaysAgoStr(),
  );
  const [to, setTo] = useState(
    initial ? initial.rangeTo.slice(0, 10) : todayStr(),
  );

  async function generate() {
    if (!from || !to) return;
    if (from > to) {
      setError("Start date must be before end date.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate insights");
        return;
      }
      if (data.skipped) {
        setError("No entries found in this date range — try a wider range.");
        return;
      }
      setInsight({
        content: data.content,
        entryCount: data.entryCount,
        rangeFrom: data.rangeFrom,
        rangeTo: data.rangeTo,
        generatedAt: data.generatedAt,
      });
    } catch {
      setError("Something went wrong — is Ollama running?");
    } finally {
      setGenerating(false);
    }
  }

  const hasResult = insight !== null;

  return (
    <section>
      {/* Date range + generate controls */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-5">
        <div className="flex items-end gap-2 flex-1">
          <div className="flex-1">
            <label className="block text-xs text-base-content/50 mb-1">From</label>
            <input
              type="date"
              value={from}
              max={to || todayStr()}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full text-sm bg-base-200 border border-base-content/10 rounded-lg px-3 py-2 text-base-content focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <span className="text-base-content/30 text-sm pb-2">→</span>
          <div className="flex-1">
            <label className="block text-xs text-base-content/50 mb-1">To</label>
            <input
              type="date"
              value={to}
              min={from}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value)}
              className="w-full text-sm bg-base-200 border border-base-content/10 rounded-lg px-3 py-2 text-base-content focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <button
          onClick={generate}
          disabled={generating || !from || !to}
          className="sm:mb-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          {generating
            ? "Generating…"
            : hasResult
              ? "Regenerate"
              : "Generate insights"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}

      {generating && (
        <div className="bg-base-content/5 rounded-lg px-4 py-6 text-center">
          <p className="text-sm text-base-content/40">
            Analysing your entries — this may take a minute…
          </p>
        </div>
      )}

      {!generating && hasResult && (
        <div className="bg-base-content/5 rounded-lg px-4 py-4">
          <p className="text-xs text-base-content/40 mb-3">
            {formatDate(insight.rangeFrom)} → {formatDate(insight.rangeTo)}{" "}
            · {insight.entryCount}{" "}
            {insight.entryCount === 1 ? "entry" : "entries"} analysed
          </p>
          <pre className="whitespace-pre-wrap text-sm text-base-content/80 font-sans leading-relaxed">
            {insight.content}
          </pre>
        </div>
      )}

      {!generating && !hasResult && (
        <p className="text-sm text-base-content/30">
          Select a date range and click &ldquo;Generate insights&rdquo; to discover patterns in your journaling.
        </p>
      )}
    </section>
  );
}
