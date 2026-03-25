# Session Log

## Sesión 1 — 2026-03-23 — Construcción del q-saas-template

### Objetivo
Construir el template completo desde Fase 0 hasta Fase 8.

### Progreso
- [x] Fase 0: Documentación y planificación
- [x] Fase 1: Infraestructura base
- [x] Fase 2: Autenticación
- [x] Fase 3: Layout y navegación
- [x] Fase 4: Componentes compartidos
- [x] Fase 5: Modelo y CRUD de ejemplo
- [x] Fase 6: Páginas de ejemplo
- [x] Fase 7: Health check, SEO, deploy
- [x] Fase 8: BLUEPRINT.md y documentación final

### Decisiones tomadas
- ADR-0003: Template con código base funcional
- ADR-0004: Se usaron Next.js 16 (no 15) y Zod 4 (no 3). Ver implicaciones en ADR.

### Stack real implementado
- Next.js **16.x** (App Router) — no 15.x como planeado
- TypeScript strict
- Tailwind CSS 4 + Radix UI (shadcn/ui NO pre-instalado — se instala por proyecto)
- Prisma 6 + Supabase PostgreSQL
- NextAuth v5 (beta) con Google OAuth
- Zod **4.x** — no 3.x como planeado
- Vitest 4
- Deploy: Vercel

### Notas técnicas
- El layout del dashboard usa `src/app/dashboard/` (no route group `(dashboard)/`)
- `nav-config.ts` vive en `src/components/layout/` (no en `src/lib/`)
- `next lint` eliminado en Next.js 16 → script cambiado a `eslint src/ tests/`
- `middleware.ts` deprecado en Next.js 16 → documentado en KNOWN_ISSUES.md, pendiente migrar a `proxy`
- UI language: Español argentino
- Number format: argentino (1.000,50)

---

## Sesión 2 — 2026-03-23 — Revisión y corrección del template

### Objetivo
Resolver discrepancias entre documentación y código, completar funcionalidad incompleta, agregar tests.

### Completado esta sesión
- [x] Lint arreglado (ESLint 9 flat config nativo, sin `eslint-config-next`)
- [x] Middleware deprecado documentado en KNOWN_ISSUES.md
- [x] ARCHITECTURE.md actualizado con versiones reales y estructura correcta
- [x] ADR-0004 creado para documentar cambios de versión del stack
- [x] Headers de seguridad en vercel.json (X-Frame-Options, HSTS, nosniff, etc.)
- [x] Tests unitarios para utils.ts (12 tests)
- [x] Tests unitarios para api-response.ts (17 tests)
- [x] Tests de integración para API de projects (20 tests — GET, POST, GET/:id, PUT/:id, DELETE/:id)
- [x] Formulario de creación de proyecto (`/dashboard/projects/new`)
- [x] Edición de proyecto en página de detalle (toggle vista/formulario)
- [x] Dashboard home con stats reales (tarjetas con conteo por estado)
- [x] IMPLEMENTATION_PLAN.md actualizado con estado real de cada fase
- [x] SESSION_LOG.md actualizado
- [x] BLUEPRINT.example.md creado como ejemplo de referencia

---

## Sesión 3 — 2026-03-25 — Planificación en dos fases (roadmap)

### Objetivo
Resolver el problema de sesiones truncadas cuando se planifican proyectos grandes. Dividir la planificación en dos fases: roadmap (meta-planificación) + plan detallado por sesión.

### Completado esta sesión
- [x] Nuevo skill `/project:roadmap` — meta-planificación para proyectos grandes
- [x] Detección automática de escala en `CLAUDE.md` — tabla que decide si necesita roadmap, cambio-grande, o plan inline
- [x] Sección "Planificación en dos fases" en `docs/PLANNING.md` con flujo completo, orden canónico de construcción para SaaS, y protocolo de handoff entre sesiones
- [x] `/project:sesion` lee `ROADMAP.md` y muestra progreso al iniciar
- [x] `/project:cambio-grande` sugiere roadmap si detecta proyecto completo (Paso 0)
- [x] Template para "construí este SaaS" en `docs/COMO_PEDIR.md`
- [x] Roadmap como actividad estimable en `docs/ESTIMATION.md`
- [x] PR creado: #9

### Archivos modificados
- `.claude/commands/roadmap.md` — nuevo
- `.claude/commands/sesion.md` — modificado
- `.claude/commands/cambio-grande.md` — modificado
- `CLAUDE.md` — modificado
- `docs/PLANNING.md` — modificado
- `docs/COMO_PEDIR.md` — modificado
- `docs/ESTIMATION.md` — modificado

#### Handoff para la próxima sesión
- **Completado**: sistema de planificación en dos fases documentado y conectado
- **Próxima sesión**: testear el flujo completo con un proyecto real (pedir "construí un SaaS para X" y verificar que se dispare el roadmap)
- **Decisiones que afectan lo que sigue**: el `ROADMAP.md` se sobreescribe por proyecto, no se acumula
- **Archivos clave para retomar**: `CLAUDE.md` (tabla de escala), `.claude/commands/roadmap.md` (skill)

---

## Sesión 4 — 2026-03-25 — Modo issues para q-orchestrator

### Objetivo
Implementar el modo `issues` en el q-orchestrator: procesamiento batch desatendido de GitHub Issues con label `board-directive`, priorizados CRITICAL→LOW, con implementación via Claude Code CLI, PR draft automático, y notificación al Board API.

### Completado esta sesión
- [x] `lib/issues-board-api.sh` — PATCH al Board API, builders de JSON payload con escaping correcto
- [x] `lib/issues-fetch.sh` — fetch de GitHub Issues vía `gh` CLI, parse del body (directive_id, tipo, prioridad, instrucciones, requisitos)
- [x] `lib/issues-queue.sh` — priorización CRITICAL→LOW, state por issue en JSON, filtro de completados
- [x] `lib/issues-runner.sh` — loop de procesamiento, `process_single_issue()`, `run_issues_mode()` entry point
- [x] `lib/issues-report.sh` — morning report en Markdown con completados/fallidos/pendientes
- [x] `lib/config.sh` — variables `ORCH_ISSUES_*` agregadas con defaults y documentación
- [x] `q-orchestrator.sh` — modo `issues` registrado, sourcing de libs, ayuda actualizada
- [x] Revisión técnica completa (5 roles: Code Reviewer, QA Engineer, Security Auditor, DevOps/SRE, Consistency Reviewer)
- [x] 2 hallazgos CRÍTICOS corregidos, 3 ALTOS corregidos, 4 MEDIOS corregidos, 1 BAJO corregido
- [x] `docs/reviews/2026-03-25_issues-mode.md` — reporte de revisión
- [x] `docs/decisions/ADR-0005-orchestrator-issues-mode.md` — ADR con decisión arquitectónica
- [x] `scripts/orchestrator/ORCHESTRATOR_GUIDE.md` — sección "Modo issues" con todas las variables, formato de issues, pipeline, debugging
- [x] `scripts/orchestrator/SETUP.md` — sección de activación, uso, requisitos y troubleshooting

### Hallazgos críticos corregidos
- `_run_json` no recibía datos JSON (arg 3 ignorado) → reemplazado por `_parse_issues_json()` vía stdin
- `run_ci_check_and_fix` con `ORCH_BRANCH_STRATEGY="pr"` creaba branch equivocado → cambiado a `"direct"`

### Hallazgos altos corregidos
- `grep -oP` no portable en macOS → reemplazado con `grep | sed`
- `base64 -d` falla en macOS → helper `_b64decode()` con fallback `-D`
- Repo en estado sucio tras fallo → `git reset --hard + clean -fd` en `ensure_repo_cloned` y `handle_issue_failure`

### Decisiones arquitectónicas
- ADR-0005: Modo `issues` integrado en el orquestador (Option C) vs script separado o extensión del modo `continue`
- Branch strategy: `ORCH_BRANCH_STRATEGY="direct"` en issues mode → PR creado por separado con `create_draft_pr()`
- Sin dependencia de `jq` — JSON parseado con node/python vía stdin (convención del proyecto)
- Board API graceful failure — issue se procesa aunque el Board no esté disponible

### Archivos creados
- `scripts/orchestrator/lib/issues-board-api.sh`
- `scripts/orchestrator/lib/issues-fetch.sh`
- `scripts/orchestrator/lib/issues-queue.sh`
- `scripts/orchestrator/lib/issues-runner.sh`
- `scripts/orchestrator/lib/issues-report.sh`
- `docs/reviews/2026-03-25_issues-mode.md`
- `docs/decisions/ADR-0005-orchestrator-issues-mode.md`

### Archivos modificados
- `scripts/orchestrator/lib/config.sh`
- `scripts/orchestrator/q-orchestrator.sh`
- `scripts/orchestrator/ORCHESTRATOR_GUIDE.md`
- `scripts/orchestrator/SETUP.md`

#### Handoff para la próxima sesión
- **Completado**: modo issues implementado, revisado, y todos los hallazgos corregidos
- **Pendiente**: test end-to-end con repo BU real (qautiva/qapitaliza) con `ORCH_ISSUES_REPOS` configurado
- **Pendiente opcional**: modo `--dry-run` para mostrar cola sin procesar (recomendado en ADR y en revisión)
- **Archivos clave para retomar**: `lib/issues-runner.sh` (entry point `run_issues_mode()`), `ORCHESTRATOR_GUIDE.md` (sección "Modo issues")
