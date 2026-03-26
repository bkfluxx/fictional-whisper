import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SearchBar from "@/components/search/SearchBar";
import SidebarNav from "@/components/layout/SidebarNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <aside className="w-56 shrink-0 border-r border-neutral-800 flex flex-col py-5 px-3">
        <div className="px-3 mb-5">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
            Fictional Whisper
          </span>
        </div>

        <SidebarNav />

        <div className="mt-auto pt-4 border-t border-neutral-800">
          <SearchBar />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
    </div>
  );
}
