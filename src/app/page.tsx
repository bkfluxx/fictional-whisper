export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const keyStore = await prisma.keyStore.findUnique({
    where: { id: "singleton" },
    select: { id: true },
  });
  if (!keyStore) redirect("/setup");
  redirect("/journal");
}
