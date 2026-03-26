"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  title: string | null;
  entryDate: string;
  snippet: string;
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data: SearchResult[] = await res.json();
      setResults(data);
      setOpen(true);
      setSelectedIdx(-1);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      e.preventDefault();
      navigate(results[selectedIdx].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function navigate(id: string) {
    setQuery("");
    setOpen(false);
    setResults([]);
    router.push(`/journal/${id}`);
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search entries…"
          className="w-full pl-8 pr-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {loading && (
          <div className="absolute right-2.5 top-2.5 h-3.5 w-3.5 border-2 border-neutral-600 border-t-indigo-400 rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl overflow-hidden">
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => navigate(r.id)}
              className={`w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors border-b border-neutral-800 last:border-0 ${
                i === selectedIdx ? "bg-neutral-800" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="text-sm font-medium text-white truncate">
                  {r.title ?? <span className="text-neutral-500 italic">Untitled</span>}
                </span>
                <span className="text-xs text-neutral-500 shrink-0">
                  {new Date(r.entryDate).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-xs text-neutral-400 line-clamp-2 leading-5">{r.snippet}</p>
            </button>
          ))}
        </div>
      )}

      {open && query && results.length === 0 && !loading && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl px-4 py-3 text-sm text-neutral-500">
          No entries found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
