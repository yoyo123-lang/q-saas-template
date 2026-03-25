# Guía: Orquestador de Sesiones con Claude Code CLI

> Cómo automatizar la ejecución secuencial de múltiples sesiones de Claude Code desde la terminal, sin intervención humana.

## Qué es

Un script que encadena sesiones de Claude Code CLI automáticamente. Cada sesión ejecuta un prompt, revisa el código, corrige hallazgos, documenta, pushea, espera CI, y pasa a la siguiente.

## Cuándo usarlo

- Tenés un proyecto con un ROADMAP de múltiples sesiones
- Cada sesión depende de la anterior
- Querés dejarlo corriendo de noche sin intervención

## Requisitos

| Herramienta | Versión mínima | Para qué |
|-------------|---------------|----------|
| Node.js | 18+ | Runtime del proyecto |
| npm | 8+ | Dependencias |
| Claude Code CLI | Última | Ejecuta las sesiones |
| Git | 2.x | Commits y push |
| Git Bash (Windows) | Incluido con Git | Correr scripts bash en Windows |
| Python3 | 3.x | Parsear JSON de estado (opcional) |
| curl | Cualquiera | Consultar CI de GitHub (opcional) |

### Instalar Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

## Arquitectura

```
scripts/
├── orchestrate.sh          ← Script principal (bash)
├── iniciar.bat             ← Launcher Windows con menú interactivo
├── state.json              ← Estado actual (sesión, paso, timestamp)
├── sessions/
│   ├── session-01.md       ← Prompt de cada sesión
│   ├── session-02.md
│   └── ...
├── prompts/
│   ├── apply-roles.md      ← Revisión por roles
│   ├── fix-findings.md     ← Corregir hallazgos
│   ├── document.md         ← Documentar lo hecho
│   └── fix-ci.md           ← Reparar tests de CI
└── logs/
    └── *.log               ← Logs automáticos por paso
```

## Flujo por sesión

```
Sesión N
   │
   ├─ 1. IMPLEMENTACIÓN ──── claude -p session-XX.md
   │     Ejecuta el prompt de la sesión. Crea código, tests, commits.
   │
   ├─ 2. REVISIÓN POR ROLES ── claude -p apply-roles.md
   │     Aplica 8+ roles de revisión (code review, QA, seguridad, etc.)
   │     Genera informes en docs/reviews/
   │
   ├─ 3. CORRECCIÓN ──────── claude -p fix-findings.md
   │     Lee los informes y corrige TODOS los hallazgos (críticos a bajos)
   │
   ├─ 4. DOCUMENTACIÓN ───── claude -p document.md
   │     Actualiza SESSION_LOG, IMPLEMENTATION_PLAN, ARCHITECTURE
   │
   ├─ 5. BUILD + PUSH ────── claude -p (inline)
   │     npm run build → lint → test → git commit → git push
   │
   ├─ 6. ESPERAR CI ──────── poll cada 30s vía GitHub API
   │     Si CI pasa → siguiente sesión
   │     Si CI falla ↓
   │
   ├─ 7. REPARAR CI ──────── claude -p fix-ci.md (loop, máx 5 intentos)
   │     Reproduce localmente, arregla, re-pushea
   │
   └─ 8. SIGUIENTE SESIÓN ── actualiza state.json → Sesión N+1
```

## Cómo replicarlo en tu proyecto

### Paso 1: Definir las sesiones

Cada sesión es un archivo `.md` con un prompt completo. Estructura recomendada:

```markdown
# scripts/sessions/session-01.md

Sos un ingeniero senior trabajando en [TU_PROYECTO].

## Contexto
Lee estos archivos antes de empezar:
- ROADMAP.md → Sesión 1
- [otros archivos relevantes]

## Tu tarea: [Nombre de la sesión]

### Objetivo
[Qué debe estar listo al terminar]

### Etapas

**Etapa 1: [nombre]**
- Detalle de lo que hay que hacer
- Archivos involucrados

**Etapa 2: [nombre]**
- ...

### Proceso obligatorio
1. Creá el plan de implementación
2. TDD: test primero, código después
3. Un commit por tarea atómica
```

**Reglas para buenos prompts de sesión:**
- Ser específico: decir QUÉ archivos crear, QUÉ funciones implementar
- Indicar dependencias: qué debe existir antes
- Definir "definition of done": cuándo está terminada la sesión
- No dejar ambigüedades: si Claude tiene que elegir, va a elegir mal

### Paso 2: Definir los prompts de soporte

Son los mismos para todos los proyectos. Copiar de `scripts/prompts/`:

| Archivo | Qué hace |
|---------|----------|
| `apply-roles.md` | Aplica roles de revisión sobre el código nuevo |
| `fix-findings.md` | Lee informes de revisión y corrige todo |
| `document.md` | Documenta lo que se hizo |
| `fix-ci.md` | Reproduce y arregla fallos de CI |

Adaptá las rutas y nombres de archivos a tu proyecto.

### Paso 3: Crear el script orquestador

El núcleo es simple — un loop que llama a `claude -p` repetidamente:

```bash
#!/bin/bash

# Función principal: ejecutar un prompt con Claude
run_claude() {
  local prompt_file="$1"
  claude -p "$(cat "$prompt_file")" \
    --model claude-sonnet-4-6 \
    --max-turns 50
}

# Loop por sesión
for SESSION in $(seq 1 $TOTAL_SESSIONS); do
  SESSION_FILE="scripts/sessions/session-$(printf '%02d' $SESSION).md"

  # 1. Implementar
  run_claude "$SESSION_FILE"

  # 2. Revisar
  run_claude "scripts/prompts/apply-roles.md"

  # 3. Corregir
  run_claude "scripts/prompts/fix-findings.md"

  # 4. Documentar
  run_claude "scripts/prompts/document.md"

  # 5. Push (inline)
  claude -p "Corré build, lint, test. Commiteá y pusheá." \
    --model claude-sonnet-4-6 --max-turns 30

  # 6. Esperar CI (opcional)
  # 7. Reparar CI si falla (opcional)
done
```

Después podés agregar:
- **Estado persistente** (`state.json`) para retomar si se corta
- **Logs** por cada paso
- **CI check** consultando GitHub API
- **Launcher Windows** (`iniciar.bat`) con menú interactivo

### Paso 4: Configurar el estado

```json
{
  "session": 1,
  "step": "start",
  "status": "pending",
  "updated_at": ""
}
```

El script actualiza esto en cada paso. Si se corta, lee el JSON y retoma.

### Paso 5: Launcher para Windows (opcional)

Si tus usuarios usan Windows, crear un `iniciar.bat` que:
1. Busca Git Bash automáticamente
2. Valida dependencias
3. Muestra menú interactivo con estado y progreso
4. Deshabilita suspensión de Windows mientras corre
5. Permite retomar desde sesión específica

Ver `scripts/iniciar.bat` como referencia.

## Parámetros de Claude CLI relevantes

| Parámetro | Qué hace | Valor recomendado |
|-----------|----------|-------------------|
| `-p "prompt"` | Modo no-interactivo (prompt mode) | Siempre usar |
| `--model` | Modelo a usar | `claude-sonnet-4-6` (rápido) o `claude-opus-4-6` (mejor) |
| `--max-turns` | Máximo de turnos antes de parar | 50 para implementación, 30 para fixes |
| `--verbose` | Muestra más detalle | Útil para logs |
| `--allowedTools` | Herramientas permitidas | `"Edit,Write,Read,Glob,Grep,Bash,Agent"` |

## Costos estimados

| Modelo | Por sesión (implementar + revisar + corregir) | 11 sesiones |
|--------|----------------------------------------------|-------------|
| Sonnet | ~$3-5 USD | ~$35-55 USD |
| Opus | ~$15-25 USD | ~$165-275 USD |

Estos son estimados. Varía según la complejidad del código.

## Personalización común

### Cambiar el modelo

En `orchestrate.sh`, buscar `--model` y reemplazar:

```bash
# Más rápido y barato
--model claude-sonnet-4-6

# Más inteligente pero más caro y lento
--model claude-opus-4-6
```

### Agregar más pasos al loop

En el main loop de `orchestrate.sh`, agregar un paso nuevo:

```bash
# Ejemplo: correr tests E2E después de documentar
save_state "$SESSION_NUM" "e2e"
run_claude "$PROMPTS_DIR/run-e2e.md" "e2e-tests"
```

### Quitar pasos

Comentar o borrar el bloque del paso que no querés. Por ejemplo, si no tenés roles de revisión:

```bash
# ── PASO 2: Aplicar roles de revisión ──
# save_state "$SESSION_NUM" "roles"
# run_claude "$PROMPTS_DIR/apply-roles.md" "roles"
```

### Cambiar la branch

En `orchestrate.sh`:

```bash
BRANCH="tu-branch-de-desarrollo"
```

### Cambiar el repo

En `orchestrate.sh`:

```bash
REPO_SLUG="tu-usuario/tu-repo"
```

### Sin CI check

Si no tenés GitHub Actions, no seteés `GITHUB_TOKEN` y el script saltea el CI check automáticamente.

## Troubleshooting

| Problema | Solución |
|----------|----------|
| "claude: command not found" | `npm install -g @anthropic-ai/claude-code` |
| "bash: not found" (Windows) | Instalar Git desde git-scm.com (incluye Git Bash) |
| Script se corta a mitad | `./scripts/orchestrate.sh --from N` (retoma sesión N) |
| Claude se queda en loop | Reducir `--max-turns` a 30 |
| Muchos errores de CI | Revisar que los prompts de sesión sean específicos |
| "Rate limit exceeded" | Esperar 1 hora o cambiar a modelo más barato |
| state.json corrupto | Borrarlo y usar `--from N` para retomar |

## Ejemplo completo mínimo

Para un proyecto con 3 sesiones (backend, frontend, deploy):

```
mi-proyecto/
├── scripts/
│   ├── orchestrate.sh
│   ├── state.json
│   ├── sessions/
│   │   ├── session-01.md   "Crear API REST con Express"
│   │   ├── session-02.md   "Crear frontend React"
│   │   └── session-03.md   "Tests E2E y deploy"
│   └── prompts/
│       ├── fix-findings.md
│       └── fix-ci.md
```

Script mínimo (`orchestrate.sh`):

```bash
#!/bin/bash
set -euo pipefail

for i in 1 2 3; do
  echo "=== Sesión $i ==="
  claude -p "$(cat scripts/sessions/session-0${i}.md)" \
    --model claude-sonnet-4-6 --max-turns 50

  claude -p "Corré build, lint, test. Commiteá y pusheá a origin main." \
    --model claude-sonnet-4-6 --max-turns 20
done

echo "Listo!"
```

Eso es lo mínimo funcional. Después podés ir agregando complejidad según necesites.
