# Testing

> Para el PROCESO de escritura de tests (Red-Green-Refactor) → ver `docs/TDD.md`.
> Este archivo cubre la ESTRATEGIA (qué testear, cobertura, datos, anti-patrones).

> Si no hay verificación automática, no hay garantía de calidad.
> Para verificación funcional con datos reales (que lo que se implementó hace lo que se pidió) → ver `PRE_DEPLOY_AND_QA.md` (Parte 2).

## 1) Estado actual del template

### Qué hay hoy

| Tipo | Ubicación | Qué validan | Qué NO validan |
|---|---|---|---|
| Tests unitarios (Zod) | `tests/unit/` | Schemas de validación aislados | — |
| Tests de handlers con mocks | `tests/integration/` | Lógica de API route handlers (auth, validación, CRUD, ownership, soft delete) | No tocan DB real ni auth real — Prisma y `requireAuth` están mockeados |

**Total:** ~14 tests de handlers + tests unitarios de schemas.

### Qué NO hay todavía

| Tipo | Estado | Prioridad para proyectos derivados |
|---|---|---|
| Tests de integración real (DB) | No implementado | Media — agregar cuando haya lógica de negocio compleja |
| Smoke tests (health + auth flow) | No implementado | Media — útil como gate de CI |
| Tests e2e (Playwright/Cypress) | No implementado | Baja — agregar cuando haya flujos críticos de usuario |
| Tests de componentes React | No implementado | Baja — la UI del template es simple |

### Honestidad sobre los tests de `tests/integration/`

Los tests en `tests/integration/projects-api.test.ts` están categorizados como "integración" pero técnicamente son **tests de handlers con mocks**. Mockean `prisma` y `requireAuth` con `vi.mock()` y prueban la lógica de los route handlers de forma aislada.

**Lo que sí validan** (y es valioso):
- Que los handlers retornen los status codes correctos (401, 400, 404, 200, 201)
- Que la validación Zod funcione (nombres vacíos, status inválidos)
- Que el ownership check funcione (no ves proyectos de otro usuario)
- Que el soft delete use `deletedAt` en lugar de borrado físico
- Que la paginación por cursor funcione correctamente

**Lo que no validan:**
- Que las queries Prisma realmente funcionen contra una DB
- Que el flujo real de auth (NextAuth → Google → callback → sesión) funcione
- Que el middleware redirija correctamente en runtime

Esta distinción es importante para no tener falsa confianza.

## 2) Estrategia por capa

| Capa | Tipo | Objetivo | Estado en template |
|---|---|---|---|
| Validación | unit tests | Schemas Zod | Implementado |
| API handlers | tests con mocks | Lógica de handlers | Implementado |
| API + DB | integración real | Queries Prisma contra DB real | Pendiente |
| Endpoints | smoke tests | Health + respuesta mínima | Pendiente |
| UI | e2e | Flujos de usuario completos | Pendiente |

## 3) Qué testear siempre

- Autenticación/autorización.
- Reglas de negocio críticas.
- Cálculos (precios, impuestos, fechas).
- Integraciones externas (con mocks/stubs controlados).
- Manejo de errores y casos borde.

## 4) Qué se puede omitir

- Getters/setters triviales.
- UI estática sin lógica.
- Código generado automáticamente (si está cubierto por integración).

## 5) Datos de prueba

- Usar factories/fixtures versionados.
- Test DB aislada por ambiente (cuando se implemente integración real).
- Limpieza automática entre tests.
- Prohibido usar datos reales de producción.

## 6) Nomenclatura

`<módulo>.<función_o_caso>.spec|test`

Ejemplo: `auth.login.invalid_password.spec.ts`

## 7) Proceso mínimo en cada PR

1. Ejecutar unit + tests de handlers (`npm test`).
2. Ejecutar lint/format/typecheck (`npm run lint`).
3. Build limpio (`npm run build`).
4. Adjuntar comandos en la descripción del PR.

## 8) Anti-patrones

- Tests frágiles dependientes de orden.
- Sleeps fijos en vez de sincronización.
- Mockear tanto que no se valida integración real.
- Pasar tests localmente pero no en CI.
- **Llamar "tests de integración" a tests que mockean todo** — ser honesto con lo que validan.

## 9) Siguiente escalón recomendado

Cuando un proyecto derivado necesite más confianza, agregar en este orden:

1. **Smoke test de health endpoint** — Un test que levante la app y haga `GET /api/health`. Valida que el build funciona y la DB conecta. Mínimo esfuerzo, máximo valor como gate de CI.
2. **Tests de integración real con DB de test** — Usar una DB PostgreSQL de test (Docker o Supabase local) para validar queries Prisma reales. Priorizar endpoints con lógica compleja.
3. **E2e con Playwright** — Flujos de usuario completos (login → dashboard → CRUD). Usar `/project:e2e` para generar tests automáticamente.

## 10) Sistema E2E generativo

El template incluye un sistema completo para generar tests e2e de forma incremental:

| Pieza | Ubicación | Qué hace |
|---|---|---|
| Playbook técnico | `docs/playbooks/e2e.md` | Patrones reutilizables por tipo (CRUD, form, ruta protegida, flujo multi-paso) |
| Command interactivo | `/project:e2e` | Proceso guiado: detecta entidades, genera tests, los ejecuta |
| Infraestructura base | `playwright.config.ts`, `tests/e2e/fixtures/auth.ts` | Config + fixture de auth con sesión sintética en DB |
| CI workflow | `.github/workflows/e2e.yml` | Corre tests automáticamente en cada PR |

### Niveles incrementales

| Nivel | Qué cubre | Archivos |
|---|---|---|
| 0. Smoke | Health endpoint, páginas públicas, redirect sin auth | `tests/e2e/smoke.spec.ts` |
| 1. Auth | Sesión sintética funciona, dashboard carga | `tests/e2e/auth.spec.ts` |
| 2. CRUD | Crear → listar → editar → eliminar por entidad | `tests/e2e/[entidad].spec.ts` |
| 3. Flujos | Multi-paso, permisos por rol, estados | `tests/e2e/[flujo].spec.ts` |

Para adoptar e2e en un proyecto (nuevo o existente): correr `/project:e2e`.
