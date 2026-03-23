# Inicio de sesión de trabajo

> Skill para arrancar una sesión de desarrollo con contexto claro.
> Invocar con: `/project:sesion`
> No escribas código hasta que el usuario apruebe el plan.

## Paso 1: Entender el estado del proyecto

Leé estos archivos si existen (en silencio, no los cites textualmente):
- `SESSION_LOG.md` — qué se hizo antes, qué quedó pendiente
- `IMPLEMENTATION_PLAN.md` — si hay un plan en curso
- `KNOWN_ISSUES.md` — errores conocidos que afecten lo que se va a hacer

Resumí en 3-4 oraciones cortas: dónde está parado el proyecto y qué quedó pendiente.

### Si no existe `SESSION_LOG.md` (proyecto nuevo)

Es la primera sesión de desarrollo de este proyecto. Además de las preguntas del Paso 2, preguntá:

> **¿Este proyecto necesita alguno de estos módulos?**
> - **OAuth con Google** — login con cuenta de Google, allowlist de emails, roles → `/project:oauth`
> - **reCAPTCHA v3** — protección invisible contra bots en formularios → `/project:recaptcha`
> - **Bot de Telegram con LLM** — bot que responde en lenguaje natural consultando datos de la app → `/project:telegram`
> - **Tests E2E con Playwright** — tests end-to-end generados automáticamente para tus entidades → `/project:e2e`

Si el usuario indica que necesita alguno, sugerir integrarlo como parte del plan de la sesión o en una sesión dedicada. Los playbooks están en `docs/playbooks/`.

## Paso 2: Entender qué necesita el usuario HOY

Preguntale al usuario (de a poco, no todo junto):

1. **¿Qué querés lograr en esta sesión?** (el resultado, no la implementación)
2. **¿Hay algo que debería ver antes de arrancar?** (un archivo, una pantalla, un error, una referencia visual)

Si la respuesta es clara y concreta → ir al paso 3.

Si la respuesta es ambigua, preguntá UNA de estas según corresponda:
- "¿Qué debería ver el usuario final cuando esto esté terminado?"
- "¿Podés darme un ejemplo de lo que esperás?"
- "¿Esto es algo nuevo o estamos modificando algo que ya existe?"

No hagas más de 3 preguntas en total. El objetivo es clarificar, no interrogar.

## Paso 3: Proponer plan de trabajo

Con lo que entendiste, proponé un plan en este formato:

```
SESIÓN: [nombre descriptivo]
OBJETIVO: [qué se va a lograr, en una oración]

PASOS:
1. [paso concreto]
2. [paso concreto]
3. [paso concreto]

ARCHIVOS QUE VOY A TOCAR:
- [lista]

RIESGOS:
- [si hay alguno, en una oración. Si no hay, no incluir esta sección]
```

Máximo 10 líneas el plan. Si es más largo, el alcance es demasiado grande — proponé dividirlo.

### Evaluar si se necesita worktree

Si el plan implica tocar más de 3 archivos o incluye cambios con riesgo medio-alto (refactor, cambio de arquitectura, integración nueva, cambio en lógica de pagos):

1. Proponer al usuario crear un worktree aislado
2. Si acepta, crearlo siguiendo `docs/GIT-WORKTREES.md`
3. Todo el trabajo de la sesión se hace dentro del worktree
4. Al cierre (`/project:cierre`) se decide qué hacer con el worktree

Si el cambio es chico (1-3 archivos, bajo riesgo), trabajar en rama normal sin worktree.

## Paso 4: Esperar aprobación

No arranques a codear hasta que el usuario diga que está bien. Si ajusta algo del plan, actualizar y confirmar de nuevo.

## Paso 5: Trabajar

Una vez aprobado, implementá siguiendo el plan. Aplicá las reglas de `docs/REGLAS_PREVENTIVAS.md`.

Al terminar, actualizá `SESSION_LOG.md` con:
- Qué se hizo
- Qué quedó pendiente
- Archivos modificados
