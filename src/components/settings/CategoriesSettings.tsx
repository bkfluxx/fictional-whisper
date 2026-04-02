"use client";

import { useState, useEffect } from "react";
import { JOURNAL_TYPES } from "@/lib/journal-types";

interface UserCategory {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  builtinId: string | null;
  hidden: boolean;
}

type FormState = { name: string; emoji: string; description: string };

const EMPTY_FORM: FormState = { name: "", emoji: "📝", description: "" };

// Which item is being edited: "new" | db-id | null
type EditingKey = string | "new" | null;

export default function CategoriesSettings() {
  const [overrides, setOverrides] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingKey>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setOverrides(Array.isArray(data) ? data : []))
      .catch(() => setOverrides([]))
      .finally(() => setLoading(false));
  }, []);

  const overrideMap = new Map(
    overrides.filter((o) => o.builtinId).map((o) => [o.builtinId!, o]),
  );
  const customCategories = overrides.filter((o) => !o.builtinId);

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

  // Save edits for a built-in override (create or update)
  async function saveBuiltinEdit(builtinId: string) {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          builtinId,
          name: form.name.trim(),
          emoji: form.emoji.trim() || "📝",
          description: form.description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: UserCategory = await res.json();
      setOverrides((prev) => {
        const exists = prev.some((o) => o.builtinId === builtinId);
        return exists
          ? prev.map((o) => (o.builtinId === builtinId ? updated : o))
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
      const builtin = JOURNAL_TYPES.find((j) => j.id === builtinId)!;
      const existing = overrideMap.get(builtinId);
      if (existing) {
        const res = await fetch(`/api/categories/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden: hide }),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: UserCategory = await res.json();
        setOverrides((prev) => prev.map((o) => (o.id === existing.id ? updated : o)));
      } else {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            builtinId,
            name: builtin.name,
            emoji: builtin.emoji,
            hidden: hide,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: UserCategory = await res.json();
        setOverrides((prev) => [...prev, created]);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  // Reset a built-in override (delete it entirely)
  async function resetBuiltin(overrideId: string) {
    setSaving(true);
    try {
      await fetch(`/api/categories/${overrideId}`, { method: "DELETE" });
      setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
      if (editing === overrideId) cancelEdit();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  // Save edits for a custom category
  async function saveCustomEdit(id: string) {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          emoji: form.emoji.trim() || "📝",
          description: form.description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: UserCategory = await res.json();
      setOverrides((prev) => prev.map((o) => (o.id === id ? updated : o)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Create a new custom category
  async function addCustom() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          emoji: form.emoji.trim() || "📝",
          description: form.description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: UserCategory = await res.json();
      setOverrides((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
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
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      setOverrides((prev) => prev.filter((o) => o.id !== id));
      if (editing === id) cancelEdit();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-base-content/50">Loading categories…</p>;
  }

  return (
    <div className="space-y-8">
      {/* Built-in categories */}
      <div>
        <p className="text-xs font-medium text-base-content/40 mb-3 uppercase tracking-widest">
          Built-in
        </p>
        <div className="space-y-1.5">
          {JOURNAL_TYPES.map((jt) => {
            const override = overrideMap.get(jt.id);
            const isHidden = override?.hidden ?? false;
            const displayName = override && !override.hidden ? override.name : jt.name;
            const displayEmoji = override && !override.hidden ? override.emoji : jt.emoji;
            const editKey = `builtin:${jt.id}`;

            if (editing === editKey) {
              return (
                <div key={jt.id} className="rounded-xl border border-indigo-500/40 bg-base-200 p-4 space-y-3">
                  <CategoryForm form={form} onChange={setForm} />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveBuiltinEdit(jt.id)}
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
                key={jt.id}
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
                      {displayName}
                    </p>
                    {override && !override.hidden && override.name !== jt.name && (
                      <p className="text-xs text-base-content/40 truncate">was: {jt.name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isHidden && (
                    <button
                      onClick={() => startEdit(editKey, {
                        name: displayName,
                        emoji: displayEmoji,
                        description: override?.description ?? "",
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
                      className="text-xs px-2 py-1 text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-indigo-500/10 transition-colors disabled:opacity-40"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleBuiltinHidden(jt.id, true)}
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

      {/* Custom categories */}
      <div>
        <p className="text-xs font-medium text-base-content/40 mb-3 uppercase tracking-widest">
          Custom
        </p>
        {customCategories.length === 0 && editing !== "new" ? (
          <p className="text-sm text-base-content/40 mb-3">
            No custom categories yet.
          </p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {customCategories.map((cat) =>
              editing === cat.id ? (
                <div key={cat.id} className="rounded-xl border border-indigo-500/40 bg-base-200 p-4 space-y-3">
                  <CategoryForm form={form} onChange={setForm} />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveCustomEdit(cat.id)}
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
                <div key={cat.id} className="flex items-center justify-between gap-4 rounded-xl border border-base-content/10 bg-base-200 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{cat.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-base-content truncate">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-base-content/50 truncate">{cat.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(cat.id, { name: cat.name, emoji: cat.emoji, description: cat.description ?? "" })}
                      className="p-1.5 text-base-content/40 hover:text-base-content rounded-lg hover:bg-base-content/8 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteCustom(cat.id)}
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
                <CategoryForm form={form} onChange={setForm} />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={addCustom}
                    disabled={saving || !form.name.trim()}
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
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Add custom category
          </button>
        )}
      </div>
    </div>
  );
}

function CategoryForm({
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
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Category name"
          className="flex-1 bg-base-100 border border-base-content/20 text-base-content text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder:text-base-content/30"
        />
      </div>
      <input
        type="text"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
        placeholder="Description (optional)"
        className="w-full bg-base-100 border border-base-content/20 text-base-content text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder:text-base-content/30"
      />
    </div>
  );
}
