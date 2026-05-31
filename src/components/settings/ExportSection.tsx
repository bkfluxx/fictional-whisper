"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function ExportSection() {
  const [downloading, setDownloading] = useState<"json" | "markdown" | null>(null);

  async function download(format: "json" | "markdown") {
    const id = toast.loading(`Exporting ${format.toUpperCase()}…`);
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
      toast.success("Export downloaded", { id });
    } catch {
      toast.error("Export failed — please try again", { id });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => download("json")}
          disabled={!!downloading}
          className="flex items-center gap-2 px-4 py-2.5 bg-card hover:bg-foreground/10 disabled:opacity-50 border border-foreground/15 text-sm text-foreground rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {downloading === "json" ? "Exporting…" : "Export JSON"}
        </button>

        <button
          onClick={() => download("markdown")}
          disabled={!!downloading}
          className="flex items-center gap-2 px-4 py-2.5 bg-card hover:bg-foreground/10 disabled:opacity-50 border border-foreground/15 text-sm text-foreground rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {downloading === "markdown" ? "Exporting…" : "Export Markdown (.zip)"}
        </button>
      </div>

      <p className="text-xs text-foreground/40">
        JSON re-imports here · Markdown imports into Obsidian
      </p>

      <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
        <svg className="w-3.5 h-3.5 text-amber-500/70 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/70 leading-relaxed">
          Exported files contain your journal entries as <strong>unencrypted plain text</strong>. Store them securely and avoid sharing them.
        </p>
      </div>
    </div>
  );
}
