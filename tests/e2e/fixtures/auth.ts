import { test as base, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Datos del usuario de test */
interface TestUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
}

/** Fixture que crea sesión autenticada directamente en DB */
export const test = base.extend<{ authedPage: Page; testUser: TestUser }>({
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
    const sessionToken = `e2e-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Crear usuario en DB
    await prisma.user.create({
      data: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
      },
    });

    // Crear sesión válida en DB (expira en 1 hora)
    await prisma.session.create({
      data: {
        sessionToken,
        userId: testUser.id,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Inyectar cookie de sesión en el browser
    // NextAuth v5 usa "authjs.session-token" en dev (sin HTTPS)
    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await use(page);

    // Cleanup: eliminar sesión y usuario de test
    await prisma.session.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {
      // Puede fallar si cascading deletes ya lo eliminaron
    });
  },
});

export { expect } from "@playwright/test";
