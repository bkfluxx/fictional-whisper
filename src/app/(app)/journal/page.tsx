import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDEK } from "@/lib/session/dek-store";
import { decryptString } from "@/lib/crypto";
import { getJournalType } from "@/lib/journal-types";
import JournalView, { type DayGroup, type CategoryLabel } from "@/components/journal/JournalView";

function formatDay(dateStr: string): { weekday: string; date: string } {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);
  const dayDate = new Date(d);
  dayDate.setHours(0, 0, 0, 0);

  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });

  if (dayDate.getTime() === today.getTime()) return { weekday: "Today", date: datePart };
  if (dayDate.getTime() === yesterday.getTime()) return { weekday: "Yesterday", date: datePart };
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: datePart,
  };
}

function textPreview(html: string, maxLen = 140): string {
  // Strip heading tags AND their content — headings are template scaffolding,
  // not entry body text worth previewing.
  const noHeadings = html.replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, " ");
  const text = noHeadings.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; from?: string; to?: string; category?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.jti) redirect("/login");

  const dek = getDEK(session.jti);
  if (!dek) redirect("/login");

  const { tag, from, to, category } = await searchParams;
  const categoryDef = category ? getJournalType(category) : null;

  const [entries, userCategories] = await Promise.all([
    prisma.entry.findMany({
      where: {
        ...(tag ? { tags: { some: { name: tag } } } : {}),
        ...(category ? { categories: { has: category } } : {}),
        ...(from || to
          ? {
              entryDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        tags: { select: { id: true, name: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: { entryDate: "desc" },
      take: 100,
    }),
    prisma.userCategory.findMany({ select: { id: true, name: true, emoji: true } }),
  ]);

  // Build a lookup for user-created categories by ID
  const userCatMap = new Map(userCategories.map((c) => [c.id, c]));

  // Build decrypted day groups for the client component
  const grouped = new Map<string, DayGroup>();
  for (const e of entries) {
    const key = e.entryDate.toISOString().slice(0, 10);
    if (!grouped.has(key)) {
      const { weekday, date } = formatDay(key);
      grouped.set(key, { day: key, weekday, date, entries: [] });
    }

    const title = e.title ? decryptString(e.title, dek) : null;
    const body = decryptString(e.body, dek);
    const preview = textPreview(body);
    const hasVoice = e._count.attachments > 0;

    // Resolve each category ID to a label — built-in types first, then user categories
    const categoryLabels: CategoryLabel[] = e.categories.map((id) => {
      const builtin = getJournalType(id);
      if (builtin) return { id, emoji: builtin.emoji, name: builtin.name };
      const user = userCatMap.get(id);
      if (user) return { id, emoji: user.emoji, name: user.name };
      return { id, emoji: "📝", name: id };
    });

    grouped.get(key)!.entries.push({
      id: e.id,
      title,
      preview,
      hasVoice,
      isVoiceOnly: hasVoice && !preview,
      mood: e.mood,
      categoryLabels,
      tags: e.tags,
    });
  }
  const days = [...grouped.values()];

  const heading = categoryDef ? `${categoryDef.emoji} ${categoryDef.name}` : "Journal";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-8 pb-4 shrink-0">
        <h1 className="text-xl font-semibold text-base-content">{heading}</h1>
        <Link
          href="/journal/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          New entry
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📖</div>
          <p className="text-base-content/40 text-sm">No entries yet.</p>
          <Link
            href="/journal/new"
            className="mt-4 inline-block text-indigo-500 hover:text-indigo-400 text-sm transition-colors"
          >
            Write your first entry →
          </Link>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <JournalView days={days} />
        </div>
      )}
    </div>
  );
}
