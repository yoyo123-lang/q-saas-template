# Plan: Modo Issues para q-orchestrator

> **Estado**: BORRADOR — pendiente aprobación
> **Fecha**: 2026-03-25
> **Escala**: ~5 archivos nuevos + 2 modificados (aditivos)
> **Riesgo**: BAJO — no modifica flujos existentes

---

## Contexto

El q-orchestrator tiene 5 modos: `continue`, `roadmap`, `cambio-grande`, `cambio`, `sesion`. Todos operan sobre UN proyecto registrado.

Este plan agrega un **modo `issues`** que:
1. Escanea GitHub issues OPEN de N repos de BUs
2. Parsea las directivas del Board embebidas en el body
3. Prioriza por severidad (CRITICAL > HIGH > MEDIUM > LOW)
4. Procesa cada issue: clone/pull → implementar → build+test → push branch → PR draft → comment en issue
5. Reporta estado al Board via API (`PATCH /api/v1/bu/{buId}/directives/{directiveId}/status`)
6. Genera un morning-report al final

### Qué NO cambia

- `runner.sh`, `sessions.sh`, `projects.sh` — intactos
- Modos existentes — intactos
- Config en cascada — se extiende, no se modifica
- El flujo de CI check + retry — `issues-runner.sh` lo reutiliza vía `run_ci_check_and_fix()`

---

## Flujo completo

```
┌─────────────────────────────┐
│  Q Company Board            │
│  (q-company.vercel.app)     │
└────────┬────────────────────┘
         │ crea directivas → GitHub Issues
         ▼
┌──────────────────────────────────────┐
│  GitHub repos (BUs)                  │
│  qautiva, qapitaliza, qobra, ...    │
│  Issues OPEN = directivas pendientes │
└──────────────┬───────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  q-orchestrator --mode issues       │
│  (cron nocturno, ej. 22:00)         │
│                                     │
│  1. FETCH: gh issue list × N repos  │
│  2. PARSE: extraer directive_id,    │
│     tipo, prioridad del body        │
│  3. PRIORIZAR: CRITICAL>HIGH>MED>LOW│
│  4. LOOP por cada issue:            │
│     ├─ PATCH Board → "in_progress"  │
│     ├─ Clone/pull repo BU           │
│     ├─ Implementar (Claude CLI)     │
│     ├─ Build + test                 │
│     ├─ Push branch + PR draft       │
│     ├─ Comment en el issue          │
│     └─ PATCH Board → completed|failed│
│  5. MORNING REPORT                  │
└─────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  A la mañana: revisás morning-report │
│  mergeás PRs, cerrás issues         │
└──────────────────────────────────────┘
```

---

## Formato del GitHub Issue (definido por este plan)

> **NOTA PARA SESIÓN DE q-company**: Cuando el Board cree issues con `execution.type: "github_issue"`,
> debe seguir este formato exacto. Verificar y adaptar el cron `process-queue` de q-company.

### Título
```
[BOARD] {title de la directiva}
```

### Labels
```
board-directive, {tipo en lowercase} (ej: config-change, feature-request, technical-directive)
```

### Body

```markdown
<!-- board:directive_id={directive_id} -->
<!-- board:bu_id={bu_id} -->

| Campo     | Valor                |
|-----------|----------------------|
| Tipo      | CONFIG_CHANGE        |
| Prioridad | LOW                  |
| Origen    | CFO / reporte semanal|
| Deadline  | —                    |

## Instrucciones

{description de la directiva — texto libre}

## Requisitos de implementación

{requisitos específicos, pueden ser bullet points}

## Contexto adicional

- **Razonamiento**: {origin.reasoning}
- **Reporte origen**: {origin.report_id o "N/A"}
```

### Reglas de parseo

1. `directive_id` y `bu_id` se extraen de los HTML comments `<!-- board:key=value -->`
2. `tipo` y `prioridad` se extraen de la tabla markdown (columna "Valor")
3. `deadline` se extrae de la tabla; `—` significa sin deadline
4. Todo lo que esté después de `## Instrucciones` hasta el siguiente `##` es el prompt de implementación
5. Todo lo que esté después de `## Requisitos de implementación` son restricciones adicionales
6. Si el issue NO tiene el comment `<!-- board:directive_id=... -->`, se ignora (no es una directiva del Board)

---

## Archivos nuevos

### 1. `scripts/orchestrator/lib/issues-fetch.sh`

**Responsabilidad**: Fetch + parse de issues de GitHub.

```
Funciones:
├── fetch_open_issues()         # gh issue list --repo X --state open --label board-directive --json
├── parse_issue_body()          # Extrae directive_id, bu_id, tipo, prioridad, deadline, instrucciones
├── is_board_directive()        # Verifica que tenga el HTML comment de directive_id
└── format_issue_for_queue()    # Normaliza a formato interno: {repo, issue_number, directive_id, bu_id, type, priority, deadline, instructions, requirements}
```

**Dependencias**: `gh` CLI (ya es dependencia del orquestador para `ORCH_BRANCH_STRATEGY=pr`).

**Parse del body**: usa `grep` + `sed` para extraer de HTML comments y tabla markdown. No requiere dependencias externas.

### 2. `scripts/orchestrator/lib/issues-queue.sh`

**Responsabilidad**: Priorización + estado de cola.

```
Funciones:
├── build_issues_queue()        # Recibe issues de N repos, ordena por prioridad, aplica ORCH_ISSUES_MAX_PER_RUN
├── prioritize_issues()         # CRITICAL=0, HIGH=1, MEDIUM=2, LOW=3 → sort numérico
├── is_issue_already_processed()# Chequea en ~/.q-orchestrator/issues-state/{repo}/{issue_number}.json
├── mark_issue_started()        # Crea state file con timestamp + status=in_progress
└── mark_issue_done()           # Actualiza state file con status=completed|failed + result
```

**Estado persistido**: `~/.q-orchestrator/issues-state/{owner}_{repo}/{issue_number}.json`

```json
{
  "directive_id": "cmn6c4...",
  "status": "completed",
  "started_at": "2026-03-25T22:00:00Z",
  "finished_at": "2026-03-25T22:45:00Z",
  "pr_url": "https://github.com/...",
  "attempts": 1,
  "last_log": "~/.q-orchestrator/logs/..."
}
```

### 3. `scripts/orchestrator/lib/issues-runner.sh`

**Responsabilidad**: Loop de procesamiento. Núcleo del modo.

```
Funciones:
├── run_issues_mode()           # Entry point: fetch → queue → loop → report
├── process_single_issue()      # Flujo completo para un issue
│   ├── ensure_repo_cloned()    # Clone si no existe, pull si existe
│   ├── create_directive_branch()# git checkout -b directive/{directive_id}
│   ├── build_implementation_prompt()  # Arma el prompt combinando instrucciones + requisitos + CLAUDE.md del repo
│   ├── run_implementation()    # Llama run_claude() del runner.sh existente
│   ├── run_ci_and_push()       # Llama run_ci_check_and_fix() del runner.sh existente
│   ├── create_draft_pr()       # gh pr create --draft
│   └── comment_on_issue()      # gh issue comment con resultado
└── handle_issue_failure()      # Logging + state + comment en issue con error
```

**Reutilización del runner existente**:
- `run_claude()` para implementación (source runner.sh)
- `run_ci_check_and_fix()` para build+test+push (con CI retry)
- `_handle_step_fail()` para manejo de errores por paso
- `save_state()` de projects.sh para persistencia

**Prompt de implementación** (template):
```
Estás corriendo en modo batch desatendido. NO pidas confirmación.

Esta tarea viene de una directiva del Board de Q Company.

## Directiva
- Tipo: {tipo}
- Prioridad: {prioridad}
- Deadline: {deadline}

## Instrucciones
{instrucciones del issue}

## Requisitos
{requisitos del issue}

## Reglas
- Implementá directamente, commit por tarea atómica
- TDD obligatorio para lógica de negocio
- Si encontrás ambiguedad, elegí la opción más simple
- NO modifiques archivos fuera del alcance de la directiva
- Al terminar, hacé un resumen de qué cambiaste y por qué
```

### 4. `scripts/orchestrator/lib/issues-report.sh`

**Responsabilidad**: Genera morning-report.

```
Funciones:
├── generate_morning_report()   # Genera MD con resumen de la corrida
└── format_issue_result()       # Formatea un resultado individual
```

**Output**: `~/.q-orchestrator/reports/morning-report-{YYYYMMDD}.md`

```markdown
# Morning Report — 2026-03-25

> Corrida: 22:00 — 23:15 | Issues procesados: 3/5 | PRs creados: 2

## Completados (2)

### [Qapitaliza] Actualizar footer con branding Q Company
- **PR**: https://github.com/yoyo123-lang/qapitaliza/pull/42
- **Branch**: directive/cmn6c4...
- **Commits**: 3 | Archivos: 2 | Tests: 1 nuevo
- **Duración**: 25 min

### [Qautiva] PING: verificar receptor de directivas
- **PR**: https://github.com/yoyo123-lang/qautiva/pull/185
- ...

## Fallidos (1)

### [Qobra] Implementar webhook de notificación
- **Error**: test_failure (email.spec.ts)
- **Intentos**: 3/3
- **Log**: ~/.q-orchestrator/logs/qobra/...-ci-fix-3.log
- **Acción sugerida**: Revisar manualmente el test

## Pendientes (no procesados por límite)
- [Qontacta] Migrar schema de contactos (MEDIUM)
- [Qautiva] Rediseñar landing page (LOW)
```

### 5. `scripts/orchestrator/lib/issues-board-api.sh`

**Responsabilidad**: Wrapper para PATCH al Board API.

```
Funciones:
├── update_directive_status()   # PATCH /api/v1/bu/{buId}/directives/{directiveId}/status
├── get_bu_api_key()            # Lee ORCH_BU_API_KEY del .q-orchestrator.sh del repo
└── get_bu_id()                 # Lee ORCH_BU_ID del .q-orchestrator.sh del repo
```

**Implementación de `update_directive_status()`**:
```bash
update_directive_status() {
  local bu_id="$1"
  local directive_id="$2"
  local status="$3"        # in_progress | completed | failed
  local notes="$4"         # texto libre
  local result_json="$5"   # JSON con { pr_url, commits, ... }

  local api_key=$(get_bu_api_key "$bu_id")

  curl -s -X PATCH \
    "${ORCH_BOARD_URL}/api/v1/bu/${bu_id}/directives/${directive_id}/status" \
    -H "x-api-key: ${api_key}" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"${status}\",\"notes\":\"${notes}\",\"result\":${result_json:-null}}"
}
```

**Payload de completed**:
```json
{
  "status": "completed",
  "notes": "PR draft creado. 3 commits, 2 archivos, tests pasando.",
  "result": {
    "pr_url": "https://github.com/yoyo123-lang/qautiva/pull/185",
    "pr_number": 185,
    "branch": "directive/cmn6c4tie0001at03czi15ff3",
    "commits": 3,
    "files_changed": 2,
    "tests_added": 1,
    "run_id": "20260325-220000"
  }
}
```

**Payload de failed**:
```json
{
  "status": "failed",
  "notes": "Build falló después de 3 intentos. Error en test email.spec.ts.",
  "result": {
    "error": "test_failure",
    "last_log": "~/.q-orchestrator/logs/qobra/...-ci-fix-3.log",
    "attempts": 3,
    "run_id": "20260325-220000"
  }
}
```

---

## Archivos modificados (cambios mínimos, aditivos)

### 6. `scripts/orchestrator/lib/config.sh` — agregar variables ORCH_ISSUES_*

Nuevas variables al final de la sección DEFAULTS:

```bash
# ── Issues mode ──
: "${ORCH_ISSUES_REPOS:=}"                    # Repos a escanear (space-separated owner/repo)
: "${ORCH_ISSUES_MAX_PER_RUN:=5}"             # Límite por ejecución (control de costos)
: "${ORCH_ISSUES_DRAFT_PR:=true}"             # PRs como draft
: "${ORCH_ISSUES_WORKSPACE:=${HOME}/projects}" # Donde se clonan los repos BU
: "${ORCH_ISSUES_REPORT_DIR:=${CONFIG_DIR}/reports}" # Directorio de morning reports
: "${ORCH_ISSUES_LABEL:=board-directive}"     # Label que identifica issues del Board
: "${ORCH_BOARD_URL:=https://q-company.vercel.app}" # URL base del Board
```

También agregar a `generate_default_config()` y `show_config()`.

### 7. `scripts/orchestrator/q-orchestrator.sh` — agregar opción "issues" al menú

Cambios puntuales:
1. En `show_help()`: agregar `issues` a la lista de modos
2. En `select_and_run_mode()`: agregar opción al menú si `ORCH_ISSUES_REPOS` no está vacío
3. En el `case` de modos: agregar `issues) run_issues_mode "$project_path" "$slug" "$model" ;;`
4. Agregar `source "${SCRIPT_DIR}/lib/issues-fetch.sh"` etc. al bloque de cargas

**Nota**: el modo `issues` es especial porque no opera sobre un solo proyecto sino sobre N repos. El entry point `run_issues_mode()` ignora `$project_path` y usa `ORCH_ISSUES_REPOS` + `ORCH_ISSUES_WORKSPACE`.

---

## Configuración por BU (`.q-orchestrator.sh` en cada repo BU)

```bash
# ── Identidad de la BU (para callback al Board) ──
ORCH_BU_ID="cm..."                    # ID en el Board
ORCH_BU_SLUG="qautiva"                # Slug legible
ORCH_BU_API_KEY="qb_qautiva_..."      # API key para el Board

# ── GitHub ──
ORCH_BU_REPO="yoyo123-lang/qautiva"   # owner/repo

# ── Build commands (CI local) ──
ORCH_BU_BUILD_CMD=""                   # ej: "npm run build"
ORCH_BU_TEST_CMD=""                    # ej: "npm test"
ORCH_BU_LINT_CMD=""                    # ej: "npm run lint"
```

El orquestador carga este archivo via `load_project_config()` que ya existe. No se necesita un mecanismo de registro separado — se usa el mismo `add_project()` de `projects.sh`, con la única diferencia de que el repo BU necesita tener su `.q-orchestrator.sh` con las variables de identidad.

---

## Plan de implementación (orden de tareas)

| # | Tarea | Archivo | Tipo | Depende de |
|---|-------|---------|------|------------|
| 1 | Config: agregar variables `ORCH_ISSUES_*` | `lib/config.sh` | Modificar | — |
| 2 | Board API wrapper | `lib/issues-board-api.sh` | Nuevo | 1 |
| 3 | Fetch + parse de issues | `lib/issues-fetch.sh` | Nuevo | 1 |
| 4 | Cola + priorización + estado | `lib/issues-queue.sh` | Nuevo | 3 |
| 5 | Runner de issues (núcleo) | `lib/issues-runner.sh` | Nuevo | 2, 3, 4 |
| 6 | Morning report | `lib/issues-report.sh` | Nuevo | 5 |
| 7 | Integrar en menú principal | `q-orchestrator.sh` | Modificar | 5, 6 |

**Estimación**: 7 tareas atómicas, implementables en 1 sesión.

---

## Dependencias externas

- `gh` CLI — ya usada por el orquestador cuando `ORCH_BRANCH_STRATEGY=pr`
- `curl` — ya disponible en cualquier sistema
- `jq` — **NO se usa**; el parse de JSON se hace con `node -e` o `python3 -c` (patrón ya establecido en el orquestador)

**No se agregan dependencias nuevas.**

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Issue mal formateado (body no sigue formato) | Media | Bajo | `is_board_directive()` ignora issues sin HTML comment; parseo defensivo con defaults |
| Rate limit de GitHub API | Baja | Medio | `ORCH_ISSUES_MAX_PER_RUN` limita a 5 por defecto |
| Clone de repo grande tarda mucho | Baja | Bajo | `--depth 1` para clone inicial; pull incremental después |
| Board API no disponible | Baja | Bajo | Log warning y continuar; el issue queda con comment como fallback |
| Claude falla en implementación | Media | Bajo | CI retry loop ya probado; issue se marca como `failed` con log |

---

## Notas para otras sesiones

### Para sesión de q-company (Board)
- [ ] **REVISAR**: Adaptar el cron `process-queue` para que cuando `execution.type === "github_issue"`, el body del issue siga el formato definido en la sección "Formato del GitHub Issue" de este plan
- [ ] **REVISAR**: El título del issue debe tener prefijo `[BOARD]`
- [ ] **REVISAR**: Agregar label `board-directive` al crear el issue
- [ ] **REVISAR**: Incluir HTML comments `<!-- board:directive_id=... -->` y `<!-- board:bu_id=... -->` en el body

### Para sesiones de BUs (qautiva, qapitaliza, etc.)
- Cada BU necesita un `.q-orchestrator.sh` en la raíz con las variables de identidad
- El repo necesita un `CLAUDE.md` funcional (el orquestador usa Claude Code CLI que lo lee)
- La BU debe estar registrada en el orquestador central via `add_project()`
