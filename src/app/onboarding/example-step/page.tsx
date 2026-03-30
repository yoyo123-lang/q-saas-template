import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { onboardingConfig } from "@/config/onboarding.config";
import { ExampleStepForm } from "@/components/onboarding/example-step-form";

/**
 * Página de ejemplo para paso BU-specific.
 *
 * Instrucciones para personalizar:
 * 1. Renombrá esta carpeta de `example-step` a tu paso (ej: `first-product`)
 * 2. Actualizá el OnboardingStepId en onboarding.config.ts
 * 3. Reemplazá ExampleStepForm con tu componente
 * 4. Implementá la server action correspondiente en lib/actions/onboarding.ts
 */
export default async function ExampleStepPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const progress = await prisma.onboardingProgress.findFirst({
    where: { userId: session.user.id, completedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!progress || progress.type !== "BUSINESS") {
    redirect("/onboarding");
  }

  // Verificar que este paso existe en la config
  const stepConfig = onboardingConfig.businessSteps.find((s) => s.id === "example-step");
  if (!stepConfig) redirect("/onboarding");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Paso de ejemplo</h1>
        <p className="mt-2 text-sm text-gray-500">
          Reemplazá esta página con el primer paso específico de tu producto
        </p>
      </div>

      <ExampleStepForm isRequired={stepConfig.required} />
    </div>
  );
}
