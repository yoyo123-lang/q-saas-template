"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { onboardingConfig } from "@/config/onboarding.config";
import { slugify } from "@/lib/utils/slugify";
import { ACTIVE_ORG_COOKIE } from "@/lib/auth/guards";
import type { OnboardingType } from "@prisma/client";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSessionUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

async function getActiveProgress(userId: string) {
  return prisma.onboardingProgress.findFirst({
    where: { userId, completedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

// ─── startOnboarding ─────────────────────────────────────────────────────────

/**
 * Crea un OnboardingProgress para el usuario y redirige al primer paso.
 * Si ya existe un onboarding en curso, redirige al paso actual.
 */
export async function startOnboarding(type: OnboardingType): Promise<void> {
  const userId = await getSessionUserId();

  // Si ya tiene uno en curso, redirigir al paso actual
  const existing = await getActiveProgress(userId);
  if (existing) {
    if (existing.type === "BUSINESS") redirect("/onboarding/organization");
    else redirect("/onboarding/profile");
  }

  const steps =
    type === "BUSINESS"
      ? onboardingConfig.businessSteps
      : onboardingConfig.personalSteps;

  await prisma.onboardingProgress.create({
    data: {
      userId,
      type,
      currentStep: 1,
      totalSteps: steps.length,
    },
  });

  if (type === "BUSINESS") redirect("/onboarding/organization");
  else redirect("/onboarding/profile");
}

// ─── saveOrganizationStep (UNIVERSAL) ────────────────────────────────────────

const organizationSchema = z.object({
  sector: z.enum([
    "COMMERCE",
    "SERVICES",
    "EDUCATION",
    "HEALTH",
    "MANUFACTURING",
    "GASTRONOMY",
    "AGRO",
    "OTHER",
  ]),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  slug: z
    .string()
    .min(2, "El identificador debe tener al menos 2 caracteres")
    .max(60)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Solo letras minúsculas, números y guiones"),
});

type OrganizationInput = z.infer<typeof organizationSchema>;

export type SaveOrganizationResult = { error: string } | { success: true };

/**
 * Paso 1 (UNIVERSAL): Crea la organización y membership.
 * Actualiza OnboardingProgress.currentStep = 2 y redirige a /onboarding/fiscal-data.
 */
export async function saveOrganizationStep(
  input: OrganizationInput
): Promise<SaveOrganizationResult> {
  const userId = await getSessionUserId();

  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { sector, name, slug } = parsed.data;

  // Verificar slug único
  const existingOrg = await prisma.organization.findUnique({ where: { slug } });
  if (existingOrg) {
    return { error: "Ese identificador ya está en uso. Elegí otro." };
  }

  const progress = await getActiveProgress(userId);
  if (!progress) redirect("/onboarding");

  // Crear org y membership en una transacción
  const org = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name, slug, sector },
    });

    await tx.membership.create({
      data: { userId, organizationId: organization.id, role: "OWNER" },
    });

    await tx.onboardingProgress.update({
      where: { id: progress.id },
      data: { currentStep: 2, organizationId: organization.id },
    });

    return organization;
  });

  // Setear cookie active-org-id
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, org.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });

  redirect("/onboarding/fiscal-data");
  // unreachable — redirect() throws; satisfies TypeScript return type
  return { success: true };
}

// ─── saveFiscalDataStep (UNIVERSAL) ──────────────────────────────────────────

const fiscalDataSchema = z.object({
  razonSocial: z.string().min(2, "La razón social debe tener al menos 2 caracteres").max(200),
  cuit: z
    .string()
    .regex(/^\d{2}-\d{8}-\d$/, "Formato de CUIT inválido. Usar XX-XXXXXXXX-X")
    .optional()
    .or(z.literal("")),
  ivaCondition: z.enum([
    "RESPONSABLE_INSCRIPTO",
    "MONOTRIBUTISTA",
    "EXENTO",
    "CONSUMIDOR_FINAL",
    "NO_CATEGORIZADO",
  ]),
  address: z
    .object({
      street: z.string().optional(),
      number: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
  puntoDeVenta: z
    .number()
    .int()
    .min(1)
    .max(99999)
    .optional(),
});

type FiscalDataInput = z.infer<typeof fiscalDataSchema>;

export type SaveFiscalDataResult = { error: string } | { success: true };

/**
 * Paso 2 (UNIVERSAL): Guarda datos fiscales en Organization.fiscalData.
 * Si hay pasos BU-specific → redirige al siguiente paso.
 * Si no hay más pasos → marca onboarding completado y redirige a /dashboard.
 */
export async function saveFiscalDataStep(
  input: FiscalDataInput
): Promise<SaveFiscalDataResult> {
  const userId = await getSessionUserId();

  const parsed = fiscalDataSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const progressRaw = await getActiveProgress(userId);
  if (!progressRaw || !progressRaw.organizationId) {
    redirect("/onboarding");
    return { success: true }; // unreachable
  }
  const progress = progressRaw as typeof progressRaw & { organizationId: string };

  const { razonSocial, cuit, ivaCondition, address, puntoDeVenta } = parsed.data;

  // Actualizar fiscalData en la organización
  await prisma.organization.update({
    where: { id: progress.organizationId },
    data: {
      fiscalData: {
        razonSocial,
        ...(cuit ? { cuit } : {}),
        ivaCondition,
        ...(address ? { address } : {}),
        ...(puntoDeVenta !== undefined ? { puntoDeVenta } : {}),
      },
    },
  });

  // Determinar siguiente paso
  const buSpecificSteps = onboardingConfig.businessSteps.filter(
    (s) => s.id !== "organization" && s.id !== "fiscal-data"
  );
  const nextBuStep = buSpecificSteps[0]; // primer paso BU-specific

  if (nextBuStep) {
    // Hay pasos BU-specific: actualizar currentStep y redirigir
    await prisma.onboardingProgress.update({
      where: { id: progress.id },
      data: { currentStep: 3 },
    });
    redirect(`/onboarding/${nextBuStep.id}`);
  } else {
    // No hay más pasos: completar onboarding
    await prisma.onboardingProgress.update({
      where: { id: progress.id },
      data: { currentStep: progress.totalSteps, completedAt: new Date() },
    });
    redirect("/dashboard");
  }
  // unreachable — redirect() throws; satisfies TypeScript return type
  return { success: true };
}

// ─── Step route map (used by skip + navigation) ──────────────────────────────

const STEP_ROUTES: Record<string, string> = {
  "organization": "/onboarding/organization",
  "fiscal-data": "/onboarding/fiscal-data",
  // --- BU-SPECIFIC STEP ROUTES ---
  // Agregá acá los routes de tus pasos BU-specific:
  // "first-product": "/onboarding/first-product",
  // "first-contact": "/onboarding/first-contact",
  "example-step": "/onboarding/example-step",
  // --- PERSONAL STEP ROUTES ---
  "profile": "/onboarding/profile",
  "workspace": "/onboarding/workspace",
};

// ─── skipOnboardingStep ───────────────────────────────────────────────────────

/**
 * Omite el paso actual si tiene required: false.
 * Avanza el currentStep o completa el onboarding si era el último paso.
 */
export async function skipOnboardingStep(): Promise<void> {
  const userId = await getSessionUserId();

  const progress = await getActiveProgress(userId);
  if (!progress) redirect("/onboarding");

  const steps =
    progress.type === "BUSINESS"
      ? onboardingConfig.businessSteps
      : onboardingConfig.personalSteps;

  const currentStepConfig = steps[progress.currentStep - 1];

  // Solo se puede omitir si required === false
  if (!currentStepConfig || currentStepConfig.required) {
    const currentRoute = STEP_ROUTES[currentStepConfig?.id ?? ""];
    redirect(currentRoute ?? "/onboarding");
  }

  const newCurrentStep = progress.currentStep + 1;

  if (newCurrentStep > progress.totalSteps) {
    // Último paso: completar onboarding
    await prisma.onboardingProgress.update({
      where: { id: progress.id },
      data: { currentStep: progress.totalSteps, completedAt: new Date() },
    });
    redirect("/dashboard");
  }

  // Avanzar al siguiente paso
  const nextStepConfig = steps[newCurrentStep - 1];
  await prisma.onboardingProgress.update({
    where: { id: progress.id },
    data: { currentStep: newCurrentStep },
  });

  const nextRoute = STEP_ROUTES[nextStepConfig.id];
  redirect(nextRoute ?? "/onboarding");
}

// ─── saveExampleStep (BU-SPECIFIC EXAMPLE) ───────────────────────────────────

const exampleStepSchema = z.object({
  value: z.string().min(1, "El valor es requerido").max(200),
  notes: z.string().max(500).optional(),
});

type ExampleStepInput = z.infer<typeof exampleStepSchema>;

export type SaveExampleStepResult = { error: string } | { success: true };

/**
 * Ejemplo de paso BU-specific.
 * Reemplazá esta función con la lógica específica de tu producto.
 *
 * Guardá los datos del paso en progress.data y avanzá al siguiente paso.
 * Si es el último paso, completá el onboarding y redirigí a /dashboard.
 */
export async function saveExampleStep(
  input: ExampleStepInput
): Promise<SaveExampleStepResult> {
  const userId = await getSessionUserId();

  const parsed = exampleStepSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const progress = await getActiveProgress(userId);
  if (!progress) {
    redirect("/onboarding");
    return { success: true }; // unreachable
  }

  const { value, notes } = parsed.data;

  const newCurrentStep = progress.currentStep + 1;
  const isLastStep = newCurrentStep > progress.totalSteps;

  await prisma.onboardingProgress.update({
    where: { id: progress.id },
    data: {
      currentStep: isLastStep ? progress.totalSteps : newCurrentStep,
      completedAt: isLastStep ? new Date() : null,
      data: { ...(progress.data as object), exampleValue: value, exampleNotes: notes ?? null },
    },
  });

  if (isLastStep) {
    redirect("/dashboard");
  } else {
    const steps = onboardingConfig.businessSteps;
    const nextStepConfig = steps[newCurrentStep - 1];
    const nextRoute = STEP_ROUTES[nextStepConfig?.id ?? ""] ?? "/onboarding";
    redirect(nextRoute);
  }

  return { success: true }; // unreachable
}

// ─── saveProfileStep (PERSONAL) ───────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(1, "El nombre es requerido").max(100),
  phone: z.string().max(50).optional(),
});

type ProfileInput = z.infer<typeof profileSchema>;

export type SaveProfileResult = { error: string } | { success: true };

/**
 * Paso personal 1: Actualiza el nombre del usuario y avanza al paso 2.
 */
export async function saveProfileStep(
  input: ProfileInput
): Promise<SaveProfileResult> {
  const userId = await getSessionUserId();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const progress = await getActiveProgress(userId);
  if (!progress) {
    redirect("/onboarding");
    return { success: true }; // unreachable
  }

  const { fullName, phone } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { name: fullName },
    });

    await tx.onboardingProgress.update({
      where: { id: progress.id },
      data: {
        currentStep: 2,
        data: { ...(progress.data as object), phone: phone ?? null },
      },
    });
  });

  redirect("/onboarding/workspace");
  return { success: true }; // unreachable
}

// ─── saveWorkspaceStep (PERSONAL) ─────────────────────────────────────────────

const workspaceSchema = z.object({
  workspaceName: z.string().min(1, "El nombre del espacio es requerido").max(100),
  timezone: z.string().max(100).optional(),
});

type WorkspaceInput = z.infer<typeof workspaceSchema>;

export type SaveWorkspaceResult = { error: string } | { success: true };

/**
 * Paso personal 2: Crea la organización personal (workspace) y completa el onboarding.
 */
export async function saveWorkspaceStep(
  input: WorkspaceInput
): Promise<SaveWorkspaceResult> {
  const userId = await getSessionUserId();

  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const progress = await getActiveProgress(userId);
  if (!progress) {
    redirect("/onboarding");
    return { success: true }; // unreachable
  }

  const { workspaceName, timezone } = parsed.data;
  const baseSlug = slugify(workspaceName);

  // Generar slug único con sufijo si es necesario
  let slug = baseSlug;
  let attempts = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempts++;
    slug = `${baseSlug}-${attempts}`;
  }

  const org = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: workspaceName,
        slug,
        sector: "OTHER",
        settings: { timezone: timezone ?? "America/Argentina/Buenos_Aires", isPersonal: true },
      },
    });

    await tx.membership.create({
      data: { userId, organizationId: organization.id, role: "OWNER" },
    });

    await tx.onboardingProgress.update({
      where: { id: progress.id },
      data: {
        currentStep: progress.totalSteps,
        completedAt: new Date(),
        organizationId: organization.id,
      },
    });

    return organization;
  });

  // Setear cookie active-org-id
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, org.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });

  redirect("/dashboard");
  return { success: true }; // unreachable
}

// Re-export slugify for use in client components via server actions
export { slugify };
