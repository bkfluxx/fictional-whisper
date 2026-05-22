"use client";

import { useState } from "react";
import { BarChart2 } from "lucide-react";
import StatCard from "@/components/analytics/StatCard";
import HorizontalBar from "@/components/analytics/HorizontalBar";
import MonthlyBars from "@/components/analytics/MonthlyBars";
import ActivityHeatmap from "@/components/analytics/ActivityHeatmap";
import DigestSection from "@/components/analytics/DigestSection";
import InsightsSection from "@/components/analytics/InsightsSection";
import EmptyState from "@/components/ui/EmptyState";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Digest {
  id: string;
  weekStart: string;
  content: string;
  entryCount: number;
  createdAt: string;
}

interface Insight {
  content: string;
  entryCount: number;
  rangeFrom: string;
  rangeTo: string;
  generatedAt: string;
}

interface GoalSummary {
  id: string;
  title: string;
  status: string;
  targetDate: string | null;
  createdAt: string;
}

interface AnalyticsTabsProps {
  // Stats
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  uniqueDays: number;
  heatmapWeeks: { date: string; count: number }[][];
  monthlyData: { month: string; count: number }[];
  dowCounts: number[];
  moodBreakdown: [string, number][];
  categoryBreakdown: { name: string; count: number }[];
  // Goals
  goals: GoalSummary[];
  // Weekly Digest
  digests: Digest[];
  // Insights
  latestInsight: Insight | null;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MOOD_EMOJI: Record<string, string> = {
  joyful: "😄",
  content: "😌",
  neutral: "😐",
  reflective: "🤔",
  anxious: "😰",
  frustrated: "😤",
  sad: "😢",
};

const MOOD_COLOR: Record<string, string> = {
  joyful: "bg-yellow-400",
  content: "bg-emerald-500",
  neutral: "bg-neutral-500",
  reflective: "bg-blue-500",
  anxious: "bg-orange-400",
  frustrated: "bg-red-500",
  sad: "bg-blue-600",
};

// ─── Tab definition ───────────────────────────────────────────────────────────

type Tab = "stats" | "digest" | "insights";

const TABS: { id: Tab; label: string }[] = [
  { id: "stats", label: "Stats" },
  { id: "digest", label: "Weekly Digest" },
  { id: "insights", label: "Insights" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalyticsTabs({
  totalEntries,
  currentStreak,
  longestStreak,
  uniqueDays,
  heatmapWeeks,
  monthlyData,
  dowCounts,
  moodBreakdown,
  categoryBreakdown,
  goals,
  digests,
  latestInsight,
}: AnalyticsTabsProps) {
  const [active, setActive] = useState<Tab>("stats");

  const dowMax = Math.max(...dowCounts, 1);
  const latestDigest = digests[0] ?? null;

  // Goals derived stats
  const activeGoals = goals.filter((g) => g.status === "active");
  const pausedGoals = goals.filter((g) => g.status === "paused");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const completionRate =
    goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0;

  function daysUntil(iso: string): number {
    const target = new Date(iso);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / 86400000);
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-border mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? "border-indigo-500 text-foreground"
                : "border-transparent text-foreground/40 hover:text-foreground/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {active === "stats" && (
        <>
          {totalEntries === 0 ? (
            <EmptyState
              icon={BarChart2}
              heading="No data yet"
              subtitle="Write your first journal entry and your stats will start appearing here."
              action={{ label: "Write your first entry", href: "/journal/new" }}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                <StatCard label="Total entries" value={totalEntries} />
                <StatCard
                  label="Current streak"
                  value={currentStreak > 0 ? `${currentStreak}d` : "—"}
                />
                <StatCard
                  label="Longest streak"
                  value={longestStreak > 0 ? `${longestStreak}d` : "—"}
                />
                <StatCard
                  label="Days written"
                  value={uniqueDays}
                  sub={
                    totalEntries > uniqueDays
                      ? `${totalEntries - uniqueDays} days with multiple`
                      : undefined
                  }
                />
              </div>

              <section className="mb-10">
                <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-4">
                  Activity — last 52 weeks
                </h2>
                <ActivityHeatmap weeks={heatmapWeeks} />
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                <section>
                  <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-4">
                    Entries per month
                  </h2>
                  <MonthlyBars data={monthlyData} />
                </section>

                <section>
                  <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-4">
                    Day of week
                  </h2>
                  <div>
                    {DOW.map((day, i) => (
                      <HorizontalBar
                        key={day}
                        label={day}
                        count={dowCounts[i]}
                        max={dowMax}
                        color="bg-primary"
                      />
                    ))}
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                <section>
                  <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-4">
                    Mood breakdown
                  </h2>
                  {moodBreakdown.length === 0 ? (
                    <p className="text-sm text-foreground/30">No mood data yet.</p>
                  ) : (
                    moodBreakdown.map(([mood, count]) => (
                      <HorizontalBar
                        key={mood}
                        label={`${MOOD_EMOJI[mood] ?? "•"} ${mood}`}
                        count={count}
                        max={moodBreakdown[0][1]}
                        color={MOOD_COLOR[mood] ?? "bg-neutral-500"}
                      />
                    ))
                  )}
                </section>

                <section>
                  <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-4">
                    Top categories
                  </h2>
                  {categoryBreakdown.length === 0 ? (
                    <p className="text-sm text-foreground/30">No categories used yet.</p>
                  ) : (
                    categoryBreakdown.map(({ name, count }) => (
                      <HorizontalBar
                        key={name}
                        label={name}
                        count={count}
                        max={categoryBreakdown[0].count}
                        color="bg-chart-2"
                      />
                    ))
                  )}
                </section>
              </div>

              {/* Goals section */}
              {goals.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-4">
                    Goal progress
                  </h2>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-card rounded-xl p-4 text-center">
                      <p className="text-2xl font-semibold text-foreground">{activeGoals.length}</p>
                      <p className="text-xs text-foreground/40 mt-0.5">Active</p>
                    </div>
                    <div className="bg-card rounded-xl p-4 text-center">
                      <p className="text-2xl font-semibold text-primary">{completedGoals.length}</p>
                      <p className="text-xs text-foreground/40 mt-0.5">Completed</p>
                    </div>
                    <div className="bg-card rounded-xl p-4 text-center">
                      <p className="text-2xl font-semibold text-foreground">{completionRate}%</p>
                      <p className="text-xs text-foreground/40 mt-0.5">Completion rate</p>
                    </div>
                  </div>

                  {/* Completion progress bar */}
                  {goals.length > 0 && (
                    <div className="mb-6">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <p className="text-xs text-foreground/30 mt-1.5">
                        {completedGoals.length} of {goals.length} goals completed
                      </p>
                    </div>
                  )}

                  {/* Active & paused goals list */}
                  {(activeGoals.length > 0 || pausedGoals.length > 0) && (
                    <div className="space-y-2">
                      {[...activeGoals, ...pausedGoals].map((g) => {
                        const days = g.targetDate ? daysUntil(g.targetDate) : null;
                        const overdue = days !== null && days < 0;
                        const soon = days !== null && days >= 0 && days <= 7;
                        return (
                          <div
                            key={g.id}
                            className="flex items-center gap-3 bg-card rounded-lg px-3 py-2.5"
                          >
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                g.status === "paused"
                                  ? "bg-foreground/30"
                                  : "bg-primary"
                              }`}
                            />
                            <span className="flex-1 text-sm text-foreground truncate">
                              {g.title}
                            </span>
                            {days !== null && (
                              <span
                                className={`text-[11px] shrink-0 ${
                                  overdue
                                    ? "text-red-400"
                                    : soon
                                      ? "text-amber-400"
                                      : "text-foreground/30"
                                }`}
                              >
                                {overdue
                                  ? `${Math.abs(days)}d overdue`
                                  : days === 0
                                    ? "Due today"
                                    : days === 1
                                      ? "Due tomorrow"
                                      : `${days}d left`}
                              </span>
                            )}
                            {g.status === "paused" && (
                              <span className="text-[10px] text-foreground/30 shrink-0">
                                paused
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* Weekly Digest tab */}
      {active === "digest" && (
        <DigestSection initial={latestDigest} all={digests} />
      )}

      {/* Insights tab */}
      {active === "insights" && (
        <InsightsSection initial={latestInsight} />
      )}
    </div>
  );
}
