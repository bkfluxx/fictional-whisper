"use client";

import { useState, useEffect } from "react";
import { BUILT_IN_TEMPLATES } from "@/lib/templates";

interface DbTemplate {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  body: string;
  categories: string[];
  builtinId: string | null;
  hidden: boolean;
}

type FormState = {
  title: string;
  emoji: string;
  description: string;
  body: string;
};

const EMPTY_FORM: FormState = { title: "", emoji: "📝", description: "", body: "" };

// Which item is being edited: "builtin:<id>" | db-id | "new" | null
type EditingKey = string | null;

export default function TemplatesSettings() {
  const [dbRows, setDbRows] = useState<DbTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingKey>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => {
        const overrides: DbTemplate[] = Object.values(d.overrides ?? {}) as DbTemplate[];
        const user: DbTemplate[] = d.user ?? [];
        setDbRows([...overrides, ...user]);
      })
      .catch(() => setDbRows([]))
      .finally(() => setLoading(false));
  }, []);

  // Maps builtinId → override row
  const overrideMap = new Map(
    dbRows.filter((r) => r.builtinId).map((r) => [r.builtinId!, r]),
  );
  const customTemplates = dbRows.filter((r) => !r.builtinId);

  function startEdit(key: string, initial: FormState) {
    setEditing(key);
    setForm(initial);
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  // Save edits for a built-in override (upsert)
  async function saveBuiltinEdit(builtinId: string) {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.body.trim()) { setError("Body is required."); return; }
    setSaving(true); setError(null);
    try {
      const builtin = BUILT_IN_TEMPLATES.find((t) => t.id === builtinId)!;
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          builtinId,
          title: form.title.trim(),
          emoji: form.emoji.trim() || "📝",
          description: form.description.trim() || null,
          body: form.body.trim(),
          categories: builtin.categories,
          hidden: overrideMap.get(builtinId)?.hidden ?? false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: DbTemplate = await res.json();
      setDbRows((prev) => {
        const exists = prev.some((r) => r.builtinId === builtinId);
        return exists
          ? prev.map((r) => (r.builtinId === builtinId ? updated : r))
          : [...prev, updated];
      });
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Toggle hidden for a built-in
  async function toggleBuiltinHidden(builtinId: string, hide: boolean) {
    setSaving(true);
    try {
      const builtin = BUILT_IN_TEMPLATES.find((t) => t.id === builtinId)!;
      const existing = overrideMap.get(builtinId);
      if (existing) {
        const res = await fetch(`/api/templates/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden: hide }),
        });
        if (!res.ok) throw new Error();
        const updated: DbTemplate = await res.json();
        setDbRows((prev) => prev.map((r) => (r.id === existing.id ? updated : r)));
      } else {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            builtinId,
            title: builtin.title,
            emoji: builtin.emoji,
            description: builtin.description,
            body: builtin.body,
            categories: builtin.categories,
            hidden: hide,
          }),
        });
        if (!res.ok) throw new Error();
        const created: DbTemplate = await res.json();
        setDbRows((prev) => [...prev, created]);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  // Reset a built-in override (delete override row — restores original)
  async function resetBuiltin(overrideId: string) {
    setSaving(true);
    try {
      await fetch(`/api/templates/${overrideId}`, { method: "DELETE" });
      setDbRows((prev) => prev.filter((r) => r.id !== overrideId));
      if (editing === overrideId || editing === `builtin:${overrideMap.get(overrideId)?.builtinId}`) {
        cancelEdit();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  // Save edits for a custom template
  async function saveCustomEdit(id: string) {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.body.trim()) { setError("Body is required."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          emoji: form.emoji.trim() || "📝",
          description: form.description.trim() || null,
          body: form.body.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: DbTemplate = await res.json();
      setDbRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Create a new custom template
  async function addCustom() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.body.trim()) { setError("Body is required."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          emoji: form.emoji.trim() || "📝",
          description: form.description.trim() || null,
          body: form.body.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: DbTemplate = await res.json();
      setDbRows((prev) => [...prev, created]);
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustom(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setDbRows((prev) => prev.filter((r) => r.id !== id));
      if (editing === id) cancelEdit();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-base-content/50">Loading templates…</p>;
  }

  return (
    <div className="space-y-8">
      {/* Built-in templates */}
      <div>
        <p className="text-xs font-medium text-base-content/40 mb-3 uppercase tracking-widest">
          Built-in
        </p>
        <div className="space-y-1.5">
          {BUILT_IN_TEMPLATES.map((bt) => {
            const override = overrideMap.get(bt.id);
            const isHidden = override?.hidden ?? false;
            const displayTitle = override && !isHidden ? override.title : bt.title;
            const displayEmoji = override && !isHidden ? override.emoji : bt.emoji;
            const displayDesc = override && !isHidden ? (override.description ?? bt.description) : bt.description;
            const editKey = `builtin:${bt.id}`;

            if (editing === editKey) {
              return (
                <div key={bt.id} className="rounded-xl border border-indigo-500/40 bg-base-200 p-4 space-y-3">
                  <TemplateForm form={form} onChange={setForm} />
                  {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveBuiltinEdit(bt.id)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={cancelEdit} className="px-3 py-1.5 text-base-content/50 hover:text-base-content text-xs transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={bt.id}
                className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
                  isHidden
                    ? "border-base-content/5 bg-base-100 opacity-50"
                    : "border-base-content/10 bg-base-200"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{displayEmoji}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isHidden ? "line-through text-base-content/50" : "text-base-content"}`}>
                      {displayTitle}
                    </p>
                    {override && !isHidden && override.title !== bt.title && (
                      <p className="text-xs text-base-content/40 truncate">was: {bt.title}</p>
                    )}
                    {!isHidden && displayDesc && (
                      <p className="text-xs text-base-content/40 truncate">{displayDesc}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isHidden && (
                    <button
                      onClick={() => startEdit(editKey, {
                        title: displayTitle,
                        emoji: displayEmoji,
                        description: displayDesc ?? "",
                        body: override?.body ?? bt.body,
                      })}
                      className="p-1.5 text-base-content/40 hover:text-base-content rounded-lg hover:bg-base-content/8 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                    </button>
                  )}
                  {isHidden ? (
                    <button
                      onClick={() => resetBuiltin(override!.id)}
                      disabled={saving}
                      className="text-xs px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-500/10 transition-colors disabled:opacity-40"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleBuiltinHidden(bt.id, true)}
                      disabled={saving}
                      className="p-1.5 text-base-content/40 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      title="Hide from picker"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    </button>
                  )}
                  {override && (
                    <button
                      onClick={() => resetBuiltin(override.id)}
                      disabled={saving}
                      className="text-xs px-2 py-1 text-base-content/30 hover:text-base-content/60 rounded-lg transition-colors disabled:opacity-40"
                      title="Reset to default"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom templates */}
      <div>
        <p className="text-xs font-medium text-base-content/40 mb-3 uppercase tracking-widest">
          Custom
        </p>
        {customTemplates.length === 0 && editing !== "new" ? (
          <p className="text-sm text-base-content/40 mb-3">No custom templates yet.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {customTemplates.map((t) =>
              editing === t.id ? (
                <div key={t.id} className="rounded-xl border border-indigo-500/40 bg-base-200 p-4 space-y-3">
                  <TemplateForm form={form} onChange={setForm} />
                  {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveCustomEdit(t.id)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={cancelEdit} className="px-3 py-1.5 text-base-content/50 hover:text-base-content text-xs transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={t.id} className="flex items-center justify-between gap-4 rounded-xl border border-base-content/10 bg-base-200 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{t.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-base-content truncate">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-base-content/50 truncate">{t.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(t.id, {
                        title: t.title,
                        emoji: t.emoji,
                        description: t.description ?? "",
                        body: t.body,
                      })}
                      className="p-1.5 text-base-content/40 hover:text-base-content rounded-lg hover:bg-base-content/8 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteCustom(t.id)}
                      disabled={saving}
                      className="p-1.5 text-base-content/40 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            )}

            {editing === "new" && (
              <div className="rounded-xl border border-indigo-500/40 bg-base-200 p-4 space-y-3">
                <TemplateForm form={form} onChange={setForm} />
                {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={addCustom}
                    disabled={saving || !form.title.trim() || !form.body.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {saving ? "Adding…" : "Add"}
                  </button>
                  <button onClick={cancelEdit} className="px-3 py-1.5 text-base-content/50 hover:text-base-content text-xs transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {editing !== "new" && (
          <button
            onClick={() => startEdit("new", EMPTY_FORM)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
          >
            + Add custom template
          </button>
        )}
      </div>
    </div>
  );
}

function TemplateForm({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={form.emoji}
          onChange={(e) => onChange({ ...form, emoji: e.target.value })}
          placeholder="📝"
          maxLength={4}
          className="w-14 bg-base-100 border border-base-content/20 text-base-content text-center text-lg rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="Template name"
          className="flex-1 bg-base-100 border border-base-content/20 text-base-content text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder:text-base-content/30"
        />
      </div>
      <input
        type="text"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
        placeholder="Short description (optional)"
        className="w-full bg-base-100 border border-base-content/20 text-base-content text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder:text-base-content/30"
      />
      <textarea
        rows={6}
        value={form.body}
        onChange={(e) => onChange({ ...form, body: e.target.value })}
        placeholder="Template body — use HTML headings like <h2>Section</h2>"
        className="w-full bg-base-100 border border-base-content/20 text-base-content text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder:text-base-content/30 font-mono resize-y"
      />
    </div>
  );
}
