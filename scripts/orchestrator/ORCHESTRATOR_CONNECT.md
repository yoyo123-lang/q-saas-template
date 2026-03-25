# Conectar este proyecto al q-orchestrator

> **Este archivo es una guía para Claude Code.** Subilo a la raíz de cualquier repo
> donde quieras usar el orquestador de sesiones. Después, en una sesión de Claude Code
> en ese repo, decí: "Leé ORCHESTRATOR_CONNECT.md y configurá este proyecto."

## Qué es q-orchestrator

Un orquestador externo que encadena sesiones de Claude Code automáticamente.
Permite ejecutar roadmaps completos sin intervención humana: implementar → revisar → corregir → documentar → push, sesión tras sesión.

Vive en un repo central (q-saas-template) y se conecta a cualquier proyecto via wrapper scripts.

## Instrucciones para Claude Code

Cuando te pidan configurar este proyecto para el orquestador, seguí estos pasos:

### Paso 1: Recopilar información

Preguntale al usuario:

1. **¿Dónde está clonado q-saas-template?** (ej: `~/q-saas-template`, `C:\Users\user\q-saas-template`)
2. **¿Cuál es el slug de este proyecto?** (nombre corto sin espacios, ej: `mi-saas`)
3. **¿Cuál es el repo en GitHub?** (ej: `usuario/mi-saas`, puede estar vacío)
4. **¿Branch principal?** (default: `main`)

### Paso 2: Crear la estructura de soporte

Creá los directorios y archivos que el orquestador espera encontrar:

```
<raíz del proyecto>/
├── ROADMAP.md                    ← Si no existe, sugerir crearlo con /project:roadmap
├── SESSION_LOG.md                ← Si no existe, crear vacío con header
├── scripts/
│   ├── sessions/                 ← Prompts detallados por sesión (opcional)
│   │   ├── session-01.md
│   │   ├── session-02.md
│   │   └── ...
│   └── prompts/                  ← Prompts de soporte (opcional)
│       ├── apply-roles.md
│       ├── fix-findings.md
│       ├── document.md
│       └── fix-ci.md
├── orchestrate.sh                ← Wrapper script (Linux/Mac)
└── orchestrate.bat               ← Wrapper script (Windows)
```

**Importante:** los directorios `scripts/sessions/` y `scripts/prompts/` son opcionales. Si no existen, el orquestador genera prompts inline. Pero si existen, permiten mayor control sobre qué hace cada sesión.

### Paso 3: Crear el wrapper script

#### orchestrate.sh (Linux/Mac/WSL)

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Configuración del proyecto ──
PROJECT_SLUG="__SLUG__"
ORCHESTRATOR_PATH="__ORCH_PATH__/scripts/orchestrator"

# ── Verificar orquestador ──
if [ ! -f "${ORCHESTRATOR_PATH}/q-orchestrator.sh" ]; then
  echo "[ERROR] Orquestador no encontrado en: ${ORCHESTRATOR_PATH}"
  echo "Cloná q-saas-template o corregí ORCHESTRATOR_PATH en este archivo."
  exit 1
fi

# ── Registrar proyecto automáticamente ──
source "${ORCHESTRATOR_PATH}/lib/projects.sh"
source "${ORCHESTRATOR_PATH}/lib/ui.sh"
ensure_config
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
add_project "$PROJECT_SLUG" "$PROJECT_DIR" "__REPO__" "__BRANCH__" 2>/dev/null || true

# ── Ejecutar ──
exec bash "${ORCHESTRATOR_PATH}/q-orchestrator.sh" --project "$PROJECT_SLUG" "$@"
```

Reemplazá:
- `__SLUG__` → slug del proyecto (paso 1.2)
- `__ORCH_PATH__` → ruta a q-saas-template (paso 1.1)
- `__REPO__` → repo GitHub (paso 1.3)
- `__BRANCH__` → branch (paso 1.4)

#### orchestrate.bat (Windows)

```bat
@echo off
chcp 65001 >nul
title q-orchestrator — __SLUG__

set "PROJECT_SLUG=__SLUG__"
set "ORCHESTRATOR_PATH=__ORCH_PATH__\scripts\orchestrator"

set "GITBASH="
if exist "C:\Program Files\Git\bin\bash.exe" (
    set "GITBASH=C:\Program Files\Git\bin\bash.exe"
) else (
    for /f "delims=" %%i in ('where bash 2^>nul') do set "GITBASH=%%i"
)

if "%GITBASH%"=="" (
    echo [ERROR] Git Bash no encontrado.
    pause
    exit /b 1
)

if not exist "%ORCHESTRATOR_PATH%\q-orchestrator.sh" (
    echo [ERROR] Orquestador no encontrado en: %ORCHESTRATOR_PATH%
    pause
    exit /b 1
)

"%GITBASH%" -c "bash '%ORCHESTRATOR_PATH:\=/%/q-orchestrator.sh' --project '%PROJECT_SLUG%' %*"
pause
```

### Paso 4: Crear SESSION_LOG.md (si no existe)

```markdown
# Session Log

> Registro de sesiones de desarrollo. Se actualiza automáticamente al cerrar cada sesión.
```

### Paso 5: Crear prompts de sesión (opcional pero recomendado)

Si el proyecto tiene `ROADMAP.md`, crear un prompt `.md` por cada sesión del roadmap en `scripts/sessions/`. El formato:

```markdown
# Sesión N: [Nombre de la sesión]

## Contexto
Leé estos archivos antes de empezar:
- ROADMAP.md → Sesión N
- SESSION_LOG.md → qué se hizo antes
- [otros archivos relevantes del proyecto]

## Objetivo
[Qué debe estar listo al terminar esta sesión — 1-2 oraciones]

## Etapas

### Etapa 1: [nombre]
- [Tarea concreta]
- [Archivos involucrados]
- [Criterio de "done"]

### Etapa 2: [nombre]
- [Tarea concreta]
- [Archivos involucrados]
- [Criterio de "done"]

## Proceso obligatorio
1. Creá el plan de implementación antes de codear
2. TDD: test primero, código después
3. Un commit por tarea atómica
4. Al terminar: build + lint + test deben pasar
```

**Si no querés crear prompts de sesión:** el orquestador le va a decir a Claude "Leé ROADMAP.md y ejecutá la Sesión N", que funciona pero da menos control.

### Paso 6: Crear prompts de soporte (opcional)

Si querés que el ciclo de revisión sea más preciso, crear estos archivos en `scripts/prompts/`:

#### apply-roles.md
```markdown
Revisá el código que se modificó en esta sesión.

1. Leé el git diff de los últimos commits de esta sesión
2. Para cada archivo modificado, aplicá los roles de revisión relevantes:
   - Code Reviewer: siempre
   - QA Engineer: si hay lógica nueva
   - Security Auditor: si hay auth, input de usuario, o APIs
   - Performance Engineer: si hay queries o loops
   - UX Reviewer: si hay componentes de UI
3. Generá un informe en docs/reviews/ con los hallazgos por severidad

Formato de hallazgo: [SEVERIDAD] archivo:línea — descripción
Severidades: CRÍTICO / ALTO / MEDIO / BAJO
```

#### fix-findings.md
```markdown
Leé los informes de revisión más recientes en docs/reviews/.

1. Corregí TODOS los hallazgos CRÍTICOS y ALTOS
2. Documentá los hallazgos MEDIOS y BAJOS como pendientes
3. Hacé un commit por cada corrección
4. No introduzcas código nuevo — solo corregí lo reportado
```

#### document.md
```markdown
Documentá lo que se hizo en esta sesión:

1. Actualizá SESSION_LOG.md con fecha, cambios, archivos modificados y handoff
2. Si se modificó la estructura del proyecto, actualizá ARCHITECTURE.md
3. Si existe ROADMAP.md, marcá la sesión actual como completada (✅)
4. Commiteá la documentación
```

#### fix-ci.md
```markdown
Los tests de CI fallaron. Arreglalos:

1. Leé los logs de CI del último push
2. Reproducí los fallos localmente
3. Corregí cada fallo
4. Corré los tests localmente para verificar
5. Commiteá y pusheá
```

### Paso 7: Configurar .gitignore

Agregá al `.gitignore` del proyecto:

```gitignore
# q-orchestrator local state (the global state lives in ~/.q-orchestrator)
scripts/state.json
scripts/logs/
```

### Paso 8: Verificar

Corré el wrapper para verificar que funciona:

```bash
# Linux/Mac
./orchestrate.sh

# Windows
orchestrate.bat
```

Debería abrir el menú del orquestador con este proyecto preseleccionado.

### Paso 9: Confirmar al usuario

```
✅ PROYECTO CONECTADO AL ORQUESTADOR

Slug: [slug]
Orquestador: [ruta]
Wrapper: orchestrate.sh / orchestrate.bat

Archivos creados:
- orchestrate.sh (wrapper Linux/Mac)
- orchestrate.bat (wrapper Windows)
- SESSION_LOG.md (si no existía)
- scripts/sessions/ (si se crearon prompts)
- scripts/prompts/ (si se crearon prompts de soporte)

Para usar:
  ./orchestrate.sh                    # menú interactivo
  ./orchestrate.sh --mode continue    # continuar roadmap
  ./orchestrate.sh --mode cambio      # cambio puntual

Para que otros devs del equipo lo usen:
  1. Deben tener q-saas-template clonado en la misma ruta
  2. O editar ORCHESTRATOR_PATH en el wrapper
```

## Notas para el proyecto destino

### CLAUDE.md

Si el proyecto ya tiene `CLAUDE.md`, no lo modifiques a menos que el usuario lo pida. El orquestador no depende de que el proyecto use el template de q-saas-template — funciona con cualquier proyecto que tenga un `ROADMAP.md` con el formato de sesiones.

### Skills (.claude/commands/)

Si el proyecto no tiene los skills de q-saas-template (cambio, cambio-grande, etc.), el orquestador funciona igual porque genera los prompts inline. Pero si los tiene, los aprovecha.

### Formato del ROADMAP.md

El parser del orquestador busca este patrón en el ROADMAP:

```
### Sesión N: Nombre de la sesión
```

Y detecta el estado por:
- `~~tachado~~` o `✅` en el nombre → completada
- `🔄` en el nombre → en progreso
- Nada → pendiente

Asegurate de que el ROADMAP siga este formato para que la detección funcione.
