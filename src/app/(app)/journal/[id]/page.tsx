import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { authOptions } from "@/lib/auth";
import { getDEK } from "@/lib/session/dek-store";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";

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

  const entry = await prisma.entry.findUnique({
    where: { id },
    include: { tags: true },
  });

  if (!entry) notFound();

  const title = entry.title ? decryptString(entry.title, dek) : null;
  const body = decryptString(entry.body, dek);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/journal" className="text-sm text-neutral-400 hover:text-white transition-colors">
          ← Journal
        </Link>
        <Link
          href={`/journal/${entry.id}/edit`}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Edit
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-1">
        {title ?? <span className="text-neutral-500 italic">Untitled</span>}
      </h1>
      <p className="text-sm text-neutral-500 mb-4">
        {new Date(entry.entryDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        {entry.mood && ` · ${entry.mood}`}
      </p>

      {entry.tags.length > 0 && (
        <div className="flex gap-1 mb-6 flex-wrap">
          {entry.tags.map((t) => (
            <span
              key={t.id}
              className="text-xs px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded-full"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="prose prose-invert prose-neutral max-w-none
        prose-headings:text-white prose-headings:font-semibold
        prose-p:text-neutral-300 prose-p:leading-7
        prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-white
        prose-code:text-indigo-300 prose-code:bg-neutral-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-700
        prose-blockquote:border-l-indigo-500 prose-blockquote:text-neutral-400
        prose-li:text-neutral-300
        prose-hr:border-neutral-700
        prose-table:text-neutral-300
        prose-th:text-neutral-200 prose-th:border-neutral-700
        prose-td:border-neutral-700">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
        >
          {body}
        </ReactMarkdown>
      </div>
    </div>
  );
}
