"use client";

import { useState, useEffect } from "react";
import { BUILT_IN_TEMPLATES } from "@/lib/templates";

interface UserTemplate {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  body: string;
  categories: string[];
}

type SaveState = "idle" | "saving" | "error";

export default function TemplatesSettings() {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.user ?? []))
      .finally(() => setLoading(false));
  }, []);
  const [creating, setCreating] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // New template form state
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("📝");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");

  async function create() {
    if (!title.trim() || !body.trim()) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, emoji, description, body }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setTemplates((prev) => [...prev, created]);
      setTitle("");
      setEmoji("📝");
      setDescription("");
      setBody("");
      setCreating(false);
      setSaveState("idle");
    } catch {
      setSaveState("error");
    }
  }

  async function remove(id: string) {
    setDeleteId(id);
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Built-in templates (read-only) */}
      <div>
        <h3 className="text-sm font-medium text-neutral-300 mb-3">Built-in templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BUILT_IN_TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg"
            >
              <span>{t.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm text-neutral-300 truncate">{t.title}</p>
                <p className="text-xs text-neutral-600 truncate">{t.group}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-800" />

      {/* User templates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-neutral-300">My templates</h3>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              + New template
            </button>
          )}
        </div>

        {loading && (
          <p className="text-sm text-neutral-600">Loading…</p>
        )}
        {!loading && templates.length === 0 && !creating && (
          <p className="text-sm text-neutral-600">No custom templates yet.</p>
        )}

        {/* Existing user templates */}
        <div className="space-y-2 mb-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg"
            >
              <span>{t.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-300 truncate">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-neutral-600 truncate">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                disabled={deleteId === t.id}
                className="text-xs text-neutral-600 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                {deleteId === t.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          ))}
        </div>

        {/* Create form */}
        {creating && (
          <div className="border border-neutral-700 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-medium text-white">New template</h4>
            <div className="flex gap-2">
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="📝"
                maxLength={4}
                className="w-14 bg-neutral-800 border border-neutral-700 text-white text-center rounded-lg px-2 py-2 text-lg focus:outline-none focus:border-indigo-500"
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Template name"
                className="flex-1 bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)"
              className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Template body in Markdown — use ## headings for sections and <!-- hints --> for guidance"
              rows={8}
              className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 font-mono resize-y"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={create}
                disabled={!title.trim() || !body.trim() || saveState === "saving"}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
              >
                {saveState === "saving" ? "Saving…" : "Save template"}
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setSaveState("idle");
                }}
                className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              {saveState === "error" && (
                <span className="text-xs text-red-400">Something went wrong</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
