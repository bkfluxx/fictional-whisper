"use client";

import { useState } from "react";

export default function ExportSection() {
  const [downloading, setDownloading] = useState<"json" | "markdown" | null>(null);

  async function download(format: "json" | "markdown") {
    setDownloading(format);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `export.${format === "markdown" ? "zip" : "json"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={() => download("json")}
        disabled={!!downloading}
        className="flex items-center gap-2 px-4 py-2.5 bg-base-200 hover:bg-base-content/10 disabled:opacity-50 border border-base-content/15 text-sm text-base-content rounded-lg transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {downloading === "json" ? "Exporting…" : "Export JSON"}
      </button>

      <button
        onClick={() => download("markdown")}
        disabled={!!downloading}
        className="flex items-center gap-2 px-4 py-2.5 bg-base-200 hover:bg-base-content/10 disabled:opacity-50 border border-base-content/15 text-sm text-base-content rounded-lg transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {downloading === "markdown" ? "Exporting…" : "Export Markdown (.zip)"}
      </button>

      <p className="text-xs text-base-content/40 self-center sm:ml-1">
        JSON re-imports here · Markdown imports into Obsidian
      </p>
    </div>
  );
}
