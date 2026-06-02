"use client";

import { useState, useEffect } from "react";
import { MOOD_GROUPS } from "@/lib/moods";
import { MoodGroupIcon, MoodFaceIcon } from "@/components/ui/MoodIcon";

interface CustomEmotion {
  id: string;
  label: string;
  value: string;
  groupId: string;
}

export default function MoodSettings() {
  const [customs, setCustoms] = useState<CustomEmotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [groupId, setGroupId] = useState(MOOD_GROUPS[0].id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/moods")
      .then((r) => r.json())
      .then((data) => setCustoms(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/moods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), groupId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to add"); return; }
      setCustoms((prev) => [...prev, data]);
      setLabel("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/moods/${id}`, { method: "DELETE" });
    setCustoms((prev) => prev.filter((c) => c.id !== id));
  }

  const byGroup = MOOD_GROUPS.map((g) => ({
    group: g,
    emotions: customs.filter((c) => c.groupId === g.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Custom emotions</h2>
        <p className="text-xs text-foreground/50 mb-4">
          Add personal emotion labels to any group. They appear in the mood picker alongside the built-in ones.
        </p>

        {/* Add form */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Melancholic"
            maxLength={30}
            className="flex-1 min-w-0 h-9 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 placeholder-foreground/30"
          />
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="h-9 px-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {MOOD_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving || !label.trim()}
            className="h-9 px-4 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </form>
        {error && <p className="text-xs text-destructive mb-3">{error}</p>}
      </div>

      {/* Built-in + custom by group */}
      {loading ? (
        <p className="text-sm text-foreground/40">Loading…</p>
      ) : (
        <div className="space-y-4">
          {byGroup.map(({ group, emotions }) => (
            <div key={group.id}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 ${group.colorClass}`}>
                <MoodGroupIcon groupId={group.id} size={16} className={group.textClass} />
                <span className={`text-xs font-semibold ${group.textClass}`}>{group.label}</span>
              </div>
              <div className="pl-2 space-y-1">
                {/* Built-ins (read-only) */}
                {group.emotions.map((e) => (
                  <div key={e.value} className="flex items-center gap-2 px-2 py-1">
                    <MoodFaceIcon value={e.value} size={15} className="text-foreground/40" />
                    <span className="text-sm text-foreground/70">{e.label}</span>
                    <span className="text-xs text-foreground/30 ml-auto">built-in</span>
                  </div>
                ))}
                {/* Custom */}
                {emotions.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-2 py-1">
                    <MoodFaceIcon value={c.value} size={15} className={group.textClass} />
                    <span className="text-sm text-foreground/80">{c.label}</span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto text-xs text-foreground/30 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {emotions.length === 0 && (
                  <p className="text-xs text-foreground/25 px-2 py-0.5 italic">No custom emotions yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
