import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { FiscalDataForm } from "@/components/onboarding/fiscal-data-form";

export default async function OnboardingFiscalDataPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const progress = await prisma.onboardingProgress.findFirst({
    where: { userId: session.user.id, completedAt: null, type: "BUSINESS" },
    orderBy: { createdAt: "desc" },
  });

  if (!progress) redirect("/onboarding");

  // Solo se puede acceder a este paso si ya completó el paso 1
  if (progress.currentStep < 2) redirect("/onboarding/organization");

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <FileText className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Datos fiscales</h1>
          <p className="text-sm text-gray-500">Información fiscal de tu organización</p>
        </div>
      </div>

      <FiscalDataForm />
    </div>
  );
}
