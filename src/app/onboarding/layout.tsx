import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import { onboardingConfig } from "@/config/onboarding.config";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Q SaaS";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default async function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const progress = await prisma.onboardingProgress.findFirst({
    where: { userId: session.user.id, completedAt: null },
    orderBy: { createdAt: "desc" },
  });

  // Si ya completó el onboarding → dashboard
  const completed = await prisma.onboardingProgress.findFirst({
    where: { userId: session.user.id, completedAt: { not: null } },
  });
  if (completed) {
    redirect("/dashboard");
  }

  const steps =
    progress?.type === "PERSONAL"
      ? onboardingConfig.personalSteps
      : onboardingConfig.businessSteps;

  const currentStep = progress?.currentStep ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold text-gray-900">
            {APP_NAME}
          </Link>
          <span className="text-sm text-gray-500">Configuración inicial</span>
        </div>
      </header>

      {/* Progress bar — solo si hay un onboarding en curso */}
      {progress && currentStep > 0 && (
        <ProgressBar steps={steps} currentStep={currentStep} />
      )}

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </div>
  );
}
