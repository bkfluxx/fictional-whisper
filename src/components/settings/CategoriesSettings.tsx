"use client";

import { useState, useEffect } from "react";

interface UserCategory {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
}

type FormState = { name: string; emoji: string; description: string };

const EMPTY_FORM: FormState = { name: "", emoji: "📝", description: "" };

export default function CategoriesSettings() {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(cat: UserCategory) {
    setEditingId(cat.id);
    setForm({ name: cat.name, emoji: cat.emoji, description: cat.description ?? "" });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/categories/${editingId}`, {
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
        setCategories((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
        cancelEdit();
      } else {
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
        setCategories((prev) => [...prev, created]);
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) cancelEdit();
    } catch {
      // silent — category stays in list
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-base-content/50">Loading categories…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Existing categories */}
      {categories.length === 0 ? (
        <p className="text-sm text-base-content/40">
          No custom categories yet. Add one below — it will appear in the category picker when writing entries.
        </p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) =>
            editingId === cat.id ? (
              <div key={cat.id} className="rounded-xl border border-indigo-500/40 bg-base-200 p-4 space-y-3">
                <CategoryForm form={form} onChange={setForm} />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-base-content/50 hover:text-base-content text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-base-content/10 bg-base-200 px-4 py-3"
              >
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
                    onClick={() => startEdit(cat)}
                    className="p-1.5 text-base-content/40 hover:text-base-content rounded-lg hover:bg-base-content/8 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => remove(cat.id)}
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
        </div>
      )}

      {/* Add new category form */}
      {editingId === null && (
        <div>
          <p className="text-xs font-medium text-base-content/40 mb-3 uppercase tracking-widest">
            Add category
          </p>
          <div className="rounded-xl border border-base-content/10 bg-base-200 p-4 space-y-3">
            <CategoryForm form={form} onChange={setForm} />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? "Adding…" : "Add category"}
            </button>
          </div>
        </div>
      )}
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
