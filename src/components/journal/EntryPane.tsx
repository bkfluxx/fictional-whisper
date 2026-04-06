"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getJournalType } from "@/lib/journal-types";
import VoiceNotesList from "@/components/entries/VoiceNotesList";
import type { DecryptedEntry } from "@/types/entry";

interface UserCat { id: string; name: string; emoji: string; }

interface Props {
  entryId: string;
  onClose: () => void;
}

export default function EntryPane({ entryId, onClose }: Props) {
  const [entry, setEntry] = useState<DecryptedEntry | null>(null);
  const [userCatMap, setUserCatMap] = useState<Map<string, UserCat>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: UserCat[]) => setUserCatMap(new Map(data.map((c) => [c.id, c]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setEntry(null);
    fetch(`/api/entries/${entryId}`)
      .then((r) => r.json())
      .then((data: DecryptedEntry) => { setEntry(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [entryId]);

  return (
    <div className="h-full flex flex-col overflow-hidden border-l border-base-content/10">
      {/* Pane header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-base-content/10 shrink-0">
        {entry && (
          <Link
            href={`/journal/${entryId}/edit`}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Edit →
          </Link>
        )}
        <span className="flex-1" />
        <button
          onClick={onClose}
          title="Close"
          className="p-1.5 rounded-lg text-base-content/30 hover:text-base-content hover:bg-base-content/8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Pane body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-base-content/30 text-sm">
            Loading…
          </div>
        ) : entry ? (
          <>
            <h2 className="text-xl font-semibold text-base-content mb-1">
              {entry.title ?? (
                <span className="text-base-content/40 italic font-normal">Untitled</span>
              )}
            </h2>
            <p className="text-sm text-base-content/40 mb-4">
              {new Date(entry.entryDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {entry.mood && ` · ${entry.mood}`}
            </p>

            {(entry.categories.length > 0 || entry.tags.length > 0) && (
              <div className="flex gap-1 mb-6 flex-wrap">
                {entry.categories.map((c) => {
                  const jt = getJournalType(c);
                  const uc = userCatMap.get(c);
                  const label = jt ? `${jt.emoji} ${jt.name}` : uc ? `${uc.emoji} ${uc.name}` : c;
                  return (
                    <span key={c} className="text-xs px-2 py-0.5 bg-indigo-950 text-indigo-400 rounded-full">
                      {label}
                    </span>
                  );
                })}
                {entry.tags.map((t) => (
                  <span key={t.id} className="text-xs px-2 py-0.5 bg-base-content/10 text-base-content/60 rounded-full">
                    #{t.name}
                  </span>
                ))}
              </div>
            )}

            <div
              className="fw-prose max-w-none"
              dangerouslySetInnerHTML={{ __html: entry.body }}
            />

            <div className="mt-8">
              <VoiceNotesList entryId={entry.id} refreshKey={0} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
