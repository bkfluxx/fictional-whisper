import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import SearchBar from "@/components/search/SearchBar";
import SidebarNav from "@/components/layout/SidebarNav";
import OllamaWarmup from "@/components/layout/OllamaWarmup";
import IdleLogout from "@/components/layout/IdleLogout";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { onboardingDone: true },
  });

  if (!settings?.onboardingDone) redirect("/onboarding");

  return (
    <div className="flex h-screen bg-base-100 text-base-content overflow-hidden">
      <aside className="w-56 shrink-0 border-r border-base-200 flex flex-col py-5 px-3">
        <div className="px-3 mb-5">
          <Image src="/logo.jpg" alt="Aura" width={80} height={80} className="rounded-xl" priority unoptimized />
        </div>

        <SidebarNav />

        <div className="mt-auto pt-4 border-t border-base-200">
          <SearchBar />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      <OllamaWarmup />
      <IdleLogout />
    </div>
  );
}
