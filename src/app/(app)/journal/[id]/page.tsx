import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDEK } from "@/lib/session/dek-store";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import { getJournalType } from "@/lib/journal-types";
import VoiceNotesList from "@/components/entries/VoiceNotesList";

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
          className="flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground transition-colors"
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
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
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
        {entry.mood && (
          <span className="text-xs px-2.5 py-0.5 bg-tertiary/12 text-tertiary rounded-full capitalize">
            {entry.mood}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-heading font-normal text-foreground leading-snug mb-6">
        {title ?? <span className="text-foreground/30 italic">Untitled</span>}
      </h1>

      {/* Categories + tags */}
      {(entry.categories.length > 0 || entry.tags.length > 0) && (
        <div className="flex gap-1.5 mb-8 flex-wrap">
          {entry.categories.map((c) => {
            const jt = getJournalType(c);
            const uc = userCatMap.get(c);
            const label = jt ? `${jt.emoji} ${jt.name}` : uc ? `${uc.emoji} ${uc.name}` : c;
            return (
              <span key={c} className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
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

      {/* Body */}
      <div className="fw-prose max-w-none" dangerouslySetInnerHTML={{ __html: body }} />

      {entry._count.attachments > 0 && (
        <div className="mt-10 pt-8 border-t border-border">
          <VoiceNotesList entryId={entry.id} refreshKey={0} />
        </div>
      )}
    </div>
  );
}
