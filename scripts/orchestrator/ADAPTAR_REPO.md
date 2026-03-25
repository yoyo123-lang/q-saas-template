# Adaptar este repo para el q-orchestrator

> **INSTRUCCIONES PARA CLAUDE CODE.**
> Si estás leyendo esto, significa que el usuario subió el orquestador como zip
> o te pidió que adaptes el repo actual para que funcione con el q-orchestrator.
> Seguí estos pasos EN ORDEN. No modifiques ningún archivo del orquestador.
> Todos los cambios van en el repo actual (el repo destino).

---

## PASO 0: Entender qué hace el orquestador

El q-orchestrator ejecuta sesiones de Claude Code de forma desatendida. Lee un
`ROADMAP.md` del repo, detecta las sesiones pendientes, y para cada una ejecuta:
implementar -> revisar -> corregir -> documentar -> build + push.

**Tu trabajo: preparar este repo para que el orquestador lo pueda leer y ejecutar.**

---

## PASO 1: Verificar o crear ROADMAP.md (OBLIGATORIO)

El orquestador parsea `ROADMAP.md` en la raíz del repo con un regex estricto.
Si el formato está mal, detecta 0 sesiones y no hace nada (falla silenciosa).

### Formato EXACTO requerido para los headings de sesión

```markdown
### Sesion 1: Nombre de la sesion
```

**Reglas del heading:**

| Regla | Ejemplo valido | Ejemplo INVALIDO (no se detecta) |
|-------|----------------|----------------------------------|
| Debe ser h3 (`###`) | `### Sesion 1: Setup` | `## Sesion 1: Setup` (h2) |
| `Sesion` o `sesion` (con o sin tilde) | `### Sesion 1: Setup` | N/A |
| Sin emojis antes de `Sesion` | `### Sesion 1: Setup` | `### ✅ Sesion 1: Setup` |
| Sin tachado antes de `Sesion` | `### Sesion 1: Setup` | `### ~~Sesion 1: Setup~~` |
| Numero despues de `Sesion` | `### Sesion 1: Setup` | `### Sesion: Setup` (sin numero) |
| Dos puntos despues del numero | `### Sesion 1: Setup` | `### Sesion 1 - Setup` (guion) |

### Regex que usa el parser (bash puro)

```
^###[[:space:]]+[Ss]esi..?n[[:space:]]+([0-9]+)[[:space:]]*:[[:space:]]*(.+)$
```

El `..?` es porque `o` con tilde ocupa 1 o 2 bytes segun el locale del sistema.

### Estructura minima de ROADMAP.md

```markdown
# Roadmap: Nombre del proyecto

## Vision
Una oracion sobre que es el proyecto.

## Plan de sesiones

### Sesion 1: Nombre descriptivo de la sesion
- **Objetivo**: que queda funcionando al terminar
- **Pre-requisitos**: ninguno

### Sesion 2: Nombre descriptivo de la sesion
- **Objetivo**: que queda funcionando al terminar
- **Pre-requisitos**: Sesion 1

### Sesion 3: Nombre descriptivo de la sesion
- **Objetivo**: que queda funcionando al terminar
- **Pre-requisitos**: Sesion 2
```

### Si el repo ya tiene un ROADMAP.md

Verificar que los headings sigan el formato exacto. Errores comunes:
- Emojis pegados antes de "Sesion" -> moverlos despues o quitarlos
- Usar `##` (h2) en vez de `###` (h3) -> cambiar a h3
- Usar guion en vez de dos puntos -> cambiar a `:`
- Tachado en sesiones completadas -> usar otra forma de marcar estado (el orquestador
  trackea el progreso en un archivo JSON externo, no en el ROADMAP)

### Si el repo NO tiene ROADMAP.md

Preguntale al usuario que quiere construir y genera uno. Cada sesion debe representar
un bloque de trabajo coherente (3-5 etapas, 10-20 tareas). Una sesion equivale a
~60-90 minutos de ejecucion de Claude Code.

---

## PASO 2: Crear archivos de plan detallado (RECOMENDADO)

Sin estos archivos el orquestador funciona, pero los resultados son significativamente
peores porque Claude improvisa desde el ROADMAP en vez de seguir un plan detallado.

### Donde crearlos

Usa UNA de estas ubicaciones (el orquestador las busca en este orden de prioridad):

1. `docs/plan_inicial/` (recomendada)
2. `scripts/sessions/`
3. `sessions/`
4. `docs/sessions/`
5. `docs/plan/`

### Nombres de archivo

Para la sesion N, el orquestador busca (en orden):

1. `sesion-NN.md` (espanol, con zero-padding: 01, 02, ... 11)
2. `session-NN.md` (ingles, con zero-padding)
3. `sesion-N.md` (espanol, sin padding)
4. `session-N.md` (ingles, sin padding)

**Recomendacion**: usar `sesion-01.md`, `sesion-02.md`, etc.

### Estructura de un archivo de sesion

```markdown
# Sesion 01: Nombre de la sesion

## Objetivo
Que queda funcionando al terminar esta sesion. Ser concreto.

## Pre-requisitos
- Ninguno (o listar sesiones anteriores)

## Al iniciar
1. Leer `ROADMAP.md`
2. Leer `archivo-relevante-1.ts`
3. Leer `archivo-relevante-2.ts`

---

## Etapa 1: Nombre de la etapa

### Tarea 1.1: Nombre de la tarea
**Archivo nuevo**: `src/lib/algo.ts`

Descripcion concreta:
- Que hacer exactamente
- Patron a seguir (ej: "copiar estructura de `src/app/api/v1/projects/`")

### Tarea 1.2: Otra tarea
**Archivos a modificar**:
- `src/app/layout.tsx` — agregar provider
- `src/middleware.ts` — agregar check

**Commit**: `feat(modulo): descripcion del commit`

---

## Etapa 2: Nombre de otra etapa

### Tarea 2.1: ...

**Commit**: `feat(otro): descripcion`

---

## Checklist de cierre de sesion

- [ ] Funcionalidad X funciona
- [ ] Tests pasan
- [ ] `npm run build` pasa sin errores
- [ ] Todos los commits pusheados
```

### Claves para que el plan funcione bien

| Que incluir | Por que |
|-------------|---------|
| Paths de archivos exactos | Claude no tiene que adivinar donde crear archivos |
| Patrones de referencia ("copiar estructura de X") | Claude replica lo que ya funciona |
| Reglas de negocio explicitas | Evita decisiones incorrectas |
| Un commit por etapa con mensaje convencional | Progreso atomico |
| "Al iniciar" con archivos a leer | Da contexto antes de codear |

### Que NO incluir

- No pidas confirmacion ("Queres que continue?") — corre desatendido
- No dejes decisiones abiertas ("Podriamos usar X o Y") — decidi antes
- No hagas sesiones de >20 tareas — dividir en dos sesiones

---

## PASO 3: Crear SESSION_LOG.md (RECOMENDADO)

Si no existe, crear en la raiz del repo:

```markdown
# Session Log

> Registro de sesiones de desarrollo. Se actualiza automaticamente al cerrar cada sesion.
```

El orquestador le pide a Claude que lo actualice en el paso de documentacion.

---

## PASO 4: Crear prompts de soporte (OPCIONAL)

Estos archivos van en `scripts/prompts/` (o `prompts/`). Si no existen, el
orquestador usa prompts inline que funcionan pero son menos precisos.

### scripts/prompts/apply-roles.md

```markdown
Revisa el codigo que se modifico en esta sesion.

1. Lee el git diff de los ultimos commits de esta sesion
2. Para cada archivo modificado, aplica los roles de revision relevantes:
   - Code Reviewer: siempre
   - QA Engineer: si hay logica nueva
   - Security Auditor: si hay auth, input de usuario, o APIs
   - Performance Engineer: si hay queries o loops
   - UX Reviewer: si hay componentes de UI
3. Genera un informe en docs/reviews/ con los hallazgos por severidad

Formato de hallazgo: [SEVERIDAD] archivo:linea — descripcion
Severidades: CRITICO / ALTO / MEDIO / BAJO
```

### scripts/prompts/fix-findings.md

```markdown
Lee los informes de revision mas recientes en docs/reviews/.

1. Corregi TODOS los hallazgos CRITICOS y ALTOS
2. Documenta los hallazgos MEDIOS y BAJOS como pendientes
3. Hace un commit por cada correccion
4. No introduzcas codigo nuevo — solo corregi lo reportado
```

### scripts/prompts/document.md

```markdown
Documenta lo que se hizo en esta sesion:

1. Actualiza SESSION_LOG.md con fecha, cambios, archivos modificados y handoff
2. Si se modifico la estructura del proyecto, actualiza ARCHITECTURE.md
3. Commitea la documentacion
```

### scripts/prompts/fix-ci.md

```markdown
Los tests de CI fallaron. Arreglalos:

1. Lee los logs de CI del ultimo push
2. Reproduci los fallos localmente
3. Corregi cada fallo
4. Corre los tests localmente para verificar
5. Commitea y pushea
```

---

## PASO 5: Configuracion del proyecto (OPCIONAL)

Crear `.q-orchestrator.sh` en la raiz del repo para override de configuracion:

```bash
# Overrides para este proyecto (todos opcionales)
# ORCH_MODEL="claude-opus-4-6"            # Modelo (default: claude-sonnet-4-6)
# ORCH_MAX_TURNS_IMPLEMENT=100            # Turnos para implementacion (default: 80)
# ORCH_BRANCH_STRATEGY="pr"              # "direct" (push a main) o "pr" (branch + PR)
# ORCH_SKIP_ROLES="true"                 # Omitir revision por roles
# ORCH_SKIP_FIX="true"                   # Omitir correccion de hallazgos
# ORCH_SKIP_DOCS="true"                  # Omitir documentacion
```

---

## PASO 6: Actualizar .gitignore (RECOMENDADO)

Agregar al `.gitignore`:

```gitignore
# q-orchestrator local state
scripts/state.json
scripts/logs/
```

---

## PASO 7: Verificar la adaptacion

Ejecuta este checklist mental antes de reportar al usuario:

- [ ] Existe `ROADMAP.md` en la raiz del repo
- [ ] TODOS los headings de sesion usan el formato `### Sesion N: Nombre`
- [ ] No hay emojis, tachado, ni otros caracteres antes de "Sesion" en los headings
- [ ] Los headings son h3 (`###`), no h2 ni h4
- [ ] Cada sesion tiene numero y nombre separados por `:`
- [ ] (Si se crearon) Los archivos de plan estan en una de las 5 ubicaciones reconocidas
- [ ] (Si se crearon) Los archivos de plan se llaman `sesion-NN.md` o `session-NN.md`
- [ ] Existe `SESSION_LOG.md` en la raiz

### Validacion del ROADMAP (hacer siempre)

Lee el ROADMAP.md creado/modificado y verifica que este regex matchea cada heading de sesion:

```
^###[[:space:]]+[Ss]esi..?n[[:space:]]+([0-9]+)[[:space:]]*:[[:space:]]*(.+)$
```

Si un heading no matchea, corregilo. El orquestador falla **silenciosamente** cuando
el formato no es correcto (devuelve 0 sesiones).

---

## PASO 8: Reportar al usuario

```
REPO ADAPTADO PARA EL q-orchestrator

Archivos creados/modificados:
- ROADMAP.md (N sesiones detectables)
- docs/plan_inicial/sesion-01.md ... sesion-NN.md (planes detallados)
- SESSION_LOG.md
- scripts/prompts/ (prompts de soporte)
- .gitignore (actualizado)

Para ejecutar:
1. Registrar el proyecto en el orquestador (desde el menu, o con un wrapper)
2. ./q-orchestrator.sh --project <slug> --mode continue

Sesiones detectadas:
1. Sesion 1: [nombre]
2. Sesion 2: [nombre]
...
```

---

## Referencia rapida: que lee el orquestador del repo

| Archivo/directorio | Obligatorio | Para que |
|---------------------|-------------|----------|
| `ROADMAP.md` | SI (modo roadmap) | Indice de sesiones. Parseado con regex. |
| `docs/plan_inicial/sesion-NN.md` | No, pero muy recomendado | Plan detallado de cada sesion |
| `SESSION_LOG.md` | No | Registro de lo hecho por sesion |
| `scripts/prompts/apply-roles.md` | No | Prompt de revision por roles |
| `scripts/prompts/fix-findings.md` | No | Prompt de correccion de hallazgos |
| `scripts/prompts/document.md` | No | Prompt de documentacion |
| `scripts/prompts/fix-ci.md` | No | Prompt de reparacion de CI |
| `docs/roles/` | No | Roles de revision (si existen, se usan) |
| `.claude/commands/` | No | Skills de Claude Code (cambio, etc.) |
| `.q-orchestrator.sh` | No | Config override del proyecto |
| `CLAUDE.md` | No | Detectado como capacidad, no requerido |

## Errores frecuentes que causan "0 sesiones detectadas"

1. **Emoji antes de Sesion**: `### ✅ Sesion 1:` -> quitar el emoji: `### Sesion 1:`
2. **H2 en vez de H3**: `## Sesion 1:` -> agregar un `#`: `### Sesion 1:`
3. **Tachado**: `### ~~Sesion 1: ...~~` -> quitar `~~`
4. **Guion en vez de dos puntos**: `### Sesion 1 - Setup` -> cambiar a `### Sesion 1: Setup`
5. **Sin numero**: `### Sesion: Setup` -> agregar numero: `### Sesion 1: Setup`
6. **Texto antes del heading**: cualquier caracter antes de `###` rompe el match
7. **Encoding BOM**: algunos editores agregan BOM al inicio del archivo — verificar
