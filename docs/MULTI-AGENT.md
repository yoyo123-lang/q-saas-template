# Trabajo Paralelo y Múltiples Sesiones

> Cómo hacer que Claude Code trabaje más rápido dividiendo tareas, y cómo no perder contexto entre sesiones.

## PARTE 1: Trabajo paralelo

### El concepto

Claude Code puede delegar tareas a "sub-agentes" que trabajan al mismo tiempo. Cada uno tiene su propio espacio y no interfiere con los demás.

Pero: **la velocidad viene del paralelismo, no de la cantidad de agentes.** Más agentes ≠ mejor resultado. Lo que importa es que las tareas sean realmente independientes.

### La única regla que importa

**Paralelo solo cuando los archivos NO se solapan.** Si dos agentes quieren tocar el mismo archivo, hacerlo en secuencia.

### Cuándo tiene sentido paralelizar

| ✅ Paralelizar | ❌ No paralelizar |
|---|---|
| Leer y analizar múltiples archivos | Modificar un solo archivo |
| Crear componentes que no se tocan entre sí | Cambios que dependen uno del otro |
| Escribir tests para módulos independientes | Refactors que cruzan todo el proyecto |
| Investigar el codebase buscando patrones | Debugging paso a paso |

### Cómo pedirlo

Lo más efectivo es ser **explícito** en el momento. Dividí el trabajo en tareas de 2-5 minutos y marcá qué es paralelo:

```
Necesito implementar el módulo de notificaciones. El plan ya está en IMPLEMENTATION_PLAN.md.

Tareas paralelas (archivos distintos):
  1.1 (implementador) Crear modelo en src/models/notification.ts
  1.2 (implementador) Crear servicio en src/services/notification-service.ts
  1.3 (implementador) Crear tests en tests/notification.test.ts

Tareas secuenciales (después de las anteriores):
  2.1 (implementador) Crear endpoint GET /api/notifications en src/routes/
  2.2 (revisor) Revisar tareas 1.1 a 2.1
  2.3 (implementador) Corregir hallazgos del revisor

Cada tarea se commitea individualmente.
```

### Flujo de trabajo paralelo

```
PLANIFICAR (secuencial, agente principal)
├── Entender el requerimiento
├── Identificar archivos involucrados
├── Separar tareas que NO comparten archivos
└── Definir qué va en paralelo y qué en secuencia

EJECUTAR (paralelo donde aplique)
├── Sub-agente A: [tarea independiente]
├── Sub-agente B: [tarea independiente]
└── Sub-agente C: [tarea independiente]

INTEGRAR (secuencial, agente principal)
├── Verificar compatibilidad
├── Resolver conflictos si los hay
├── Correr TODOS los tests
└── Commit
```

---

## PARTE 2: Persistencia entre sesiones

### El problema

Claude Code pierde contexto cuando se cierra la terminal, se hace `/clear`, se compacta la conversación, o se arranca una sesión nueva.

### La solución

Todo lo que necesita recordar debe vivir en **archivos**, no en la conversación. Los archivos sobreviven a cualquier sesión.

### SESSION_LOG.md — El diario de trabajo

Claude Code DEBE mantener este archivo actualizado. Es lo primero que lee al retomar.

```markdown
# Log de Sesión

## Sesión actual
**Fecha**: YYYY-MM-DD
**Objetivo**: [Qué se está haciendo]
**Branch**: [nombre del branch]

### Estado
- ✅ [Completado]
- 🔄 [En progreso — dónde quedó]
- ⬜ [Pendiente]

### Decisiones tomadas
- [Decisión y por qué]

### Problemas encontrados
- [Problema y cómo se resolvió o qué se intentó]

### Archivos modificados
- `ruta/archivo` — Qué se cambió

### Para la próxima sesión
- [ ] [Tarea específica]
- [ ] [Cosa que no olvidar]

---

## Sesiones anteriores

### YYYY-MM-DD — [Objetivo]
[Resumen breve]
```

### Reglas de persistencia

**Al INICIAR sesión:**
1. Leer CLAUDE.md
2. Leer SESSION_LOG.md si existe
3. Leer IMPLEMENTATION_PLAN.md si existe
4. Leer KNOWN_ISSUES.md si existe
5. Informar al usuario qué se encontró pendiente

**DURANTE la sesión:**
- Actualizar SESSION_LOG.md después de cada tarea completada
- Actualizar IMPLEMENTATION_PLAN.md si cambia el estado
- Si se toma una decisión de arquitectura → crear ADR
- Si Claude Code se equivoca en algo → anotar en KNOWN_ISSUES.md

**Al FINALIZAR (o cuando el usuario avisa que va a cerrar):**
1. Actualizar SESSION_LOG.md con estado final
2. Completar "Para la próxima sesión"
3. Listar archivos modificados
4. Commit de archivos de estado junto con el código

**Si el contexto se compacta:**
1. Leer SESSION_LOG.md para recuperar contexto
2. Avisar al usuario
3. Continuar desde donde quedó

### Nombres de sesiones

Ponerle nombre descriptivo apenas empieces a trabajar:

```
/rename implementar-autenticacion
/rename fix-calculo-iva
/rename refactor-modulo-pagos
```

Para retomar: `claude --resume "nombre"` o `claude --continue` para la última sesión.

---

## PARTE 3: Flujo completo

### Proyecto nuevo

```
1. Brainstorming con Claude (guia_onboarding.md) → PROJECT_PLAN.md
2. Subir todo al repo
3. Claude Code: "Leé PROJECT_PLAN.md. Completá ARCHITECTURE.md. Creá IMPLEMENTATION_PLAN.md. No escribas código."
4. Revisar y aprobar
5. "Implementá Etapa 1. Mantené SESSION_LOG.md actualizado."
```

### Retomar trabajo

```
1. claude --resume "nombre" (o --continue)
2. "Leé SESSION_LOG.md y decime dónde quedamos."
3. Claude retoma
4. Al terminar: "Actualizá SESSION_LOG.md y commiteá."
```

### Checklist de cierre de sesión

- [ ] SESSION_LOG.md actualizado
- [ ] Archivos modificados listados
- [ ] Pendientes anotados
- [ ] Commit hecho
- [ ] Sesión con nombre (`/rename`)

---

## PARTE 4: Sub-agentes custom

Claude Code permite definir sub-agentes permanentes como archivos Markdown
en `.claude/agents/`. Cada sub-agente tiene su propio modelo, herramientas
permitidas, y prompt especializado.

A diferencia de los sub-agentes genéricos (Task tool), los custom:
- Se definen una vez y se reutilizan siempre
- Tienen instrucciones especializadas por rol
- Pueden limitarse a herramientas específicas (ej: solo lectura)
- Pueden usar un modelo diferente al principal (Haiku para explorar, Opus para revisar)
- Claude los invoca automáticamente cuando la tarea coincide con la descripción

### Sub-agentes del proyecto

| Agente | Modelo | Permisos | Cuándo se usa |
|---|---|---|---|
| `explorador` | Sonnet | Solo lectura | Investigar el codebase antes de hacer cambios |
| `implementador` | Sonnet | Edición + bash + tests | Escribir código nuevo o modificar existente |
| `micro-revisor` | Haiku | Solo lectura | Verificación rápida después de cada tarea atómica |
| `revisor` | Opus | Solo lectura | Revisar código después de implementar, antes de commit |

Las definiciones están en `.claude/agents/`.

### Reglas de uso

- Usar sub-agentes para tareas que se repiten (explorar, implementar, revisar)
- Hilo principal para tareas puntuales, debugging, y coordinación
- **No usar sub-agentes para tareas de menos de 50 líneas** — el overhead (~20K tokens por Task) no se justifica
- Los sub-agentes NO se ven entre sí — solo hablan con el agente principal
- Los sub-agentes NO pueden lanzar otros sub-agentes
- Si un sub-agente necesita info de otro, el agente principal la pasa

### Cuándo usar sub-agentes vs. hilo principal

| Situación | Sub-agente | Hilo principal |
|---|---|---|
| Explorar codebase antes de un cambio | explorador | |
| Implementar funcionalidad planificada | implementador | |
| Verificar una tarea recién completada | micro-revisor | |
| Revisión rápida post-implementación | revisor | |
| Cambio chico en 1-2 archivos | | directo |
| Debugging paso a paso | | directo |
| Tareas que dependen una de otra | | secuencial |
| Refactor grande (>10 archivos) | múltiples implementadores en paralelo | |

### Flujo típico con sub-agentes

```
1. /project:sesion → definir qué se va a hacer
2. Agente principal planifica (divide en tareas de 2-5 min)
3. Lanza EXPLORADOR → entiende el codebase
4. Para cada tarea del plan:
   a. Lanza IMPLEMENTADOR → implementa la tarea
   b. Lanza MICRO-REVISOR → verifica spec compliance + code quality
   c. Si micro-revisor dice CORREGIR → volver al implementador
   d. Si micro-revisor dice CONTINUAR → commit y siguiente tarea
5. Al terminar un bloque de tareas (etapa del plan):
   Lanza REVISOR → revisión más profunda de toda la etapa
6. Si hay problemas → corregir con implementador
7. Si está limpio → checkpoint y siguiente etapa
8. /project:cierre → cerrar sesión ordenada
```

**Cuándo saltarse el micro-revisor:**
- Tareas triviales de 1-2 líneas (renombrar, agregar import)
- Tareas que son solo de documentación
- Cuando hay presión de tiempo y el riesgo es bajo

**Cuándo el micro-revisor es obligatorio:**
- Tareas que tocan lógica de negocio
- Tareas que tocan seguridad, auth, o pagos
- Tareas que crean endpoints nuevos
- Tareas que modifican el modelo de datos

### Relación con las auditorías de docs/roles/

Los sub-agentes (especialmente el revisor) NO reemplazan las auditorías formales.

| Situación | Qué usar |
|---|---|
| Revisión rápida antes de commitear | Sub-agente revisor |
| Auditoría formal antes de deploy | Los roles de `docs/roles/tech/` y `docs/roles/business/` |
| Auditoría de seguridad post-sprint | `docs/roles/tech/security-audit-post-sprint.md` |
| Scan rápido antes de un deploy urgente | `docs/roles/tech/security-scan-quick.md` |

El sub-agente revisor cubre el 80% del día a día. Las auditorías formales cubren el 100% antes de momentos clave.

---

## PARTE 5: Agent Teams (experimental)

> Estado: experimental, requiere `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
> Requiere: Opus 4.6
> Fecha de introducción: febrero 2026

Agent Teams permite que múltiples instancias de Claude Code trabajen en paralelo
y se coordinen entre sí con una lista de tareas compartida y mensajería directa.

A diferencia de sub-agentes (que reportan al principal y no se ven entre sí),
los teammates pueden:
- Mandarse mensajes directamente entre ellos
- Reclamar tareas de una lista compartida
- Compartir hallazgos en tiempo real

### Cuándo considerarlo

- Refactors que tocan más de 15-20 archivos
- Trabajo donde los agentes necesitan comunicarse entre sí
- Cuándo el costo de 3-4x tokens se justifica por el ahorro de tiempo

### Cuándo NO usarlo

- Proyectos chicos o micrositios (overkill)
- Tareas donde un sub-agente ya resuelve
- Si el presupuesto de tokens es limitado

### Evaluación actual

Para el perfil de operador solo trabajando en micrositios y apps de tamaño
mediano, los sub-agentes custom cubren las necesidades actuales.
Reevaluar Agent Teams cuando:
- Salga de experimental
- Soporte mezcla de modelos (Opus para lead, Sonnet para implementar)
- Se trabaje en un proyecto grande
