# ADR-0002: Mejoras inspiradas en Superpowers (obra/superpowers)

> **Fecha**: 2026-03-21
> **Estado**: Propuesta

## Contexto

Se investigó el repo [Superpowers](https://github.com/obra/superpowers) (v5.0.4, por Jesse Vincent / Prime Radiant, 103k+ stars) para identificar patrones y prácticas que puedan mejorar nuestro template-blanco.

Superpowers es un framework de skills composables para agentes de código (Claude Code, Cursor, Codex, Gemini). Se enfoca en workflow de desarrollo estructurado: brainstorming → planificación → ejecución con sub-agentes → verificación.

## Análisis comparativo

### Lo que YA tenemos (equivalencias)

| Superpowers | templete-blanco | Notas |
|---|---|---|
| `skills/test-driven-development` | `docs/TDD.md` | Similar enfoque TDD-first |
| `skills/systematic-debugging` | `docs/DEBUGGING.md` + `/project:debug` | Ambos usan fases y root-cause-first |
| `skills/using-git-worktrees` | `docs/GIT-WORKTREES.md` | Ambos usan worktrees para aislamiento |
| `skills/dispatching-parallel-agents` | `docs/MULTI-AGENT.md` + sub-agentes | Nuestro sistema es más detallado con modelos diferenciados |
| `agents/code-reviewer` | `agents/revisor.md` + `docs/roles/tech/` | Nuestro sistema de revisión es más granular (micro-revisor + revisor + roles) |
| `skills/writing-plans` | `/project:cambio` + `IMPLEMENTATION_PLAN.md` | Similar concepto de plan-antes-de-código |
| `skills/executing-plans` | `/project:cambio` (implementador) | Similar ejecución task-by-task |
| `skills/finishing-a-development-branch` | `/project:deploy` | Ambos verifican tests antes de merge/push |
| `commands/brainstorm` | No directamente | Ver propuestas abajo |

### Lo que Superpowers tiene y nosotros NO

1. **Skill: Verification Before Completion** — Regla explícita de "nunca declarar completado sin ejecutar el comando de verificación y leer la salida". Red flags: palabras como "should", "probably", "seems to", o expresiones de satisfacción ("Done!") antes de verificar. Esto es más estricto que nuestro checklist post-código.

2. **Skill: Brainstorming estructurado** — Fase de design-before-code con gate de aprobación explícito. No se puede invocar ningún skill de implementación hasta que el diseño esté aprobado. Incluye un spec-document-reviewer que valida la especificación.

3. **Skill: Receiving Code Review** — Protocolo para recibir feedback de reviews: prohibido responder "You're absolutely right!", exige verificar antes de implementar sugerencias, y aplica evaluación YAGNI a sugerencias de reviewers externos. Pushback técnico cuando el feedback no tiene sentido.

4. **Skill: Subagent-Driven Development** — Patrón de "un sub-agente fresco por tarea" con doble review (spec compliance + code quality). Incluye selección de modelo por complejidad de tarea. Más granular que nuestro modelo actual.

5. **Hook: SessionStart automático** — Script que inyecta contexto de skills activos al iniciar sesión. Detecta configuración legacy y muestra warnings.

6. **Skill: Writing Skills (meta-skill)** — Capacidad de crear nuevos skills desde dentro del sistema. Auto-extensible.

## Propuestas concretas

### P1: Agregar regla "Verification Before Completion" (ALTO IMPACTO, BAJO ESFUERZO)
- Agregar a `docs/REGLAS_PREVENTIVAS.md` una sección que prohíba declarar tareas completas sin ejecutar verificación fresca
- Red flags: "should work", "probably fixed", "Done!" sin evidencia
- Regla: ejecutar comando → leer salida completa → confirmar que prueba la afirmación → recién entonces declarar completo

### P2: Agregar fase de Brainstorming/Diseño al flujo de cambio (MEDIO IMPACTO)
- Crear `/project:brainstorm` o integrar fase de diseño explícita en `/project:cambio-grande`
- Gate: no se puede pasar a implementación sin diseño aprobado por el usuario
- Incluir reviewer de spec como sub-agente

### P3: Agregar protocolo de recepción de code review (MEDIO IMPACTO)
- Documentar en `docs/CODE_REVIEW.md` cómo el agente debe procesar feedback de reviews
- Prohibir acuerdo performativo — verificar técnicamente antes de implementar sugerencias
- Aplicar evaluación YAGNI a sugerencias externas

### P4: Mejorar sub-agente de implementación con doble review (MEDIO IMPACTO, MEDIO ESFUERZO)
- Agregar paso de "spec compliance review" antes del "code quality review" en el flujo de `/project:cambio`
- El micro-revisor actual cubre parte de esto, pero no tiene la separación explícita spec vs. quality

### P5: Hook de SessionStart con contexto (BAJO IMPACTO — ya tenemos `/project:sesion`)
- Evaluar si un hook automático sería mejor que el slash command manual
- Ventaja: no depende de que el usuario recuerde ejecutarlo
- Riesgo: agrega overhead a cada sesión aunque no se necesite

### P6: Meta-skill para crear skills nuevos (BAJO PRIORIDAD)
- Documentar cómo crear nuevos slash commands y sub-agentes
- Ya tenemos la estructura, falta documentar el proceso

## Lo que NO conviene adoptar

- **Plugin system multi-plataforma** (`.claude-plugin`, `.cursor-plugin`, etc.): Nuestro template es específico para Claude Code. No necesitamos abstraer.
- **GEMINI.md como entry point**: Usamos CLAUDE.md que es mejor soportado.
- **Commands deprecados en favor de skills**: En Superpowers los commands están deprecados. Nuestros slash commands funcionan bien como entry points.
- **package.json / npm**: Superpowers se distribuye como paquete npm. Nuestro template es un repo que se clona, no un paquete.

## Decisión

Propongo implementar **P1 (Verification Before Completion)** y **P3 (Protocolo de Code Review)** como primera prioridad por su alta relación impacto/esfuerzo. P2 y P4 como segunda iteración.

## Consecuencias

### Lo que ganamos
- Menos falsos positivos de "tarea completa" sin verificación real
- Mejor procesamiento de feedback de code reviews
- Alineación con best practices de un repo con 103k+ stars

### Lo que perdemos o se complica
- Más reglas = más fricción en el workflow (mitigable con hooks)
- Documentación adicional que mantener

### Lo que hay que tener en cuenta a futuro
- Superpowers evoluciona rápido (v5.0.4). Revisitar periódicamente por nuevos patrones
- Si se implementa P5 (hook automático), testear que no cause overhead en sesiones cortas
