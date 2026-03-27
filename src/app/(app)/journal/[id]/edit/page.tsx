import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDEK } from "@/lib/session/dek-store";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import EntryForm from "@/components/entries/EntryForm";
import type { DecryptedEntry } from "@/types/entry";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.jti) redirect("/login");

  const dek = getDEK(session.jti);
  if (!dek) redirect("/login");

  const entry = await prisma.entry.findUnique({ where: { id }, include: { tags: true } });

  if (!entry) notFound();

  const initial: DecryptedEntry = {
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    entryDate: entry.entryDate.toISOString(),
    title: entry.title ? decryptString(entry.title, dek) : null,
    body: decryptString(entry.body, dek),
    mood: entry.mood,
    categories: entry.categories,
    tags: entry.tags,
  };

  return (
    <div className="h-full flex flex-col">
      <EntryForm initial={initial} />
    </div>
  );
}
