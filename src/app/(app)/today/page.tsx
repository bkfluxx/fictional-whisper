import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDEK } from "@/lib/session/dek-store";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import Greeting from "@/components/today/Greeting";
import MiniCalendar from "@/components/today/MiniCalendar";
import MoodCheckIn from "@/components/today/MoodCheckIn";
import { MoodPill } from "@/components/ui/MoodIcon";

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

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeStreak(dates: Date[]): number {
  const daySet = new Set(dates.map(localDateStr));
  const todayStr = localDateStr(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = localDateStr(yesterday);
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

function localTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  const todayStr = localDateStr(now);

  const [allDates, todayEntries] = await Promise.all([
    prisma.entry.findMany({
      select: { entryDate: true },
      orderBy: { entryDate: "asc" },
    }),
    prisma.entry.findMany({
      where: {
        entryDate: {
          // No Z suffix — parsed as local time so boundaries respect TZ setting
          gte: new Date(todayStr + "T00:00:00"),
          lte: new Date(todayStr + "T23:59:59.999"),
        },
      },
      orderBy: { createdAt: "desc" },
      include: { tags: { select: { name: true } } },
    }),
  ]);

  const streak = computeStreak(allDates.map((e) => e.entryDate));
  const allEntryDates = allDates.map((e) => localDateStr(e.entryDate));

  const todayDecrypted = todayEntries.map((e) => ({
    id: e.id,
    isPrivate: e.isPrivate,
    mood: e.mood,
    entryType: e.entryType,
    time: localTimeStr(e.createdAt),
    title: e.title ? decryptString(e.title, dek) : null,
    preview: e.entryType === "mood" ? "" : textPreview(decryptString(e.body, dek)),
  }));

  const lastMood = todayDecrypted.find((e) => e.mood)?.mood ?? null;

  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const prompt = getDailyPrompt();

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-300">
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M12 2c0 6-6 8-6 13a6 6 0 0 0 12 0c0-5-6-7-6-13Z" />
              <path d="M12 12c0 3-2 4-2 6a2 2 0 0 0 4 0c0-2-2-3-2-6Z" />
            </svg>
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
          Start writing&nbsp;
          <svg className="inline-block w-3.5 h-3.5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
        </Link>
      </div>

      {/* Mood check-in */}
      <MoodCheckIn todayStr={todayStr} lastMood={lastMood} />

      {/* Mini calendar */}
      <MiniCalendar entryDates={allEntryDates} todayStr={todayStr} />

      {/* Today's entries */}
      {todayDecrypted.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-3">
            Today · {todayDecrypted.length} {todayDecrypted.length === 1 ? "entry" : "entries"}
          </p>
          <div className="space-y-2">
            {todayDecrypted.map((entry) => {
              if (entry.entryType === "mood") {
                return (
                  <Link
                    key={entry.id}
                    href={`/journal/${entry.id}`}
                    className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:bg-foreground/[0.02] transition-colors"
                  >
                    {entry.mood && <MoodPill value={entry.mood} />}
                    <span className="text-xs text-foreground/30 ml-auto">Mood snapshot</span>
                  </Link>
                );
              }
              return (
                <Link
                  key={entry.id}
                  href={`/journal/${entry.id}`}
                  className="block bg-card border border-border rounded-xl px-5 py-4 hover:bg-foreground/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-semibold text-foreground ${entry.isPrivate ? "blur-sm select-none" : ""}`}>
                      {entry.title ?? (
                        <span className="italic font-normal text-foreground/40">Untitled</span>
                      )}
                    </p>
                    {entry.isPrivate && (
                      <svg className="w-3.5 h-3.5 shrink-0 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                    )}
                    {entry.mood && <MoodPill value={entry.mood} className="ml-auto" />}
                  </div>
                  {entry.preview && (
                    <p className={`text-xs text-foreground/50 leading-relaxed line-clamp-2 ${entry.isPrivate ? "blur-sm select-none" : ""}`}>
                      {entry.preview}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
