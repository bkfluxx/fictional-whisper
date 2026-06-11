"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getJournalType } from "@/lib/journal-types";
import VoiceNotesList from "@/components/entries/VoiceNotesList";
import type { DecryptedEntry } from "@/types/entry";
import { Skeleton } from "@/components/ui/skeleton";
import { MoodPill, MoodFaceIcon } from "@/components/ui/MoodIcon";
import { getMoodLabel, getMoodGroup } from "@/lib/moods";

interface UserCat { id: string; name: string; emoji: string; }

interface Props {
  entryId: string;
  onClose: () => void;
}

export default function EntryPane({ entryId, onClose }: Props) {
  const router = useRouter();
  const [entry, setEntry] = useState<DecryptedEntry | null>(null);
  const [userCatMap, setUserCatMap] = useState<Map<string, UserCat>>(new Map());
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
    onClose();
    router.refresh();
  }

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: UserCat[]) => setUserCatMap(new Map(data.map((c) => [c.id, c]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setEntry(null);
    setRevealed(false);
    fetch(`/api/entries/${entryId}`)
      .then((r) => r.json())
      .then((data: DecryptedEntry) => { setEntry(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [entryId]);

  return (
    <div className="h-full flex flex-col overflow-hidden border-l border-foreground/10">
      {/* Pane header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10 shrink-0">
        {entry && entry.entryType === "mood" ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-foreground/30 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        ) : entry ? (
          <Link
            href={`/journal/${entryId}/edit`}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Edit →
          </Link>
        ) : null}
        <span className="flex-1" />
        <button
          onClick={onClose}
          title="Close"
          className="p-1.5 rounded-lg text-foreground/30 hover:text-foreground hover:bg-foreground/8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Pane body */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain px-6 py-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <div className="space-y-2 mt-6">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ) : entry ? (
          entry.entryType === "mood" ? (
            /* ── Mood snapshot view ── */
            (() => {
              const moodGroup = entry.mood ? getMoodGroup(entry.mood) : null;
              return (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {entry.mood && moodGroup && (
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${moodGroup.colorClass}`}>
                      <MoodFaceIcon value={entry.mood} size={44} className={moodGroup.textClass} />
                    </div>
                  )}
                  <h2 className="text-xl font-semibold text-foreground capitalize mb-1">
                    {entry.mood ? getMoodLabel(entry.mood) : "Unknown"}
                  </h2>
                  <p className="text-sm text-foreground/40">
                    {new Date(entry.entryDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-xs text-foreground/30 mt-0.5">
                    Logged at {new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              );
            })()
          ) : (
          <>
            <p className="text-sm text-foreground/40 mb-4">
              {new Date(entry.entryDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {entry.mood && <MoodPill value={entry.mood} className="mt-1.5" />}

            {(entry.categories.length > 0 || entry.tags.length > 0) && (
              <div className="flex gap-1 mb-6 flex-wrap">
                {entry.categories.map((c) => {
                  const jt = getJournalType(c);
                  const uc = userCatMap.get(c);
                  const label = jt ? jt.name : uc ? uc.name : c;
                  return (
                    <span key={c} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      {label}
                    </span>
                  );
                })}
                {entry.tags.map((t) => (
                  <span key={t.id} className="text-xs px-2 py-0.5 bg-foreground/10 text-foreground/60 rounded-full">
                    #{t.name}
                  </span>
                ))}
              </div>
            )}

            {entry.isPrivate && !revealed ? (
              <div className="relative rounded-xl overflow-hidden">
                <div className="blur-md select-none pointer-events-none">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {entry.title ?? <span className="text-foreground/40 italic font-normal">Untitled</span>}
                  </h2>
                  <div className="fw-prose max-w-none" dangerouslySetInnerHTML={{ __html: entry.body }} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => setRevealed(true)}
                    className="bg-card border border-border shadow-md px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 text-foreground"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    Reveal entry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {entry.title ?? <span className="text-foreground/40 italic font-normal">Untitled</span>}
                </h2>
                <div
                  className="fw-prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: entry.body }}
                />
              </>
            )}

            <div className="mt-8">
              <VoiceNotesList entryId={entry.id} refreshKey={0} />
            </div>
          </>
          )
        ) : null}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6 animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" className="bg-card border border-foreground/15 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <p className="text-sm font-medium text-foreground mb-1">Delete this entry?</p>
            <p className="text-xs text-foreground/50 mb-5">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 text-sm py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 text-sm py-2 bg-foreground/8 hover:bg-foreground/15 text-foreground rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
