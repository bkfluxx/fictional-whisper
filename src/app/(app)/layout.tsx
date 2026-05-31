import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import SidebarNav from "@/components/layout/SidebarNav";
import MobileNav from "@/components/layout/MobileNav";
import OllamaWarmup from "@/components/layout/OllamaWarmup";
import IdleLogout from "@/components/layout/IdleLogout";
import ToasterProvider from "@/components/layout/ToasterProvider";

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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border flex-col py-4 px-3">
        <div className="flex items-center gap-2.5 px-3 mb-5">
          <Image src="/logo.jpg" alt="Aura" width={32} height={32} className="rounded-lg shrink-0" priority unoptimized />
          <span className="text-sm font-semibold text-foreground">Aura</span>
        </div>

        <SidebarNav />
      </aside>

      {/* Mobile top bar + slide-over drawer */}
      <MobileNav />

      {/* Main content — top padding on mobile clears the fixed top bar */}
      <main className="flex-1 overflow-y-auto min-h-0 pt-mobile-header">{children}</main>
      <OllamaWarmup />
      <IdleLogout />
      <ToasterProvider />
    </div>
  );
}
