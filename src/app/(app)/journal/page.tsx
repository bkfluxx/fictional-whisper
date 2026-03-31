import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDEK } from "@/lib/session/dek-store";
import { decryptString } from "@/lib/crypto";
import { getJournalType } from "@/lib/journal-types";

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
    take: 50,
  });

  const heading = categoryDef
    ? `${categoryDef.emoji} ${categoryDef.name}`
    : "All entries";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-base-content">{heading}</h1>
        <Link
          href="/journal/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          New entry
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-base-content/40 text-sm">No entries yet. Start writing!</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => {
            const title = e.title ? decryptString(e.title, dek) : null;
            return (
              <li key={e.id}>
                <Link
                  href={`/journal/${e.id}`}
                  className="block px-4 py-3 bg-base-200 hover:bg-base-300 rounded-xl transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-base-content font-medium truncate">
                      {title ?? (
                        <span className="text-base-content/40 italic">Untitled</span>
                      )}
                    </span>
                    <span className="text-xs text-base-content/40 shrink-0">
                      {new Date(e.entryDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {(e.categories.length > 0 || e.tags.length > 0) && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {e.categories.map((c) => {
                        const jt = getJournalType(c);
                        return (
                          <span
                            key={c}
                            className="text-xs px-2 py-0.5 bg-indigo-950 text-indigo-400 rounded-full"
                          >
                            {jt ? `${jt.emoji} ${jt.name}` : c}
                          </span>
                        );
                      })}
                      {e.tags.map((t) => (
                        <span
                          key={t.id}
                          className="text-xs px-2 py-0.5 bg-base-300 text-base-content/60 rounded-full"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
