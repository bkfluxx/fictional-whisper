import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EntryForm from "@/components/entries/EntryForm";
import TemplatePicker from "@/components/templates/TemplatePicker";
import { findBuiltIn } from "@/lib/templates";
import type { JournalTemplate } from "@prisma/client";

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { from } = await searchParams;

  // No ?from param → show template picker
  if (!from) {
    const [dbTemplates, settings] = await Promise.all([
      prisma.journalTemplate.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.appSettings.findUnique({
        where: { id: "singleton" },
        select: { journalingIntention: true },
      }),
    ]);
    const userTemplates = dbTemplates.filter((t) => !t.builtinId);
    const overrideRows = dbTemplates.filter((t) => t.builtinId !== null);
    const overrides: Record<string, JournalTemplate> = {};
    for (const row of overrideRows) overrides[row.builtinId!] = row;

    return (
      <div className="h-full overflow-y-auto">
        <TemplatePicker
          userTemplates={userTemplates}
          overrides={overrides}
          journalingIntentions={settings?.journalingIntention ?? []}
        />
      </div>
    );
  }

  // ?from=blank → bare editor
  if (from === "blank") {
    return (
      <div className="h-full flex flex-col">
        <EntryForm />
      </div>
    );
  }

  // ?from=[id] → look up template (built-in first, then DB)
  const builtIn = findBuiltIn(from);
  if (builtIn) {
    // Check if there's a DB override with a different body
    const override = await prisma.journalTemplate.findUnique({
      where: { builtinId: from },
    });
    // If hidden via override, fall back to blank
    if (override?.hidden) redirect("/journal/new?from=blank");
    return (
      <div className="h-full flex flex-col">
        <EntryForm
          initialBody={override?.body ?? builtIn.body}
          initialCategories={override?.categories ?? builtIn.categories}
        />
      </div>
    );
  }

  const userTemplate = await prisma.journalTemplate.findUnique({ where: { id: from } });
  if (userTemplate) {
    return (
      <div className="h-full flex flex-col">
        <EntryForm
          initialBody={userTemplate.body}
          initialCategories={userTemplate.categories}
        />
      </div>
    );
  }

  // Unknown ID — fall back to blank
  redirect("/journal/new?from=blank");
}
