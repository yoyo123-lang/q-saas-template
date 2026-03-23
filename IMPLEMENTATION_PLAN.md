# Plan de Implementación — q-saas-template

> Cada tarea es una unidad atómica: implementar → verificar → commit.
> Estado: ⬜ pendiente | ✅ completado | ❌ bloqueado

---

## Fase 0: Documentación y planificación

**Objetivo:** Tener toda la documentación base antes de escribir código.

| # | Tarea | Tiempo est. | Archivos afectados | Criterio de aceptación |
|---|---|---|---|---|
| 0.1 | Crear ADR-0003 | 2 min | `docs/decisions/ADR-0003-template-con-codigo-base.md` | Archivo existe con decisión completa |
| 0.2 | Actualizar ARCHITECTURE.md | 3 min | `docs/ARCHITECTURE.md` | Refleja stack real y estructura de carpetas |
| 0.3 | Crear IMPLEMENTATION_PLAN.md | 4 min | `IMPLEMENTATION_PLAN.md` | Plan con todas las fases y criterios de aceptación |
| 0.4 | Crear SESSION_LOG.md | 2 min | `SESSION_LOG.md` | Log inicial con fases pendientes |

**Estado Fase 0:** ✅

---

## Fase 1: Infraestructura base

**Objetivo:** Proyecto Next.js que compila, con todas las dependencias instaladas y configuradas.

| # | Tarea | Tiempo est. | Archivos afectados | Criterio de aceptación |
|---|---|---|---|---|
| 1.1 | Inicializar Next.js 15 con TypeScript strict y Tailwind CSS 4 | 5 min | `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx` | `npm run build` pasa sin errores |
| 1.2 | Instalar y configurar Prisma con Supabase | 4 min | `prisma/schema.prisma`, `src/lib/db.ts`, `package.json` | `npx prisma generate` corre sin errores |
| 1.3 | Configurar shadcn/ui | 3 min | `components.json`, `src/lib/utils.ts`, `tailwind.config.ts` | `npx shadcn-ui init` completado |
| 1.4 | Crear .env.example con todas las variables | 2 min | `.env.example` | Todas las variables documentadas con descripción |
| 1.5 | Verificar build limpio | 2 min | — | `npm run build` y `npm run lint` pasan sin errores ni warnings |

**Estado Fase 1:** ⬜

---

## Fase 2: Autenticación

**Objetivo:** Login con Google OAuth funcional, con allowlist y roles en DB.

| # | Tarea | Tiempo est. | Archivos afectados | Criterio de aceptación |
|---|---|---|---|---|
| 2.1 | Definir modelos de auth en Prisma schema | 3 min | `prisma/schema.prisma` | Modelos User, Account, Session, VerificationToken, AllowedEmail con campos correctos |
| 2.2 | Configurar NextAuth v5 con Google provider y callbacks | 5 min | `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts` | Callback `signIn` verifica allowlist, callback `session` agrega role |
| 2.3 | Implementar middleware de protección de rutas | 3 min | `src/middleware.ts` | Rutas `/dashboard/*` redirigen a `/login` si no hay sesión; rutas públicas accesibles sin sesión |
| 2.4 | Crear página de login | 3 min | `src/app/login/page.tsx` | Botón "Ingresar con Google", redirige a dashboard si ya autenticado |
| 2.5 | Crear seed del admin y página unauthorized | 3 min | `prisma/seed.ts`, `src/app/unauthorized/page.tsx`, `src/lib/require-admin.ts` | Seed inserta AllowedEmail con ADMIN_EMAIL; página unauthorized muestra mensaje claro |

**Estado Fase 2:** ⬜

---

## Fase 3: Layout y navegación

**Objetivo:** Shell visual completo: landing pública, dashboard con sidebar y header.

| # | Tarea | Tiempo est. | Archivos afectados | Criterio de aceptación |
|---|---|---|---|---|
| 3.1 | Crear layout raíz y landing pública | 3 min | `src/app/layout.tsx`, `src/app/page.tsx` | Landing renderiza sin errores, tiene CTA de login |
| 3.2 | Crear nav-config y tipos de navegación | 2 min | `src/lib/nav-config.ts`, `src/types/nav.ts` | Array de NavItem exportado con label, href, icon |
| 3.3 | Crear sidebar y header | 5 min | `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx` | Sidebar muestra nav-config, header muestra usuario y botón de logout |
| 3.4 | Crear breadcrumbs | 3 min | `src/components/layout/breadcrumbs.tsx` | Genera breadcrumbs automáticamente desde el pathname |
| 3.5 | Crear layout del dashboard y página home | 3 min | `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/page.tsx` | Layout verifica sesión y redirige; página home muestra bienvenida con nombre del usuario |

**Estado Fase 3:** ⬜

---

## Fase 4: Componentes compartidos

**Objetivo:** Librería de componentes reutilizables para estados de UI y utilidades.

| # | Tarea | Tiempo est. | Archivos afectados | Criterio de aceptación |
|---|---|---|---|---|
| 4.1 | Crear LoadingState, EmptyState, ErrorState | 4 min | `src/components/shared/loading-state.tsx`, `src/components/shared/empty-state.tsx`, `src/components/shared/error-state.tsx` | Cada componente acepta props relevantes y renderiza sin errores |
| 4.2 | Crear ConfirmDialog | 3 min | `src/components/shared/confirm-dialog.tsx` | Modal con título, descripción, botones confirmar/cancelar; deshabilita botones mientras procesa |
| 4.3 | Crear DataTable y StatusBadge | 4 min | `src/components/shared/data-table.tsx`, `src/components/shared/status-badge.tsx` | DataTable acepta columns y data genéricos; StatusBadge mapea status a colores |
| 4.4 | Crear helpers api-response y utils | 3 min | `src/lib/api-response.ts`, `src/lib/utils.ts` | `apiSuccess`, `apiError` retornan NextResponse con estructura consistente; `formatDate`, `formatNumber` usan formato argentino |
| 4.5 | Crear componentes SEO base | 3 min | `src/components/shared/seo.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts` | Componente acepta metadata props; robots.ts y sitemap.ts exportan funciones válidas |

**Estado Fase 4:** ⬜

---

## Fase 5: Modelo y CRUD de ejemplo

**Objetivo:** Modelo Project con 5 endpoints REST completamente testeados (TDD).

| # | Tarea | Tiempo est. | Archivos afectados | Criterio de aceptación |
|---|---|---|---|---|
| 5.1 | Definir modelo Project en Prisma y validaciones Zod | 3 min | `prisma/schema.prisma`, `src/lib/validations/project.ts` | Modelo tiene id, name, description, status, userId, timestamps; Zod schemas para create y update |
| 5.2 | Tests unitarios para validaciones (RED) | 3 min | `tests/unit/project-validations.test.ts` | Tests fallan porque validaciones no existen aún |
| 5.3 | Implementar endpoints GET /projects y POST /projects (TDD) | 5 min | `src/app/api/v1/projects/route.ts`, `tests/integration/projects-api.test.ts` | Tests GREEN: lista paginada, crea con validación, retorna 401 sin auth |
| 5.4 | Implementar endpoints GET, PUT, DELETE /projects/[id] (TDD) | 5 min | `src/app/api/v1/projects/[id]/route.ts` | Tests GREEN: obtiene por id, actualiza, elimina; verifica ownership; retorna 404 si no existe |
| 5.5 | Refactor y verificación final de tests | 2 min | — | `npm test` pasa todos los tests sin errores |

**Estado Fase 5:** ⬜

---

## Fase 6: Páginas de ejemplo

**Objetivo:** UI completa del CRUD de projects con todos los estados de carga/error/vacío.

| # | Tarea | Tiempo est. | Archivos afectados | Criterio de aceptación |
|---|---|---|---|---|
| 6.1 | Crear hook useProjects | 3 min | `src/hooks/use-projects.ts` | Hook expone list, create, update, delete con estados loading/error; usa SWR o fetch nativo |
| 6.2 | Crear página listado de projects | 4 min | `src/app/(dashboard)/projects/page.tsx` | Muestra LoadingState, EmptyState, lista con DataTable, botón "Nuevo proyecto" |
| 6.3 | Crear página detalle/edición de project | 4 min | `src/app/(dashboard)/projects/[id]/page.tsx` | Carga el project, permite editar inline o via formulario, botón eliminar con ConfirmDialog |
| 6.4 | Crear formulario de nuevo project | 3 min | `src/app/(dashboard)/projects/new/page.tsx` | Formulario con validación client-side, botón deshabilitado mientras procesa, redirige al listado |

**Estado Fase 6:** ⬜

---

## Fase 7: Health check, SEO y deploy

**Objetivo:** App lista para deploy con monitoreo básico y configuración de producción.

| # | Tarea | Tiempo est. | Archivos afectados | Criterio de aceptación |
|---|---|---|---|---|
| 7.1 | Crear health check endpoint | 2 min | `src/app/api/health/route.ts` | GET /api/health retorna `{ status: "ok", timestamp, db: "ok" }` con 200; 503 si DB falla |
| 7.2 | Configurar metadata y OG tags base | 3 min | `src/app/layout.tsx`, `src/lib/metadata.ts` | `generateMetadata` exporta title, description, OG image, canonical URL |
| 7.3 | Crear vercel.json y configurar headers de seguridad | 3 min | `vercel.json` | Headers X-Frame-Options, X-Content-Type-Options, HSTS configurados |
| 7.4 | Verificar build de producción completo | 3 min | — | `npm run build` pasa sin errores, `npm run lint` limpio, todos los tests pasan |

**Estado Fase 7:** ⬜

---

## Fase 8: BLUEPRINT.md y documentación final

**Objetivo:** Template listo para ser clonado y personalizado por Claude Code.

| # | Tarea | Tiempo est. | Archivos afectados | Criterio de aceptación |
|---|---|---|---|---|
| 8.1 | Crear BLUEPRINT.md | 4 min | `BLUEPRINT.md` | Formulario con: nombre del proyecto, descripción, modelo de negocio, entidades principales, colores/branding, usuarios/roles |
| 8.2 | Actualizar README.md con instrucciones de setup | 3 min | `README.md` | Pasos: clonar → copiar .env.example → llenar BLUEPRINT.md → `npm install` → `npx prisma migrate dev` → `npm run dev` |
| 8.3 | Actualizar SESSION_LOG.md con estado final | 2 min | `SESSION_LOG.md` | Todas las fases marcadas como completadas |
| 8.4 | Actualizar IMPLEMENTATION_PLAN.md con estado final | 1 min | `IMPLEMENTATION_PLAN.md` | Todas las fases marcadas como ✅ |
| 8.5 | Commit final y tag de versión | 2 min | — | `git tag v1.0.0` aplicado, repositorio en estado limpio |

**Estado Fase 8:** ⬜

---

## Resumen de tiempos estimados

| Fase | Tareas | Tiempo total est. |
|---|---|---|
| 0 — Documentación | 4 | 11 min |
| 1 — Infraestructura | 5 | 16 min |
| 2 — Autenticación | 5 | 17 min |
| 3 — Layout | 5 | 16 min |
| 4 — Componentes | 5 | 17 min |
| 5 — CRUD + Tests | 5 | 18 min |
| 6 — Páginas | 4 | 14 min |
| 7 — Deploy | 4 | 11 min |
| 8 — Blueprint | 5 | 12 min |
| **Total** | **42** | **~2 horas** |

---

## Convenciones para este plan

- Cada tarea = un commit con mensaje descriptivo
- TDD obligatorio en Fase 5 (y cualquier lógica testeable)
- Verificar `npm run build` después de cada fase
- Marcar ✅ en este archivo al completar cada tarea
- Si una tarea tarda más de 10 minutos → subdividir y reportar al agente principal
