"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { DecryptedEntry, EntryPayload } from "@/types/entry";
import { JOURNAL_TYPES } from "@/lib/journal-types";
import AiPanel from "./AiPanel";
import MoodPicker from "./MoodPicker";
import VoiceNotesList from "./VoiceNotesList";
import VoiceMicButton from "@/components/editor/VoiceMicButton";

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
  const [entryDate, setEntryDate] = useState(
    initial?.entryDate
      ? initial.entryDate.slice(0, 10)
      : (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })(),
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
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const isPrivateRef = useRef(initial?.isPrivate ?? false);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const entryIdRef = useRef<string | null>(initial?.id ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const insertTextRef = useRef<((text: string) => void) | null>(null);
  const triggerImagePickerRef = useRef<(() => void) | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const resizeTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  useEffect(() => { resizeTitle(); }, [title, resizeTitle]);

  const save = useCallback(
    async (
      currentBody: string,
      currentTitle: string,
      currentTags: string,
      currentMood: string,
      currentCategories: string[],
      currentEntryDate: string,
      explicit = false,
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
        entryDate: currentEntryDate,
        isPrivate: isPrivateRef.current,
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
        if (explicit) toast.success("Entry saved");
      } catch {
        setSaveState("error");
        toast.error("Failed to save entry");
      }
    },
    [],
  );

  const scheduleSave = useCallback(
    (b: string, t: string, tg: string, m: string, cats: string[], ed: string) => {
      setSaveState("unsaved");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(b, t, tg, m, cats, ed), 2000);
    },
    [save],
  );

  const togglePrivate = useCallback(async () => {
    const next = !isPrivateRef.current;
    isPrivateRef.current = next;
    setIsPrivate(next);
    // If the entry doesn't exist yet, isPrivateRef will be picked up on first save
    if (!entryIdRef.current) return;
    try {
      const res = await fetch(`/api/entries/${entryIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrivate: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      isPrivateRef.current = !next;
      setIsPrivate(!next);
      toast.error("Failed to update privacy");
    }
  }, []);

  const handleImageInsert = useCallback(async (file: File): Promise<string | null> => {
    let id = entryIdRef.current;
    if (!id) {
      // Force-save first so we have an entry to attach to
      await save(body, title, tags, mood, categories, entryDate, false);
      id = entryIdRef.current;
      if (!id) {
        toast.error("Save the entry before attaching images");
        return null;
      }
    }
    setImageUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`/api/entries/${id}/attachments`, { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return `/api/entries/${id}/attachments/${data.id}`;
    } catch {
      toast.error("Failed to upload image");
      return null;
    } finally {
      setImageUploading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, title, tags, mood, categories, entryDate, save]);

  function toggleCategory(id: string) {
    const next = categories.includes(id)
      ? categories.filter((c) => c !== id)
      : [...categories, id];
    setCategories(next);
    scheduleSave(body, title, tags, mood, next, entryDate);
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
        save(body, title, tags, mood, categories, entryDate, true);
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
      <div className="flex flex-col flex-1 min-w-0 px-6 pt-6 pb-4 gap-4 md:pt-4">
        {/* Header row — stacks on mobile so title gets full width */}
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:gap-4">
          <textarea
            ref={titleRef}
            placeholder="Title (optional)"
            value={title}
            rows={1}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave(body, e.target.value, tags, mood, categories, entryDate);
              resizeTitle();
            }}
            style={{ fontSize: '1.875rem' }}
            aria-label="Entry title"
            className="flex-1 min-w-0 w-full bg-transparent font-semibold text-foreground placeholder-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:rounded resize-none overflow-hidden leading-tight"
          />
          <div className="flex items-center gap-2 md:shrink-0">
            {saveState === "unsaved" && (
              <button
                onClick={() => {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  save(body, title, tags, mood, categories, entryDate, true);
                }}
                className="text-xs px-2.5 py-1 bg-primary hover:bg-primary/90 text-white rounded-full transition-colors"
              >
                Save
              </button>
            )}
            <span aria-live="polite" className="text-xs text-foreground/40">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : saveState === "error"
                    ? "Error"
                    : null}
            </span>
            {entryId && !deleteConfirm && (
              <button
                onClick={() => setDeleteConfirm(true)}
                aria-label="Delete entry"
                className="text-foreground/30 hover:text-red-400 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Metadata row — stacks on mobile */}
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3 text-sm text-foreground/60">
          <input
            placeholder="Tags (comma-separated)"
            aria-label="Tags"
            value={tags}
            onChange={(e) => {
              setTags(e.target.value);
              scheduleSave(body, title, e.target.value, mood, categories, entryDate);
            }}
            className="bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:rounded w-full md:flex-1 md:min-w-[120px] placeholder-foreground/30"
          />

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={entryDate}
              max={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()}
              onChange={(e) => {
                const d = e.target.value;
                if (!d) return;
                setEntryDate(d);
                scheduleSave(body, title, tags, mood, categories, d);
              }}
              aria-label="Entry date"
              className="bg-transparent text-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:rounded cursor-pointer"
            />

            <MoodPicker
              value={mood}
              onChange={(m) => {
                setMood(m);
                scheduleSave(body, title, tags, m, categories, entryDate);
              }}
            />
          </div>
        </div>

        {/* Category chips + popover picker */}
        <div className="relative flex flex-wrap items-center gap-1.5" ref={pickerRef}>
          {categories.map((id) => {
            const jt = JOURNAL_TYPES.find((j) => j.id === id);
            const override = jt ? overridesByBuiltinId.get(id) : null;
            const uc = !jt ? userCategories.find((c) => c.id === id) : null;
            const label = jt
              ? (override?.name ?? jt.name)
              : uc
                ? uc.name
                : id;
            return (
              <span
                key={id}
                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary rounded-full"
              >
                {label}
                <button
                  type="button"
                  onClick={() => toggleCategory(id)}
                  className="ml-0.5 text-primary hover:text-white transition-colors leading-none"
                >
                  ×
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="text-xs px-2 py-1.5 text-foreground/30 hover:text-foreground/80 border border-border hover:border-foreground/30 rounded-full transition-colors"
          >
            + category
          </button>

          {pickerOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-20 bg-card border border-foreground/20 rounded-xl p-2 shadow-2xl w-72 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              {customCategories.length > 0 && (
                <>
                  <p className="text-xs text-foreground/40 px-2 pt-1 pb-0.5 uppercase tracking-wider font-medium">My categories</p>
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
                              ? "bg-primary text-white"
                              : "text-foreground/60 hover:bg-foreground/8 hover:text-foreground"
                          }`}
                        >
                          <span className="truncate">{uc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-foreground/10 mb-1" />
                </>
              )}
              {visibleBuiltins.length > 0 && (
                <>
                  <p className="text-xs text-foreground/40 px-2 pt-1 pb-0.5 uppercase tracking-wider font-medium">Built-in</p>
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
                              ? "bg-primary text-white"
                              : "text-foreground/60 hover:bg-foreground/8 hover:text-foreground"
                          }`}
                        >
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
              scheduleSave(v, title, tags, mood, categories, entryDate);
            }}
            placeholder="Start writing…"
            entryId={entryId ?? undefined}
            onVoiceNoteSaved={() => setVoiceNoteRefreshKey((k) => k + 1)}
            onEditorReady={(fn) => { insertTextRef.current = fn; }}
            onImageInsert={handleImageInsert}
            onImagePickerReady={(fn) => { triggerImagePickerRef.current = fn; }}
            aiOpen={aiOpen}
            onAiToggle={() => setAiOpen((o) => !o)}
            isPrivate={isPrivate}
            onPrivateToggle={togglePrivate}
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
              scheduleSave(newBody, title, tags, mood, categories, entryDate);
            }}
          />
        )}
      </div>

      {/* Mobile floating footer — mic + Private + AI toggle */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <VoiceMicButton
          pill
          onTranscript={(text) => insertTextRef.current?.(text)}
          entryId={entryId ?? undefined}
          onSaved={() => setVoiceNoteRefreshKey((k) => k + 1)}
        />
        <button
          onClick={() => triggerImagePickerRef.current?.()}
          disabled={imageUploading}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors text-foreground/50 hover:text-foreground bg-foreground/5 hover:bg-foreground/10 disabled:opacity-40"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          {imageUploading ? "Uploading…" : "Image"}
        </button>
        <button
          onClick={togglePrivate}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
            isPrivate
              ? "bg-foreground/20 text-foreground"
              : "text-foreground/50 hover:text-foreground bg-foreground/5 hover:bg-foreground/10"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          Private
        </button>
        <button
          onClick={() => setAiOpen((o) => !o)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
            aiOpen
              ? "bg-primary text-white"
              : "text-foreground/50 hover:text-foreground bg-foreground/5 hover:bg-foreground/10"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
          AI
        </button>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6 animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" className="bg-card border border-foreground/15 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in fade-in zoom-in-95 duration-150">

            <p id="delete-dialog-title" className="text-sm font-medium text-foreground mb-1">Delete this entry?</p>
            <p className="text-xs text-foreground/50 mb-5">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setDeleting(true);
                  await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
                  toast.success("Entry deleted");
                  _router.push("/journal");
                }}
                disabled={deleting}
                className="flex-1 text-sm py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 text-sm py-2 bg-foreground/8 hover:bg-foreground/15 text-foreground rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI sidebar — side panel on desktop, overlay on mobile */}
      {aiOpen && (
        <aside className="fixed inset-0 z-30 bg-background px-4 py-4 overflow-y-auto md:static md:inset-auto md:z-auto md:w-72 md:shrink-0 md:border-l md:border-border md:overflow-visible">
          <div className="flex items-center justify-between mb-4 md:hidden">
            <span className="text-sm font-medium text-foreground">AI assistant</span>
            <button
              onClick={() => setAiOpen(false)}
              className="p-2 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <AiPanel
            entryId={entryIdRef.current}
            categories={categories}
            currentMood={mood}
            onApplyMood={(m) => {
              setMood(m);
              scheduleSave(body, title, tags, m, categories, entryDate);
            }}
            onApplyPrompt={(p) => {
              const newBody = body ? `${body}\n\n${p}\n` : `${p}\n`;
              setBody(newBody);
              scheduleSave(newBody, title, tags, mood, categories, entryDate);
            }}
          />
        </aside>
      )}
    </div>
  );
}
