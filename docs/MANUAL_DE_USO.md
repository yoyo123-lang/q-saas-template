# Manual de uso — Template de reglas para Claude Code

> Este manual es para vos, el usuario. Explica cómo usar este sistema día a día.
> No es documentación técnica — es una guía práctica de operación.

---

## Qué es esto

Un sistema de documentación y reglas que convierte a Claude Code en un equipo de desarrollo completo. Incluye:

- **Reglas automáticas** que Claude Code carga solo al arrancar (`CLAUDE.md`)
- **13 comandos** que activan flujos de trabajo guiados
- **4 sub-agentes** con roles diferenciados (investigar, codear, revisar rápido, revisar profundo)
- **9 roles de auditoría** que se activan automáticamente según el tipo de cambio
- **Documentación modular** donde cada tema vive en un solo lugar

El template es agnóstico al lenguaje. Funciona igual con Next.js, Python, Go o lo que uses.

---

## Mapa mental del sistema

```
VOS (decidís qué construir)
│
├── ANTES de codear
│   ├── /project:sesion ........... arranca el día con contexto
│   ├── /project:descubrimiento ... documenta el modelo de negocio
│   └── /project:onboard ......... adopta el template en proyecto existente
│
├── MIENTRAS codeás
│   ├── /project:cambio ........... cambio chico con revisión automática
│   ├── /project:cambio-grande .... cambio multi-etapa con revisión por etapa
│   ├── /project:diseño ........... crear/mejorar pantallas
│   └── /project:debug ............ diagnosticar y arreglar bugs
│
├── INTEGRACIONES
│   ├── /project:oauth ............ login con Google
│   ├── /project:recaptcha ........ protección contra bots
│   └── /project:telegram ......... bot de Telegram con LLM
│
├── VERIFICACIÓN
│   ├── /project:revision ......... auditoría a demanda (sin cambiar código)
│   └── /project:deploy ........... verificación pre-deploy + push
│
└── AL TERMINAR
    └── /project:cierre ........... cierre ordenado de sesión
```

---

## Tu día típico de trabajo

### 1. Arrancás la sesión

```
/project:sesion
```

Claude Code lee `SESSION_LOG.md` para saber dónde quedaste, te pregunta qué querés hacer hoy, y propone un plan. No escribe código hasta que aprobés el plan.

**Primera vez en un proyecto existente?** Usá `/project:onboard` en vez de `/project:sesion`. Va a detectar el stack, diagnosticar el estado del proyecto y completar la documentación base.

### 2. Pedís lo que necesitás

Dependiendo de qué vas a hacer:

| Situación | Qué usar |
|---|---|
| Cambio puntual (hasta ~5 archivos) | `/project:cambio` |
| Feature grande o multi-etapa | `/project:cambio-grande` |
| Crear o mejorar una pantalla | `/project:diseño` |
| Arreglar un bug | `/project:debug` |
| Algo que no tenés claro | `/project:sesion` y dejá que te guíe |

Cada comando va a:
1. Preguntarte qué querés
2. Proponer un plan
3. Esperar tu aprobación
4. Implementar
5. Revisar automáticamente con los roles que correspondan
6. Corregir hallazgos críticos/altos
7. Documentar todo en `SESSION_LOG.md`

### 3. Cerrás la sesión

```
/project:cierre
```

Verifica que el build pase, te pregunta si algo salió mal (para registrar en `KNOWN_ISSUES.md`), actualiza el log, y sugiere un nombre para la sesión.

**No cierres la terminal sin hacer `/project:cierre`.** Es lo que hace que la próxima sesión arranque con contexto.

---

## Cómo formular pedidos

Antes de escribir un prompt, repasá rápido `docs/COMO_PEDIR.md`. La versión corta:

### Todo pedido bueno tiene 3 cosas

1. **QUÉ** quiero que pase (el resultado, no la implementación)
2. **PARA QUIÉN** (qué ve el usuario final)
3. **CONTEXTO** (de dónde vienen los datos, qué ya existe, qué no tocar)

### Ejemplos

**Malo:** "Hacé la autenticación"
**Bueno:** "Hacé login con email y contraseña, JWT, refresh token, formulario mobile-first de máximo 3 campos"

**Malo:** "Arreglá los estilos"
**Bueno:** "Los botones en la pantalla de pagos se ven distintos a los del dashboard. Unificá al estilo del dashboard"

**Si no podés describir el resultado en 2-3 oraciones**, todavía no tenés claro qué querés. Pensalo en Claude.ai primero y después vení a Claude Code.

---

## Los 13 comandos en detalle

### Ciclo de vida de la sesión

#### `/project:sesion` — Arrancar el día
- Lee el estado anterior del proyecto
- Te pregunta qué querés hacer
- Propone plan + archivos que va a tocar
- Evalúa si necesita un worktree aislado
- **No codea hasta que aprobés**

#### `/project:cierre` — Cerrar el día
- Lista cambios hechos
- Corre build + lint + tests
- Pregunta si algo salió mal → `KNOWN_ISSUES.md`
- Actualiza `SESSION_LOG.md`
- Maneja commit y rama (o worktree si aplica)

### Desarrollo

#### `/project:cambio` — Cambio chico con revisión
- Para cambios de hasta ~5 archivos, 1 etapa
- Implementa, commitea, detecta el tipo de cambio por el diff
- Selecciona y corre los roles de auditoría que correspondan
- Corrige hallazgos críticos/altos automáticamente
- Si el cambio es muy grande, te sugiere usar `/project:cambio-grande`

#### `/project:cambio-grande` — Cambio multi-etapa
- Para features complejas que tocan muchos archivos
- Divide en etapas, implementa y revisa cada una
- Al final de todas las etapas, corre revisión de negocio (si existe `BUSINESS_MODEL.md`)
- Puede crear worktree aislado para cambios de alto riesgo

#### `/project:diseño` — Trabajo visual
- Para crear o mejorar pantallas/componentes
- Pide referencia visual e identidad del proyecto
- Implementa con reglas de responsive, accesibilidad y estados de UI
- Itera hasta que aprobés el resultado

#### `/project:debug` — Debugging estructurado
- Reproduce → aísla → formula hipótesis → verifica → escribe test → arregla
- Usa la regla de los 2 intentos: si no encuentra la causa, para y pide ayuda
- Escribe el test del bug ANTES de arreglar
- Evalúa prevención para que no vuelva a pasar

### Integraciones

#### `/project:oauth` — Login con Google
- Sigue el playbook de `docs/playbooks/oauth.md`
- Te pregunta por proveedor, allowlist, roles, credenciales
- Implementa paso a paso

#### `/project:recaptcha` — Protección contra bots
- reCAPTCHA v3 invisible
- Evalúa qué formularios proteger
- Te pregunta por claves y comportamiento en dev

#### `/project:telegram` — Bot con LLM
- Bot de Telegram que responde en lenguaje natural
- Define tools del LLM con function calling
- Previene que operaciones de gestión de usuarios sean tools (anti prompt injection)

### Verificación

#### `/project:revision` — Auditoría a demanda
- Corre roles de revisión SIN implementar cambios
- Podés elegir: técnica, de negocio, completa, o de archivos específicos
- Genera informe en `docs/reviews/`
- Ideal para pre-deploy o auditorías periódicas

#### `/project:deploy` — Pre-deploy y release
- Secuencia obligatoria: build → lint → tests → security scan
- Revisa diff contra main, busca TODOs bloqueantes
- Genera changelog
- Push solo con confirmación explícita tuya

### Setup

#### `/project:onboard` — Adoptar template en proyecto existente
- Detecta stack automáticamente
- Verifica que el build funcione
- Diagnóstica estado (estructura, docs, tests, seguridad)
- Completa `ARCHITECTURE.md` con datos reales
- Propone plan de adopción por fases

#### `/project:descubrimiento` — Documentar modelo de negocio
- Recorre el código para inferir auth, billing, entidades, integraciones
- Te hace preguntas para completar lo que no pudo inferir
- Genera `BUSINESS_MODEL.md`
- Necesario para activar los roles de negocio (capa 2)

---

## Los 4 sub-agentes

Claude Code usa sub-agentes automáticamente cuando corresponde. No necesitás invocarlos vos.

| Agente | Modelo | Para qué | Cuándo se usa |
|---|---|---|---|
| **explorador** | Sonnet | Investigar código, buscar patrones, entender | Antes de implementar |
| **implementador** | Sonnet | Escribir código, correr tests y build | Durante la implementación |
| **micro-revisor** | Haiku | Verificación rápida post-tarea | Después de cada tarea atómica |
| **revisor** | Opus | Revisión profunda de seguridad, performance, robustez | Antes de commit final |

**Costo:** cada sub-agente usa ~20K tokens. No se usan para tareas de menos de 50 líneas.

**Regla:** los sub-agentes nunca se hablan entre sí. El agente principal coordina todo.

---

## Sistema de revisión automática

Cuando usás `/project:cambio` o `/project:cambio-grande`, Claude Code analiza el diff y selecciona qué roles correr:

### Capa 1 — Roles técnicos (siempre disponibles)

| Rol | Qué revisa | Cuándo se activa |
|---|---|---|
| Code Reviewer | Estructura, nombres, complejidad, errores | **Siempre** (corre primero) |
| QA Engineer | Flujos, casos borde, estados de UI | Features nuevas, bug fixes |
| Security Auditor | Inputs, auth, datos sensibles, headers | Cambios de seguridad/auth |
| Performance Engineer | N+1, queries, bundle, cache | Optimizaciones |
| DevOps/SRE | Deploy, logs, health check, rollback | Infra, CI/CD |
| UX Reviewer | Jerarquía visual, responsive, accesibilidad | UI/diseño |
| Product Reviewer | Propósito, flujo, copy, SEO | Features orientadas al usuario |

### Capa 2 — Roles de negocio (requieren `BUSINESS_MODEL.md`)

| Rol | Qué revisa |
|---|---|
| Business Logic Reviewer | Reglas de negocio, billing, permisos por plan |
| Data/Analytics Reviewer | Tracking de funnel, métricas, calidad de datos |

Para activar la capa 2, corré `/project:descubrimiento` primero.

### Severidades

- **CRÍTICO** → bloquea. Se corrige automáticamente antes de seguir.
- **ALTO** → se corrige automáticamente.
- **MEDIO** → se documenta para después.
- **BAJO** → detalle, se registra.

---

## Archivos que importan

### Los que Claude Code mantiene

| Archivo | Qué tiene | Quién lo actualiza |
|---|---|---|
| `SESSION_LOG.md` | Historia de sesiones, qué se hizo, qué quedó pendiente | `/project:cierre` |
| `KNOWN_ISSUES.md` | Errores repetidos, patrones a evitar | `/project:cierre` cuando algo sale mal |
| `IMPLEMENTATION_PLAN.md` | Plan formal para cambios grandes | `/project:cambio-grande` |
| `docs/reviews/*.md` | Informes de auditoría | `/project:cambio`, `/project:revision` |

### Los que vos completás (o Claude Code te ayuda)

| Archivo | Qué tiene | Cuándo completar |
|---|---|---|
| `docs/ARCHITECTURE.md` | Stack, estructura, decisiones | Al adoptar el template (`/project:onboard`) |
| `docs/BUSINESS_MODEL.md` | Auth, billing, entidades, métricas | Con `/project:descubrimiento` |
| `docs/decisions/ADR-*.md` | Decisiones técnicas importantes | Cuando se toma una decisión no obvia |

### Los que no tocás (vienen configurados)

- `CLAUDE.md` — reglas que Claude Code carga solo
- `docs/REGLAS_PREVENTIVAS.md` — reglas destiladas de los roles
- `docs/roles/*.md` — definición de cada rol de auditoría
- `.claude/agents/*.md` — definición de sub-agentes
- `.claude/commands/*.md` — definición de comandos

---

## Flujo para proyectos chicos

Para un proyecto chico (landing page, herramienta interna, MVP):

```
1. /project:sesion
2. Describí qué querés en 2-3 oraciones
3. Aprobá el plan
4. Claude Code implementa y revisa
5. /project:deploy cuando esté listo
6. /project:cierre
```

No necesitás usar `/project:descubrimiento`, ni cambio-grande, ni los roles de capa 2. El sistema escala hacia abajo — los comandos que no usás no molestan.

---

## Flujo para proyectos SaaS

```
1. /project:onboard (si el proyecto ya existe)
   o /project:sesion (si arrancás de cero)

2. /project:descubrimiento → genera BUSINESS_MODEL.md
   (activa roles de negocio: billing, permisos, tracking)

3. Desarrollo diario:
   /project:sesion → /project:cambio o /project:cambio-grande → /project:cierre

4. Antes de cada deploy:
   /project:revision (auditoría completa)
   /project:deploy (verificación + push)

5. Cada N sprints:
   Correr security-audit-post-sprint (auditoría de seguridad profunda)
```

---

## Worktrees — Desarrollo aislado

Si un cambio toca >3 archivos o tiene riesgo medio-alto, Claude Code te va a proponer crear un **worktree**: una copia del repo en otra carpeta que trabaja en otra rama.

**No tenés que hacer nada especial.** Claude Code lo crea, trabaja ahí, y al hacer `/project:cierre` te pregunta qué hacer:

- **Mergear a main** — si está todo verificado
- **Push + PR** — para revisión antes de mergear
- **Dejar para después** — commit WIP, retomar en otra sesión
- **Descartar** — borrar todo y volver a main limpio

---

## Hooks — Verificación automática

Los hooks son scripts que corren automáticamente cuando Claude Code hace ciertas acciones. Se configuran en `.claude/settings.json`.

Los 3 recomendados:
1. **Proteger archivos sensibles** — bloquea edición de migrations, .env, .lock
2. **Formatear al guardar** — corre el formatter después de cada edición
3. **Lint + tests al terminar** — corre cuando Claude Code termina una tarea

Para configurarlos: ver `docs/HOOKS.md`.

---

## Reglas que Claude Code sigue solo

No necesitás recordarle estas cosas — están en `CLAUDE.md` y las reglas preventivas:

- No toca archivos que no mencionaste
- No agrega dependencias sin preguntar
- No borra código sin confirmar
- No hace refactors no solicitados
- Escribe test antes del código (TDD)
- Commit atómicos con mensaje del POR QUÉ
- Cero errores silenciosos
- Build obligatorio antes de push
- Si se traba después de 2 intentos, para y pregunta

---

## Cuando algo sale mal

| Problema | Qué hacer |
|---|---|
| Claude Code se trabó en un loop | Decile "probá un approach completamente diferente" |
| El cambio es más grande de lo esperado | Usá `/project:cambio-grande` para dividir en etapas |
| No entendés qué hizo | Pedile un resumen de los cambios |
| Hizo algo que no pediste | Recordale las restricciones de `CLAUDE.md` |
| La conversación se puso muy larga | Hacé `/compact` o `/clear` y arrancá con `/project:sesion` |
| Un error se repite entre sesiones | Revisá `KNOWN_ISSUES.md` — si no está, agregalo con `/project:cierre` |

---

## Referencia rápida

```
ARRANCAR:        /project:sesion
CAMBIO CHICO:    /project:cambio
CAMBIO GRANDE:   /project:cambio-grande
PANTALLA:        /project:diseño
BUG:             /project:debug
AUDITORÍA:       /project:revision
DEPLOY:          /project:deploy
CERRAR:          /project:cierre
ONBOARDING:      /project:onboard
MODELO NEGOCIO:  /project:descubrimiento
OAUTH:           /project:oauth
RECAPTCHA:       /project:recaptcha
TELEGRAM:        /project:telegram
```

---

*Si después de leer esto seguís con dudas, abrí una sesión y preguntale a Claude Code. Para eso está.*
