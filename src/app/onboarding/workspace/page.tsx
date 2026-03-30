import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { WorkspaceForm } from "@/components/onboarding/workspace-form";

export default async function WorkspacePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const progress = await prisma.onboardingProgress.findFirst({
    where: { userId: session.user.id, completedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!progress || progress.type !== "PERSONAL") {
    redirect("/onboarding");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tu espacio de trabajo</h1>
        <p className="mt-2 text-sm text-gray-500">
          Configurá tu espacio personal en {process.env.NEXT_PUBLIC_APP_NAME || 'la app'}
        </p>
      </div>

      <WorkspaceForm />
    </div>
  );
}
