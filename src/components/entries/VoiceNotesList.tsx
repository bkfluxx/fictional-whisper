"use client";

import { useEffect, useState, useCallback } from "react";
import WaveformPlayer from "@/components/ui/WaveformPlayer";

interface VoiceNote {
  id: string;
  filename: string;
  mimeType: string;
  createdAt: string;
}

interface Props {
  entryId: string;
  refreshKey: number;
  onTranscript?: (text: string) => void;
}

export default function VoiceNotesList({ entryId, refreshKey, onTranscript }: Props) {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [transcribing, setTranscribing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/entries/${entryId}/attachments`);
      if (res.ok) setNotes(await res.json());
    } catch {
      // silent — list just stays empty
    }
  }, [entryId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function deleteNote(noteId: string) {
    await fetch(`/api/entries/${entryId}/attachments/${noteId}`, { method: "DELETE" });
    setNotes((n) => n.filter((x) => x.id !== noteId));
  }

  async function transcribeNote(noteId: string) {
    if (!onTranscript) return;
    setTranscribing(noteId);
    try {
      const audioRes = await fetch(`/api/entries/${entryId}/attachments/${noteId}`);
      const blob = await audioRes.blob();
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: formData });
      const data = await res.json() as { transcript?: string; error?: string };
      if (data.transcript) onTranscript(data.transcript);
    } finally {
      setTranscribing(null);
    }
  }

  if (!notes.length) return null;

  return (
    <div className="border-t border-base-content/10 pt-3 space-y-2">
      <p className="text-xs text-base-content/40 font-medium uppercase tracking-wider px-1">
        Voice notes
      </p>
      {notes.map((note) => {
        const date = new Date(note.createdAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <div
            key={note.id}
            className="space-y-1.5"
          >
            <WaveformPlayer
              src={`/api/entries/${entryId}/attachments/${note.id}`}
              className="w-full"
            />
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-base-content/30">{date}</span>

              <div className="flex items-center gap-3">
                {onTranscript && (
                  <button
                    onClick={() => transcribeNote(note.id)}
                    disabled={transcribing === note.id}
                    className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    {transcribing === note.id ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Transcribing…
                      </>
                    ) : "Transcribe"}
                  </button>
                )}
                <button
                  onClick={() => deleteNote(note.id)}
                  title="Delete voice note"
                  className="text-xs text-base-content/30 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
