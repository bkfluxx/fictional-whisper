"use client";

import { useRef, useState } from "react";

type Status = "idle" | "uploading" | "done" | "error";

export default function ImportSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setStatus("uploading");
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Import failed");
      } else {
        setStatus("done");
        setResult(data);
      }
    } catch {
      setStatus("error");
      setError("Network error — please try again");
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          dragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-base-content/20 hover:border-base-content/40 bg-base-200/50"
        }`}
      >
        <svg className="w-8 h-8 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <div className="text-center">
          <p className="text-sm text-base-content/70">
            {status === "uploading" ? "Importing…" : "Drop file or click to browse"}
          </p>
          <p className="text-xs text-base-content/40 mt-0.5">
            .json (Fictional Whisper or Day One) · .md · .zip (Obsidian vault)
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.md,.markdown,.zip"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {/* Result */}
      {status === "done" && result && (
        <p className="text-sm text-emerald-500">
          ✓ Imported {result.imported} {result.imported === 1 ? "entry" : "entries"}
          {result.skipped > 0 && ` · ${result.skipped} skipped (empty)`}
        </p>
      )}
      {status === "error" && error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}
