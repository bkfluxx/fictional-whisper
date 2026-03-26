import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDEK } from "@/lib/session/dek-store";
import { prisma } from "@/lib/prisma";
import CalendarGrid from "@/components/calendar/CalendarGrid";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.jti) redirect("/login");
  if (!getDEK(session.jti)) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);

  const entries = await prisma.entry.findMany({
    where: { entryDate: { gte: from, lt: to } },
    select: { entryDate: true },
  });

  const counts: Record<string, number> = {};
  for (const e of entries) {
    const key = e.entryDate.toISOString().slice(0, 10);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-white mb-8">Calendar</h1>
      <CalendarGrid year={year} month={month} counts={counts} />
    </div>
  );
}
