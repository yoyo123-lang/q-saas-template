# Guía de adopción para sesiones de Claude Code

> Este archivo es para vos, Claude Code. Lo lee una sesión nueva que recibe
> un zip de este template y debe aplicarlo sobre un proyecto existente pre-MVP.

---

## Contexto

El proyecto destino ya tiene código funcional pero está antes del MVP. No hay
usuarios reales todavía. Esto significa que podés hacer cambios estructurales
sin miedo a romper producción, pero el código existente tiene decisiones de
diseño que hay que respetar salvo que sean claramente incorrectas.

---

## Paso 0 — Orientarte (5 min)

Antes de tocar nada, entendé dónde estás:

```
1. Leé el README.md del proyecto destino (si existe)
2. Corré: ls src/ (o el directorio principal de código)
3. Corré: cat package.json (o equivalente del stack)
4. Identificá: framework, ORM, auth, DB, hosting
```

Anotá mentalmente las diferencias con el template (Next.js 15, Prisma, NextAuth v5, Supabase, Vercel).

---

## Paso 1 — Copiar la infraestructura de reglas

Copiá estas carpetas TAL CUAL del zip al proyecto destino:

```
docs/                     ← TODO (roles, playbooks, decisions, todos los .md)
.claude/agents/           ← Los 4 sub-agentes (explorador, implementador, micro-revisor, revisor)
.claude/commands/         ← Los 14 slash commands
```

**CLAUDE.md** requiere tratamiento especial:

- Si el proyecto NO tiene CLAUDE.md → copiá el del template directamente.
- Si el proyecto YA tiene CLAUDE.md → hacé merge manual:
  - Las reglas del proyecto existente tienen prioridad en caso de conflicto.
  - Agregá las secciones del template que falten (proceso obligatorio, restricciones, filosofía).
  - No dupliques contenido.

---

## Paso 2 — Adaptar docs/ARCHITECTURE.md

Este archivo viene con datos del template (Next.js 15, Prisma, etc). Reemplazá TODO el contenido con la realidad del proyecto:

```
Recorré el proyecto y completá docs/ARCHITECTURE.md con:
- Stack real (framework, lenguaje, ORM, DB, auth, hosting)
- Estructura de carpetas actual
- Módulos/dominios principales
- Cómo se levanta el proyecto (dev, build, start)
- Variables de entorno necesarias
- Dependencias externas (APIs, servicios)
```

---

## Paso 3 — Adaptar testing

El template asume Vitest + Playwright. El proyecto destino puede usar otra cosa.

### Si el proyecto ya tiene tests:
- NO cambies el framework de testing.
- Adaptá `docs/TESTING.md` y `docs/TDD.md` al framework existente.
- Verificá que los comandos en `package.json` (o equivalente) coincidan con lo que dicen los docs.

### Si el proyecto NO tiene tests:
- Instalá lo que corresponda según el stack (Vitest para Node/React, pytest para Python, etc).
- Creá al menos un test smoke que verifique que la app arranca.
- Configurá el comando `test` en package.json (o equivalente).

### E2E (Playwright):
- Si el proyecto tiene frontend web → copiá `playwright.config.ts` y `tests/e2e/` del template.
- Adaptá el `webServer.command` al comando real de dev/start del proyecto.
- Adaptá los smoke tests (`tests/e2e/smoke.spec.ts`) a las rutas reales del proyecto.
- Si el auth es distinto a NextAuth v5 → reescribí `tests/e2e/fixtures/auth.ts` para crear sesiones sintéticas con el mecanismo real del proyecto.

### CI (GitHub Actions):
- Copiá `.github/workflows/e2e.yml` solo si el proyecto usa GitHub Actions.
- Adaptá el service container de PostgreSQL si la DB es distinta.
- Si ya hay un workflow de CI → integrá los steps de Playwright en el existente, no dupliques workflows.

---

## Paso 4 — Adaptar configuración específica del stack

Los siguientes archivos del template son específicos de Next.js/Prisma/Vercel. **No los copies si el stack es diferente:**

```
NO COPIAR si el stack difiere:
├── prisma/                  ← Solo para Prisma
├── src/lib/auth.ts          ← Solo para NextAuth v5
├── src/middleware.ts         ← Solo para Next.js
├── playwright.config.ts     ← Adaptar, no copiar textual
├── vitest.config.ts         ← Adaptar, no copiar textual
├── tsconfig.json            ← Adaptar, no copiar textual
├── .github/workflows/       ← Adaptar, no copiar textual
└── next.config.ts           ← Solo para Next.js
```

Los docs de `docs/` son agnósticos al stack y se copian siempre. Lo que hay que adaptar es el contenido interno cuando hace referencia a herramientas concretas (ej: si el doc dice "corré prisma db push" y el proyecto usa Drizzle, cambiá el comando).

---

## Paso 5 — Completar documentación mínima

Estos 6 archivos deben reflejar la realidad del proyecto, no del template:

| Archivo | Qué completar |
|---|---|
| `docs/ARCHITECTURE.md` | Stack, estructura, módulos, dependencias |
| `docs/API_STANDARDS.md` | Endpoints existentes, formato de respuesta, versionado |
| `docs/DATABASE.md` | Modelo actual, migraciones, índices, backups |
| `docs/TESTING.md` | Cobertura real, framework, comandos, estrategia |
| `docs/SECURITY.md` | Auth actual, manejo de secretos, vulnerabilidades conocidas |
| `docs/DEPLOYMENT.md` | Proceso de deploy, ambientes, rollback |

Para cada uno: leé el archivo del template, mantené la estructura, reemplazá el contenido con datos reales.

---

## Paso 6 — Verificar que todo funciona

Antes de commitear, corré esta secuencia:

```bash
# 1. Tests unitarios
npm test          # o el comando equivalente del proyecto

# 2. Lint
npm run lint      # o el comando equivalente

# 3. Build
npm run build     # o el comando equivalente

# 4. Si configuraste E2E
npx playwright test
```

Si algo falla, arreglalo antes de seguir. El objetivo es que el proyecto quede en estado verde con la nueva infraestructura de docs y reglas.

---

## Paso 7 — Primer commit

```bash
git add docs/ .claude/ CLAUDE.md
# + cualquier archivo de config que hayas adaptado (playwright.config.ts, etc)

git commit -m "chore: adoptar sistema de reglas y documentación del template Q-SaaS

Agrega infraestructura de documentación, sub-agentes, slash commands,
roles de revisión y configuración de testing.

Docs adaptados a la realidad del proyecto."
```

---

## Qué NO hacer

- No copies código fuente del template (src/, prisma/, etc) salvo los tests E2E adaptados.
- No reemplaces configuración existente del proyecto (tsconfig, eslint, etc) — mergeá.
- No instales dependencias nuevas sin que el humano lo apruebe.
- No cambies la estructura de carpetas del proyecto existente.
- No refactorices código existente en esta sesión — eso es trabajo de `/project:cambio`.
- No borres archivos del proyecto existente.

---

## Qué sí hacer

- Completar todos los docs con datos reales del proyecto.
- Adaptar los slash commands si el stack es diferente (ej: cambiar `npm` por `pnpm`).
- Crear un smoke test mínimo si no hay tests.
- Dejar el proyecto en estado verde (build + test + lint pasan).
- Documentar en `docs/KNOWN_ISSUES.md` cualquier problema que encuentres durante la adopción.

---

## Después de esta sesión

El humano (o la siguiente sesión de Claude Code) debería:

1. Correr `/project:sesion` para verificar que el onboarding funciona.
2. Correr `/project:revision` para una primera auditoría.
3. Empezar a desarrollar con `/project:cambio` para el primer feature del MVP.
