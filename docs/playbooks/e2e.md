# Playbook: Tests E2E con Playwright

> Sistema generativo para que Claude Code produzca tests end-to-end automáticamente.
> Stack probado: Next.js 15 + NextAuth v5 + Prisma + PostgreSQL + Playwright.
> Funciona tanto para proyectos nuevos desde el template como para proyectos existentes.

---

## Cuándo usar esto

- El proyecto tiene flujos de usuario que justifican validación end-to-end.
- Querés un gate de CI que verifique que la app funciona antes de mergear.
- Necesitás generar tests e2e para entidades nuevas sin escribirlos a mano.

## Cuándo NO usar esto

- El proyecto solo tiene API sin UI — usar tests de integración con Vitest.
- La UI es estática sin interacciones — no hay qué testear e2e.
- Estás en fase de prototipo rápido — agregar e2e después de estabilizar.

## Qué vas a necesitar

| Componente | Qué es | Ejemplo |
|---|---|---|
| Test runner e2e | Ejecuta tests en browser real | Playwright |
| Fixture de auth | Crea sesión sintética en DB | Custom (Prisma directo) |
| CI runner | Corre tests en cada PR | GitHub Actions |
| App desplegada o local | Target de los tests | Vercel preview URL o `next dev` en CI |

## Variables de entorno

```bash
# Solo necesarias en CI — en local Playwright usa la DB de dev
DATABASE_URL=""              # DB de test o dev
NEXTAUTH_SECRET="test-secret-not-for-production"
PLAYWRIGHT_BASE_URL=""       # URL contra la que correr tests (default: http://localhost:3000)
```

## Arquitectura

```
Tests E2E con Playwright
========================

┌─────────────────────────────────────────────────────────┐
│                    GitHub Actions CI                      │
│                                                          │
│  1. Build app (next build)                               │
│  2. Start server (node .next/standalone/server.js)       │
│  3. Run Playwright tests contra localhost:3000            │
│  4. Upload report como artifact                          │
│                                                          │
│  Alternativa: correr contra Vercel preview URL            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Fixture de Auth                        │
│                                                          │
│  1. Crea User en DB (via Prisma)                         │
│  2. Crea Session con token conocido                      │
│  3. Inyecta cookie `authjs.session-token` en browser     │
│  4. Cleanup automático al terminar el test               │
│                                                          │
│  ¿Por qué no OAuth real?                                 │
│  → Google OAuth requiere browser real + cuenta real       │
│  → Sesión sintética en DB es equivalente funcionalmente   │
│  → NextAuth v5 valida la sesión contra DB, no el origin  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Niveles incrementales                    │
│                                                          │
│  Nivel 0: Smoke         → health + páginas públicas      │
│  Nivel 1: Auth          → sesión funciona, redirect OK   │
│  Nivel 2: CRUD/entidad  → create → list → edit → delete  │
│  Nivel 3: Flujos complejos → multi-paso, permisos, roles │
└─────────────────────────────────────────────────────────┘
```

## Modelo incremental

Cada proyecto adopta hasta el nivel que necesite. No hace falta implementar todos de entrada.

### Nivel 0: Smoke (siempre)

**Qué valida:** la app arranca, el health endpoint responde, las páginas públicas cargan.

**Cuándo adoptarlo:** siempre — es el gate mínimo de CI.

**Tests generados:**
- `GET /api/health` retorna 200 con `status: "ok"`
- `/login` carga sin errores
- `/` (landing) carga sin errores
- Ruta protegida sin auth redirige a `/login`

### Nivel 1: Auth

**Qué valida:** la fixture de auth funciona, el dashboard carga con sesión, el usuario no autenticado es redirigido.

**Cuándo adoptarlo:** cuando el proyecto tiene auth implementado.

**Tests generados:**
- Con sesión sintética → `/dashboard` carga y muestra contenido
- Sin sesión → `/dashboard` redirige a `/login`
- La sesión incluye datos del usuario (nombre, email, rol)

### Nivel 2: CRUD por entidad

**Qué valida:** flujo completo de crear → ver en lista → editar → eliminar para una entidad.

**Cuándo adoptarlo:** cuando se agrega una entidad de negocio al proyecto.

**Tests generados (por entidad):**
- Crear entidad desde formulario → aparece en lista
- Ver detalle de entidad existente
- Editar entidad → cambios reflejados
- Eliminar entidad → desaparece de lista
- Validación de formulario (campos requeridos, formatos)

### Nivel 3: Flujos complejos

**Qué valida:** flujos multi-paso, permisos por rol, estados, transiciones.

**Cuándo adoptarlo:** cuando hay flujos críticos de usuario (checkout, onboarding multi-step, workflows).

**Tests generados (según el flujo):**
- Flujo completo paso a paso
- Permisos: usuario sin rol correcto no puede acceder
- Estados: transiciones válidas funcionan, inválidas fallan
- Edge cases del flujo

## Archivos a crear

### 1. Configuración de Playwright

**Ubicación:** `playwright.config.ts` (raíz del proyecto)

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Descomentar para testear en más browsers:
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  // Server local para desarrollo — en CI se arranca por separado
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
```

### 2. Fixture de autenticación

**Ubicación:** `tests/e2e/fixtures/auth.ts`

```typescript
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
    // NextAuth v5 usa "authjs.session-token" en dev
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
```

### 3. Smoke tests (Nivel 0)

**Ubicación:** `tests/e2e/smoke.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("health endpoint responde OK", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("landing page carga", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveTitle(/error/i);
  });

  test("login page carga", async ({ page }) => {
    await page.goto("/login");
    await expect(page).not.toHaveTitle(/error/i);
  });

  test("ruta protegida redirige a login sin sesión", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
```

### 4. Auth tests (Nivel 1)

**Ubicación:** `tests/e2e/auth.spec.ts`

```typescript
import { test, expect } from "./fixtures/auth";

test.describe("Autenticación", () => {
  test("dashboard carga con sesión válida", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await expect(authedPage).not.toHaveURL(/\/login/);
    // Verificar que hay contenido del dashboard (adaptar selector al proyecto)
    await expect(authedPage.locator("body")).not.toContainText("Iniciar sesión");
  });

  test("sesión muestra datos del usuario", async ({ authedPage, testUser }) => {
    await authedPage.goto("/dashboard");
    // Adaptar: buscar dónde se muestra el nombre o email del usuario
    await expect(authedPage.locator("body")).toContainText(testUser.name);
  });
});
```

## Patrones generativos

> Esta sección es la clave del sistema. Claude Code usa estos patrones para generar tests
> automáticamente para cualquier entidad o flujo del proyecto.

### Patrón: CRUD de entidad

**Input necesario:**
- Nombre de la entidad (ej: "Proyecto", "Cliente", "Factura")
- URL base (ej: "/dashboard/projects", "/dashboard/clients")
- Campos del formulario de creación (ej: `[{id: "name", type: "text", required: true}, {id: "status", type: "select", required: true}]`)
- Campos visibles en la lista (ej: `["name", "status"]`)
- ¿Tiene soft delete? (sí/no)

**Template de test generado:**

```typescript
// tests/e2e/[entidad-kebab].spec.ts
import { test, expect } from "./fixtures/auth";

const ENTITY_URL = "/dashboard/[url-base]";
const ENTITY_NAME = "[Entidad]";

test.describe(`CRUD de ${ENTITY_NAME}`, () => {
  test("crear entidad desde formulario", async ({ authedPage }) => {
    await authedPage.goto(ENTITY_URL);

    // Abrir formulario de creación (adaptar al UI del proyecto)
    await authedPage.getByRole("button", { name: /crear|nuevo|agregar/i }).click();

    // Completar campos — ADAPTAR según los campos reales
    // Para input text:
    await authedPage.getByLabel("[Label del campo]").fill("[Valor de test]");
    // Para select:
    await authedPage.getByLabel("[Label del campo]").selectOption("[Valor]");
    // Para checkbox:
    await authedPage.getByLabel("[Label del campo]").check();

    // Enviar formulario
    await authedPage.getByRole("button", { name: /guardar|crear|enviar/i }).click();

    // Verificar que aparece en la lista
    await expect(authedPage.getByText("[Valor de test]")).toBeVisible();
  });

  test("editar entidad existente", async ({ authedPage }) => {
    await authedPage.goto(ENTITY_URL);

    // Click en la entidad existente o botón de editar — ADAPTAR
    await authedPage.getByText("[Valor existente]").click();

    // Modificar campo
    await authedPage.getByLabel("[Label]").fill("[Nuevo valor]");
    await authedPage.getByRole("button", { name: /guardar|actualizar/i }).click();

    // Verificar cambio reflejado
    await expect(authedPage.getByText("[Nuevo valor]")).toBeVisible();
  });

  test("eliminar entidad", async ({ authedPage }) => {
    await authedPage.goto(ENTITY_URL);

    // Abrir menú de acciones y eliminar — ADAPTAR
    // Opción A: botón directo
    await authedPage.getByRole("button", { name: /eliminar|borrar/i }).first().click();
    // Opción B: menú contextual
    // await authedPage.getByRole("button", { name: /acciones|más/i }).first().click();
    // await authedPage.getByRole("menuitem", { name: /eliminar/i }).click();

    // Confirmar eliminación si hay dialog
    await authedPage.getByRole("button", { name: /confirmar|sí|eliminar/i }).click();

    // Verificar que desapareció de la lista
    await expect(authedPage.getByText("[Valor de la entidad]")).not.toBeVisible();
  });

  test("validación de formulario rechaza datos inválidos", async ({ authedPage }) => {
    await authedPage.goto(ENTITY_URL);
    await authedPage.getByRole("button", { name: /crear|nuevo|agregar/i }).click();

    // Enviar formulario vacío
    await authedPage.getByRole("button", { name: /guardar|crear|enviar/i }).click();

    // Verificar mensaje de error — ADAPTAR al mensaje real
    await expect(authedPage.getByText(/obligatorio|requerido|required/i)).toBeVisible();
  });
});
```

### Patrón: Ruta protegida

**Input necesario:**
- URL de la ruta
- Rol requerido (si aplica)

**Template:**

```typescript
test.describe("Protección de [ruta]", () => {
  test("sin sesión redirige a login", async ({ page }) => {
    await page.goto("[URL]");
    await expect(page).toHaveURL(/\/login/);
  });

  // Si la ruta requiere rol específico:
  test("usuario sin rol correcto ve unauthorized", async ({ authedPage }) => {
    // Cambiar rol del testUser a uno que NO tenga acceso
    await authedPage.goto("[URL]");
    await expect(authedPage).toHaveURL(/\/unauthorized|\/login/);
  });
});
```

### Patrón: Formulario con validación

**Input necesario:**
- URL del formulario
- Campos con sus validaciones (required, min/max length, format)
- Mensaje de éxito esperado

**Template:**

```typescript
test.describe("Formulario [nombre]", () => {
  test("envío exitoso con datos válidos", async ({ authedPage }) => {
    await authedPage.goto("[URL]");

    // Completar todos los campos con datos válidos
    // [generado dinámicamente según los campos]

    await authedPage.getByRole("button", { name: /enviar|guardar/i }).click();

    // Verificar éxito
    await expect(authedPage.getByText(/[mensaje de éxito]/i)).toBeVisible();
  });

  test("muestra errores para campos requeridos vacíos", async ({ authedPage }) => {
    await authedPage.goto("[URL]");
    await authedPage.getByRole("button", { name: /enviar|guardar/i }).click();

    // Verificar errores de validación
    // [generado dinámicamente según campos required]
  });

  // [un test por cada validación específica: min length, format, etc.]
});
```

### Patrón: Flujo multi-paso

**Input necesario:**
- Nombre del flujo
- Pasos en orden (URL + acciones + resultado esperado de cada paso)
- Condición de éxito final

**Template:**

```typescript
test.describe("Flujo: [nombre]", () => {
  test("flujo completo happy path", async ({ authedPage }) => {
    // Paso 1: [descripción]
    await authedPage.goto("[URL paso 1]");
    // [acciones del paso 1]
    // [verificación intermedia]

    // Paso 2: [descripción]
    // [acciones del paso 2]
    // [verificación intermedia]

    // Paso N: verificación final
    await expect(authedPage.getByText(/[resultado final]/i)).toBeVisible();
  });

  test("no puede saltear pasos", async ({ authedPage }) => {
    // Ir directo al paso N sin completar los anteriores
    await authedPage.goto("[URL paso N]");
    // Verificar que redirige al paso 1 o muestra error
  });
});
```

## Guía para proyectos existentes

Si el proyecto ya está en marcha y querés agregar e2e:

### Paso 1: Instalar dependencias

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Paso 2: Copiar infraestructura base

Copiar estos archivos desde el template (o generarlos con `/project:e2e`):
- `playwright.config.ts`
- `tests/e2e/fixtures/auth.ts` — adaptar si el auth es diferente al template
- `tests/e2e/smoke.spec.ts`

### Paso 3: Adaptar fixture de auth

Si el proyecto usa NextAuth v5 con sesiones en DB (como el template), la fixture funciona sin cambios.

Si usa otro mecanismo de auth, adaptar:

| Auth del proyecto | Qué cambiar en la fixture |
|---|---|
| NextAuth v5 + DB sessions | Nada — funciona tal cual |
| NextAuth v5 + JWT | Generar JWT válido y setear como cookie |
| Auth custom con cookies | Crear la cookie que el proyecto espera |
| Auth con headers (API only) | Usar `request.newContext({ extraHTTPHeaders })` en lugar de cookies |

### Paso 4: Agregar scripts a package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

### Paso 5: Agregar workflow de CI

Copiar `.github/workflows/e2e.yml` desde el template. Adaptar:
- Variables de entorno según el proyecto
- URL base si usa Vercel preview

### Paso 6: Generar tests para entidades existentes

Correr `/project:e2e` y seleccionar "entidad existente" para cada modelo del proyecto.

## Dependencias

```bash
npm install -D @playwright/test
npx playwright install chromium
```

**Nota:** `@playwright/test` incluye Playwright. No instalar `playwright` por separado.

## Checklist de integración

### Setup inicial
- [ ] Instalar `@playwright/test` como devDependency
- [ ] Instalar browsers con `npx playwright install chromium`
- [ ] Crear `playwright.config.ts` en raíz del proyecto
- [ ] Crear `tests/e2e/fixtures/auth.ts` con fixture de sesión
- [ ] Crear `tests/e2e/smoke.spec.ts` con tests de nivel 0
- [ ] Agregar scripts `test:e2e`, `test:e2e:ui`, `test:e2e:headed` a `package.json`
- [ ] Verificar que `npx playwright test` pasa los smoke tests

### CI
- [ ] Crear `.github/workflows/e2e.yml`
- [ ] Verificar que el workflow corre en PRs
- [ ] Configurar variables de entorno en GitHub Secrets

### Por entidad (repetir para cada entidad)
- [ ] Generar test CRUD usando el patrón de este playbook
- [ ] Adaptar selectores al UI real del proyecto
- [ ] Verificar que los tests pasan localmente
- [ ] Verificar que los tests pasan en CI

## Decisiones de diseño y por qué

| Decisión | Razón |
|---|---|
| Sesión sintética en DB (no OAuth real) | Google OAuth no se puede automatizar en tests; sesión en DB es funcionalmente equivalente porque NextAuth v5 valida contra DB |
| Solo Chromium por defecto | Reduce tiempo de CI y tamaño de instalación; agregar Firefox/WebKit si hay requerimiento cross-browser |
| `fullyParallel: true` | Tests e2e son lentos — paralelizar maximiza velocidad |
| Workers: 1 en CI | Evita race conditions en DB compartida; en local permite paralelismo |
| Cleanup en fixture (no global) | Cada test limpia lo suyo — no depende de orden ni de setup global |
| Cookie `authjs.session-token` (no `__Secure-`) | En ambiente de test/localhost no se usa HTTPS, así que la cookie sin prefijo `__Secure-` es la correcta |
| Patrones genéricos con marcadores de adaptación | Permite a Claude Code generar tests para cualquier entidad sin conocer el proyecto de antemano |
| Niveles incrementales | No todos los proyectos necesitan e2e completo — permite adopción gradual |

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `Session not found` o redirect a login con cookie seteada | La sesión en DB expiró o no se creó correctamente | Verificar que `expires` sea futuro; verificar que el `sessionToken` coincide con la cookie |
| `Browser not installed` | Falta correr `npx playwright install chromium` | Correrlo; en CI, agregar como step del workflow |
| Tests pasan local pero fallan en CI | Diferencia de timing o la app no arrancó | Agregar `waitForURL` o `waitForSelector` explícitos; verificar que el server arranca antes de los tests |
| `net::ERR_CONNECTION_REFUSED` | La app no está corriendo en la URL base | Verificar `webServer` en config o que el step de CI arranque la app |
| Cookie no se setea | Domain de la cookie no coincide con la URL | Usar `localhost` para tests locales; en CI verificar que `baseURL` coincide |
| Fixture de auth falla con error de Prisma | `DATABASE_URL` no apunta a una DB accesible | Verificar env vars en CI; en local verificar que la DB de dev está corriendo |
| Test de CRUD falla porque no encuentra botón | El selector no coincide con el UI real | Usar `getByRole` o `getByText` con regex flexible; inspeccionar la página con `--headed` |
| Timeout en CI | Server tarda en arrancar o test espera algo que no aparece | Aumentar `timeout` en config; agregar `waitFor` explícitos |

## Deuda técnica conocida

- La fixture de auth crea datos directamente en DB — si el schema de User/Session cambia, hay que actualizar la fixture.
- Los patrones generativos usan selectores genéricos (`getByRole`, `getByText` con regex) — pueden necesitar ajuste si el UI usa componentes custom sin roles ARIA.
- No hay factory pattern compartido entre tests e2e y tests de integración — duplicación de setup de datos.

---

*Para generar tests automáticamente: `/project:e2e`*
*Para la estrategia general de testing: `docs/TESTING.md`*
