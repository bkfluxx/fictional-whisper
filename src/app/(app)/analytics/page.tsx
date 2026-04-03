import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDEK } from "@/lib/session/dek-store";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import { JOURNAL_TYPES } from "@/lib/journal-types";
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs";

// ─── Data helpers ─────────────────────────────────────────────────────────────

function computeStreaks(dates: Date[]): {
  current: number;
  longest: number;
  uniqueDays: number;
} {
  const daySet = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
  const days = [...daySet].sort();
  if (days.length === 0) return { current: 0, longest: 0, uniqueDays: 0 };

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

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 52 * 7 * 86400000);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.jti) redirect("/login");

  const dek = getDEK(session.jti);
  if (!dek) redirect("/login");

  // Fetch all data in parallel
  const [digestRows, insightRow, entries] = await Promise.all([
    prisma.weeklyDigest.findMany({ orderBy: { weekStart: "desc" }, take: 8 }),
    prisma.aiInsight.findUnique({ where: { id: "singleton" } }),
    prisma.entry.findMany({
      select: { entryDate: true, mood: true, categories: true },
      orderBy: { entryDate: "asc" },
    }),
  ]);

  const digests = digestRows.map((r) => ({
    id: r.id,
    weekStart: r.weekStart.toISOString(),
    content: decryptString(r.content, dek),
    entryCount: r.entryCount,
    createdAt: r.createdAt.toISOString(),
  }));

  const latestInsight = insightRow
    ? {
        content: decryptString(insightRow.content, dek),
        entryCount: insightRow.entryCount,
        rangeFrom: insightRow.rangeFrom.toISOString(),
        rangeTo: insightRow.rangeTo.toISOString(),
        generatedAt: insightRow.generatedAt.toISOString(),
      }
    : null;

  const totalEntries = entries.length;
  const { current: currentStreak, longest: longestStreak, uniqueDays } =
    computeStreaks(entries.map((e) => e.entryDate));

  // Mood breakdown
  const moodCounts: Record<string, number> = {};
  for (const e of entries) {
    if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1;
  }
  const moodBreakdown = Object.entries(moodCounts).sort(
    (a, b) => b[1] - a[1],
  ) as [string, number][];

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
  const monthlyData = Object.entries(byMonth).map(([month, count]) => ({
    month,
    count,
  }));

  // Day of week
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) dowCounts[e.entryDate.getDay()]++;

  const heatmapWeeks = buildHeatmapWeeks(entries.map((e) => e.entryDate));

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-base-content mb-8">Analytics</h1>
      <AnalyticsTabs
        totalEntries={totalEntries}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        uniqueDays={uniqueDays}
        heatmapWeeks={heatmapWeeks}
        monthlyData={monthlyData}
        dowCounts={dowCounts}
        moodBreakdown={moodBreakdown}
        categoryBreakdown={categoryBreakdown}
        digests={digests}
        latestInsight={latestInsight}
      />
    </div>
  );
}
