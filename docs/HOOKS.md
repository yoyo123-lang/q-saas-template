# Hooks: Verificación Automática

> Los hooks son reglas que se ejecutan AUTOMATICAMENTE. No dependen de que Claude Code "se acuerde".
> Sin hooks, las reglas son sugerencias. Con hooks, son obligaciones.

## Qué es un hook

Un hook es un comando que se ejecuta automáticamente antes o después de que Claude Code haga algo. Si el hook falla con código de salida `2`, la acción se bloquea.

Es como un guardia en la puerta: no importa si el que entra quiere saltarse las reglas, el guardia no lo deja pasar.

## Formato de Claude Code hooks

Los hooks se configuran en `.claude/settings.json` dentro de la raíz del proyecto. Los eventos disponibles son:

| Evento | Cuándo se ejecuta |
|---|---|
| `PreToolUse` | Antes de que Claude Code use una herramienta (Edit, Write, Bash, etc.) |
| `PostToolUse` | Después de que Claude Code use una herramienta |
| `Stop` | Cuando Claude Code termina de responder |

Cada hook tiene:
- `matcher`: regex que filtra por nombre de herramienta (ej: `"Edit|Write"`, `"Bash"`, `""` para todos)
- `hooks`: lista de comandos a ejecutar
- Código de salida `0` = permitir, `2` = bloquear la acción

Variables de entorno disponibles en los hooks:
- `$CLAUDE_TOOL_NAME`: nombre de la herramienta
- `$CLAUDE_FILE_PATH`: ruta del archivo (cuando aplica)
- `$CLAUDE_TOOL_INPUT`: JSON con los parámetros de la herramienta

## Hooks recomendados

### 1. Proteger archivos sensibles (antes de editar)

Bloquea la edición de migraciones, .env, y archivos de lock:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "echo $CLAUDE_FILE_PATH | grep -qE '(migrations/|\\.env$|\\.lock$)' && echo 'ARCHIVO PROTEGIDO: no editar directamente' && exit 2 || exit 0"
          }
        ]
      }
    ]
  }
}
```

### 2. Formatear automáticamente después de editar

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $CLAUDE_FILE_PATH 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

**Equivalentes por stack:**

| Stack | Formatter |
|-------|-----------|
| Node.js | `npx prettier --write $CLAUDE_FILE_PATH` |
| Python | `ruff format $CLAUDE_FILE_PATH` o `black $CLAUDE_FILE_PATH` |
| Go | `gofmt -w $CLAUDE_FILE_PATH` |
| PHP | `./vendor/bin/php-cs-fixer fix $CLAUDE_FILE_PATH` |

### 3. Verificar build/lint/tests cuando Claude termina (hook Stop)

> Este hook implementa la regla de `PRE_DEPLOY_AND_QA.md` (Parte 1). Verifica que todo esté en orden cuando Claude termina de trabajar.

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint --silent 2>/dev/null; npm test --silent 2>/dev/null; echo 'Checks completados'"
          }
        ]
      }
    ]
  }
}
```

**Adaptar los comandos a tu stack:**

| Stack | Linter | Tests |
|-------|--------|-------|
| Node.js | `npm run lint` | `npm test` |
| Python | `ruff check .` o `flake8` | `pytest` |
| Go | `golangci-lint run` | `go test ./...` |
| PHP | `./vendor/bin/phpstan` | `./vendor/bin/phpunit` |

### 4. Verificar migración al modificar modelos (proyectos Supabase)

> Para proyectos que usan Supabase. Bloquea la edición de modelos/tipos de BD si no existe una migración correspondiente en el plan o en `supabase/migrations/`.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "if echo $CLAUDE_FILE_PATH | grep -qE '(models/|entities/|schemas/.*\\.ts$|types/.*db)'; then TODAY=$(date +%Y%m%d); if ! ls supabase/migrations/${TODAY}*.sql 1>/dev/null 2>&1 && ! ls supabase/migrations/ 2>/dev/null | tail -1 | grep -q ${TODAY}; then echo 'BLOQUEADO: Estás modificando un modelo/schema sin migración Supabase del día de hoy. Creá la migración primero con: supabase migration new <nombre>' && exit 2; fi; fi; exit 0"
          }
        ]
      }
    ]
  }
}
```

**Qué hace:**
- Detecta si el archivo editado está en carpetas de modelos, entidades o schemas
- Verifica que exista al menos una migración creada hoy en `supabase/migrations/`
- Si no existe, bloquea la edición con mensaje claro

**Personalización:**
- Ajustar el regex de `grep -qE` para que coincida con la estructura de tu proyecto
- Si usás Prisma en vez de Supabase directo, cambiar la verificación a `prisma/migrations/`
- Para proyectos que no usan Supabase, no agregar este hook

### Ejemplo completo de .claude/settings.json

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "echo $CLAUDE_FILE_PATH | grep -qE '(migrations/|\\.env$|\\.lock$)' && echo 'ARCHIVO PROTEGIDO' && exit 2 || exit 0"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $CLAUDE_FILE_PATH 2>/dev/null || true"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint --silent 2>/dev/null && npm test --silent 2>/dev/null || echo 'Algunos checks fallaron — revisar antes de commitear'"
          }
        ]
      }
    ]
  }
}
```

## Opción B: Git hooks tradicionales

Si preferís que funcione también fuera de Claude Code, usar Git hooks en `.git/hooks/` o herramientas como `husky` (Node.js), `pre-commit` (Python), etc.

Se pueden usar ambos al mismo tiempo: Claude Code hooks para el flujo de IA y Git hooks para el flujo humano.

## Empezar sin hooks e ir agregando

No hace falta configurar todo de una. El orden recomendado:

1. **Primero**: Protección de archivos sensibles (evita errores costosos)
2. **Segundo**: Formatter automático (mantiene código limpio sin esfuerzo)
3. **Tercero**: Checks al terminar (lint + tests como red de seguridad)

## Reglas para Claude Code sobre hooks

- Si el proyecto tiene hooks configurados, NUNCA intentar saltearlos o desactivarlos
- Si un hook falla, arreglar el problema (no eliminar el hook)
- Si Claude Code detecta que el proyecto no tiene hooks, puede sugerir agregarlos
- Los hooks se commitean al repo (son parte del proyecto, no configuración personal)

## Qué verifican los hooks vs. qué verifica Claude Code

| Verificación | Hook automático | Claude Code manual |
|---|:-:|:-:|
| Formateo de código | PostToolUse | No es necesario |
| Protección de archivos sensibles | PreToolUse | No es necesario |
| Lint + tests al terminar | Stop | No es necesario |
| QA funcional (resultados reales) | No se puede | ver `PRE_DEPLOY_AND_QA.md` |
| No hay credenciales en código | Se puede | Como backup |
| Lógica correcta | No se puede | Auto-revisión |
| Documentación actualizada | No se puede | Parte del proceso |
| SESSION_LOG.md actualizado | No se puede | Parte del proceso |

**Principio**: Todo lo que se pueda automatizar, se automatiza. Lo que no, va en el proceso manual de CLAUDE.md.
