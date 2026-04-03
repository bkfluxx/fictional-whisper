import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SearchBar from "@/components/search/SearchBar";
import SidebarNav from "@/components/layout/SidebarNav";
import OllamaWarmup from "@/components/layout/OllamaWarmup";

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
          <span className="text-xs font-semibold text-base-content/40 uppercase tracking-widest">
            Fictional Whisper
          </span>
        </div>

        <SidebarNav />

        <div className="mt-auto pt-4 border-t border-base-200">
          <SearchBar />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      <OllamaWarmup />
    </div>
  );
}
