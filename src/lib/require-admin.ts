import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

interface AuthResult {
  error: NextResponse | null;
  userId: string | null;
}

/** Verifica que el usuario autenticado tenga rol ADMIN. */
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

  // Usa el role del session callback — evita una query extra a DB por request
  if (session.user.role !== "ADMIN") {
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

/** Verifica que el usuario esté autenticado (cualquier rol). */
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
