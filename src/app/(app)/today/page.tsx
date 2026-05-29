import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDEK } from "@/lib/session/dek-store";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import Greeting from "@/components/today/Greeting";

const DAILY_PROMPTS = [
  "What made you feel most like yourself today?",
  "What are you grateful for right now, in this exact moment?",
  "What would you tell your past self from one year ago?",
  "What's one thing you're quietly proud of this week?",
  "What does rest mean to you right now?",
  "Describe a moment today when time seemed to slow down.",
  "What's something small that brought you unexpected joy recently?",
  "What tension are you carrying that you haven't put into words yet?",
  "What conversation have you been putting off?",
  "If today had a title, what would it be?",
  "What did you notice today that you usually overlook?",
  "What would you do differently if you weren't afraid?",
  "What's the most honest thing you could say about how you're feeling?",
  "What were you chasing this week — and was it worth it?",
  "What does your body need right now?",
  "Who have you been lately, and is that who you want to be?",
  "What's one thing you keep almost saying?",
  "When did you last feel truly at ease?",
  "What are you pretending not to know?",
  "What small thing would make tomorrow better than today?",
];

function getDailyPrompt(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
}

function computeStreak(dates: Date[]): number {
  const daySet = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const anchor = daySet.has(todayStr)
    ? todayStr
    : daySet.has(yesterdayStr)
      ? yesterdayStr
      : null;
  if (!anchor) return 0;
  const days = [...daySet].sort();
  const idx = days.indexOf(anchor);
  let streak = 1;
  for (let i = idx - 1; i >= 0; i--) {
    const gap =
      (new Date(days[i + 1] + "T00:00:00Z").getTime() -
        new Date(days[i] + "T00:00:00Z").getTime()) /
      86400000;
    if (gap === 1) streak++;
    else break;
  }
  return streak;
}

function textPreview(html: string, maxLen = 120): string {
  const noHeadings = html.replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, " ");
  const text = noHeadings
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

export default async function TodayPage() {
  const session = await getServerSession(authOptions);
  if (!session?.jti) redirect("/login");
  const dek = getDEK(session.jti);
  if (!dek) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const [allDates, monthEntries, recentEntries] = await Promise.all([
    prisma.entry.findMany({
      select: { entryDate: true },
      orderBy: { entryDate: "asc" },
    }),
    prisma.entry.findMany({
      where: { entryDate: { gte: monthStart, lte: monthEnd } },
      select: { entryDate: true },
    }),
    prisma.entry.findMany({
      orderBy: { entryDate: "desc" },
      take: 1,
      include: { tags: { select: { name: true } } },
    }),
  ]);

  const streak = computeStreak(allDates.map((e) => e.entryDate));
  const writtenDays = new Set(
    monthEntries.map((e) => e.entryDate.toISOString().slice(0, 10)),
  );
  const monthEntryCount = monthEntries.length;

  const recentEntry = recentEntries[0] ?? null;
  const recentTitle = recentEntry?.title ? decryptString(recentEntry.title, dek) : null;
  const recentPreview = recentEntry
    ? textPreview(decryptString(recentEntry.body, dek))
    : null;

  let recentLabel = "";
  if (recentEntry) {
    const d = recentEntry.entryDate.toISOString().slice(0, 10);
    if (d === todayStr) recentLabel = "Today";
    else if (d === yesterdayStr) recentLabel = "Yesterday";
    else
      recentLabel = recentEntry.entryDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
  }

  // Calendar grid
  const daysInMonth = monthEnd.getDate();
  const firstDayOfWeek = monthStart.getDay();
  const monthName = now.toLocaleDateString("en-US", { month: "long" });

  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const prompt = getDailyPrompt();

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      {/* Greeting header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-1">
            {todayLabel}
          </p>
          <Greeting />
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 bg-tertiary text-tertiary-foreground rounded-full px-3.5 py-2 text-sm font-semibold shrink-0 mt-1">
            <span>🔥</span>
            <span>{streak}</span>
          </div>
        )}
      </div>

      {/* Prompt card */}
      <div className="relative bg-surface-dark rounded-2xl p-5 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-surface-dark-foreground/[0.06] pointer-events-none" />
        <p className="text-xs font-semibold uppercase tracking-widest text-surface-dark-foreground/50 mb-2">
          Today's prompt
        </p>
        <p className="text-lg text-surface-dark-foreground/90 italic leading-snug mb-5 font-heading">
          "{prompt}"
        </p>
        <Link
          href="/journal/new"
          className="block w-full bg-primary text-primary-foreground text-sm font-semibold text-center py-3 rounded-xl hover:bg-primary/90 transition-colors"
        >
          Start writing ✦
        </Link>
      </div>

      {/* Mini calendar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
            {monthName} {year}
          </p>
          <p className="text-xs text-primary font-medium">
            {monthEntryCount} {monthEntryCount === 1 ? "entry" : "entries"}
          </p>
        </div>
        <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div
              key={i}
              className="text-center text-xs text-foreground/35 pb-1.5 font-medium"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasEntry = writtenDays.has(dateStr);
            const isToday = dateStr === todayStr;
            return (
              <div key={day} className="flex items-center justify-center py-0.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : hasEntry
                        ? "bg-tertiary text-tertiary-foreground"
                        : "text-foreground/40"
                  }`}
                >
                  {day}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Most recent entry */}
      {recentEntry && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-3">
            {recentLabel}
          </p>
          <Link
            href={`/journal/${recentEntry.id}`}
            className="block bg-card border border-border rounded-xl px-5 py-4 hover:bg-foreground/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              {recentEntry.mood && (
                <span className="text-xs text-foreground/50 capitalize">
                  {recentEntry.mood}
                </span>
              )}
              <span className="text-xs text-foreground/35">
                {recentEntry.entryDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {recentTitle ?? (
                <span className="italic font-normal text-foreground/40">Untitled</span>
              )}
            </p>
            {recentPreview && (
              <p className="text-xs text-foreground/50 leading-relaxed line-clamp-2">
                {recentPreview}
              </p>
            )}
          </Link>
        </div>
      )}
    </div>
  );
}
