"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { DecryptedEntry, EntryPayload } from "@/types/entry";
import { JOURNAL_TYPES } from "@/lib/journal-types";
import AiPanel from "./AiPanel";
import VoiceNotesList from "./VoiceNotesList";

interface UserCategory {
  id: string;
  name: string;
  emoji: string;
  builtinId: string | null;
  hidden: boolean;
}

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
  const [entryId, setEntryId] = useState<string | null>(initial?.id ?? null);
  const [voiceNoteRefreshKey, setVoiceNoteRefreshKey] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
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
          setEntryId(data.id);
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
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setUserCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

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

  const overridesByBuiltinId = new Map(
    userCategories.filter((uc) => uc.builtinId).map((uc) => [uc.builtinId!, uc]),
  );
  const customCategories = userCategories.filter((uc) => !uc.builtinId);
  const visibleBuiltins = JOURNAL_TYPES.filter(
    (jt) => !overridesByBuiltinId.get(jt.id)?.hidden,
  );

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
          <div className="flex items-center gap-2 shrink-0">
            {saveState === "unsaved" && (
              <button
                onClick={() => {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  save(body, title, tags, mood, categories);
                }}
                className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            )}
            <span className="text-xs text-base-content/40">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : saveState === "error"
                    ? "Error saving"
                    : null}
            </span>
            {entryId && !deleteConfirm && (
              <button
                onClick={() => setDeleteConfirm(true)}
                title="Delete entry"
                className="text-base-content/30 hover:text-red-400 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            )}
            {deleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-base-content/50">Delete entry?</span>
                <button
                  onClick={async () => {
                    setDeleting(true);
                    await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
                    _router.push("/journal");
                  }}
                  disabled={deleting}
                  className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="text-xs text-base-content/40 hover:text-base-content transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
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
            const override = jt ? overridesByBuiltinId.get(id) : null;
            const uc = !jt ? userCategories.find((c) => c.id === id) : null;
            const label = jt
              ? `${override?.emoji ?? jt.emoji} ${override?.name ?? jt.name}`
              : uc
                ? `${uc.emoji} ${uc.name}`
                : id;
            return (
              <span
                key={id}
                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded-full"
              >
                {label}
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
            <div className="absolute top-full left-0 mt-1.5 z-20 bg-base-200 border border-base-content/20 rounded-xl p-2 shadow-2xl w-72 max-h-72 overflow-y-auto">
              {customCategories.length > 0 && (
                <>
                  <p className="text-xs text-base-content/40 px-2 pt-1 pb-0.5 uppercase tracking-wider font-medium">My categories</p>
                  <div className="grid grid-cols-2 gap-0.5 mb-1">
                    {customCategories.map((uc) => {
                      const active = categories.includes(uc.id);
                      return (
                        <button
                          key={uc.id}
                          type="button"
                          onClick={() => toggleCategory(uc.id)}
                          className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                            active
                              ? "bg-indigo-600 text-white"
                              : "text-base-content/60 hover:bg-base-content/8 hover:text-base-content"
                          }`}
                        >
                          <span className="shrink-0">{uc.emoji}</span>
                          <span className="truncate">{uc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-base-content/10 mb-1" />
                </>
              )}
              {visibleBuiltins.length > 0 && (
                <>
                  <p className="text-xs text-base-content/40 px-2 pt-1 pb-0.5 uppercase tracking-wider font-medium">Built-in</p>
                  <div className="grid grid-cols-2 gap-0.5">
                    {visibleBuiltins.map((jt) => {
                      const override = overridesByBuiltinId.get(jt.id);
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
                          <span className="shrink-0">{override?.emoji ?? jt.emoji}</span>
                          <span className="truncate">{override?.name ?? jt.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
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
            entryId={entryId ?? undefined}
            onVoiceNoteSaved={() => setVoiceNoteRefreshKey((k) => k + 1)}
          />
        </div>

        {/* Voice notes */}
        {entryId && (
          <VoiceNotesList
            entryId={entryId}
            refreshKey={voiceNoteRefreshKey}
            onTranscript={(text) => {
              const newBody = body ? `${body}\n\n${text}` : text;
              setBody(newBody);
              scheduleSave(newBody, title, tags, mood, categories);
            }}
          />
        )}
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
