"use client";

import { useState, useEffect } from "react";

type Status = "active" | "completed" | "paused";

interface Goal {
  id: string;
  title: string;
  notes: string | null;
  status: Status;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  completed: "Completed",
  paused: "Paused",
};

const STATUS_STYLE: Record<Status, string> = {
  active: "bg-indigo-500/15 text-indigo-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  paused: "bg-base-content/10 text-base-content/50",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

// ── Add / Edit form ───────────────────────────────────────────────────────────
function GoalForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Goal>;
  onSave: (data: { title: string; notes: string; targetDate: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [targetDate, setTargetDate] = useState(
    initial?.targetDate ? initial.targetDate.slice(0, 10) : "",
  );

  return (
    <div className="bg-base-200 border border-base-content/10 rounded-xl p-5 space-y-4">
      <div>
        <label className="text-xs text-base-content/50 mb-1 block">Goal</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you want to achieve?"
          className="w-full bg-base-100 border border-base-content/10 rounded-lg px-3 py-2 text-sm text-base-content placeholder-base-content/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
        />
      </div>
      <div>
        <label className="text-xs text-base-content/50 mb-1 block">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why does this matter? Any context or milestones…"
          rows={3}
          className="w-full bg-base-100 border border-base-content/10 rounded-lg px-3 py-2 text-sm text-base-content placeholder-base-content/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
        />
      </div>
      <div>
        <label className="text-xs text-base-content/50 mb-1 block">Target date (optional)</label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="bg-base-100 border border-base-content/10 rounded-lg px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ title, notes, targetDate })}
          disabled={!title.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
        >
          {initial?.id ? "Save changes" : "Add goal"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-base-content/40 hover:text-base-content border border-base-content/10 hover:border-base-content/30 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Goal card ─────────────────────────────────────────────────────────────────
function GoalCard({
  goal,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onStatusChange: (id: string, status: Status) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const days = goal.targetDate ? daysUntil(goal.targetDate) : null;

  return (
    <div className={`bg-base-200 border rounded-xl p-4 transition-opacity ${
      goal.status === "completed" ? "opacity-60" : ""
    } border-base-content/10`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() =>
            onStatusChange(goal.id, goal.status === "completed" ? "active" : "completed")
          }
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
            goal.status === "completed"
              ? "bg-emerald-500 border-emerald-500"
              : "border-base-content/30 hover:border-indigo-400"
          }`}
        >
          {goal.status === "completed" && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium text-base-content ${goal.status === "completed" ? "line-through" : ""}`}>
              {goal.title}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[goal.status]}`}>
              {STATUS_LABEL[goal.status]}
            </span>
          </div>

          {goal.notes && (
            <p className="text-xs text-base-content/50 mt-1 leading-relaxed">{goal.notes}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-[11px] text-base-content/40">
            {goal.targetDate && (
              <span className={days !== null && days < 0 ? "text-red-400" : days !== null && days <= 7 ? "text-amber-400" : ""}>
                {days === null ? "" : days < 0
                  ? `${Math.abs(days)}d overdue`
                  : days === 0
                    ? "Due today"
                    : days === 1
                      ? "Due tomorrow"
                      : `Due ${formatDate(goal.targetDate)}`}
              </span>
            )}
            <span>Added {formatDate(goal.createdAt)}</span>
          </div>
        </div>

        {/* Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1 text-base-content/30 hover:text-base-content transition-colors rounded"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-6 z-10 bg-base-100 border border-base-content/10 rounded-xl shadow-xl py-1 w-40"
              onBlur={() => setMenuOpen(false)}
            >
              {(["active", "paused", "completed"] as Status[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(goal.id, s); setMenuOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-base-content/8 ${goal.status === s ? "text-indigo-400 font-medium" : "text-base-content/60"}`}
                >
                  Mark {STATUS_LABEL[s].toLowerCase()}
                </button>
              ))}
              <div className="border-t border-base-content/10 my-1" />
              <button
                onClick={() => { onEdit(goal); setMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-base-content/60 hover:bg-base-content/8 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => { onDelete(goal.id); setMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
type FilterTab = "active" | "all" | "completed";

export default function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<FilterTab>("active");

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data: Goal[]) => { setGoals(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleAdd({ title, notes, targetDate }: { title: string; notes: string; targetDate: string }) {
    if (!title.trim()) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes: notes || undefined, targetDate: targetDate || undefined }),
    });
    if (!res.ok) return;
    const created: Goal = await res.json();
    setGoals((prev) => [created, ...prev]);
    setShowForm(false);
  }

  async function handleEdit({ title, notes, targetDate }: { title: string; notes: string; targetDate: string }) {
    if (!editingGoal || !title.trim()) return;
    const res = await fetch(`/api/goals/${editingGoal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes: notes || undefined, targetDate: targetDate || null }),
    });
    if (!res.ok) return;
    const updated: Goal = await res.json();
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    setEditingGoal(null);
  }

  async function handleStatusChange(id: string, status: Status) {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, status } : g)));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const filtered = goals.filter((g) => {
    if (filter === "active") return g.status === "active" || g.status === "paused";
    if (filter === "completed") return g.status === "completed";
    return true;
  });

  const activeCount = goals.filter((g) => g.status === "active").length;
  const completedCount = goals.filter((g) => g.status === "completed").length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-base-content">Goals</h1>
          {goals.length > 0 && (
            <p className="text-sm text-base-content/40 mt-0.5">
              {activeCount} active · {completedCount} completed
            </p>
          )}
        </div>
        {!showForm && !editingGoal && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            New goal
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6">
          <GoalForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Filter tabs */}
      {goals.length > 0 && (
        <div className="flex gap-1 mb-5 border-b border-base-content/10">
          {(["active", "all", "completed"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                filter === tab
                  ? "border-indigo-500 text-base-content"
                  : "border-transparent text-base-content/40 hover:text-base-content/70"
              }`}
            >
              {tab === "active" ? "In progress" : tab}
            </button>
          ))}
        </div>
      )}

      {/* Goal list */}
      {loading ? (
        <div className="text-center py-20 text-base-content/30 text-sm">Loading…</div>
      ) : goals.length === 0 && !showForm ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-base-content/40 text-sm">No goals yet. Set one to get started.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-block text-indigo-500 hover:text-indigo-400 text-sm transition-colors"
          >
            Add your first goal →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((goal) =>
            editingGoal?.id === goal.id ? (
              <GoalForm
                key={goal.id}
                initial={editingGoal}
                onSave={handleEdit}
                onCancel={() => setEditingGoal(null)}
              />
            ) : (
              <GoalCard
                key={goal.id}
                goal={goal}
                onStatusChange={handleStatusChange}
                onEdit={setEditingGoal}
                onDelete={handleDelete}
              />
            ),
          )}
          {filtered.length === 0 && (
            <p className="text-center py-8 text-base-content/30 text-sm">Nothing here.</p>
          )}
        </div>
      )}
    </div>
  );
}
