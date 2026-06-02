import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDEK } from "@/lib/session/dek-store";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import { getJournalType } from "@/lib/journal-types";
import VoiceNotesList from "@/components/entries/VoiceNotesList";
import PrivateReveal from "@/components/entries/PrivateReveal";
import CategoryIcon from "@/components/icons/CategoryIcon";
import { MoodPill, MoodFaceIcon } from "@/components/ui/MoodIcon";
import { getMoodLabel, getMoodGroup } from "@/lib/moods";
import DeleteEntryButton from "@/components/entries/DeleteEntryButton";

export default async function EntryViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.jti) redirect("/login");

  const dek = getDEK(session.jti);
  if (!dek) redirect("/login");

  const [entry, userCategories] = await Promise.all([
    prisma.entry.findUnique({
      where: { id },
      include: { tags: true, _count: { select: { attachments: true } } },
    }),
    prisma.userCategory.findMany({ select: { id: true, name: true, emoji: true } }),
  ]);

  if (!entry) notFound();

  // ── Mood snapshot view ────────────────────────────────────────────────────
  if (entry.entryType === "mood") {
    const moodGroup = entry.mood ? getMoodGroup(entry.mood) : null;
    const moodLabel = entry.mood ? getMoodLabel(entry.mood) : null;
    const loggedAt = entry.createdAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const loggedDate = entry.entryDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/journal"
            className="flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Journal
          </Link>
          <DeleteEntryButton entryId={entry.id} />
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          {entry.mood && moodGroup && (
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${moodGroup.colorClass}`}>
              <MoodFaceIcon value={entry.mood} size={52} className={moodGroup.textClass} />
            </div>
          )}
          <h1 className="text-2xl font-semibold text-foreground capitalize mb-1">{moodLabel ?? "Unknown"}</h1>
          <p className="text-sm text-foreground/40">{loggedDate}</p>
          <p className="text-xs text-foreground/30 mt-0.5">Logged at {loggedAt}</p>
        </div>
      </div>
    );
  }

  // ── Regular entry view ────────────────────────────────────────────────────
  const userCatMap = new Map(userCategories.map((c) => [c.id, c]));
  const title = entry.title ? decryptString(entry.title, dek) : null;
  const body = decryptString(entry.body, dek);

  const wordCount = body
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Nav */}
      <div className="flex items-center justify-between mb-10">
        <Link
          href="/journal"
          className="flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground transition-colors min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Journal
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-foreground/30">{wordCount} words</span>
          <Link
            href={`/journal/${entry.id}/edit`}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors min-h-[44px] flex items-center"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Date + mood */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
          {new Date(entry.entryDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        {entry.mood && <MoodPill value={entry.mood} />}
        {entry.isPrivate && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-foreground/8 text-foreground/50 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Private
          </span>
        )}
      </div>

      {/* Categories + tags */}
      {(entry.categories.length > 0 || entry.tags.length > 0) && (
        <div className="flex gap-1.5 mb-8 flex-wrap">
          {entry.categories.map((c) => {
            const jt = getJournalType(c);
            const uc = userCatMap.get(c);
            const label = jt ? jt.name : uc ? uc.name : c;
            return (
              <span key={c} className="inline-flex items-center gap-1 text-xs pl-2 pr-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                <CategoryIcon id={c} className="w-3 h-3 shrink-0" />
                {label}
              </span>
            );
          })}
          {entry.tags.map((t) => (
            <span key={t.id} className="text-xs px-3 py-1 bg-tertiary/10 text-tertiary/80 rounded-full">
              #{t.name}
            </span>
          ))}
        </div>
      )}

      <div className="border-t border-border mb-8" />

      {/* Title + body — blurred behind reveal if private */}
      <PrivateReveal isPrivate={entry.isPrivate} title={title} html={body} />

      {entry._count.attachments > 0 && (
        <div className="mt-10 pt-8 border-t border-border">
          <VoiceNotesList entryId={entry.id} refreshKey={0} />
        </div>
      )}
    </div>
  );
}
