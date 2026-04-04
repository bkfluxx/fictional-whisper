"use client";

import { useEffect, useState, useCallback } from "react";

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
            className="flex items-center gap-2 bg-base-200/50 rounded-lg px-3 py-2"
          >
            <svg className="w-3.5 h-3.5 text-base-content/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>

            <audio
              src={`/api/entries/${entryId}/attachments/${note.id}`}
              controls
              className="h-8 flex-1 min-w-0"
            />

            <span className="text-xs text-base-content/30 shrink-0 hidden sm:block">{date}</span>

            {onTranscript && (
              <button
                onClick={() => transcribeNote(note.id)}
                disabled={transcribing === note.id}
                title="Transcribe and insert into entry"
                className="text-xs px-2 py-1 rounded text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {transcribing === note.id ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : "Transcribe"}
              </button>
            )}

            <button
              onClick={() => deleteNote(note.id)}
              title="Delete voice note"
              className="text-base-content/30 hover:text-red-400 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
