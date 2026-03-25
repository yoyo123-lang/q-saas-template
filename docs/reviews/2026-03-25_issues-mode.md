# Revisión: Modo Issues — q-orchestrator
Fecha: 2026-03-25
Proyecto: q-saas-template / scripts/orchestrator (issues mode)
Revisó: Claude Code — roles: Code Reviewer, QA Engineer, Security Auditor, DevOps/SRE, Consistency Reviewer

---

## Resumen
- Estado: ⚠️ Aprobado con observaciones
- Hallazgos: 2 críticos, 3 altos, 4 medios, 1 bajo

---

## Hallazgos

### [CRÍTICO] `_run_json` no recibe los datos JSON en fetch_open_issues
- Dónde: `lib/issues-fetch.sh:50-62`
- Problema: `_run_json` acepta solo 2 args (node_code, python_code). Se pasa `$raw` como arg 3 pero nunca llega a `node -e` ni a `python3 -c`. El código JS usa `process.argv[1]` que es `undefined` en `-e` mode; el parsing falla silenciosamente → `fetch_open_issues` retorna vacío.
- Riesgo: El modo issues no fetcha ningún issue. Toda la funcionalidad principal está rota.
- Solución: Reemplazar la llamada a `_run_json` por un helper local que pipe el JSON via stdin.

### [CRÍTICO] Branch incorrecto al llamar `run_ci_check_and_fix` con strategy "pr"
- Dónde: `lib/issues-runner.sh:291-301`
- Problema: `process_single_issue` crea `directive/{id}`, luego llama `run_ci_check_and_fix` con `ORCH_BRANCH_STRATEGY="pr"`. Dentro de esa función, se crea un branch diferente: `session/{slug}/s1`. El branch `directive/{id}` queda abandonado con los commits. El PR se crea en la rama equivocada.
- Riesgo: Los cambios implementados nunca llegan al PR. El branch directive/{id} existe sin PR asociado.
- Solución: Usar `ORCH_BRANCH_STRATEGY="direct"` para que Claude pushee al branch actual (directive/{id}). El PR se crea por separado con `create_draft_pr`.

### [ALTO] `grep -oP` no es portable — falla en macOS
- Dónde: `lib/issues-fetch.sh:79`, `lib/issues-runner.sh:147`
- Problema: `-P` (Perl regex) no está disponible en el grep BSD de macOS. `_parse_board_comment` nunca extrae `directive_id` ni `bu_id` en macOS. `_PR_NUMBER` queda vacío.
- Riesgo: En macOS (entorno de desarrollo común), el modo issues procesa issues sin directive_id → todos se ignoran.
- Solución: Reemplazar con `grep -o ... | sed` o `sed -n`.

### [ALTO] `base64 -d` (Linux) vs `base64 -D` (macOS) — portabilidad
- Dónde: `lib/issues-fetch.sh:208`, `lib/issues-runner.sh:267-268`
- Problema: macOS usa `-D` (mayúscula) para decode. Con `-d` y 2>/dev/null, silenciosamente retorna vacío → el body de todos los issues se vacía.
- Riesgo: Issues procesados con instrucciones/requisitos vacíos en macOS.
- Solución: Usar helper `_b64decode()` con fallback `-D`.

### [ALTO] Repo puede quedar en estado sucio tras fallo de issue
- Dónde: `lib/issues-runner.sh:304-314` (después de CI fail), `lib/issues-runner.sh:33-42` (`ensure_repo_cloned`)
- Problema: Si un issue falla (CI, implementación, etc.), el repo local queda en el branch `directive/{id}` con potenciales cambios sin commitear. La siguiente llamada a `ensure_repo_cloned` para el mismo repo intentará hacer `git pull` en un branch dirtied → falla o aplica cambios incorrectos.
- Riesgo: Errores en cascada entre issues del mismo repo en una misma corrida.
- Solución: En `ensure_repo_cloned`, hacer `git checkout main && git reset --hard origin/main` antes del pull. En `handle_issue_failure`, resetear el repo al estado limpio.

### [MEDIO] ~~`process_single_issue` tiene 129 líneas~~ — ✅ RESUELTO
- Dónde: `lib/issues-runner.sh:202-344`
- Problema: La función hace 12 cosas distintas: parse, clone, branch, decode, prompt, implement, CI, PR, stats, state, comment, board. Difícil de testear y debuggear.
- Solución: Extraer sub-funciones. Mínimo: `_prepare_issue_workspace()` y `_finalize_issue_success()`.

### [MEDIO] ~~Variables globales `_REPO_LOCAL_PATH`, `_PR_URL`, `_PR_NUMBER` sin namespacing~~ — ✅ RESUELTO
- Dónde: `lib/issues-runner.sh:22, 103-104`
- Problema: Si el loop de issues en `run_issues_mode` se paralelizara con `&`, estas variables se pisarían entre procesos. Además, si `create_draft_pr` falla en un issue y tiene el `_PR_URL` de un issue anterior, el estado incorrecto se registra.
- Solución: Usar `local` variables o verificar que se limpien explícitamente antes de cada call.

### [MEDIO] ~~JSON payload del Board API con escaping incompleto~~ — ✅ RESUELTO
- Dónde: `lib/issues-board-api.sh:94`
- Problema: `notes_escaped` solo escapa comillas y newlines. Si `result_json` contiene comillas sin escapar (ej. ramas con caracteres raros), el JSON del PATCH puede ser inválido. Board API recibiría un request malformado.
- Solución: Validar que `result_json` sea JSON válido antes de insertar, o construirlo siempre con los builders del mismo archivo.

### [MEDIO] ~~Fallo silencioso en state files JSON corrompidos~~ — ✅ RESUELTO
- Dónde: `lib/issues-queue.sh:63-67` (`is_issue_already_processed`)
- Problema: Si el state file está corrupto/incompleto, el grep retorna vacío, la condición `[ "$status" = "completed" ]` es false, y el issue se reprocesa. No hay log de advertencia.
- Solución: Agregar `ui_warn` si el state file existe pero el status no se pudo parsear.

### [BAJO] ~~`_parse_section` en awk usa `$heading` sin escapar metacaracteres regex~~ — ✅ RESUELTO
- Dónde: `lib/issues-fetch.sh:102`
- Problema: Si el heading contiene `(`, `)`, `.`, `*`, etc., el patrón awk falla o matchea incorrectamente. "Requisitos de implementación" no tiene este problema, pero futuros headings podrían tenerlo.
- Solución: Escapar `$heading` con `gsub` en awk o usar `index()` en lugar de regex.

---

## Lo que está bien
- Diseño modular: 5 archivos con responsabilidad única bien definida
- Todos los archivos pasan `bash -n` (syntax check)
- Fallbacks defensivos: `|| true`, `2>/dev/null` en la mayoría de operaciones externas
- Persistencia de estado en JSON por issue: facilita debugging y re-runs
- `update_directive_status` es graceful si el Board no está disponible
- `build_issues_queue` respeta `ORCH_ISSUES_MAX_PER_RUN` para control de costos
- Reutilización correcta de `run_claude()` del runner existente

## Recomendaciones generales
- Agregar un modo `--dry-run` que fetchee y muestre la cola sin procesar issues
- Considerar retry por issue individual (actualmente un fallo de CI marca el issue como failed sin reintentar)
- Documentar el formato `.q-orchestrator.sh` de cada BU en el README del orchestrator
