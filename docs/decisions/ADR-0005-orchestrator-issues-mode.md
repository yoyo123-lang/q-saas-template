# ADR-0005: Modo issues para q-orchestrator — batch processing de directivas del Board

> **Fecha**: 2026-03-25
> **Estado**: Aceptada

## Contexto

El q-orchestrator tenía 5 modos de trabajo, todos centrados en **un proyecto a la vez** elegido por el operador de forma interactiva. El Q Company Board (q-company) genera directivas que se publican como GitHub Issues en los repos de cada BU (Business Unit: qautiva, qapitaliza, qobra, etc.).

El flujo actual requería intervención manual por issue: abrir el orquestador, seleccionar el repo, describir el cambio. Con N BUs generando issues permanentemente, esto no escala.

La necesidad: un modo que corra de forma **no interactiva y desatendida** (cron nocturno), escanee múltiples repos, y procese cada directiva end-to-end sin intervención humana.

## Opciones consideradas

### Opción A: Extender el modo `continue` para soportar múltiples repos

Modificar el flujo existente de roadmap para que itere sobre N repos registrados.

- **Pros**: reutiliza infraestructura existente (sessions.sh, parse_roadmap)
- **Contras**: el modelo de roadmap por sesión no encaja con "issue = tarea independiente"; habría que forzar una metáfora equivocada; contamina el flujo de proyectos existentes

### Opción B: Script independiente fuera del orquestador

Crear un script separado `q-issues-processor.sh` con su propia lógica.

- **Pros**: no toca el código existente
- **Contras**: duplica toda la infraestructura de `run_claude()`, CI retry, logging, UI; dos sistemas a mantener; no hereda config ORCH_*

### Opción C: Nuevo modo `issues` integrado en el orquestador (elegida)

Agregar `--mode issues` al orquestador existente como modo especializado, con 5 nuevos archivos en `lib/`:

- **Pros**: hereda toda la infraestructura existente (`run_claude`, `run_ci_check_and_fix`, config ORCH_*, logging, UI); un único entry point; config en cascada funciona igual; el modo es invisible si `ORCH_ISSUES_REPOS` no está configurado (no rompe usuarios actuales)
- **Contras**: el modo issues no opera sobre un `project_path` seleccionado — necesita ignorar ese argumento y operar sobre `ORCH_ISSUES_REPOS`; esto rompe levemente el contrato del menú (todos los otros modos usan el proyecto seleccionado)

## Decisión

Elegimos **Opción C** porque la reutilización de `run_claude()` y `run_ci_check_and_fix()` es el beneficio más importante. Esas funciones encapsulan la interacción con Claude CLI de forma probada; reimplementarlas sería deuda técnica inmediata.

El "contrato roto" (ignorar `project_path`) es un trade-off aceptable: se documenta explícitamente en el código y el modo issues solo aparece en el menú cuando `ORCH_ISSUES_REPOS` está configurado.

### Decisiones secundarias dentro del modo issues

**Branch strategy para issues**: usar `ORCH_BRANCH_STRATEGY="direct"` temporalmente durante el procesamiento de cada issue (en lugar de "pr"). El branch `directive/{id}` se crea manualmente antes de llamar a `run_ci_check_and_fix`; Claude pushea al branch actual; el PR se crea por separado con `gh pr create`.

Alternativa descartada: usar `ORCH_BRANCH_STRATEGY="pr"` que crearía `session/{slug}/s1` — nombre incorrecto y desconectado de la directiva.

**State file por issue**: persistido en `~/.q-orchestrator/issues-state/{owner_repo}/{issue_number}.json`. Permite re-runs sin reprocesar issues ya completados, y debugging post-mortem de cada fallo.

**Sin jq**: el parse de JSON (respuesta de gh API) se hace con node/python vía stdin, siguiendo la convención del proyecto (ver `_run_json` en projects.sh). No se agrega jq como dependencia.

**Board API graceful failure**: si `ORCH_BOARD_URL` o la API key no están configurados, el procesamiento del issue continúa igualmente. El comment en el GitHub Issue es el fallback de notificación.

## Consecuencias

### Lo que ganamos
- Cron nocturno completamente desatendido: un operador configura `ORCH_ISSUES_REPOS` y olvida
- Reutilización directa de `run_claude()` y `run_ci_check_and_fix()` — el motor de Claude CLI probado
- Config en cascada heredada — `ORCH_MODEL`, `ORCH_CI_MAX_RETRIES`, etc. aplican igual
- Trazabilidad completa: state files JSON, logs por issue, morning report diario, comment en cada issue
- Zero cambios a los modos existentes — no hay riesgo de regresión

### Lo que perdemos o se complica
- El modo issues ignora el proyecto seleccionado en el menú — el menú pregunta por proyecto aunque no se use. Esto puede confundir al operador.
- El estado del orquestador mezcla dos conceptos: "proyecto por sesión" (modos existentes) y "issues batch por repo" (modo issues). Son mundos separados que comparten la misma UI.
- `run_ci_check_and_fix` usa `save_state(slug, session_num, ...)` internamente. En modo issues, `slug` = directive slug y `session_num` = 1 siempre. Semánticamente no es ideal, pero funciona.

### Lo que hay que tener en cuenta a futuro
- Si `run_ci_check_and_fix` cambia su firma o comportamiento, `issues-runner.sh` debe actualizarse
- El formato del GitHub Issue (HTML comments `board:directive_id`, tabla markdown) es un contrato entre q-company y q-orchestrator. Cambios en el Board que alteren ese formato rompen el parser sin error visible
- Considerar agregar un modo `--dry-run` que muestre la cola sin procesar (ver roadmap técnico del orquestador)
- Los repos BU se clonan con `--depth 1` (shallow clone). `git log main..branch` puede no funcionar correctamente si main no está en la historia local después de muchos commits. Considerar `--unshallow` al actualizar si se necesita historia completa.

---

## Archivos creados

| Archivo | Responsabilidad |
|---------|----------------|
| `lib/issues-board-api.sh` | PATCH al Board API, builders de JSON payload |
| `lib/issues-fetch.sh` | Fetch de GitHub Issues vía gh CLI, parse del body |
| `lib/issues-queue.sh` | Priorización (CRITICAL→LOW), state por issue |
| `lib/issues-runner.sh` | Loop de procesamiento, entry point `run_issues_mode()` |
| `lib/issues-report.sh` | Morning report en Markdown |

## Variables de configuración agregadas

Ver sección "Variables ORCH_ISSUES_*" en `ORCHESTRATOR_GUIDE.md`.
