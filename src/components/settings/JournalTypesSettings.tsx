"use client";

import { useState } from "react";
import { JOURNAL_TYPES, JOURNAL_TYPES_BY_CATEGORY, type JournalTypeId } from "@/lib/journal-types";

type Status = "idle" | "saving" | "success" | "error";

export default function JournalTypesSettings({ current }: { current: string[] }) {
  const [selected, setSelected] = useState<Set<JournalTypeId>>(
    new Set(current as JournalTypeId[]),
  );
  const [status, setStatus] = useState<Status>("idle");

  function toggle(id: JournalTypeId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (selected.size === 0) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalTypes: Array.from(selected) }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2000);
  }

  const categories = Object.entries(JOURNAL_TYPES_BY_CATEGORY);
  const hasChanges =
    selected.size !== current.length ||
    Array.from(selected).some((id) => !current.includes(id));

  return (
    <div className="space-y-6">
      {categories.map(([category, types]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2.5">
            {category}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {types.map((type) => {
              const isSelected = selected.has(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => toggle(type.id)}
                  className={`relative text-left rounded-xl p-3 border transition-all ${
                    isSelected
                      ? "bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/30"
                      : "bg-neutral-900 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                  )}
                  <div className="text-xl mb-1">{type.emoji}</div>
                  <div className="text-xs font-medium text-white leading-tight">{type.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={!hasChanges || selected.size === 0 || status === "saving"}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
        {status === "success" && (
          <span className="text-sm text-emerald-400">Saved — refresh to see updated sidebar</span>
        )}
        {status === "error" && (
          <span className="text-sm text-red-400">Something went wrong</span>
        )}
        {selected.size === 0 && (
          <span className="text-sm text-amber-500">Select at least one type</span>
        )}
      </div>
    </div>
  );
}
