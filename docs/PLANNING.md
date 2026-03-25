# Metodología de Planificación

> Claude Code DEBE seguir este proceso para cualquier tarea que involucre más de un archivo o más de 50 líneas de código.

## Regla fundamental

**Nunca empezar a codear sin un plan aprobado.** El plan ES el prompt. Un buen plan produce buen código; un plan vago produce código que hay que rehacer.

## Planificación en dos fases

Cuando el proyecto es grande (app completa, SaaS, sistema con múltiples módulos), la planificación se divide en dos fases para evitar que una sesión se trunque tratando de planificar todo de una vez.

### Fase 1 — Roadmap (meta-planificación)

**Cuándo:** el plan tendría >5 etapas o >3 sesiones. Se detecta automáticamente (→ ver tabla en `CLAUDE.md` sección "Detección automática de escala").

**Produce:** `ROADMAP.md` — un archivo de alto nivel que define:
- Módulos del proyecto con dependencias entre sí
- Orden de construcción (canónico para SaaS, personalizable)
- Agrupación en sesiones con estimaciones
- Qué queda fuera de alcance

**Cómo:** usar `/project:roadmap`. Se hace en una sola sesión. No genera código.

**Detalle progresivo:** el roadmap NO detalla tareas atómicas. Solo define módulos, sesiones y dependencias. El detalle fino se genera sesión por sesión en la Fase 2.

### Fase 2 — Plan de sesión (detalle por sesión)

**Cuándo:** al iniciar cada sesión de implementación, si existe un `ROADMAP.md`.

**Produce:** `IMPLEMENTATION_PLAN.md` — el plan detallado con tareas atómicas SOLO para la sesión actual (máximo ~4 etapas, ~15 tareas).

**Cómo:** al inicio de la sesión (`/project:sesion` o `/project:cambio-grande`), leer `ROADMAP.md`, identificar qué sesión toca, y detallar solo esas etapas.

**Al cerrar la sesión:** actualizar `ROADMAP.md` marcando módulos/sesiones completadas.

### Specs de sesión (capa intermedia)

**Cuándo:** se generan durante `/project:roadmap` (Fase 1), una por cada sesión planificada.

**Ubicación:** `sessions/S0N-nombre-descriptivo.md` en la raíz del proyecto.

**Propósito:** cada spec es un documento autocontenido con suficiente contexto para que una sesión de Claude pueda arrancar sin explorar el codebase ni adivinar decisiones. Es el puente entre el roadmap (alto nivel) y el plan de implementación (tareas atómicas).

**Relación con otros artefactos:**
- `ROADMAP.md` referencia cada spec: `→ sessions/S01-auth-y-schema.md`
- `/project:sesion` lee la spec como input principal (en vez de solo las 5 líneas del roadmap)
- `IMPLEMENTATION_PLAN.md` se genera *a partir de* la spec, no desde cero

**Formato de cada spec:**

````markdown
# Sesión N: [nombre descriptivo]

> Spec generada por `/project:roadmap`. Consumida por `/project:sesion`.

## Objetivo
[Qué queda funcionando al terminar esta sesión — en 2-3 oraciones concretas, no vagas]

## Contexto técnico
[Qué ya existe en el proyecto que esta sesión necesita conocer: tablas, servicios, componentes, patrones. Ser específico con nombres de archivos/funciones si ya existen.]

## Entidades y schema
[Si esta sesión toca el modelo de datos: tablas, campos, tipos, relaciones. Formato de tabla o SQL según corresponda. Si no aplica, omitir sección.]

## Contratos de API
[Si esta sesión crea o consume endpoints: método, ruta, request body, response body, códigos de error. Si no aplica, omitir sección.]

## Decisiones de diseño
[Decisiones ya tomadas durante el roadmap que afectan esta sesión. Formato: "Se eligió X sobre Y porque Z". Esto evita que la sesión re-evalúe alternativas ya descartadas.]

## Dependencias de sesiones anteriores
[Qué específicamente necesita estar listo — no "Sesión 1 completada" sino "tabla `users` con campo `role`, endpoint `POST /api/auth/login` funcionando, componente `AuthProvider` montado"]

## Archivos clave
[Qué archivos leer antes de arrancar. Dividir en "existentes" (ya están) y "a crear" (esta sesión los genera).]

## Criterios de aceptación
[Lista concreta de qué tiene que pasar para considerar la sesión completa. Checkboxes. Deben ser verificables — "el usuario puede hacer X" o "el test Y pasa", no "el código es limpio".]

## Fuera de alcance
[Qué explícitamente NO hacer en esta sesión, aunque parezca relacionado.]

## Notas para la implementación
[Tips, gotchas, patrones a seguir, cosas que podrían salir mal. Opcional — solo si hay algo no obvio.]
````

**Reglas:**
- Las secciones opcionales (Entidades, Contratos, Notas) se omiten si no aplican — no dejar secciones vacías
- Los nombres de archivos y funciones deben ser concretos, no genéricos (`src/services/billing-service.ts`, no "el servicio de billing")
- Los criterios de aceptación deben ser verificables por Claude (correr un test, hacer un request, verificar un render)
- La spec NO incluye tareas atómicas — eso lo genera `IMPLEMENTATION_PLAN.md` a partir de la spec
- Al cerrar una sesión, si se tomaron decisiones que afectan la spec de la sesión siguiente, se actualiza esa spec

### Flujo completo

```
Usuario: "Necesito construir este SaaS para..."
       ↓
Fase 1: /project:roadmap → genera ROADMAP.md (1 sesión)
       ↓
Fase 2, Sesión 1: /project:sesion → lee ROADMAP.md → detalla sesión 1 → implementa
       ↓
Fase 2, Sesión 2: /project:sesion → lee ROADMAP.md → detalla sesión 2 → implementa
       ↓
... (N sesiones hasta completar)
```

### Orden canónico de construcción para SaaS

Cuando no hay razones específicas para otro orden, seguir este:

```
1. Schema y migraciones de base de datos
2. Tipos compartidos (interfaces, DTOs, enums)
3. Auth y autorización (si no lo provee el template)
4. Modelos y servicios de backend (lógica de negocio)
5. Endpoints / API routes
6. Layout y navegación base del frontend
7. Páginas y componentes de frontend (por feature)
8. Integración frontend ↔ backend (reemplazar mocks por APIs reales)
9. Integraciones externas (pagos, email, notificaciones)
10. Tests E2E
11. Polish y QA final
```

Este orden garantiza coherencia entre frontend y backend: el schema existe antes que los servicios, los servicios antes que los endpoints, los endpoints antes que el frontend que los consume.

### Handoff entre sesiones

Al cerrar cada sesión, documentar en `SESSION_LOG.md` un bloque de handoff:

```markdown
#### Handoff para la próxima sesión
- **Completado**: [qué módulos/sesiones del roadmap se terminaron]
- **Próxima sesión**: [nombre de la sesión según ROADMAP.md]
- **Decisiones que afectan lo que sigue**: [si se tomó alguna decisión técnica que cambie el plan]
- **Archivos clave para retomar**: [qué leer primero]
```

## Niveles de planificación

### Cambio simple (1 archivo, <50 líneas)

1. Explicar qué vas a cambiar y por qué
2. Esperar confirmación
3. Implementar

### Cambio mediano (2-5 archivos)

1. Listar los archivos que vas a tocar
2. Describir los cambios en cada uno
3. Identificar qué puede salir mal
4. Esperar confirmación
5. Implementar paso a paso, verificando después de cada archivo

### Cambio grande (>5 archivos o cambio de arquitectura)

1. Crear un plan escrito en `IMPLEMENTATION_PLAN.md`
2. Dividir en **etapas** de 3-5 pasos (agrupaciones lógicas)
3. Dentro de cada etapa, dividir en **tareas atómicas de 2-5 minutos** cada una
4. Cada tarea debe poder compilar y pasar tests por sí sola
5. Cada tarea se commitea individualmente (un commit = una tarea)
6. Esperar aprobación del plan completo antes de ejecutar
7. Ejecutar tarea por tarea, actualizando el estado

### Qué es una "tarea de 2-5 minutos"

Una tarea atómica es un cambio tan chico que:
- Se puede describir en 1-2 oraciones
- Toca 1-3 archivos como máximo
- Se puede commitear solo y el proyecto sigue funcionando
- Si sale mal, se revierte con un solo `git revert`

**Ejemplos de tareas bien divididas:**

```text
Etapa 1: Modelo de datos de notificaciones
  Tarea 1.1: Crear modelo Notification en src/models/ con campos: id, user_id, message, read, created_at
  Tarea 1.2: Crear migración para la tabla notifications
  Tarea 1.3: Agregar relación User → Notification en el modelo User existente
  Tarea 1.4: Correr migración y verificar que el schema es correcto

Etapa 2: Servicio de notificaciones
  Tarea 2.1: Crear src/services/notification-service.ts con función createNotification()
  Tarea 2.2: Agregar función getUnreadNotifications(userId) al servicio
  Tarea 2.3: Agregar función markAsRead(notificationId, userId) con verificación de ownership
  Tarea 2.4: Escribir tests unitarios para las 3 funciones
```

**Ejemplos de tareas MAL divididas (demasiado grandes):**

```text
❌ "Implementar el sistema de notificaciones" — esto es una feature, no una tarea
❌ "Crear modelo, servicio y endpoints de notificaciones" — son 3 cosas distintas
❌ "Hacer el frontend de notificaciones" — demasiado vago y grande
```

La regla del "¿puedo describirlo sin usar 'y'?": Si necesitás la palabra "y" para describir la tarea, son dos tareas.

## Formato del plan de implementación

```markdown
# Plan: [Nombre del feature/cambio]

## Objetivo
[Qué se quiere lograr en 1-2 oraciones]

## Etapa 1: [Nombre de la agrupación lógica]

> Estimación: ~[N] min [Modelo]. [Notas si hay dependencias con otras etapas.]

### Tareas

| # | Tarea | Archivos | Modelo | Min. est. | Verificación | Estado |
|---|-------|----------|--------|-----------|-------------|--------|
| 1.1 | [Descripción en 1-2 oraciones] | `archivo1`, `archivo2` | Sonnet | 5 | [qué correr para verificar] | ⬜ |
| 1.2 | [Descripción en 1-2 oraciones] | `archivo3` | Sonnet | 3 | [qué correr para verificar] | ⬜ |
| 1.3 | [Descripción en 1-2 oraciones] | `archivo1`, `archivo4` | Opus | 10 | [qué correr para verificar] | ⬜ |

**Checkpoint de etapa:** [qué debe funcionar al terminar todas las tareas de esta etapa]

## Etapa 2: [Nombre]

> Estimación: ~[N] min [Modelo].

### Tareas

| # | Tarea | Archivos | Modelo | Min. est. | Verificación | Estado |
|---|-------|----------|--------|-----------|-------------|--------|
| 2.1 | ... | ... | ... | ... | ... | ⬜ |

**Checkpoint de etapa:** [qué debe funcionar]

## Cosas que NO se van a tocar
[Listar explícitamente qué queda fuera del alcance]

## Resumen de estimación

| Sesión | Etapas | Tareas | Tiempo estimado ([modelo]) | Puede correr en paralelo |
|--------|--------|--------|---------------------------|--------------------------|
| 1 | 1, 2 | 1.1 a 2.N | ~[T] min | [Sí/No — razón] |

**Total: [N] tareas, [M] sesiones, ~[T] min [modelo].**
```

**Estados de tareas:**
- ⬜ Pendiente
- 🔄 En progreso
- ✅ Completada y commiteada
- ❌ Falló — requiere rehacer o replantear
- ⏭️ Saltada (con justificación)

Regla: después de completar cada tarea, actualizar el estado en el plan y hacer commit.

## Estimación obligatoria

Todo plan de implementación DEBE incluir estimaciones de tiempo. Referencia completa en `docs/ESTIMATION.md`.

**Mínimo requerido:**
1. Cada tarea atómica tiene columnas `Modelo` y `Min. est.` en la tabla
2. Cada etapa tiene un bloque `> Estimación:` con tiempo total y modelo
3. El plan tiene una tabla de `Resumen de estimación` al final con sesiones, tiempos y paralelismo

**Si no sabés cuánto va a llevar:** usá la tabla de referencia de `ESTIMATION.md` y redondeá para arriba. Es mejor sobreestimar que quedarse corto.

## Proyectos fullstack

Cuando el proyecto tiene frontend y backend separados (por ejemplo: Next.js + API, React + Express, SPA + microservicio), la planificación se divide en 3 archivos:

### Cuándo aplica

- El proyecto tiene carpetas separadas para frontend y backend (ej: `apps/web` + `apps/api`, `frontend/` + `backend/`, `src/app` + `src/server`)
- O tiene un monorepo con paquetes que se deployean por separado
- O usa un framework fullstack (Next.js, Nuxt) con API routes significativas

### Formato de los 3 planes

1. **`IMPLEMENTATION_PLAN.md`** (plan general): Contiene la visión completa, las etapas de alto nivel, y la coordinación entre frontend y backend. Define el orden de ejecución y las dependencias entre planes.

2. **`FRONTEND_PLAN.md`**: Tareas específicas de frontend (componentes, páginas, estado, llamadas a API). Referencia los endpoints que necesita del backend.

3. **`BACKEND_PLAN.md`**: Tareas específicas de backend (endpoints, servicios, modelos, migraciones). Define los contratos de API que el frontend va a consumir.

### Criterio de paralelismo

Dos etapas pueden ejecutarse en paralelo (en worktrees separados → ver `docs/GIT-WORKTREES.md`) si:

1. **No comparten archivos**: ningún archivo aparece en ambas etapas
2. **El contrato está definido**: los tipos/interfaces compartidos ya existen o se definen primero
3. **No hay dependencia de datos**: el frontend puede trabajar con mocks mientras el backend no está listo

**Orden típico:**
```
1. Definir tipos/interfaces compartidos (secuencial)
2. Backend: endpoints + tests (worktree A) | Frontend: UI + mocks (worktree B)  ← paralelo
3. Integración frontend ↔ backend (secuencial)
4. Tests E2E (secuencial)
```

Si no se puede paralelizar: backend primero, frontend después. Siempre es más fácil construir UI contra APIs que ya existen.

## Migraciones en el plan (Supabase)

En proyectos que usan Supabase, toda etapa que modifique el modelo de datos DEBE incluir una tarea de migración dentro de la misma etapa. No se acepta "la migración la hago en otra etapa".

**Regla:** si una tarea crea o modifica tablas, columnas, índices o RLS policies, esa etapa debe incluir una tarea de migración con el archivo `.sql` correspondiente en `supabase/migrations/` (→ ver convención en `docs/CONVENTIONS.md` sección "Supabase").

```text
Etapa 1: Modelo de datos de notificaciones
  Tarea 1.1: Crear migración 20260323120000_create_notifications_table.sql
  Tarea 1.2: Crear modelo/tipos de Notification en el código
  Tarea 1.3: Correr migración y verificar schema
```

La migración va PRIMERO dentro de la etapa, porque el código depende del schema, no al revés.

## Checklist de pensamiento previo

Antes de proponer un plan, Claude Code debe preguntarse:

1. **¿Entendí bien lo que se pide?** → Si no, preguntar
2. **¿Cómo se hace actualmente?** → Leer el código existente primero
3. **¿Cuál es la solución más simple?** → Empezar por ahí
4. **¿Qué puede salir mal?** → Pensar en edge cases
5. **¿Esto rompe algo que ya funciona?** → Identificar dependencias
6. **¿Necesito una decisión de arquitectura?** → Crear un ADR
7. **¿Hay que actualizar documentación?** → Planificarlo como parte del trabajo

## Gestión del contexto

- Después de completar una tarea grande → proponer `/clear` o `/compact`
- Si el plan tiene más de 5 etapas → dividir en sesiones separadas
- Al retomar un proyecto → leer CLAUDE.md, SESSION_LOG.md, y ARCHITECTURE.md primero
- Si hay un `IMPLEMENTATION_PLAN.md` abierto → leerlo antes de cualquier otra cosa

## Anti-patrones

- ❌ Empezar a codear "para ver qué sale"
- ❌ Refactor masivo sin dividir en pasos
- ❌ Cambiar 10 archivos sin haber testeado los primeros 3
- ❌ Ignorar warnings del compilador o linter
- ❌ Asumir que algo funciona sin verificar
- ❌ Sobre-ingeniería: abstracciones "por si en el futuro"

---

*Un plan de 5 minutos ahorra 2 horas de rehacer código.*
