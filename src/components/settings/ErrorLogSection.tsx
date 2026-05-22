"use client";

import { useEffect, useState, useCallback } from "react";

interface LogPreview {
  lines: string[];
  total: number;
}

interface ParsedLine {
  ts: string;
  level: "error" | "warn";
  msg: string;
  error?: string;
  stack?: string;
}

function parseLine(raw: string): ParsedLine | null {
  try {
    return JSON.parse(raw) as ParsedLine;
  } catch {
    return null;
  }
}

function LogLine({ raw }: { raw: string }) {
  const parsed = parseLine(raw);
  if (!parsed) return <div className="text-foreground/40">{raw}</div>;

  const time = new Date(parsed.ts).toLocaleString();
  const isError = parsed.level === "error";

  return (
    <div className={`py-1 border-b border-border/50 last:border-0 ${isError ? "text-red-500 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
      <span className="text-foreground/30 mr-2 select-none">{time}</span>
      <span className="font-medium uppercase text-[10px] mr-2">{parsed.level}</span>
      <span>{parsed.msg}</span>
      {parsed.error && (
        <span className="text-foreground/50 ml-2">— {parsed.error}</span>
      )}
    </div>
  );
}

export default function ErrorLogSection() {
  const [preview, setPreview] = useState<LogPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logs?preview=1");
      if (res.ok) setPreview(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClear() {
    setClearing(true);
    try {
      await fetch("/api/logs", { method: "DELETE" });
      setPreview({ lines: [], total: 0 });
    } finally {
      setClearing(false);
    }
  }

  const isEmpty = !preview || preview.total === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <a
          href="/api/logs"
          download
          className="inline-flex items-center gap-1.5 h-8 px-3 bg-background border border-border text-foreground text-xs font-medium rounded-lg hover:bg-muted transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download log
        </a>
        <button
          onClick={handleClear}
          disabled={clearing || isEmpty}
          className="h-8 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40 rounded-lg transition-colors"
        >
          {clearing ? "Clearing…" : "Clear log"}
        </button>
        {preview && (
          <span className="text-xs text-foreground/40 ml-auto">
            {preview.total} {preview.total === 1 ? "entry" : "entries"}
            {preview.total > 200 && " (showing last 200)"}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card/30 p-3 font-mono text-xs leading-relaxed max-h-80 overflow-y-auto">
        {loading && (
          <div className="text-foreground/40">Loading…</div>
        )}
        {!loading && isEmpty && (
          <div className="text-foreground/40">No log entries.</div>
        )}
        {!loading && preview && preview.lines.map((line, i) => (
          <LogLine key={i} raw={line} />
        ))}
      </div>
    </div>
  );
}
