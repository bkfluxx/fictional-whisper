import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PasswordChangeForm from "@/components/settings/PasswordChangeForm";
import JournalTypesSettings from "@/components/settings/JournalTypesSettings";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { journalTypes: true },
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-12">
      <h1 className="text-xl font-semibold text-white">Settings</h1>

      {/* Security */}
      <section>
        <div className="mb-5">
          <h2 className="text-base font-medium text-white">Security</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Changing your password re-wraps your encryption key. Your entries stay decryptable and your session stays active.
          </p>
        </div>
        <PasswordChangeForm />
      </section>

      <div className="border-t border-neutral-800" />

      {/* Journal types */}
      <section>
        <div className="mb-5">
          <h2 className="text-base font-medium text-white">My journals</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Add or remove journal types. Changes update the sidebar immediately after saving.
          </p>
        </div>
        <JournalTypesSettings current={settings?.journalTypes ?? []} />
      </section>
    </div>
  );
}
