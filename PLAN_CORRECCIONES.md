# Plan de correcciones del q-saas-template

**Branch:** `claude/review-qsaas-template-oed5v`
**6 tareas atómicas, independientes entre sí** (se pueden hacer en cualquier orden).

---

## Tarea 1: Arreglar seed para que el admin sea ADMIN

**Archivo:** `prisma/seed.ts`

**Qué hacer:** Después de crear el `AllowedEmail`, agregar un `upsert` en la tabla `User` que asegure que si el usuario ya existe (porque se logueó antes del seed), se le asigne `role: ADMIN`. Y si no existe aún, dejar un log indicando que al loguearse por primera vez se le asignará el rol.

**Cambio concreto:**
- Después del bloque que crea `AllowedEmail`, agregar:
```ts
// Si el usuario ya existe en la tabla User, promoverlo a ADMIN
const existingUser = await prisma.user.findUnique({
  where: { email: adminEmail },
});

if (existingUser) {
  await prisma.user.update({
    where: { email: adminEmail },
    data: { role: "ADMIN" },
  });
  console.log(`Usuario ${adminEmail} promovido a ADMIN.`);
} else {
  console.log(`El usuario ${adminEmail} recibirá rol ADMIN en su primer login.`);
}
```
- También modificar el callback `signIn` en `src/lib/auth.ts`: después de verificar que el email está en `AllowedEmail`, agregar lógica para que si el `AllowedEmail` existe y el `User` recién se crea (primer login), se le setee `role: ADMIN` si es el `ADMIN_EMAIL`. **Alternativa más simple:** en el callback `signIn`, después de verificar allowlist, chequear si el email coincide con `process.env.ADMIN_EMAIL` y si el user no tiene role ADMIN, actualizarlo.

**Checkpoint:** Correr `npx tsx prisma/seed.ts` (en seco, revisando el código) y verificar que la lógica es correcta. Los tests existentes no tocan el seed.

---

## Tarea 2: Agregar `formatCurrency()` a utils.ts

**Archivo:** `src/lib/utils.ts`

**Qué agregar** al final del archivo:
```ts
/** Formatea un monto en pesos argentinos ($ 1.000,50) */
export function formatCurrency(value: number, decimals = 2): string {
  return `$ ${formatNumber(value, decimals)}`;
}
```

**Test:** Agregar casos en `tests/unit/utils.test.ts`:
```ts
describe("formatCurrency", () => {
  it("formatea pesos argentinos con símbolo", () => {
    expect(formatCurrency(1000.5)).toBe("$ 1.000,50");
  });
  it("formatea cero", () => {
    expect(formatCurrency(0)).toBe("$ 0,00");
  });
  it("respeta decimales custom", () => {
    expect(formatCurrency(1234.5, 0)).toBe("$ 1.235");
  });
});
```

**Checkpoint:** `npm run test -- tests/unit/utils.test.ts` pasa.

---

## Tarea 3: Agregar auth server-side al dashboard layout

**Archivos:** `src/app/dashboard/layout.tsx` (refactor), `src/app/dashboard/dashboard-shell.tsx` (nuevo)

**Problema:** El layout actual es `"use client"` puro — no verifica auth contra DB. Si la cookie existe pero la sesión expiró, el usuario ve el dashboard roto.

**Qué hacer:** Separar en dos archivos:
1. `src/app/dashboard/layout.tsx` — Server Component que verifica `auth()` y redirige si no hay sesión válida
2. `src/app/dashboard/dashboard-shell.tsx` — Client Component con el sidebar state (lo que hoy es el layout)

**`src/app/dashboard/layout.tsx`** (nuevo contenido):
```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
```

**`src/app/dashboard/dashboard-shell.tsx`** (extraer de layout actual):
```tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mb-4">
            <Breadcrumbs />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Checkpoint:** `npm run build` pasa. Acceder a `/dashboard` sin sesión redirige a `/login`.

---

## Tarea 4: Crear `public/og-default.png`

**Archivo:** `public/og-default.png` (o `.svg`)

**Qué hacer:** Generar una imagen de 1200x630 (tamaño estándar Open Graph) con fondo gris claro (#f3f4f6) y el texto "Tu Producto" centrado en gris oscuro (#111827). No necesita ser artístico — es un placeholder.

**Opción pragmática:** Si ImageMagick está disponible, generar el PNG. Si no, crear `public/og-default.svg` y actualizar la referencia en `src/components/shared/seo.tsx` línea 16: `ogImage = "/og-default.svg"`.

**Checkpoint:** El archivo existe en `public/` y `seo.tsx` lo referencia correctamente.

---

## Tarea 5: Desacoplar `generateSEO` de `NEXTAUTH_URL`

**Archivos:** `src/components/shared/seo.tsx`, `src/app/sitemap.ts`, `.env.example`

**Cambio en `seo.tsx`:** Línea 17, cambiar:
```ts
// ANTES
const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
// DESPUÉS
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
```

**Cambio en `sitemap.ts`:** Línea 4, mismo cambio.

**Cambio en `.env.example`:** Agregar:
```env
# URL pública de la aplicación (usada para SEO, Open Graph, sitemap)
# NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

**Checkpoint:** `npm run build` pasa. Grep por `NEXTAUTH_URL` fuera de `auth.ts` y `.env.example` no devuelve resultados.

---

## Tarea 6: Bajar versiones a Next.js 15 y Zod 3

**Archivos:** `package.json`, potencialmente ajustes menores en código

**Qué hacer:**
1. En `package.json`, cambiar:
   - `"next": "^16.2.1"` → `"next": "^15.3.3"`
   - `"zod": "^4.3.6"` → `"zod": "^3.25.67"`
   - `"react": "^19.2.4"` → `"react": "^19.1.0"` (compatible con Next 15)
   - `"react-dom": "^19.2.4"` → `"react-dom": "^19.1.0"`
   - `"@types/react": "^19.2.4"` → `"@types/react": "^19.1.0"`
   - `"@types/react-dom": "^19.2.3"` → `"@types/react-dom": "^19.1.0"`
2. Borrar `node_modules` y `package-lock.json`, correr `npm install`
3. Verificar si hay imports o APIs específicas de Next.js 16 / Zod 4 que rompan:
   - **`params` como Promise**: En Next.js 15, `params` en route handlers y pages ya es `Promise` (fue introducido en 15). Verificar que el patrón `use(params)` en las pages siga funcionando, o si hay que usar `await params` en Server Components.
   - **Zod 4 → Zod 3**: La API de `safeParse`, `z.string()`, `z.enum()` es igual. Verificar que no se use ninguna API exclusiva de Zod 4 (como `z.interface()` o el nuevo `z.pipe()`). Si los schemas solo usan `z.object`, `z.string`, `z.enum`, `z.optional` — debería ser transparente.
4. Eliminar el issue de `docs/KNOWN_ISSUES.md` sobre middleware deprecado (ya no aplica con Next.js 15).
5. Actualizar `docs/decisions/ADR-0004-versiones-reales-del-stack.md` con las versiones corregidas.

**Esta es la tarea más riesgosa.** Hacer después de las otras 5 para no mezclar problemas.

**Checkpoint:** `npm run build` pasa. `npm run test` pasa. `npm run dev` levanta sin errores.

---

## Orden de ejecución sugerido

```
1. formatCurrency (2 min, sin riesgo)
2. Seed admin (3 min, sin riesgo)
3. SEO desacoplado (2 min, sin riesgo)
4. og-default image (2 min, sin riesgo)
5. Dashboard layout auth (5 min, riesgo bajo)
6. Downgrade versiones (10 min, riesgo medio — hacer último)
```

**Commit por cada tarea:** `fix: [q-saas-template] [descripción]`

**Commit final después de la tarea 6:** correr `npm run build && npm run test` y verificar que todo pasa.
