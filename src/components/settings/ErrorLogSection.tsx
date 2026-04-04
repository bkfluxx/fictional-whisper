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
  if (!parsed) return <div className="text-base-content/40">{raw}</div>;

  const time = new Date(parsed.ts).toLocaleString();
  const isError = parsed.level === "error";

  return (
    <div className={`py-1 border-b border-base-200/50 last:border-0 ${isError ? "text-red-500 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
      <span className="text-base-content/30 mr-2 select-none">{time}</span>
      <span className="font-medium uppercase text-[10px] mr-2">{parsed.level}</span>
      <span>{parsed.msg}</span>
      {parsed.error && (
        <span className="text-base-content/50 ml-2">— {parsed.error}</span>
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
          className="btn btn-sm btn-outline"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download log
        </a>
        <button
          onClick={handleClear}
          disabled={clearing || isEmpty}
          className="btn btn-sm btn-ghost text-error disabled:opacity-40"
        >
          {clearing ? "Clearing…" : "Clear log"}
        </button>
        {preview && (
          <span className="text-xs text-base-content/40 ml-auto">
            {preview.total} {preview.total === 1 ? "entry" : "entries"}
            {preview.total > 200 && " (showing last 200)"}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-base-200 bg-base-200/30 p-3 font-mono text-xs leading-relaxed max-h-80 overflow-y-auto">
        {loading && (
          <div className="text-base-content/40">Loading…</div>
        )}
        {!loading && isEmpty && (
          <div className="text-base-content/40">No log entries.</div>
        )}
        {!loading && preview && preview.lines.map((line, i) => (
          <LogLine key={i} raw={line} />
        ))}
      </div>
    </div>
  );
}
