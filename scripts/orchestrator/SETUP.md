# q-orchestrator — Instalación y uso

> Orquestador agnóstico de sesiones Claude Code.
> Un solo script, múltiples proyectos, cualquier workflow.

## Qué es

Un reemplazo cross-platform del `iniciar.bat` que:
- **No está atado a un proyecto** — registrás N repos y elegís en cuál trabajar
- **No está atado a sesiones fijas** — lee `ROADMAP.md` dinámicamente
- **Te deja elegir el workflow** — roadmap, cambio-grande, cambio, sesión libre
- **Te deja elegir el modelo** — Sonnet, Opus, Haiku
- **Funciona en cualquier OS** — Linux, macOS, WSL, Git Bash en Windows

## Requisitos

| Herramienta | Mínimo | Para qué |
|-------------|--------|----------|
| Claude Code CLI | Última | Ejecuta las sesiones |
| Git | 2.x | Commits y push |
| Bash | 4+ | El orquestador (incluido en Git Bash, macOS, Linux) |
| Python3 o Node.js | 3.x / 18+ | Parsear JSON de estado |

```bash
# Instalar Claude CLI si no lo tenés
npm install -g @anthropic-ai/claude-code
claude auth login
```

## Instalación (una sola vez)

### 1. Clonar este repo (si no lo tenés)

```bash
git clone <url-de-q-saas-template> ~/q-saas-template
```

### 2. Hacer ejecutable el orquestador

```bash
chmod +x ~/q-saas-template/scripts/orchestrator/q-orchestrator.sh
```

### 3. (Opcional) Crear un alias global

```bash
# En ~/.bashrc o ~/.zshrc:
alias qorch="~/q-saas-template/scripts/orchestrator/q-orchestrator.sh"
```

Ahora podés ejecutar `qorch` desde cualquier terminal.

## Uso directo

```bash
# Menú interactivo completo
./q-orchestrator.sh

# Ir directo a un proyecto
./q-orchestrator.sh --project mi-saas

# Ir directo a continuar el roadmap con Opus
./q-orchestrator.sh --project mi-saas --mode continue --model claude-opus-4-6

# Ejecutar un cambio puntual
./q-orchestrator.sh --project mi-saas --mode cambio
```

## Conectar un proyecto nuevo

Hay dos formas:

### Opción A: Desde el menú del orquestador

1. Ejecutá `qorch` (o `./q-orchestrator.sh`)
2. Elegí "Gestionar proyectos" → "Registrar proyecto nuevo"
3. Ingresá slug, path, repo y branch

### Opción B: Con un wrapper script en el proyecto

Esto es lo recomendado para que cualquier miembro del equipo pueda arrancar.

#### Linux / macOS

Copiá `templates/wrapper.sh` a la raíz de tu proyecto y editá las variables:

```bash
cp ~/q-saas-template/scripts/orchestrator/templates/wrapper.sh ./orchestrate.sh
chmod +x ./orchestrate.sh
```

Editá `orchestrate.sh`:
```bash
PROJECT_SLUG="mi-saas"                               # nombre corto
ORCHESTRATOR_PATH="$HOME/q-saas-template/scripts/orchestrator"  # ruta al orquestador
```

Y en el bloque de `add_project`, reemplazá:
```bash
RESULT=$(add_project "$PROJECT_SLUG" "$PROJECT_DIR" "usuario/mi-saas" "main" 2>/dev/null || echo "OK")
```

Ahora:
```bash
./orchestrate.sh                    # menú con este proyecto preseleccionado
./orchestrate.sh --mode continue    # continuar roadmap directamente
```

#### Windows

Copiá `templates/wrapper.bat` y editá las variables de la misma forma.

### Opción C: Con ORCHESTRATOR_CONNECT.md (para repos de terceros)

Si querés que Claude Code configure la conexión automáticamente dentro de una sesión:

1. Copiá `ORCHESTRATOR_CONNECT.md` (incluido en este repo) a la raíz del proyecto destino
2. En una sesión de Claude Code en ese proyecto, decí:
   ```
   Leé ORCHESTRATOR_CONNECT.md y configurá este proyecto para el orquestador.
   ```
3. Claude va a crear el wrapper, registrar el proyecto, y generar los archivos de soporte

## Estructura de archivos

```
~/.q-orchestrator/                  ← Config global (se crea automáticamente)
├── projects.json                   ← Registro de proyectos
├── state/
│   └── <slug>.json                 ← Estado por proyecto
└── logs/
    └── <slug>/
        └── *.log                   ← Logs por sesión

scripts/orchestrator/               ← El orquestador (en q-saas-template)
├── q-orchestrator.sh               ← Script principal
├── lib/
│   ├── ui.sh                       ← UI helpers
│   ├── projects.sh                 ← Registro de proyectos
│   ├── sessions.sh                 ← Detección de sesiones
│   └── runner.sh                   ← Ejecución de Claude CLI
├── templates/
│   ├── wrapper.sh                  ← Template de wrapper Linux/Mac
│   └── wrapper.bat                 ← Template de wrapper Windows
├── SETUP.md                        ← Este archivo
└── ORCHESTRATOR_CONNECT.md         ← Guía para repos destino
```

## Cómo funciona por dentro

### Registro de proyectos

Los proyectos se guardan en `~/.q-orchestrator/projects.json`:

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

### Detección de sesiones

Cuando seleccionás un proyecto, el orquestador busca:

1. **`ROADMAP.md`** en la raíz → parsea las sesiones y su estado
2. **`scripts/sessions/session-*.md`** → prompts detallados por sesión
3. **`scripts/prompts/*.md`** → prompts de soporte (roles, fix, docs)
4. **`.claude/commands/`** → skills disponibles (cambio, cambio-grande, etc.)

Si el proyecto no tiene session files, el orquestador genera prompts inline basados en el ROADMAP.

### Modos de trabajo

| Modo | Qué hace | Necesita |
|------|----------|----------|
| Continuar roadmap | Lee ROADMAP.md, ejecuta la siguiente sesión pendiente con el ciclo completo (implementar → revisar → corregir → documentar → push) | ROADMAP.md |
| Roadmap nuevo | Pide descripción y genera ROADMAP.md | Nada |
| Cambio grande | Pide descripción y ejecuta /project:cambio-grande | Nada |
| Cambio puntual | Pide descripción y ejecuta /project:cambio | Nada |
| Sesión libre | Abre Claude interactivo en el proyecto | Nada |

### Estado persistente

Cada proyecto tiene su propio `state.json` en `~/.q-orchestrator/state/`. Si el proceso se corta, el orquestador sabe dónde retomar.

## Personalización

### Cambiar pasos del ciclo por sesión

Editá `lib/runner.sh`, función `run_session_cambio_grande()`. Podés:
- Agregar pasos (ej: tests E2E después de documentar)
- Quitar pasos (ej: omitir revisión por roles)
- Cambiar el `max-turns` por paso

### Cambiar la detección de sesiones

Editá `lib/sessions.sh`, función `parse_roadmap()`. El parser busca headers `### Sesión N: nombre` — adaptalo si tu ROADMAP usa otro formato.

### Configuración por variable de entorno

| Variable | Default | Qué hace |
|----------|---------|----------|
| `Q_ORCH_CONFIG_DIR` | `~/.q-orchestrator` | Directorio de configuración |
| `GITHUB_TOKEN` | (no set) | Para CI checks vía GitHub API |

## Migración desde iniciar.bat

Si venías usando el `iniciar.bat` hardcodeado:

1. Registrá tu proyecto en el orquestador
2. Tu `state.json` anterior (en `scripts/state.json`) no se migra automáticamente — usá `--mode continue` y elegí desde qué sesión retomar
3. Tus session files y prompts siguen funcionando tal cual — el orquestador los detecta automáticamente

## Troubleshooting

| Problema | Solución |
|----------|----------|
| "claude: command not found" | `npm install -g @anthropic-ai/claude-code` |
| "python3 y node no encontrados" | Instalá al menos uno de los dos |
| El orquestador no detecta sesiones | Verificá que ROADMAP.md use el formato `### Sesión N: nombre` |
| Wrapper dice "orquestador no encontrado" | Editá ORCHESTRATOR_PATH en el wrapper |
| State corrupto | Borrá `~/.q-orchestrator/state/<slug>.json` |
