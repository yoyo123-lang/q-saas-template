# Guía de planificación para el orquestador

Este documento explica cómo crear planes que el orquestador (`q-orchestrator`) pueda ejecutar automáticamente. Leelo antes de planificar un proyecto nuevo o adaptar un plan existente.

## Flujo de trabajo

```
1. Planificar (vos + Claude)     → docs/plan_inicial/sesion-XX.md
2. Crear ROADMAP.md (índice)     → ROADMAP.md en la raíz
3. Ejecutar (orquestador)        → bash q-orchestrator.sh
```

El orquestador lee el ROADMAP.md como índice y los archivos de sesión como plan detallado. Si no encuentra archivos de sesión, usa solo el ROADMAP — pero los resultados son mucho mejores con planes detallados.

---

## Paso 1: Crear los planes detallados de sesión

Cada sesión necesita un archivo `.md` con el plan detallado. El orquestador busca estos archivos en este orden de prioridad:

| Ubicación | Prioridad |
|-----------|-----------|
| `docs/plan_inicial/` | 1 (más alta) |
| `scripts/sessions/` | 2 |
| `sessions/` | 3 |
| `docs/sessions/` | 4 |
| `docs/plan/` | 5 |

### Nombres de archivo aceptados

Para la sesión 2, el orquestador busca (en orden):
1. `sesion-02.md` (español, zero-padded)
2. `session-02.md` (inglés, zero-padded)
3. `sesion-2.md` (español, sin padding)
4. `session-2.md` (inglés, sin padding)

**Recomendación**: usá `sesion-XX.md` con zero-padding (01, 02... 11).

### Estructura de un archivo de sesión

```markdown
# Sesión 02: Multi-tenancy (frontend) y onboarding

## Objetivo
Una oración que describe qué queda funcionando al terminar esta sesión.
Ser concreto: "Al terminar, un usuario puede crear una organización,
invitar miembros, y la app funciona scoped al tenant activo."

## Pre-requisitos
- Sesión 01 completada (schema, migración, withTenant)

## Al iniciar
1. Leer `ROADMAP.md`
2. Leer `src/lib/tenant.ts` (helper de S01)
3. Leer `src/app/api/v1/projects/` como patrón de referencia

---

## Etapa 1: Nombre de la etapa

### Tarea 1.1: Nombre de la tarea
**Archivo nuevo**: `src/lib/validations/organization.ts`

Descripción concreta de qué hacer:
- Campo X con validación Y
- Patrón a seguir: copiar estructura de `src/app/api/v1/projects/`

### Tarea 1.2: Nombre de otra tarea
**Archivos nuevos**:
- `src/app/api/v1/organizations/route.ts` — GET (list), POST (crear)
- `src/app/api/v1/organizations/[id]/route.ts` — GET, PUT, DELETE

Reglas de negocio:
- Solo OWNER y ADMIN pueden invitar miembros
- No se puede remover al último OWNER

**Commit**: `feat(api): add Organization and Membership CRUD endpoints`

---

## Etapa 2: Nombre de otra etapa

### Tarea 2.1: ...

**Commit**: `feat(tenant): add TenantProvider and tenant context`

---

## Checklist de cierre de sesión

- [ ] API routes de Organization funcionando
- [ ] TenantProvider wrappea el dashboard
- [ ] Tests de API routes
- [ ] `npm run build` pasa sin errores
- [ ] Todos los commits pusheados
```

### Claves de un buen plan de sesión

| Qué incluir | Por qué |
|-------------|---------|
| **Paths de archivos exactos** (`src/lib/validations/organization.ts`) | Claude no tiene que adivinar dónde crear archivos |
| **Patrones de referencia** ("copiar estructura de `src/app/api/v1/projects/`") | Claude replica lo que ya funciona en vez de inventar |
| **Reglas de negocio** explícitas | Evita que Claude tome decisiones incorrectas |
| **Un commit por etapa** con mensaje convencional | Progreso atómico y rastreable |
| **Snippets de código** cuando la interfaz importa | Garantiza APIs consistentes entre sesiones |
| **"Al iniciar" con archivos a leer** | Da contexto antes de codear |

### Qué NO incluir

- No pidas confirmación ("¿Querés que continúe?") — el orquestador corre desatendido
- No incluyas decisiones abiertas ("Podríamos usar X o Y") — decidí antes
- No dejes ambiguedades — si hay dos opciones, elegí una
- No hagas el plan tan largo que exceda 80 turnos de Claude

### Tamaño ideal por sesión

- **3-5 etapas** por sesión
- **2-4 tareas** por etapa
- **10-20 tareas totales** por sesión
- Si tenés más de 20 tareas, dividí en dos sesiones

---

## Paso 2: Crear el ROADMAP.md

El ROADMAP.md es el **índice** del proyecto. El orquestador lo usa para:
- Listar las sesiones y sus nombres
- Saber cuántas sesiones hay
- Dar contexto general a Claude antes de cada sesión

### Formato obligatorio de headings

El orquestador detecta sesiones por este patrón exacto:

```markdown
### Sesión 1: Nombre de la sesión
```

**Reglas del heading**:
- Debe empezar con `### ` (h3 con espacio)
- Seguido de `Sesión` (con tilde) o `sesion` (sin tilde)
- Seguido del número
- Seguido de `:` y el nombre
- **NO** pongas emojis u otros caracteres antes de `Sesión`

Ejemplos válidos:
```
### Sesión 1: Schema base y multi-tenancy (backend)
### Sesión 11: QA, polish y deploy
```

Ejemplos **inválidos** (el orquestador NO los detecta):
```
### ✅ Sesión 1: Schema base          ← emoji antes de Sesión
### ~~Sesión 1: Schema base~~         ← ~~ antes de Sesión
## Sesión 1: Schema base              ← h2 en vez de h3
Sesión 1: Schema base                 ← sin ###
```

### Estructura del ROADMAP.md

```markdown
# Roadmap: Nombre del proyecto

## Visión
Una oración sobre qué es el proyecto.

## Decisiones técnicas clave
| Decisión | Elección | Razón |
|----------|----------|-------|
| Multi-tenancy | DB compartida + tenantId | Simple, Prisma ya configurado |
| Auth | NextAuth v5 | Extender el auth existente |

## Módulos
| # | Módulo | Descripción | Depende de | Sesiones |
|---|--------|-------------|------------|----------|
| M1 | Multi-tenancy | Orgs, membresías, tenant context | — | 2 |
| M2 | Productos | CRUD, variantes, precios | M1 | 2 |

## Plan de sesiones

### Sesión 1: Schema base y multi-tenancy (backend)
- **Módulos**: M1
- **Objetivo**: Modelos y helpers de tenant en backend
- **Pre-requisitos**: ninguno
- **Detalle**: ver `docs/plan_inicial/sesion-01.md`

### Sesión 2: Multi-tenancy (frontend) y onboarding
- **Módulos**: M1, M9
- **Objetivo**: TenantProvider, selector de org, wizard de onboarding
- **Pre-requisitos**: Sesión 1 completada
- **Detalle**: ver `docs/plan_inicial/sesion-02.md`

### Sesión 3: Productos y catálogo
- **Módulos**: M2
- **Objetivo**: CRUD de productos con variantes y categorías
- **Pre-requisitos**: Sesión 2 completada
- **Detalle**: ver `docs/plan_inicial/sesion-03.md`
```

### Lo mínimo que necesita cada sesión en el ROADMAP

```markdown
### Sesión N: Nombre descriptivo
- **Objetivo**: qué queda funcionando al terminar
- **Pre-requisitos**: qué sesiones deben estar completas
```

El resto (módulos, detalle, estimación) es opcional pero útil.

---

## Paso 3: Adaptar un plan existente

Si ya tenés un plan detallado en otro formato (documento, chat, etc.), adaptalo así:

### 1. Separar en sesiones
- Una sesión = un bloque de trabajo coherente (~60-90 min de Opus, ~80 turnos)
- Cada sesión debe dejar algo funcionando de punta a punta
- Identificar dependencias entre sesiones

### 2. Crear los archivos de sesión
Para cada sesión, crear `docs/plan_inicial/sesion-XX.md` siguiendo la estructura de arriba.

Checklist de adaptación:
- [ ] Cada tarea tiene path de archivo exacto
- [ ] Hay un patrón de referencia ("copiar estructura de X")
- [ ] Las reglas de negocio están explícitas, no implícitas
- [ ] Hay un commit sugerido por etapa
- [ ] No hay preguntas ni decisiones abiertas
- [ ] Cada sesión tiene 10-20 tareas (dividir si hay más)

### 3. Crear el ROADMAP.md
- Un heading `### Sesión N: nombre` por cada sesión
- Referencia al archivo de plan: `ver docs/plan_inicial/sesion-XX.md`

### Prompt para adaptar un plan existente

Si ya tenés un plan y querés que Claude lo adapte al formato del orquestador:

```
Tengo un plan de implementación para [nombre del proyecto].
Necesito adaptarlo al formato del q-orchestrator.

Leé scripts/orchestrator/PLANNING_GUIDE.md para entender el formato requerido.

Después leé mi plan existente: [pegar plan o indicar archivo]

Generá:
1. ROADMAP.md en la raíz del proyecto (índice con ### Sesión N: nombre)
2. Un archivo por sesión en docs/plan_inicial/sesion-XX.md

Reglas:
- Cada sesión: 3-5 etapas, 10-20 tareas
- Cada tarea: path de archivo exacto + descripción concreta
- Un commit por etapa
- Sin preguntas ni decisiones abiertas — tomá las decisiones
- Incluir "Al iniciar" con archivos a leer para tomar contexto
```

---

## Configuración del orquestador

Estas son las configuraciones relevantes para la ejecución. Se definen en `~/.q-orchestrator/config.sh` o en `<proyecto>/.q-orchestrator.sh`:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `ORCH_MODEL` | `claude-sonnet-4-6` | Modelo de Claude a usar |
| `ORCH_MAX_TURNS_IMPLEMENT` | `80` | Turnos máximos para implementación |
| `ORCH_MAX_TURNS_SUPPORT` | `40` | Turnos para review/docs |
| `ORCH_MAX_TURNS_FIX_PASS` | `50` | Turnos por nivel de severidad en fix |
| `ORCH_SKIP_PERMISSIONS` | `true` | Requerido para ejecución desatendida |
| `ORCH_VERBOSE` | `true` | Muestra progreso en tiempo real |
| `ORCH_BRANCH_STRATEGY` | `direct` | `direct` = push a main, `pr` = branch + PR por sesión |

---

## Pipeline de cada sesión

El orquestador ejecuta estos pasos por cada sesión:

```
1. Implementación  → Claude lee el plan y codea (80 turnos)
2. Revisión        → Code review por roles de docs/roles/ (40 turnos)
3. Fix CRÍTICOS    → Corrige hallazgos críticos (50 turnos)
   Fix ALTOS       → Corrige hallazgos altos (50 turnos)
   Fix MEDIOS      → Corrige hallazgos medios (50 turnos)
   Deuda técnica   → Registra lo no resuelto en docs/TECH_DEBT.md
4. Documentación   → Actualiza SESSION_LOG.md y ARCHITECTURE.md (40 turnos)
5. Build + Push    → Verifica build/lint/tests y pushea (30 turnos, 3 reintentos)
```

Si un paso falla, el comportamiento depende de `ORCH_ON_STEP_FAIL` (`ask`, `skip`, o `abort`).

---

## Ejemplo mínimo completo

Para un proyecto con 3 sesiones:

```
mi-proyecto/
├── ROADMAP.md                          ← índice
├── docs/
│   └── plan_inicial/
│       ├── sesion-01.md                ← plan detallado S1
│       ├── sesion-02.md                ← plan detallado S2
│       └── sesion-03.md                ← plan detallado S3
└── .q-orchestrator.sh                  ← config opcional del proyecto
```

`ROADMAP.md`:
```markdown
# Roadmap: Mi Proyecto

### Sesión 1: Setup base y auth
- **Objetivo**: Proyecto funcional con login
- **Pre-requisitos**: ninguno

### Sesión 2: CRUD principal
- **Objetivo**: Entidad principal con ABM completo
- **Pre-requisitos**: Sesión 1

### Sesión 3: Deploy
- **Objetivo**: App desplegada en producción
- **Pre-requisitos**: Sesión 2
```

`docs/plan_inicial/sesion-01.md`:
```markdown
# Sesión 01: Setup base y auth

## Objetivo
Proyecto Next.js con auth funcionando. Login con Google, protección de rutas.

## Pre-requisitos
- Ninguno

## Al iniciar
1. Leer `package.json`
2. Leer `src/app/layout.tsx`

---

## Etapa 1: Configurar auth

### Tarea 1.1: Instalar dependencias
**Comando**: `npm install next-auth@5`

### Tarea 1.2: Configurar NextAuth
**Archivo nuevo**: `src/lib/auth.ts`
- Google provider
- Prisma adapter

**Commit**: `feat(auth): configure NextAuth with Google provider`

---

## Checklist de cierre
- [ ] Login con Google funciona
- [ ] Rutas protegidas redirigen a login
- [ ] `npm run build` pasa
```
