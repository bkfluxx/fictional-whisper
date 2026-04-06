"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EntryPane from "./EntryPane";

const MOOD_DOT: Record<string, string> = {
  great: "bg-emerald-500",
  good: "bg-indigo-500",
  okay: "bg-amber-400",
  tough: "bg-orange-500",
  awful: "bg-red-500",
};

export interface CategoryLabel {
  id: string;
  emoji: string;
  name: string;
}

export interface EntryListItem {
  id: string;
  title: string | null;
  preview: string;
  hasVoice: boolean;
  isVoiceOnly: boolean;
  mood: string | null;
  categoryLabels: CategoryLabel[];
  tags: { id: string; name: string }[];
}

export interface DayGroup {
  day: string;
  weekday: string;
  date: string;
  entries: EntryListItem[];
}

export default function JournalView({ days }: { days: DayGroup[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLarge, setIsLarge] = useState(false);

  useEffect(() => {
    const check = () => setIsLarge(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close pane when switching to a small screen
  useEffect(() => {
    if (!isLarge) setSelectedId(null);
  }, [isLarge]);

  function handleEntryClick(id: string) {
    if (isLarge) {
      setSelectedId((prev) => (prev === id ? null : id));
    } else {
      router.push(`/journal/${id}`);
    }
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Entry list ───────────────────────────────────────────── */}
      <div className={`overflow-y-auto px-6 py-0 shrink-0 ${selectedId ? "w-[380px]" : "flex-1"}`}>
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-base-content/15" />

          {days.map((dayGroup) => (
            <div key={dayGroup.day}>
              {/* Date marker */}
              <div className="flex items-center gap-2 py-2">
                <div className="flex w-8 shrink-0 justify-center">
                  <span className="relative z-10 flex size-3 items-center justify-center rounded-full bg-base-100 ring-1 ring-base-content/20">
                    <span className="size-1.5 rounded-full bg-base-content/40" />
                  </span>
                </div>
                <span className="text-xs font-semibold text-base-content/50">{dayGroup.weekday}</span>
                <span className="text-xs text-base-content/30">{dayGroup.date}</span>
              </div>

              {/* Entry cards */}
              {dayGroup.entries.map((e) => {
                const firstCat = e.categoryLabels[0];
                const dotColor = e.mood
                  ? (MOOD_DOT[e.mood] ?? "bg-primary")
                  : firstCat
                    ? "bg-primary"
                    : "bg-base-content/30";
                const isSelected = selectedId === e.id;

                return (
                  <div key={e.id} className="flex items-stretch gap-2 mb-2">
                    {/* Timeline dot — centred with the card */}
                    <div className="flex w-8 shrink-0 justify-center pt-3">
                      <span className="relative z-10 flex size-5 items-center justify-center rounded-full bg-base-100">
                        <span className={`size-2.5 rounded-sm ${dotColor}`} />
                      </span>
                    </div>

                    {/* Card */}
                    <div
                      onClick={() => handleEntryClick(e.id)}
                      className={`flex-1 rounded-xl border overflow-hidden cursor-pointer flex transition-colors ${
                        isSelected
                          ? "border-indigo-500/40 bg-indigo-950/20"
                          : "border-base-content/10 bg-base-200 hover:bg-base-content/8"
                      }`}
                    >
                      {/* Text content */}
                      <div className="flex-1 px-4 py-3 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-semibold text-base-content leading-snug">
                            {e.title ?? (
                              <span className="text-base-content/40 font-normal italic">Untitled</span>
                            )}
                          </span>
                          {firstCat && (
                            <span className="text-base leading-none mt-0.5 shrink-0">{firstCat.emoji}</span>
                          )}
                        </div>

                        {e.isVoiceOnly ? (
                          <p className="text-xs text-indigo-400/70 mt-1 italic">Voice note</p>
                        ) : e.preview ? (
                          <p className="text-xs text-base-content/50 mt-1 leading-relaxed line-clamp-2">
                            {e.preview}
                          </p>
                        ) : null}

                        {(e.categoryLabels.length > 0 || e.tags.length > 0 || e.mood) && (
                          <div className="flex gap-1 mt-2 flex-wrap items-center">
                            {e.mood && (
                              <span className="text-xs px-2 py-0.5 bg-base-content/10 text-base-content/60 rounded-full capitalize">
                                {e.mood}
                              </span>
                            )}
                            {e.categoryLabels.map((c) => (
                              <span key={c.id} className="text-xs px-2 py-0.5 bg-indigo-500/15 text-indigo-500 rounded-full">
                                {c.emoji} {c.name}
                              </span>
                            ))}
                            {e.tags.map((t) => (
                              <span key={t.id} className="text-xs px-2 py-0.5 bg-base-content/10 text-base-content/60 rounded-full">
                                #{t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Full-height mic strip */}
                      {e.hasVoice && (
                        <div className="w-10 shrink-0 flex items-center justify-center bg-indigo-500/10 border-l border-indigo-500/10">
                          <svg
                            className="w-4 h-4 text-indigo-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Reading pane ─────────────────────────────────────────── */}
      {selectedId && (
        <div className="flex-1 min-w-0 overflow-hidden">
          <EntryPane entryId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}
