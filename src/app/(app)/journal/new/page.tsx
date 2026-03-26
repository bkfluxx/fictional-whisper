import { prisma } from "@/lib/prisma";
import EntryForm from "@/components/entries/EntryForm";

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;

  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { journalTypes: true },
  });

  return (
    <div className="h-full flex flex-col">
      <EntryForm
        availableJournalTypes={settings?.journalTypes ?? []}
        defaultJournalType={type}
      />
    </div>
  );
}
