import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EntryForm from "@/components/entries/EntryForm";
import TemplatePicker from "@/components/templates/TemplatePicker";
import { findBuiltIn } from "@/lib/templates";

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
    const userTemplates = await prisma.journalTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });
    return (
      <div className="h-full overflow-y-auto">
        <TemplatePicker userTemplates={userTemplates} />
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
    return (
      <div className="h-full flex flex-col">
        <EntryForm initialBody={builtIn.body} initialCategories={builtIn.categories} />
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
