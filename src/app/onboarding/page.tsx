import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { onboardingConfig } from "@/config/onboarding.config";
import { TypeSelector } from "@/components/onboarding/type-selector";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Si hay un onboarding en curso, redirigir al paso actual
  const progress = await prisma.onboardingProgress.findFirst({
    where: { userId, completedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (progress) {
    if (progress.type === "BUSINESS") redirect("/onboarding/organization");
    else redirect("/onboarding/profile");
  }

  // Si skipTypeSelection → redirigir al primer paso del tipo default (BUSINESS)
  if (onboardingConfig.skipTypeSelection) {
    const defaultType = onboardingConfig.allowedTypes[0];
    if (defaultType === "PERSONAL") redirect("/onboarding/profile");
    else redirect("/onboarding/organization");
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">¿Cómo vas a usar {process.env.NEXT_PUBLIC_APP_NAME || 'la app'}?</h1>
        <p className="mt-2 text-sm text-gray-500">
          Elegí el tipo de cuenta que mejor se adapta a vos
        </p>
      </div>

      <TypeSelector />
    </div>
  );
}
