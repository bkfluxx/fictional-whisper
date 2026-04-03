"use client";

import { useState } from "react";
import StatCard from "@/components/analytics/StatCard";
import HorizontalBar from "@/components/analytics/HorizontalBar";
import MonthlyBars from "@/components/analytics/MonthlyBars";
import ActivityHeatmap from "@/components/analytics/ActivityHeatmap";
import DigestSection from "@/components/analytics/DigestSection";
import InsightsSection from "@/components/analytics/InsightsSection";

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
  digests,
  latestInsight,
}: AnalyticsTabsProps) {
  const [active, setActive] = useState<Tab>("stats");

  const dowMax = Math.max(...dowCounts, 1);
  const latestDigest = digests[0] ?? null;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-base-200 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? "border-indigo-500 text-base-content"
                : "border-transparent text-base-content/40 hover:text-base-content/80"
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
            <p className="text-base-content/40">
              No entries yet — start writing and your stats will appear here.
            </p>
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
                <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-widest mb-4">
                  Activity — last 52 weeks
                </h2>
                <ActivityHeatmap weeks={heatmapWeeks} />
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                <section>
                  <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-widest mb-4">
                    Entries per month
                  </h2>
                  <MonthlyBars data={monthlyData} />
                </section>

                <section>
                  <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-widest mb-4">
                    Day of week
                  </h2>
                  <div>
                    {DOW.map((day, i) => (
                      <HorizontalBar
                        key={day}
                        label={day}
                        count={dowCounts[i]}
                        max={dowMax}
                        color="bg-indigo-500"
                      />
                    ))}
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section>
                  <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-widest mb-4">
                    Mood breakdown
                  </h2>
                  {moodBreakdown.length === 0 ? (
                    <p className="text-sm text-base-content/30">No mood data yet.</p>
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
                  <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-widest mb-4">
                    Top categories
                  </h2>
                  {categoryBreakdown.length === 0 ? (
                    <p className="text-sm text-base-content/30">No categories used yet.</p>
                  ) : (
                    categoryBreakdown.map(({ name, count }) => (
                      <HorizontalBar
                        key={name}
                        label={name}
                        count={count}
                        max={categoryBreakdown[0].count}
                        color="bg-violet-500"
                      />
                    ))
                  )}
                </section>
              </div>
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
