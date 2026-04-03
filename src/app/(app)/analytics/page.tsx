import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDEK } from "@/lib/session/dek-store";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import { JOURNAL_TYPES } from "@/lib/journal-types";
import StatCard from "@/components/analytics/StatCard";
import HorizontalBar from "@/components/analytics/HorizontalBar";
import MonthlyBars from "@/components/analytics/MonthlyBars";
import ActivityHeatmap from "@/components/analytics/ActivityHeatmap";
import DigestSection from "@/components/analytics/DigestSection";

// ─── Data helpers ─────────────────────────────────────────────────────────────

function computeStreaks(dates: Date[]): {
  current: number;
  longest: number;
  uniqueDays: number;
} {
  const daySet = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
  const days = [...daySet].sort();
  if (days.length === 0) return { current: 0, longest: 0, uniqueDays: 0 };

  // Longest consecutive streak
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap =
      (new Date(days[i] + "T00:00:00Z").getTime() -
        new Date(days[i - 1] + "T00:00:00Z").getTime()) /
      86400000;
    if (gap === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak (anchor to today or yesterday)
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const anchor = daySet.has(todayStr)
    ? todayStr
    : daySet.has(yesterdayStr)
      ? yesterdayStr
      : null;

  let current = 0;
  if (anchor) {
    const idx = days.indexOf(anchor);
    current = 1;
    for (let i = idx - 1; i >= 0; i--) {
      const gap =
        (new Date(days[i + 1] + "T00:00:00Z").getTime() -
          new Date(days[i] + "T00:00:00Z").getTime()) /
        86400000;
      if (gap === 1) current++;
      else break;
    }
  }

  return { current, longest: Math.max(longest, current), uniqueDays: days.length };
}

function buildHeatmapWeeks(
  dates: Date[],
): { date: string; count: number }[][] {
  const counts: Record<string, number> = {};
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  // Align start to Sunday, 52 weeks back
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 52 * 7 * 86400000);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // snap to Sunday

  const weeks: { date: string; count: number }[][] = [];
  const cur = new Date(start);
  while (cur <= today) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = cur.toISOString().slice(0, 10);
      week.push({ date: key, count: counts[key] ?? 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// ─── Mood colours ─────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.jti) redirect("/login");

  const dek = getDEK(session.jti);
  if (!dek) redirect("/login");

  // Fetch digests for the DigestSection
  const digestRows = await prisma.weeklyDigest.findMany({
    orderBy: { weekStart: "desc" },
    take: 8,
  });
  const digests = digestRows.map((r) => ({
    id: r.id,
    weekStart: r.weekStart.toISOString(),
    content: decryptString(r.content, dek),
    entryCount: r.entryCount,
    createdAt: r.createdAt.toISOString(),
  }));
  const latestDigest = digests[0] ?? null;

  const entries = await prisma.entry.findMany({
    select: { entryDate: true, mood: true, categories: true },
    orderBy: { entryDate: "asc" },
  });

  const totalEntries = entries.length;
  const { current: currentStreak, longest: longestStreak, uniqueDays } =
    computeStreaks(entries.map((e) => e.entryDate));

  // Mood breakdown
  const moodCounts: Record<string, number> = {};
  for (const e of entries) {
    if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1;
  }
  const moodBreakdown = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const e of entries) {
    for (const c of e.categories) {
      catCounts[c] = (catCounts[c] ?? 0) + 1;
    }
  }
  const categoryBreakdown = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => {
      const def = JOURNAL_TYPES.find((j) => j.id === id);
      return { name: def ? `${def.emoji} ${def.name}` : id, count };
    });

  // Monthly activity (last 12 months)
  const byMonth: Record<string, number> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    byMonth[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
  }
  for (const e of entries) {
    const key = e.entryDate.toISOString().slice(0, 7);
    if (key in byMonth) byMonth[key]++;
  }
  const monthlyData = Object.entries(byMonth).map(([month, count]) => ({ month, count }));

  // Day of week
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) dowCounts[e.entryDate.getDay()]++;
  const dowMax = Math.max(...dowCounts, 1);

  // Heatmap
  const heatmapWeeks = buildHeatmapWeeks(entries.map((e) => e.entryDate));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-base-content mb-8">Analytics</h1>

      {/* Weekly digest — shown even when entry count is zero */}
      <DigestSection initial={latestDigest} all={digests} />

      {totalEntries === 0 ? (
        <p className="text-base-content/40">
          No entries yet — start writing and your stats will appear here.
        </p>
      ) : (
        <>
          {/* Stat cards */}
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

          {/* Activity heatmap */}
          <section className="mb-10">
            <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-widest mb-4">
              Activity — last 52 weeks
            </h2>
            <ActivityHeatmap weeks={heatmapWeeks} />
          </section>

          {/* Monthly + Day of week */}
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

          {/* Mood + Categories */}
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
    </div>
  );
}
