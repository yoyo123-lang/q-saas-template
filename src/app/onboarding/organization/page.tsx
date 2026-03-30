import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { OrganizationForm } from "@/components/onboarding/organization-form";

export default async function OnboardingOrganizationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const progress = await prisma.onboardingProgress.findFirst({
    where: { userId: session.user.id, completedAt: null, type: "BUSINESS" },
    orderBy: { createdAt: "desc" },
  });

  if (!progress) redirect("/onboarding");

  // Si ya pasó este paso, redirigir al paso actual
  if (progress.currentStep > 1) redirect("/onboarding/fiscal-data");

  // Recuperar datos parciales si el usuario volvió
  const data = progress.data as Record<string, unknown> | null;

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Building2 className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tu organización</h1>
          <p className="text-sm text-gray-500">Creá tu espacio de trabajo</p>
        </div>
      </div>

      <OrganizationForm
        defaultSector={(data?.sector as "OTHER") ?? "OTHER"}
        defaultName={(data?.name as string) ?? ""}
        defaultSlug={(data?.slug as string) ?? ""}
      />
    </div>
  );
}
