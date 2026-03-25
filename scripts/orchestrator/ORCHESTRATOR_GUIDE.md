# q-orchestrator — Guía técnica completa

> Referencia interna para desarrollar el orquestador. Si vas a trabajar en este sistema en un repo separado, empezá por este archivo.

---

## Qué es y qué hace

El `q-orchestrator` es un sistema bash que ejecuta sesiones de Claude Code de forma **desatendida y reproducible**. Dado un proyecto con un `ROADMAP.md` y archivos de plan detallado, el orquestador:

1. Detecta qué sesiones del roadmap están pendientes
2. Ejecuta cada sesión a través de un pipeline de 5 pasos:
   - Implementación → Revisión por roles → Fix de hallazgos → Documentación → Build + Push
3. Registra progreso, telemetría y logs
4. Puede continuar donde quedó si el proceso se interrumpe

Todo corre sin intervención humana. El operador arranca el orquestador, elige el modo, y se va.

---

## Estructura de archivos

```
scripts/orchestrator/
├── q-orchestrator.sh           ← Entry point, menú interactivo
├── lib/
│   ├── config.sh               ← Variables ORCH_*, carga de config por capas
│   ├── runner.sh               ← Motor de ejecución de Claude
│   ├── sessions.sh             ← Parser de ROADMAP.md y tracking de progreso
│   ├── projects.sh             ← Registro de proyectos en JSON
│   ├── ui.sh                   ← Helpers de terminal (colores, menús, spinner)
│   ├── telemetry.sh            ← Eventos JSONL y reportes de diagnóstico
│   └── stream-filter.js        ← Filtro Node.js para output stream-json
├── templates/
│   ├── wrapper.sh              ← Template de wrapper para proyectos (Linux/macOS)
│   └── wrapper.bat             ← Template de wrapper para proyectos (Windows)
├── SETUP.md                    ← Guía de instalación y uso para usuarios finales
├── PLANNING_GUIDE.md           ← Formato de planes de sesión para Claude
├── ORCHESTRATOR_CONNECT.md     ← Guía para conectar repos de terceros
└── ORCHESTRATOR_GUIDE.md       ← Este archivo
```

### Estado global en el sistema

```
~/.q-orchestrator/
├── config.sh                   ← Config global (sobreescribe defaults)
├── projects.json               ← Registro de todos los proyectos
├── state/
│   └── <slug>.json             ← Estado de ejecución por proyecto
├── roadmap-progress/
│   └── <slug>.json             ← Progreso del roadmap por proyecto
├── telemetry/
│   └── <slug>/
│       └── <run-id>.jsonl      ← Eventos de telemetría por ejecución
└── logs/
    └── <slug>/
        └── *.log               ← Logs raw de sesiones
```

---

## Flujo de ejecución principal

### Pipeline por sesión (`run_session_cambio_grande` en `runner.sh`)

```
Sesión N
  │
  ├─ Paso 1: Implementación (ORCH_MAX_TURNS_IMPLEMENT, default: 80 turnos)
  │    Prompt: prompt de implementación + plan de sesión (si existe)
  │    Claude Code corre con --dangerously-skip-permissions
  │
  ├─ Paso 2: Revisión por roles (ORCH_MAX_TURNS_SUPPORT, default: 40 turnos)
  │    Si existe docs/roles/ → usa apply-roles.md
  │    Si no → prompt inline con los 8 roles estándar
  │    Produce hallazgos por severidad: CRÍTICOS, ALTOS, MEDIOS, BAJOS
  │
  ├─ Paso 3: Corrección de hallazgos (3 pasadas de ORCH_MAX_TURNS_FIX_PASS c/u, default: 50)
  │    Pasada 1: solo CRÍTICOS
  │    Pasada 2: solo ALTOS
  │    Pasada 3: solo MEDIOS
  │    Lo que no se resuelve → se escribe en docs/TECH_DEBT.md (20 turnos)
  │
  ├─ Paso 4: Documentación (ORCH_MAX_TURNS_SUPPORT, default: 40 turnos)
  │    Actualiza SESSION_LOG.md y ARCHITECTURE.md
  │    Si existe scripts/prompts/document.md → lo usa como prompt
  │
  └─ Paso 5: Build + Push
       Corre: npm run build (o equivalente)
       Si falla: hasta ORCH_CI_MAX_RETRIES intentos de fix (default: 3)
       Push según ORCH_BRANCH_STRATEGY:
         "direct" → push a rama principal
         "pr"     → crea rama session/<slug>/s<N>, crea PR con gh
```

### Modos disponibles

| Modo | Función en runner.sh | Descripción |
|------|---------------------|-------------|
| Continuar roadmap | `run_session_cambio_grande()` | Ejecuta pipeline completo por sesión. Puede auto-continuar todas las pendientes. |
| Roadmap nuevo | `run_roadmap()` | Pide descripción y genera ROADMAP.md |
| Cambio grande | `run_cambio_grande_standalone()` | Pipeline completo sin sesión de roadmap |
| Cambio puntual | `run_cambio()` | Ejecuta `/project:cambio` o prompt inline |
| Sesión libre | `run_sesion()` | Abre Claude interactivo en el proyecto |

---

## Sistema de progreso paralelo

**El progreso NO se guarda en marcadores dentro de ROADMAP.md.** Se guarda en un archivo JSON separado:

```
~/.q-orchestrator/roadmap-progress/<slug>.json
```

Estructura:
```json
{
  "completed": [1, 2, 3],
  "last_updated": "2026-03-25T10:30:00Z"
}
```

Funciones clave en `sessions.sh`:
- `mark_session_completed(slug, num)` — agrega número al array y escribe el JSON
- `reset_roadmap_progress(slug)` — borra el archivo
- `parse_roadmap(project_path, slug)` — cruza ROADMAP.md con el JSON para determinar estado

Esto permite:
- Que Claude escriba libremente en ROADMAP.md sin romper el tracking
- Resetear el progreso sin modificar el repo
- Estado por máquina (cada operador tiene su propio `~/.q-orchestrator/`)

---

## Parser de ROADMAP.md

El parser es puro bash (sin dependencias Node/Python) en `sessions.sh`:

```bash
function _list_roadmap_sessions() {
    local roadmap_file="$1"
    while IFS= read -r line; do
        if [[ "$line" =~ ^###[[:space:]]+[Ss]esi..?n[[:space:]]+([0-9]+)[[:space:]]*:[[:space:]]*(.+) ]]; then
            local num="${BASH_REMATCH[1]}"
            local name="${BASH_REMATCH[2]}"
            echo "${num}|${name}"
        fi
    done < "$roadmap_file"
}
```

**Por qué `..?` en lugar de `ó`:**
- En locales UTF-8: `ó` es 1 carácter
- En locale C (Windows Git Bash): `ó` son 2 bytes (`\xc3\xb3`)
- `..?` matchea 1 o 2 caracteres, funcionando en ambos casos

**Formato requerido en ROADMAP.md:**
```markdown
### Sesión 1: Nombre de la sesión
### Sesión 11: Otro nombre
```

**NO funcionan:**
```markdown
### ✅ Sesión 1: ...       ← emoji antes de Sesión
## Sesión 1: ...           ← h2 en vez de h3
~~Sesión 1: ...~~          ← caracteres antes de Sesión
```

---

## Descubrimiento de archivos de plan

El orquestador busca los planes detallados de cada sesión en este orden:

```
1. docs/plan_inicial/
2. scripts/sessions/
3. sessions/
4. docs/sessions/
5. docs/plan/
```

Para la sesión N, busca estos nombres de archivo (en orden):
1. `sesion-NN.md` (español, zero-padded)
2. `session-NN.md` (inglés, zero-padded)
3. `sesion-N.md` (español, sin padding)
4. `session-N.md` (inglés, sin padding)

Función: `find_session_prompts_dir()` en `sessions.sh`

Si no encuentra archivos de plan, el orquestador usa solo el ROADMAP.md como contexto para la implementación (resultados peores, pero funciona).

---

## Motor de ejecución de Claude (`runner.sh`)

### `_build_claude_cmd()`

Construye el array `_CLAUDE_CMD` (global) con los flags de Claude:

```bash
_CLAUDE_CMD=(claude)
_CLAUDE_CMD+=(-p "$prompt")
_CLAUDE_CMD+=(--max-turns "$turns")
_CLAUDE_CMD+=(--model "$ORCH_MODEL")
_CLAUDE_CMD+=(--cwd "$project_path")

# Si skip permissions
[[ "$ORCH_SKIP_PERMISSIONS" == "true" ]] && _CLAUDE_CMD+=(--dangerously-skip-permissions)

# Si verbose (stream-json)
if [[ "$ORCH_VERBOSE" == "true" ]]; then
    _CLAUDE_CMD+=(--output-format stream-json --verbose)
fi
```

**CRÍTICO: usar array, no string.** Los prompts contienen paréntesis, comillas y caracteres especiales que `eval` interpreta como subshells y redirecciones.

### `run_claude()`

```bash
function run_claude() {
    _build_claude_cmd "$@"
    if [[ "$ORCH_VERBOSE" == "true" ]]; then
        "${_CLAUDE_CMD[@]}" | node "$STREAM_FILTER" ${log_arg}
    else
        "${_CLAUDE_CMD[@]}"
    fi
}
```

### Modo batch (prompts de implementación)

Todos los prompts empiezan con:
```
Estás corriendo en modo batch desatendido. NO pidas confirmación,
NO hagas preguntas, NO esperes input humano. Tomá todas las
decisiones necesarias y completá la tarea de principio a fin.
```

Y para implementación:
```
NO crees ni modifiques IMPLEMENTATION_PLAN.md — el plan ya está
en ROADMAP.md y/o en el archivo de sesión.
```

Esto previene que Claude:
- Pida aprobación antes de crear archivos
- Haga un plan de implementación en vez de implementar
- Se detenga a mitad de camino esperando confirmación

---

## Filtro de stream (`stream-filter.js`)

Lee el output de `claude --output-format stream-json --verbose` desde stdin y lo convierte en output legible:

**Eventos procesados:**
- `tool_use` — muestra icono + nombre del tool (📖 Read, ✏️ Edit, ⚡ Bash, etc.)
- `tool_result` — muestra primeras 3 líneas del output, resalta errores
- `assistant` — muestra primeras 3 líneas de texto
- `result` — muestra resumen final: `✓ OK | 42 turnos | 3m15s | $0.85`

**Eventos ignorados:**
- Bloques `thinking`
- Eventos `init`
- Rate limits

**Flags:**
```bash
node stream-filter.js              # Solo filtra
node stream-filter.js --log f.log  # Filtra + guarda JSON raw
```

**Por qué stream-json en vez de texto:**
- `claude -p` solo muestra el output final, no el progreso
- `--verbose` con texto plano es ruidoso y difícil de parsear
- `stream-json` da eventos estructurados con tool calls, costos y metadatos

---

## Sistema de configuración por capas

```
Defaults en config.sh
    ↓ sobreescrito por
~/.q-orchestrator/config.sh         (config global del usuario)
    ↓ sobreescrito por
<project>/.q-orchestrator.sh        (config específica del proyecto)
    ↓ sobreescrito por
Variables de entorno al momento de ejecución
```

### Todas las variables ORCH_*

| Variable | Default | Descripción |
|----------|---------|-------------|
| `ORCH_MODEL` | `claude-sonnet-4-6` | Modelo de Claude |
| `ORCH_MAX_TURNS_IMPLEMENT` | `80` | Turnos para implementación |
| `ORCH_MAX_TURNS_SUPPORT` | `40` | Turnos para revisión/docs |
| `ORCH_MAX_TURNS_FIX_PASS` | `50` | Turnos por pasada de fix (CRÍTICOS/ALTOS/MEDIOS) |
| `ORCH_MAX_TURNS_BUILD` | `30` | Turnos para fix de build |
| `ORCH_MAX_TURNS_CI_FIX` | `40` | Turnos para fix en CI |
| `ORCH_CI_MAX_RETRIES` | `3` | Intentos de fix de build/lint antes de abortar |
| `ORCH_CI_POLL_INTERVAL` | `30` | Segundos entre checks de CI (si aplica) |
| `ORCH_CI_TIMEOUT` | `600` | Timeout total de CI en segundos |
| `ORCH_SKIP_PERMISSIONS` | `true` | Agrega --dangerously-skip-permissions |
| `ORCH_VERBOSE` | `true` | Usa stream-json + stream-filter |
| `ORCH_SKIP_ROLES` | `false` | Omite paso de revisión por roles |
| `ORCH_SKIP_FIX` | `false` | Omite paso de corrección de hallazgos |
| `ORCH_SKIP_DOCS` | `false` | Omite paso de documentación |
| `ORCH_AUTO_PUSH` | `true` | Push automático al final |
| `ORCH_AUTO_CONTINUE` | `false` | Continúa automáticamente a la siguiente sesión |
| `ORCH_GIT_AUTO_PULL` | `true` | Pull antes de iniciar sesión |
| `ORCH_GIT_PUSH_RETRIES` | `4` | Reintentos de push con backoff exponencial |
| `ORCH_BRANCH_STRATEGY` | `direct` | `direct` o `pr` |
| `ORCH_ON_STEP_FAIL` | `ask` | `ask`, `skip`, o `abort` |
| `ORCH_LOG_DIR` | `~/.q-orchestrator/logs` | Directorio de logs |
| `Q_ORCH_CONFIG_DIR` | `~/.q-orchestrator` | Directorio de config |

### Branch strategy `pr`

Cuando `ORCH_BRANCH_STRATEGY=pr`:
- Se crea rama `session/<slug>/s<N>` antes de la sesión
- Al final: `gh pr create --title "Sesión N: <nombre>" --base <main_branch>`
- **Requiere `gh` CLI instalado y autenticado**
- El merge lo hace el operador manualmente

---

## Telemetría (`telemetry.sh`)

Cada ejecución genera un archivo JSONL en `~/.q-orchestrator/telemetry/<slug>/<run-id>.jsonl`.

### Eventos registrados

| Evento | Cuándo | Campos |
|--------|--------|--------|
| `run_start` | Al iniciar sesión | session, model, config completo |
| `step_start` | Al iniciar cada paso | step_name, timestamp |
| `step_end` | Al terminar cada paso | step_name, status, duration_ms |
| `ci_attempt` | Por cada intento de build | attempt_num, success, exit_code |
| `push_attempt` | Por cada intento de push | attempt_num, success, branch |
| `run_end` | Al terminar la sesión | total_duration_ms, final_status |
| `note` | Eventos ad-hoc | message |

### Diagnóstico automático

`export_diagnostic_report(slug)` genera un markdown con:
- Tabla resumen de runs
- Análisis de performance por paso
- Efectividad de CI retry
- Historial de config
- Patrones de fallo
- Recomendaciones automáticas (ajuste de turns, optimización de CI)

Desde el menú: `Diagnóstico > Ver reporte de proyecto`

---

## Registro de proyectos (`projects.sh`)

Archivo: `~/.q-orchestrator/projects.json`

```json
{
  "projects": [
    {
      "slug": "mi-saas",
      "path": "/home/user/mi-saas",
      "repo": "usuario/mi-saas",
      "branch": "main"
    }
  ]
}
```

### Parsing JSON

El módulo detecta qué herramienta usar:
1. `node` (preferido — más rápido y confiable)
2. `python3`
3. `python`

**Path handling en Windows:**

```bash
function _to_native_path() {
    # Convierte /c/Users/... a C:/Users/...
    if command -v cygpath &>/dev/null; then
        cygpath -w "$1"
    else
        echo "$1"
    fi
}
```

---

## Modo auto-continuar

Cuando el usuario elige "Ejecutar S{N} y continuar con las siguientes":

```bash
ORCH_AUTO_CONTINUE=true
# Loop: ejecutar sesión N, marcarla completada, buscar siguiente pendiente, repetir
```

El orquestador continúa hasta que no haya más sesiones pendientes o hasta que falle un paso con `ORCH_ON_STEP_FAIL=abort`.

---

## Compatibilidad Windows (Git Bash)

Problemas conocidos y soluciones implementadas:

| Problema | Solución |
|----------|----------|
| `ó` en regex falla en locale C | `..?` en vez de `ó` en el regex de sesiones |
| Paths con backslash | `cygpath -u` al leer paths del JSON |
| Git Bash no en PATH estándar | `wrapper.bat` busca en `Program Files` y `where bash` |
| Encoding UTF-8 en cmd.exe | `chcp 65001` en wrapper.bat |
| `eval` interpretando `()` | Array bash en vez de string eval |

---

## Detección de capacidades

`detect_capabilities()` en `sessions.sh` retorna un string con lo que encontró en el proyecto:

```
roadmap sessions(plan_inicial) roles prompts commands
```

- `roadmap` — existe ROADMAP.md
- `sessions(plan_inicial)` — archivos de plan en docs/plan_inicial/
- `roles` — existe docs/roles/
- `prompts` — existe scripts/prompts/
- `commands` — existe .claude/commands/

El menú principal muestra esto como indicador del estado del proyecto.

---

## Cómo agregar un paso al pipeline

Editar `run_session_cambio_grande()` en `runner.sh`:

```bash
# Paso existente (ejemplo):
ui_section "Paso 3: Corrección"
run_claude "$fix_prompt" "$project_path" "$ORCH_MAX_TURNS_FIX_PASS" "$model"
[[ $? -ne 0 ]] && _handle_step_fail "fix" && return 1

# Nuevo paso (ejemplo: tests E2E):
ui_section "Paso 3b: Tests E2E"
local e2e_prompt="Ejecutá los tests E2E del proyecto. Si fallan, corregilos."
run_claude "$e2e_prompt" "$project_path" 30 "$model"
[[ $? -ne 0 ]] && _handle_step_fail "e2e" && return 1
```

---

## Uso en un repo separado

Si movés el orquestador a su propio repo:

1. **Estructura mínima necesaria:**
   ```
   q-orchestrator/
   ├── q-orchestrator.sh
   ├── lib/
   │   ├── config.sh
   │   ├── runner.sh
   │   ├── sessions.sh
   │   ├── projects.sh
   │   ├── ui.sh
   │   ├── telemetry.sh
   │   └── stream-filter.js
   └── templates/
       ├── wrapper.sh
       └── wrapper.bat
   ```

2. **Actualizar paths en `q-orchestrator.sh`:**
   ```bash
   ORCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
   source "$ORCH_DIR/lib/config.sh"
   # etc.
   ```
   Actualmente usa `$SCRIPT_DIR` que apunta al directorio del script — esto ya funciona.

3. **Actualizar wrappers de proyectos:**
   Los wrappers tienen `ORCHESTRATOR_PATH` hardcodeado. Habría que editarlos o regenerarlos con la nueva ruta.

4. **Config global sigue siendo `~/.q-orchestrator/`** — portable entre repos.

---

## Logs y debugging

### Ver logs de una sesión

```bash
ls ~/.q-orchestrator/logs/<slug>/
cat ~/.q-orchestrator/logs/<slug>/<session>-implement.log
```

### Ver telemetría raw

```bash
cat ~/.q-orchestrator/telemetry/<slug>/<run-id>.jsonl | node -e "
  const rl = require('readline').createInterface({input: process.stdin});
  rl.on('line', l => { const e = JSON.parse(l); console.log(e.event, e.step || e.status || ''); });
"
```

### Resetear progreso de un proyecto

```bash
rm ~/.q-orchestrator/roadmap-progress/<slug>.json
```

### Resetear state de ejecución

```bash
rm ~/.q-orchestrator/state/<slug>.json
```

### Diagnóstico desde el menú

`Configuración y diagnóstico > Diagnóstico > Ver reporte de <slug>`

---

## Roadmap técnico del orquestador

Cosas que faltan o podrían mejorarse (registradas por sesiones previas):

- [ ] **Notificaciones** al terminar una sesión (webhook, Slack, etc.)
- [ ] **Modo dry-run** — mostrar qué haría sin ejecutar
- [ ] **Retry de paso individual** sin reiniciar la sesión entera
- [ ] **Dashboard web** — UI para ver estado de todos los proyectos
- [ ] **GitHub Actions integration** — trigger sessions desde CI
- [ ] **stream-filter.js** — soporte para mostrar costo acumulado en tiempo real
- [ ] **Self-improvement** — el sistema de análisis de telemetría está scaffoldeado pero no completo
- [ ] **Windows native** — versión PowerShell del orchestrator principal

---

## Historial de decisiones técnicas importantes

### Por qué progress JSON separado (no markers en ROADMAP.md)

Los markers como `[x]` en ROADMAP.md requieren que Claude los escriba exactamente así. En la práctica, Claude a veces cambia el formato, agrega texto, o no actualiza los markers. Un archivo JSON separado desacopla completamente el tracking del contenido del roadmap.

### Por qué array bash en vez de string+eval para Claude CLI

Los prompts de implementación contienen paréntesis `(backend)`, comillas `"`, y otros caracteres que bash interpreta como subshells o redirecciones cuando se usan con `eval`. El array `_CLAUDE_CMD` se expande correctamente con `"${_CLAUDE_CMD[@]}"` sin interpretar el contenido.

### Por qué 3 pasadas de fix en vez de 1

Con 8 revisores generando 60+ hallazgos, una sola pasada de 40 turnos agotaba el límite sin resolver todos los críticos. 3 pasadas de 50 turnos cada una, en orden de severidad, garantiza que los críticos y altos se resuelven aunque los medios no entren.

### Por qué stream-json para verbose

`claude -p` solo muestra el resultado final. `--verbose` con texto plano es un dump de todos los tool calls sin estructura. `--output-format stream-json` da eventos estructurados (tool names, results, costs) que `stream-filter.js` convierte en output legible en tiempo real.
