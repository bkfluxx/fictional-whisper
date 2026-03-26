"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { DecryptedEntry, EntryPayload } from "@/types/entry";

const MarkdownEditor = dynamic(
  () => import("@/components/editor/MarkdownEditor"),
  { ssr: false },
);

type SaveState = "saved" | "saving" | "unsaved" | "error";

interface EntryFormProps {
  initial?: DecryptedEntry;
}

export default function EntryForm({ initial }: EntryFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState(
    initial?.tags.map((t) => t.name).join(", ") ?? "",
  );
  const [mood, setMood] = useState(initial?.mood ?? "");
  const [saveState, setSaveState] = useState<SaveState>(
    initial ? "saved" : "unsaved",
  );
  const entryIdRef = useRef<string | null>(initial?.id ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (currentBody: string, currentTitle: string, currentTags: string, currentMood: string) => {
      setSaveState("saving");
      const payload: EntryPayload = {
        title: currentTitle || undefined,
        body: currentBody,
        tags: currentTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        mood: currentMood || undefined,
      };

      try {
        const isNew = !entryIdRef.current;
        const res = await fetch(
          isNew
            ? "/api/entries"
            : `/api/entries/${entryIdRef.current}`,
          {
            method: isNew ? "POST" : "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        if (isNew) {
          entryIdRef.current = data.id;
          // Update URL without full navigation
          window.history.replaceState(null, "", `/journal/${data.id}/edit`);
        }

        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [],
  );

  // Debounced auto-save — fires 2 seconds after last keystroke
  const scheduleSave = useCallback(
    (b: string, t: string, tg: string, m: string) => {
      setSaveState("unsaved");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(b, t, tg, m), 2000);
    },
    [save],
  );

  // Keyboard shortcut: Cmd/Ctrl+S forces immediate save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        save(body, title, tags, mood);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save, body, title, tags, mood]);

  return (
    <div className="flex flex-col h-full px-6 py-4 gap-4">
      {/* Header row */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave(body, e.target.value, tags, mood);
          }}
          className="flex-1 bg-transparent text-2xl font-semibold text-white placeholder-neutral-600 focus:outline-none"
        />
        <span className="text-xs text-neutral-500 shrink-0">
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : saveState === "error"
                ? "Error saving"
                : "Unsaved"}
        </span>
      </div>

      {/* Metadata row */}
      <div className="flex gap-4 text-sm text-neutral-400">
        <input
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e) => {
            setTags(e.target.value);
            scheduleSave(body, title, e.target.value, mood);
          }}
          className="bg-transparent focus:outline-none flex-1 placeholder-neutral-600"
        />
        <select
          value={mood}
          onChange={(e) => {
            setMood(e.target.value);
            scheduleSave(body, title, tags, e.target.value);
          }}
          className="bg-neutral-900 text-neutral-400 text-sm rounded focus:outline-none"
        >
          <option value="">Mood</option>
          <option value="joyful">Joyful</option>
          <option value="content">Content</option>
          <option value="neutral">Neutral</option>
          <option value="reflective">Reflective</option>
          <option value="anxious">Anxious</option>
          <option value="frustrated">Frustrated</option>
          <option value="sad">Sad</option>
        </select>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <MarkdownEditor
          value={body}
          onChange={(v) => {
            setBody(v);
            scheduleSave(v, title, tags, mood);
          }}
          placeholder="Start writing…"
        />
      </div>
    </div>
  );
}
