import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "./config";
import { prisma } from "@/lib/db";
import type { Membership, Organization } from "@prisma/client";

export const ACTIVE_ORG_COOKIE = "active-org-id";

interface AuthResult {
  error: NextResponse | null;
  userId: string | null;
}

interface OrgResult {
  error: NextResponse | null;
  userId: string | null;
  organizationId: string | null;
}

interface TenantResult {
  error: NextResponse | null;
  userId: string | null;
  organizationId: string | null;
  membership: (Membership & { organization: Organization }) | null;
  organization: Organization | null;
}

/**
 * Verifica que el usuario esté autenticado (cualquier rol).
 * Para server components y API routes.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } },
        { status: 401 }
      ),
      userId: null,
    };
  }

  return { error: null, userId: session.user.id };
}

/**
 * Verifica que el usuario autenticado tenga role ADMIN.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } },
        { status: 401 }
      ),
      userId: null,
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "No autorizado" } },
        { status: 403 }
      ),
      userId: null,
    };
  }

  // Verificar suspensión desde DB — la sesión puede estar cacheada
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });

  if (!dbUser || dbUser.status === "SUSPENDED") {
    return {
      error: NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "No autorizado" } },
        { status: 403 }
      ),
      userId: null,
    };
  }

  return { error: null, userId: session.user.id };
}

/**
 * Verifica auth + membership en la organización indicada.
 * Si orgId no se pasa, lo lee de la cookie active-org-id.
 */
export async function requireOrg(orgId?: string): Promise<OrgResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } },
        { status: 401 }
      ),
      userId: null,
      organizationId: null,
    };
  }

  const userId = session.user.id;

  const organizationId =
    orgId ??
    (async () => {
      const cookieStore = await cookies();
      return cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
    })();

  const resolvedOrgId = typeof organizationId === "string" ? organizationId : await organizationId;

  if (!resolvedOrgId) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: { code: "NO_ACTIVE_ORG", message: "No hay organización activa" },
        },
        { status: 400 }
      ),
      userId: null,
      organizationId: null,
    };
  }

  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId: resolvedOrgId },
    select: { id: true },
  });

  if (!membership) {
    return {
      error: NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "No tenés acceso a esta organización" } },
        { status: 403 }
      ),
      userId: null,
      organizationId: null,
    };
  }

  return { error: null, userId, organizationId: resolvedOrgId };
}

/**
 * Para API routes: verifica auth + lee active-org-id cookie + valida membership.
 * Retorna { session, organization, membership } o un error HTTP.
 * Nunca lanza excepciones — siempre retorna un TenantResult.
 */
export async function requireTenant(): Promise<TenantResult> {
  const empty: TenantResult = {
    error: null,
    userId: null,
    organizationId: null,
    membership: null,
    organization: null,
  };

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        ...empty,
        error: NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } },
          { status: 401 }
        ),
      };
    }

    const userId = session.user.id;

    const cookieStore = await cookies();
    const orgCookie = cookieStore.get(ACTIVE_ORG_COOKIE);

    if (!orgCookie?.value) {
      return {
        ...empty,
        error: NextResponse.json(
          {
            success: false,
            error: {
              code: "NO_ACTIVE_ORG",
              message: "No hay organización activa. Seleccioná una organización.",
            },
          },
          { status: 400 }
        ),
      };
    }

    const organizationId = orgCookie.value;

    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId },
      include: { organization: true },
    });

    if (!membership) {
      return {
        ...empty,
        error: NextResponse.json(
          {
            success: false,
            error: { code: "FORBIDDEN", message: "No tenés acceso a esta organización." },
          },
          { status: 403 }
        ),
      };
    }

    return {
      error: null,
      userId,
      organizationId,
      membership,
      organization: membership.organization,
    };
  } catch (err) {
    console.error("[requireTenant] error inesperado:", err);
    return {
      ...empty,
      error: NextResponse.json(
        {
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Error interno al verificar acceso." },
        },
        { status: 500 }
      ),
    };
  }
}
