"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EntryPane from "./EntryPane";
import CategoryIcon from "@/components/icons/CategoryIcon";
import { MoodFaceIcon } from "@/components/ui/MoodIcon";
import { getMoodLabel, getMoodBgClass, getMoodTextClass } from "@/lib/moods";

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
  isPrivate: boolean;
  entryType: string;
  time?: string;
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
      {/* ── Entry list ─────────────────────────────────────────────── */}
      <div className={`overflow-y-auto overscroll-y-contain shrink-0 ${selectedId ? "w-[380px]" : "flex-1"}`}>
        <div className="px-6 pb-8">
          {days.map((dayGroup, dayIdx) => (
            <div key={dayGroup.day} className={dayIdx === 0 ? "mb-1" : "pt-6 mb-1"}>
              {/* Date section header */}
              <div className="flex items-center gap-2 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground/45">
                  {dayGroup.weekday}
                </span>
                <span className="text-xs text-foreground/25">·</span>
                <span className="text-xs text-foreground/35">{dayGroup.date}</span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2.5">
                {dayGroup.entries.map((e, entryIdx) => {
                  const isFirst = dayIdx === 0 && entryIdx === 0;
                  const isSelected = selectedId === e.id;
                  const firstCat = e.categoryLabels[0];

                  // ── Mood snapshot card ──────────────────────────────────
                  if (e.entryType === "mood") {
                    return (
                      <div
                        key={e.id}
                        onClick={() => handleEntryClick(e.id)}
                        className={`rounded-xl border cursor-pointer flex items-center gap-3 px-4 py-3 transition-colors ${
                          isSelected
                            ? "border-primary/40 bg-primary/[0.05]"
                            : "border-border bg-card hover:bg-foreground/[0.03]"
                        }`}
                      >
                        {e.mood && (
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full font-medium ${getMoodBgClass(e.mood)} ${getMoodTextClass(e.mood)}`}
                          >
                            <MoodFaceIcon value={e.mood} size={14} />
                            {getMoodLabel(e.mood)}
                          </span>
                        )}
                        {e.time && <span className="text-xs text-foreground/30 ml-auto">{e.time}</span>}
                      </div>
                    );
                  }

                  // ── Regular journal card ────────────────────────────────
                  return (
                    <div
                      key={e.id}
                      onClick={() => handleEntryClick(e.id)}
                      className={`rounded-xl border overflow-hidden cursor-pointer flex transition-colors ${
                        isFirst
                          ? "border-transparent bg-surface-dark"
                          : isSelected
                          ? "border-primary/40 bg-primary/[0.05]"
                          : "border-border bg-card hover:bg-foreground/[0.03]"
                      }`}
                    >
                      {/* Text content */}
                      <div className="flex-1 px-5 py-4 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`text-sm font-semibold leading-snug ${e.isPrivate ? "blur-sm select-none" : ""} ${
                              isFirst ? "text-surface-dark-foreground" : "text-foreground"
                            }`}
                          >
                            {e.title ?? (
                              <span
                                className={`font-normal italic ${
                                  isFirst ? "text-surface-dark-foreground/40" : "text-foreground/40"
                                }`}
                              >
                                Untitled
                              </span>
                            )}
                          </span>
                          {e.isPrivate ? (
                            <svg
                              className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isFirst ? "text-surface-dark-foreground/50" : "text-foreground/40"}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                          ) : firstCat ? (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                isFirst
                                  ? "bg-surface-dark-foreground/15 text-surface-dark-foreground/70"
                                  : "bg-primary/10 text-primary/70"
                              }`}
                            >
                              {firstCat.name}
                            </span>
                          ) : null}
                        </div>

                        {e.isVoiceOnly ? (
                          <p
                            className={`text-xs mt-1.5 italic ${
                              isFirst ? "text-surface-dark-foreground/60" : "text-primary/70"
                            }`}
                          >
                            Voice note
                          </p>
                        ) : e.preview ? (
                          <p
                            className={`text-xs mt-1.5 leading-relaxed line-clamp-2 ${e.isPrivate ? "blur-sm select-none" : ""} ${
                              isFirst ? "text-surface-dark-foreground/60" : "text-foreground/50"
                            }`}
                          >
                            {e.preview}
                          </p>
                        ) : null}

                        {(e.categoryLabels.length > 0 || e.tags.length > 0 || e.mood) && (
                          <div className={`flex gap-1 mt-3 flex-wrap items-center ${e.isPrivate ? "blur-sm select-none" : ""}`}>
                            {e.mood && (
                              <span
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                  isFirst
                                    ? "bg-surface-dark-foreground/15 text-surface-dark-foreground/75"
                                    : `${getMoodBgClass(e.mood)} ${getMoodTextClass(e.mood)}`
                                }`}
                              >
                                <MoodFaceIcon value={e.mood} size={12} />
                                {getMoodLabel(e.mood)}
                              </span>
                            )}
                            {e.categoryLabels.map((c) => (
                              <span
                                key={c.id}
                                className={`inline-flex items-center gap-1 text-xs pl-1.5 pr-2 py-0.5 rounded-full ${
                                  isFirst
                                    ? "bg-surface-dark-foreground/15 text-surface-dark-foreground/75"
                                    : "bg-primary/15 text-primary"
                                }`}
                              >
                                <CategoryIcon id={c.id} className="w-3 h-3 shrink-0" />
                                {c.name}
                              </span>
                            ))}
                            {e.tags.map((t) => (
                              <span
                                key={t.id}
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  isFirst
                                    ? "bg-surface-dark-foreground/15 text-surface-dark-foreground/75"
                                    : "bg-tertiary/10 text-tertiary/80"
                                }`}
                              >
                                #{t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Full-height mic strip */}
                      {e.hasVoice && (
                        <div
                          className={`w-10 shrink-0 flex items-center justify-center border-l ${
                            isFirst
                              ? "bg-surface-dark-foreground/10 border-surface-dark-foreground/10"
                              : "bg-primary/10 border-primary/10"
                          }`}
                        >
                          <svg
                            className={`w-4 h-4 ${isFirst ? "text-surface-dark-foreground/60" : "text-primary"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Reading pane ───────────────────────────────────────────── */}
      {selectedId && (
        <div className="flex-1 min-w-0 overflow-hidden">
          <EntryPane entryId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}
