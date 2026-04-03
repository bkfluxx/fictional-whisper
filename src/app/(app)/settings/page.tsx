import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SettingsTabs from "@/components/settings/SettingsTabs";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-base-content mb-6">Settings</h1>
      <SettingsTabs />
    </div>
  );
}
