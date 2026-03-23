import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Capa 1 de protección: verificación rápida de cookie en Edge Runtime.
 *
 * IMPORTANTE: Solo verifica que la cookie de sesión EXISTA, no que sea válida.
 * Una cookie expirada o corrupta pasará este check. Esto es intencional:
 * - El Edge Runtime no puede ejecutar Prisma ni validar sesiones contra DB.
 * - La validación real ocurre en la Capa 2 (layouts y API routes con `auth()`).
 *
 * Modelo de protección completo:
 *   Capa 1 (este middleware) → cookie existe → deja pasar
 *   Capa 2 (dashboard/layout.tsx) → auth() valida sesión contra DB → redirect si inválida
 *   Capa 3 (requireAdmin/requireAuth) → verifica rol para API routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas — no requieren autenticación
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/unauthorized" ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Verificar cookie de sesión (nombre varía entre dev y prod)
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
