import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <aside className="w-56 shrink-0 border-r border-neutral-800 flex flex-col py-6 px-3 gap-1">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest px-3 mb-2">
          Fictional Whisper
        </span>
        <NavLink href="/journal">Journal</NavLink>
        <NavLink href="/calendar">Calendar</NavLink>
        <NavLink href="/settings">Settings</NavLink>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
    >
      {children}
    </a>
  );
}
