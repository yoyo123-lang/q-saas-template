import { test as base, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "@auth/core/jwt";

const prisma = new PrismaClient();

/** Datos del usuario de test */
interface TestUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
}

/**
 * Fixture que crea sesión autenticada compatible con Auth.js v5 JWT strategy.
 *
 * La configuración usa session: { strategy: "jwt" }, lo que significa que:
 * - La cookie contiene un JWT encriptado (JWE), NO un session token de DB.
 * - prisma.session nunca se consulta con JWT strategy → no crear sesiones en DB.
 * - Se crea usuario + org + membership en DB para que los callbacks funcionen.
 */
export const test = base.extend<{ authedPage: Page; testUser: TestUser }>({
  // eslint-disable-next-line no-empty-pattern
  testUser: async ({}, use) => {
    const testUser: TestUser = {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@e2e.local`,
      name: "Usuario E2E",
      role: "ADMIN",
    };
    await use(testUser);
  },

  authedPage: async ({ page, testUser }, use) => {
    const orgId = `auth-org-${testUser.id}`;

    // Crear usuario en DB (requerido para jwt callback)
    await prisma.user.create({
      data: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
      },
    });

    // Crear org + membership para que el dashboard cargue
    await prisma.organization.create({
      data: { id: orgId, name: "Org E2E", slug: orgId },
    });
    await prisma.membership.create({
      data: { userId: testUser.id, organizationId: orgId, role: "OWNER" },
    });

    // Crear JWT encriptado tal como lo haría Auth.js v5 con strategy: "jwt"
    // El salt debe coincidir con el nombre de la cookie (convención de Auth.js v5)
    const secret = process.env.NEXTAUTH_SECRET ?? "ci-test-secret-not-for-production";
    const cookieName = "authjs.session-token";
    const jwtToken = await encode({
      token: {
        sub: testUser.id,
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      secret,
      salt: cookieName,
    });

    // Inyectar cookie con JWT válido para Auth.js v5
    await page.context().addCookies([
      {
        name: cookieName,
        value: jwtToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await use(page);

    // Cleanup: membership, org y usuario (no hay sesión en DB con JWT strategy)
    await prisma.membership.deleteMany({ where: { userId: testUser.id } });
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {
      // Puede fallar si cascading deletes ya lo eliminaron
    });
  },
});

export { expect } from "@playwright/test";
