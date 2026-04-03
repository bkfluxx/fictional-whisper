"use client";

import { useEffect, useState } from "react";
import { BUILT_IN_PERSONAS } from "@/lib/personas";

interface CustomPersona {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  isBuiltIn: false;
}

type AnyPersona =
  | (typeof BUILT_IN_PERSONAS)[number]
  | CustomPersona;

const EMPTY_FORM = { name: "", description: "", systemPrompt: "" };

export default function PersonasSettings() {
  const [enabled, setEnabled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [custom, setCustom] = useState<CustomPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit / create form state
  const [editingId, setEditingId] = useState<string | null>(null); // null = new
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/personas").then((r) => r.json()),
      fetch("/api/personas").then((r) => r.json()),
    ])
      .then(([settings, personas]) => {
        setEnabled(settings.personasEnabled ?? false);
        setActiveId(settings.activePersonaId ?? null);
        setCustom(personas.custom ?? []);
      })
      .catch(() => setError("Failed to load personas settings."))
      .finally(() => setLoading(false));
  }, []);

  async function toggleEnabled(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/personas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personasEnabled: next }),
      });
      if (!res.ok) throw new Error();
      setEnabled(next);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function activate(id: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/personas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activePersonaId: id }),
      });
      if (!res.ok) throw new Error();
      setActiveId(id);
    } catch {
      setError("Failed to activate persona.");
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(p: CustomPersona) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      systemPrompt: p.systemPrompt,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function saveForm() {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.systemPrompt.trim()) { setFormError("System prompt is required."); return; }
    setFormSaving(true);
    setFormError(null);
    try {
      const url = editingId ? `/api/personas/${editingId}` : "/api/personas";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to save."); return; }
      if (editingId) {
        setCustom((prev) => prev.map((p) => p.id === editingId ? { ...p, ...form, description: form.description || null } : p));
      } else {
        setCustom((prev) => [...prev, { ...data.persona, isBuiltIn: false }]);
      }
      setShowForm(false);
    } catch {
      setFormError("Something went wrong.");
    } finally {
      setFormSaving(false);
    }
  }

  async function deletePersona(id: string) {
    if (!confirm("Delete this persona?")) return;
    try {
      await fetch(`/api/personas/${id}`, { method: "DELETE" });
      setCustom((prev) => prev.filter((p) => p.id !== id));
      if (activeId === id) setActiveId(null);
    } catch {
      setError("Failed to delete persona.");
    }
  }

  const allPersonas: AnyPersona[] = [...BUILT_IN_PERSONAS, ...custom];

  if (loading) {
    return <p className="text-sm text-base-content/40">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Enable / disable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-base-content">Enable personas</p>
          <p className="text-xs text-base-content/40 mt-0.5">
            When on, the active persona shapes tone across chat, mood analysis, and writing prompts.
          </p>
        </div>
        <button
          onClick={() => toggleEnabled(!enabled)}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-indigo-500" : "bg-base-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className={`space-y-3 transition-opacity ${enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
        {/* Persona list */}
        {allPersonas.map((p) => {
          const isActive = activeId === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-lg border px-4 py-3 transition-colors ${
                isActive
                  ? "border-indigo-500 bg-indigo-500/5"
                  : "border-base-content/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-base-content">{p.name}</span>
                    {p.isBuiltIn && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-300 text-base-content/50 uppercase tracking-wide">
                        built-in
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                        active
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-base-content/50 mt-0.5">{p.description}</p>
                  )}
                  <p className="text-xs text-base-content/30 mt-1 line-clamp-2 font-mono">
                    {p.systemPrompt}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => activate(p.id)}
                      disabled={saving}
                      className="text-xs px-2.5 py-1 rounded bg-base-200 hover:bg-base-300 text-base-content/70 transition-colors disabled:opacity-50"
                    >
                      Activate
                    </button>
                  )}
                  {!p.isBuiltIn && (
                    <>
                      <button
                        onClick={() => openEdit(p as CustomPersona)}
                        className="text-xs px-2.5 py-1 rounded bg-base-200 hover:bg-base-300 text-base-content/70 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePersona(p.id)}
                        className="text-xs px-2.5 py-1 rounded bg-base-200 hover:bg-red-500/10 text-base-content/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Create button */}
        {!showForm && (
          <button
            onClick={openCreate}
            className="w-full text-sm py-2.5 rounded-lg border border-dashed border-base-content/20 text-base-content/40 hover:text-base-content/70 hover:border-base-content/30 transition-colors"
          >
            + New persona
          </button>
        )}

        {/* Create / edit form */}
        {showForm && (
          <div className="rounded-lg border border-base-content/10 p-4 space-y-3">
            <p className="text-sm font-medium text-base-content">
              {editingId ? "Edit persona" : "New persona"}
            </p>

            {formError && (
              <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
            )}

            <div>
              <label className="text-xs text-base-content/50 mb-1 block">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Stoic Advisor"
                className="w-full text-sm bg-base-200 border border-base-content/10 rounded-md px-3 py-2 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-base-content/50 mb-1 block">Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="One-line description shown in the list"
                className="w-full text-sm bg-base-200 border border-base-content/10 rounded-md px-3 py-2 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-base-content/50 mb-1 block">System prompt</label>
              <textarea
                rows={5}
                value={form.systemPrompt}
                onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                placeholder="You are a..."
                className="w-full text-sm bg-base-200 border border-base-content/10 rounded-md px-3 py-2 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="text-sm px-3 py-1.5 rounded-md bg-base-200 hover:bg-base-300 text-base-content/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                disabled={formSaving}
                className="text-sm px-3 py-1.5 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50"
              >
                {formSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
