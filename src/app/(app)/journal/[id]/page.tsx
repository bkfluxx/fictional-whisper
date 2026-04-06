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

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/journal" className="text-sm text-base-content/40 hover:text-base-content transition-colors">
          ← Journal
        </Link>
        <Link
          href={`/journal/${entry.id}/edit`}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Edit
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-base-content mb-1">
        {title ?? <span className="text-base-content/40 italic">Untitled</span>}
      </h1>
      <p className="text-sm text-base-content/40 mb-4">
        {new Date(entry.entryDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        {entry.mood && ` · ${entry.mood}`}
      </p>

      {(entry.categories.length > 0 || entry.tags.length > 0) && (
        <div className="flex gap-1 mb-6 flex-wrap">
          {entry.categories.map((c) => {
            const jt = getJournalType(c);
            const uc = userCatMap.get(c);
            const label = jt ? `${jt.emoji} ${jt.name}` : uc ? `${uc.emoji} ${uc.name}` : c;
            return (
              <span key={c} className="text-xs px-2 py-0.5 bg-indigo-950 text-indigo-400 rounded-full">
                {label}
              </span>
            );
          })}
          {entry.tags.map((t) => (
            <span
              key={t.id}
              className="text-xs px-2 py-0.5 bg-base-content/10 text-base-content/60 rounded-full"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div
        className="fw-prose max-w-none"
        dangerouslySetInnerHTML={{ __html: body }}
      />

      {entry._count.attachments > 0 && (
        <div className="mt-8">
          <VoiceNotesList entryId={entry.id} refreshKey={0} />
        </div>
      )}
    </div>
  );
}
