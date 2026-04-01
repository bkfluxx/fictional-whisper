import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDEK } from "@/lib/session/dek-store";
import { decryptString } from "@/lib/crypto";
import { getJournalType } from "@/lib/journal-types";

const MOOD_DOT: Record<string, string> = {
  great: "bg-emerald-500",
  good: "bg-indigo-500",
  okay: "bg-amber-400",
  tough: "bg-orange-500",
  awful: "bg-red-500",
};

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

// Strip HTML tags and collapse whitespace for body previews
function textPreview(html: string, maxLen = 140): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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

  const entries = await prisma.entry.findMany({
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
    include: { tags: { select: { id: true, name: true } } },
    orderBy: { entryDate: "desc" },
    take: 100,
  });

  // Group by date string YYYY-MM-DD
  const grouped = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = e.entryDate.toISOString().slice(0, 10);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }
  const days = [...grouped.keys()];

  const heading = categoryDef ? `${categoryDef.emoji} ${categoryDef.name}` : "Journal";

  return (
    <div className="px-6 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
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
        /* Wrap in relative container so we can draw one continuous line
           behind all items. FlyonUI's <hr> connectors collapse to 0 height
           for tall cards (auto-sized flex rows), so we draw the line
           ourselves. Left offset = center of timeline-middle column in
           compact mode (--timeline-col-start:0, col-2 = auto = 20px wide). */
        <div className="relative">
          <div className="absolute left-[0.625rem] top-4 bottom-4 w-px bg-base-content/10" />
          <ul className="timeline timeline-vertical timeline-compact">
          {days.map((day, dayIdx) => {
            const dayEntries = grouped.get(day)!;
            const { weekday, date } = formatDay(day);
            return [
              // ── Date marker row ──────────────────────────────────────────
              <li key={`date-${day}`}>
                <div className="timeline-middle">
                  <span className="flex size-3 items-center justify-center rounded-full bg-base-100 ring-1 ring-base-content/20">
                    <span className="size-1.5 rounded-full bg-base-content/40" />
                  </span>
                </div>
                <div className="timeline-end ps-3 py-2">
                  <span className="text-xs font-semibold text-base-content/50">
                    {weekday}
                  </span>
                  <span className="text-xs text-base-content/30 ml-1">{date}</span>
                </div>
              </li>,

              // ── Entry rows ───────────────────────────────────────────────
              ...dayEntries.map((e) => {
                const title = e.title ? decryptString(e.title, dek) : null;
                const body = decryptString(e.body, dek);
                const preview = textPreview(body);

                const firstCat = e.categories[0];
                const jt = firstCat ? getJournalType(firstCat) : null;
                const dotColor = e.mood
                  ? (MOOD_DOT[e.mood] ?? "bg-primary")
                  : jt
                    ? "bg-primary"
                    : "bg-base-content/30";

                return (
                  <li key={e.id}>
                    {/* Dot marker */}
                    <div className="timeline-middle">
                      <span className="bg-base-content/10 flex size-5 items-center justify-center rounded-full">
                        <span className={`size-2.5 rounded-sm ${dotColor}`} />
                      </span>
                    </div>

                    {/* Entry card */}
                    <div className="timeline-end timeline-box ms-3 mb-2 w-full border-base-content/10 bg-base-200 hover:bg-base-content/8 transition-colors p-0 overflow-hidden">
                      <Link href={`/journal/${e.id}`} className="block px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-semibold text-base-content leading-snug">
                            {title ?? (
                              <span className="text-base-content/40 font-normal italic">
                                Untitled
                              </span>
                            )}
                          </span>
                          {jt && (
                            <span className="text-base shrink-0 leading-none mt-0.5">
                              {jt.emoji}
                            </span>
                          )}
                        </div>

                        {preview && (
                          <p className="text-xs text-base-content/50 mt-1 leading-relaxed line-clamp-2">
                            {preview}
                          </p>
                        )}

                        {(e.categories.length > 0 || e.tags.length > 0 || e.mood) && (
                          <div className="flex gap-1 mt-2 flex-wrap items-center">
                            {e.mood && (
                              <span className="text-xs px-2 py-0.5 bg-base-content/10 text-base-content/60 rounded-full capitalize">
                                {e.mood}
                              </span>
                            )}
                            {e.categories.map((c) => {
                              const catJt = getJournalType(c);
                              return (
                                <span
                                  key={c}
                                  className="text-xs px-2 py-0.5 bg-indigo-950 text-indigo-400 rounded-full"
                                >
                                  {catJt ? `${catJt.emoji} ${catJt.name}` : c}
                                </span>
                              );
                            })}
                            {e.tags.map((t) => (
                              <span
                                key={t.id}
                                className="text-xs px-2 py-0.5 bg-base-content/10 text-base-content/60 rounded-full"
                              >
                                #{t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    </div>

                  </li>
                );
              }),
            ];
          })}
          </ul>
        </div>
      )}
    </div>
  );
}
