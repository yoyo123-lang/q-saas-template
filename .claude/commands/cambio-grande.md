# Ciclo de cambio grande (multi-etapa) con revisión automática

> Skill para implementar cambios complejos divididos en etapas, con revisión técnica por etapa
> y revisión de negocio al final.
> Invocar con: `/project:cambio-grande`
> Para cambios chicos (1 etapa), usar `/project:cambio`.

## Paso 1: Entender el cambio

Preguntale al usuario:

1. **¿Qué necesitás lograr?** (el resultado completo)
2. **¿Hay restricciones o prioridades?** (qué es lo más importante, qué puede esperar)
3. **¿Hay algo que debería ver antes?** (referencia visual, documentación, sistema existente)

## Paso 2: Planificar y dividir en etapas

Analizá el alcance y dividí en etapas. Cada etapa debe ser:
- **Autocontenida**: compila y funciona por sí sola
- **Commitable**: se puede commitear sin romper nada
- **Revisable**: tiene un alcance claro para que los roles puedan revisarla

Presentá el plan con estimación de tiempo (→ ver `docs/ESTIMATION.md`):

```
CAMBIO GRANDE: [descripción]
ETAPAS: [N]
MODELO: [Opus/Sonnet]

ETAPA 1: [nombre descriptivo]
  - Qué: [descripción concreta]
  - Archivos: [lista]
  - Riesgo: [bajo/medio/alto]
  - Estimación: ~[N] min [modelo]

ETAPA 2: [nombre descriptivo]
  - Qué: [descripción concreta]
  - Archivos: [lista]
  - Riesgo: [bajo/medio/alto]
  - Estimación: ~[N] min [modelo]

[...]

ESTIMACIÓN TOTAL: ~[T] min [modelo], [M] sesiones
REVISIÓN DE NEGOCIO AL FINAL: [sí/no — sí si existe BUSINESS_MODEL.md]
```

La estimación por etapa es obligatoria. Usar la tabla de referencia de `docs/ESTIMATION.md` para clasificar cada tarea.

### Detectar si es proyecto fullstack

Si el proyecto tiene frontend y backend separados (→ ver criterio en `docs/PLANNING.md` sección "Proyectos fullstack"):

1. Generar `FRONTEND_PLAN.md` con las tareas específicas de frontend
2. Generar `BACKEND_PLAN.md` con las tareas específicas de backend
3. El `IMPLEMENTATION_PLAN.md` general coordina ambos y define el orden de ejecución
4. Marcar qué etapas pueden correr en paralelo (en worktrees separados)

Si NO es fullstack, usar solo `IMPLEMENTATION_PLAN.md` como siempre.

### Evaluar si se necesita worktree

Si el cambio total toca >5 archivos o tiene riesgo medio-alto:
1. Proponer crear un git worktree aislado
2. Si el usuario acepta, crearlo siguiendo `docs/GIT-WORKTREES.md`
3. Todo el trabajo se hace dentro del worktree

Esperá aprobación del plan antes de continuar.

## Paso 2b: Gate de validación pre-ejecución

> **No avanzar al paso 3 sin pasar este gate.** Verificar los 3 puntos antes de ejecutar.

Antes de empezar a implementar, revisar el plan aprobado:

| # | Verificación | Cómo comprobar | Si falla |
|---|---|---|---|
| 1 | **Estimaciones presentes** | Cada etapa tiene `Estimación: ~N min [modelo]` y hay `ESTIMACIÓN TOTAL` | Agregar estimaciones usando `docs/ESTIMATION.md` como referencia |
| 2 | **Planes separados si fullstack** | Si el proyecto tiene FE y BE separados, existen `FRONTEND_PLAN.md` y `BACKEND_PLAN.md` | Generar los planes separados antes de continuar |
| 3 | **Migraciones si Supabase** | Si el proyecto usa Supabase y alguna etapa modifica el modelo de datos, esa etapa incluye tarea de migración | Agregar tarea de migración a las etapas correspondientes |

```
GATE DE VALIDACIÓN: ✅/❌

1. Estimaciones: [✅ presentes / ❌ faltan en etapa N]
2. Planes fullstack: [✅ presentes / ⏭️ no aplica / ❌ faltan]
3. Migraciones Supabase: [✅ incluidas / ⏭️ no aplica / ❌ faltan en etapa N]

→ CONTINUAR / CORREGIR PLAN ANTES DE EJECUTAR
```

## Paso 3: Ejecutar ciclo por etapa

Para CADA etapa, seguir este ciclo:

```
┌─────────────────────────────────────────────┐
│  ETAPA N de M: [nombre]                     │
├─────────────────────────────────────────────┤
│                                             │
│  3a. Implementar                            │
│       ↓                                     │
│  3b. Commit atómico                         │
│       ↓                                     │
│  3c. Detectar tipo y seleccionar roles      │
│       ↓                                     │
│  3d. Ejecutar roles (sub-agentes paralelos) │
│       ↓                                     │
│  3e. Evaluar hallazgos                      │
│       ↓                                     │
│  3f. Corregir CRÍTICOS/ALTOS (si hay)       │
│       ↓                                     │
│  3g. Documentar etapa                       │
│       ↓                                     │
│  3h. Decidir: continuar o pausar            │
│                                             │
└─────────────────────────────────────────────┘
```

### 3a. Implementar

Implementar la etapa siguiendo `docs/REGLAS_PREVENTIVAS.md` (incluida la sección "Consistencia cross-capa").

### 3b. Commit atómico

Commitear con mensaje descriptivo: `feat: [cambio-grande] etapa N/M — [descripción]`

### 3c. Detectar tipo y seleccionar roles

Analizar el `git diff` de la etapa. Usar las mismas reglas de detección que `/project:cambio`:

| Si el diff contiene... | Roles |
|------------------------|-------|
| Componentes/páginas + lógica nueva | 1 + 2 + 3 + 6 |
| Fix puntual o tests | 1 + 2 |
| Auth, middleware, tokens | 1 + 3 |
| Queries, cache, índices | 1 + 4 |
| Deploy, CI/CD, env | 1 + 5 |
| CSS, UI, layouts | 1 + 6 |
| Cosmético | 1 solo |

**Code Reviewer (1) siempre corre.**

### 3d. Ejecutar roles con sub-agentes

1. **Code Reviewer primero** (solo). Si CRÍTICO → corregir antes de seguir.
2. **Demás roles en paralelo** con sub-agentes.
3. Cada sub-agente revisa SOLO los archivos de esta etapa (no el proyecto entero).

Instrucción para sub-agentes:
```
Adoptá el rol definido en docs/roles/[ROL].md.
Revisá SOLO estos archivos: [lista del diff de esta etapa].
Contexto: esto es la etapa N de M de un cambio grande — [descripción general].
Devolvé hallazgos en formato compacto:
ESTADO: ✅/⚠️/❌
CRÍTICOS: [lista o "ninguno"]
ALTOS: [lista o "ninguno"]
MEDIOS: [lista o "ninguno"]
```

### 3e-3f. Evaluar, verificar consistencia y corregir

**Check de consistencia cross-capa (obligatorio si la etapa tocó tipos, endpoints o schema):**
- Correr el micro-revisor con pasada 3 habilitada (→ ver `.claude/agents/micro-revisor.md`)
- Si el micro-revisor reporta falta de cambio complementario (❌), no avanzar a la siguiente etapa
- Corregir: agregar el cambio complementario, o agregar tarea explícita al plan si corresponde a otra etapa

**CRÍTICOS encontrados:**
- Corregir automáticamente
- Re-verificar con el rol que encontró el problema
- Commitear corrección: `fix: [cambio-grande] etapa N — corregir [hallazgo]`

**Solo ALTOS:**
- Corregir automáticamente
- No re-verificar

**Solo MEDIOS/BAJOS o limpio:**
- Continuar. Documentar pendientes.

### 3g. Documentar etapa

Mostrar resumen compacto al usuario:

```
ETAPA N/M: [nombre] ✅
  Roles: [lista de roles corridos]
  Hallazgos: [X críticos, Y altos, Z medios] corregidos / pendientes
  Commit: [hash]
```

### 3h. Decidir: continuar o pausar

**Auto-continuar** a la siguiente etapa si:
- No hubo hallazgos CRÍTICOS, O
- Los CRÍTICOS se corrigieron y la re-verificación pasó

**Pausar y consultar al usuario** si:
- Un hallazgo CRÍTICO no se pudo corregir automáticamente
- La corrección cambió significativamente el alcance de la etapa
- Se detectó un problema que afecta a etapas futuras del plan

Al pausar:
```
⚠️ PAUSA EN ETAPA N/M

Motivo: [por qué se pausó]
Opciones:
1. Ajustar el plan de etapas restantes
2. Continuar como está
3. Revertir esta etapa y replantear
```

## Paso 4: Revisión de negocio (post-etapas)

Al completar TODAS las etapas, verificar si existe `docs/BUSINESS_MODEL.md` con contenido.

### Si existe BUSINESS_MODEL.md

Correr los roles de capa 2 sobre el TOTAL del cambio (no etapa por etapa):

1. **Business Logic Reviewer** (sub-agente)
   - Revisá los archivos del diff total (todas las etapas combinadas)
   - Validá contra las reglas de `docs/BUSINESS_MODEL.md`

2. **Data & Analytics Reviewer** (sub-agente, en paralelo con el anterior)
   - Verificá tracking y métricas contra `docs/BUSINESS_MODEL.md`

Recopilar hallazgos. Corregir CRÍTICOS y ALTOS.

### Si NO existe BUSINESS_MODEL.md

Saltar este paso. Mostrar nota:

```
ℹ️ No se ejecutó revisión de negocio (no existe docs/BUSINESS_MODEL.md).
   Si este proyecto tiene lógica de negocio, corré /project:descubrimiento
   para documentar el modelo y habilitar estos roles.
```

## Paso 5: Documentación final

### SESSION_LOG.md

```
### [fecha] — [nombre del cambio grande]

ETAPAS COMPLETADAS: N/M

| Etapa | Descripción | Roles | Resultado | Commit |
|-------|-------------|-------|-----------|--------|
| 1 | [desc] | [roles] | ✅/⚠️ | [hash] |
| 2 | [desc] | [roles] | ✅/⚠️ | [hash] |
| ... | | | | |

REVISIÓN DE NEGOCIO: [resultado o "no aplica"]

HALLAZGOS PENDIENTES (medios/bajos):
- [lista si hay]
```

### Informes en docs/reviews/

Generar UN informe consolidado (no uno por etapa) si hubo hallazgos ALTOS o CRÍTICOS:
`docs/reviews/YYYY-MM-DD_cambio-grande-[nombre].md`

### ARCHITECTURE.md

Si el cambio modificó la estructura del proyecto, actualizar `docs/ARCHITECTURE.md`.

## Paso 6: Confirmar al usuario

```
✅ CAMBIO GRANDE COMPLETO

[nombre del cambio]
Etapas: N completadas
Revisión técnica: [roles corridos en total] — [resultado consolidado]
Revisión de negocio: [resultado o "no aplica"]
Hallazgos corregidos: [total] / Pendientes: [total]
Commits: [lista de hashes]
```

---

*Un elefante se come de a bocados. Y después de cada bocado, verificás que no esté en mal estado.*
