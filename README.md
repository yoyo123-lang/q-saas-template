# Sistema de Reglas para Vibecoding con Claude Code

> Plantilla de documentación para operar proyectos con estandar senior usando Claude Code como herramienta principal de desarrollo.

## Manual de uso

Si es tu primera vez con este template → **leé `docs/MANUAL_DE_USO.md`**. Es la guía práctica de operación diaria.

## Que incluye

### Nucleo

- `CLAUDE.md` — Reglas que Claude Code carga automaticamente al iniciar sesion
- `docs/REGLAS_PREVENTIVAS.md` — Reglas preventivas destiladas de los 6 roles de auditoria
- `docs/COMO_PEDIR.md` — Guia personal para formular pedidos a Claude Code

### Skills (comandos de proyecto)

| Comando | Que hace |
|---|---|
| `/project:sesion` | Mini-onboarding al arrancar sesion |
| `/project:cierre` | Cierre ordenado de sesion |
| `/project:cambio` | Cambio puntual con revision automatica |
| `/project:cambio-grande` | Cambio multi-etapa con revision por etapa |
| `/project:diseño` | Contexto visual para crear/mejorar pantallas |
| `/project:debug` | Debugging estructurado con hipotesis y TDD |
| `/project:revision` | Auditoria de roles a demanda |
| `/project:deploy` | Verificacion pre-deploy y push |
| `/project:onboard` | Adoptar template en proyecto existente |
| `/project:descubrimiento` | Documentar modelo de negocio |
| `/project:oauth` | Integracion OAuth con Google |
| `/project:recaptcha` | Integracion reCAPTCHA v3 |
| `/project:telegram` | Bot de Telegram con LLM |

### Sub-agentes

| Agente | Modelo | Permisos | Uso |
|---|---|---|---|
| `explorador` | Sonnet | Solo lectura | Investigar el codebase |
| `implementador` | Sonnet | Edicion + bash | Escribir codigo siguiendo reglas preventivas + TDD |
| `micro-revisor` | Haiku | Solo lectura | Verificacion rapida post-tarea (spec + calidad) |
| `revisor` | Opus | Solo lectura | Revision completa post-etapa |

### Documentacion del proyecto

- `docs/ARCHITECTURE.md` — Arquitectura y stack tecnologico
- `docs/CONVENTIONS.md` — Convenciones de codigo
- `docs/DEBUGGING.md` — Prevencion de errores silenciosos
- `docs/TESTING.md` — Estrategia de testing por capas
- `docs/TDD.md` — Proceso de Test-Driven Development (Red-Green-Refactor)
- `docs/SECURITY.md` — Reglas minimas de seguridad
- `docs/PLANNING.md` — Metodologia de planificacion
- `docs/GIT-WORKFLOW.md` — Branching, commits, PRs
- `docs/GIT-WORKTREES.md` — Desarrollo aislado con git worktrees
- `docs/HOOKS.md` — Verificacion automatica con hooks
- `docs/MULTI-AGENT.md` — Trabajo paralelo, sesiones, sub-agentes custom
- `docs/DEPLOYMENT.md` — Ambientes y proceso de deploy
- `docs/OPERATIONS.md` — Monitoreo, alertas, incidentes
- `docs/MAINTENANCE.md` — Salud del codigo y deuda tecnica
- `docs/PERFORMANCE.md` — Optimizacion y umbrales
- `docs/KNOWN_ISSUES.md` — Errores conocidos y aprendizajes
- `docs/PRE_DEPLOY_AND_QA.md` — Build obligatorio y QA funcional
- `docs/API_STANDARDS.md` — Contratos REST y webhooks
- `docs/DATABASE.md` — Modelo, migraciones, backups
- `docs/I18N.md` — Internacionalizacion y localizacion
- `docs/FRONTEND_GUIDELINES.md` — Accesibilidad, responsive, estados de UI
- `docs/PR_TEMPLATE.md` — Template para pull requests
- `docs/AI_CODE_REVIEW.md` — Auditoria de codigo con IA
- `docs/ADOPCION_PROYECTOS_EXISTENTES.md` — Adopcion de proyectos con deuda tecnica
- `docs/CHECKLIST_SENIOR_AUDIT.md` — Scorecard de auditoria del template

### Roles de auditoria

- `docs/roles/REVIEW_ROLES.md` — Framework de revision multi-rol

#### Capa 1: Roles técnicos (`docs/roles/tech/`)
- `code-reviewer.md` — Calidad y mantenibilidad
- `qa-engineer.md` — Robustez y casos borde
- `security-auditor.md` — Vulnerabilidades y acceso
- `security-audit-post-sprint.md` — Auditoria profunda post-sprint con IA
- `security-scan-quick.md` — Scan rapido pre-deploy
- `performance-engineer.md` — Bottlenecks y escalabilidad
- `devops-sre.md` — Operabilidad y recuperacion
- `ux-reviewer.md` — Interaccion, consistencia visual, accesibilidad

#### Capa 2: Roles de negocio (`docs/roles/business/`)
- `product-reviewer.md` — UX, SEO, producto
- `business-logic-reviewer.md` — Reglas de negocio, billing, permisos
- `data-analytics-reviewer.md` — Tracking, metricas, funnel

### Onboarding y playbooks

- `docs/onboarding/guia_onboarding.md` — Brainstorming de proyecto nuevo con Claude
- `docs/onboarding/playbook-micrositios-utilidad.md` — Redes de micrositios de utilidad
- `docs/onboarding/playbook-negocios-digitales-exterior.md` — Negocios digitales probados afuera

### Decisiones de arquitectura

- `docs/decisions/ADR-TEMPLATE.md` — Template para ADRs
- `docs/decisions/ADR-0001-sistema-documentacion-modular.md` — Por que la documentacion es modular

### Referencia

- `docs/referencia/security-rules-claudemd.md` — Razonamiento detras de las reglas de seguridad (OWASP, OpenSSF)

## Flujo recomendado de uso

### Si arrancas desde cero

```
ANTES DE ARRANCAR:
→ Mirar docs/COMO_PEDIR.md (machete de templates para prompts)
→ Si la idea no esta clara → charlarla en Claude.ai primero

AL ARRANCAR SESION:
→ /project:sesion (mini-onboarding)

DURANTE EL DESARROLLO:
→ Claude usa sub-agentes automaticamente:
  - explorador para investigar
  - implementador para codear (con REGLAS_PREVENTIVAS cargadas)
  - revisor para chequear antes de commit
→ Si necesitas una pantalla → /project:diseño

AL TERMINAR:
→ /project:cierre (actualiza SESSION_LOG, evalua KNOWN_ISSUES, verifica build)

ANTES DE DEPLOY:
→ Auditorias formales de docs/roles/
```

### Si el proyecto ya existe

1. `/project:onboard` — detecta stack, diagnostica y completa documentacion base
2. `/project:descubrimiento` — documenta modelo de negocio (activa roles de capa 2)
3. Avanzar con normalizacion de codigo usando `/project:cambio` o `/project:cambio-grande`

## Estado de la plantilla

Esta base cubre los dominios del checklist senior, pero sigue siendo una **plantilla**: cada proyecto debe completar valores concretos (versiones, URLs, owners, umbrales, comandos reales).
