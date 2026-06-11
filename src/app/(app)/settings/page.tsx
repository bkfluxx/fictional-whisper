import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SettingsTabs from "@/components/settings/SettingsTabs";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <h1 className="text-xl font-semibold text-foreground mb-8">Settings</h1>
      <SettingsTabs />
    </div>
  );
}
