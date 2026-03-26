import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { onboardingDone: true },
  });

  if (settings?.onboardingDone) redirect("/journal");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <OnboardingWizard />
    </div>
  );
}
