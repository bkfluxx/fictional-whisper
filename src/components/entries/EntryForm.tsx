"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { DecryptedEntry, EntryPayload } from "@/types/entry";
import { JOURNAL_TYPES } from "@/lib/journal-types";
import AiPanel from "./AiPanel";

const MarkdownEditor = dynamic(
  () => import("@/components/editor/MarkdownEditor"),
  { ssr: false },
);

type SaveState = "saved" | "saving" | "unsaved" | "error";

interface EntryFormProps {
  initial?: DecryptedEntry;
  initialBody?: string;
  initialCategories?: string[];
}

export default function EntryForm({ initial, initialBody, initialCategories }: EntryFormProps) {
  const _router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? initialBody ?? "");
  const [tags, setTags] = useState(
    initial?.tags.map((t) => t.name).join(", ") ?? "",
  );
  const [mood, setMood] = useState(initial?.mood ?? "");
  const [categories, setCategories] = useState<string[]>(
    initial?.categories ?? initialCategories ?? [],
  );
  const [saveState, setSaveState] = useState<SaveState>(
    initial ? "saved" : "unsaved",
  );
  const [aiOpen, setAiOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const entryIdRef = useRef<string | null>(initial?.id ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const save = useCallback(
    async (
      currentBody: string,
      currentTitle: string,
      currentTags: string,
      currentMood: string,
      currentCategories: string[],
    ) => {
      setSaveState("saving");
      const payload: EntryPayload = {
        title: currentTitle || undefined,
        body: currentBody,
        tags: currentTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        mood: currentMood || undefined,
        categories: currentCategories,
      };

      try {
        const isNew = !entryIdRef.current;
        const res = await fetch(
          isNew ? "/api/entries" : `/api/entries/${entryIdRef.current}`,
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
          window.history.replaceState(null, "", `/journal/${data.id}/edit`);
        }

        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [],
  );

  const scheduleSave = useCallback(
    (b: string, t: string, tg: string, m: string, cats: string[]) => {
      setSaveState("unsaved");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(b, t, tg, m, cats), 2000);
    },
    [save],
  );

  function toggleCategory(id: string) {
    const next = categories.includes(id)
      ? categories.filter((c) => c !== id)
      : [...categories, id];
    setCategories(next);
    scheduleSave(body, title, tags, mood, next);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        save(body, title, tags, mood, categories);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save, body, title, tags, mood, categories]);

  return (
    <div className="flex h-full">
      {/* Main editor column */}
      <div className="flex flex-col flex-1 min-w-0 px-6 py-4 gap-4">
        {/* Header row */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave(body, e.target.value, tags, mood, categories);
            }}
            className="flex-1 bg-transparent text-2xl font-semibold text-base-content placeholder-base-content/30 focus:outline-none"
          />
          <span className="text-xs text-base-content/40 shrink-0">
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : saveState === "error"
                  ? "Error saving"
                  : "Unsaved"}
          </span>
          {/* AI panel toggle */}
          <button
            onClick={() => setAiOpen((o) => !o)}
            title="AI assistant"
            className={`shrink-0 p-1.5 rounded-lg transition-colors ${
              aiOpen
                ? "bg-indigo-600 text-white"
                : "text-base-content/40 hover:text-base-content/80 hover:bg-base-content/8"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
              />
            </svg>
          </button>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-3 text-sm text-base-content/60">
          <input
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => {
              setTags(e.target.value);
              scheduleSave(body, title, e.target.value, mood, categories);
            }}
            className="bg-transparent focus:outline-none flex-1 min-w-[120px] placeholder-base-content/30"
          />

          <select
            value={mood}
            onChange={(e) => {
              setMood(e.target.value);
              scheduleSave(body, title, tags, e.target.value, categories);
            }}
            className="bg-base-200 text-base-content/60 text-sm rounded focus:outline-none"
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

        {/* Category chips + popover picker */}
        <div className="relative flex flex-wrap items-center gap-1.5" ref={pickerRef}>
          {categories.map((id) => {
            const jt = JOURNAL_TYPES.find((j) => j.id === id);
            return (
              <span
                key={id}
                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded-full"
              >
                {jt ? `${jt.emoji} ${jt.name}` : id}
                <button
                  type="button"
                  onClick={() => toggleCategory(id)}
                  className="ml-0.5 text-indigo-400 hover:text-white transition-colors leading-none"
                >
                  ×
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="text-xs px-2 py-0.5 text-base-content/30 hover:text-base-content/80 border border-base-200 hover:border-base-content/30 rounded-full transition-colors"
          >
            + category
          </button>

          {pickerOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-20 bg-base-200 border border-base-content/20 rounded-xl p-2 shadow-2xl w-72">
              <div className="grid grid-cols-2 gap-0.5">
                {JOURNAL_TYPES.map((jt) => {
                  const active = categories.includes(jt.id);
                  return (
                    <button
                      key={jt.id}
                      type="button"
                      onClick={() => toggleCategory(jt.id)}
                      className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "text-base-content/60 hover:bg-base-content/8 hover:text-base-content"
                      }`}
                    >
                      <span className="shrink-0">{jt.emoji}</span>
                      <span className="truncate">{jt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0">
          <MarkdownEditor
            value={body}
            onChange={(v) => {
              setBody(v);
              scheduleSave(v, title, tags, mood, categories);
            }}
            placeholder="Start writing…"
          />
        </div>
      </div>

      {/* AI sidebar */}
      {aiOpen && (
        <aside className="w-72 shrink-0 border-l border-base-200 px-4 py-4">
          <AiPanel
            entryId={entryIdRef.current}
            categories={categories}
            currentMood={mood}
            onApplyMood={(m) => {
              setMood(m);
              scheduleSave(body, title, tags, m, categories);
            }}
            onApplyPrompt={(p) => {
              const newBody = body ? `${body}\n\n${p}\n` : `${p}\n`;
              setBody(newBody);
              scheduleSave(newBody, title, tags, mood, categories);
            }}
          />
        </aside>
      )}
    </div>
  );
}
