#!/usr/bin/env bash
# ── Claude CLI runner for q-orchestrator ──
# All settings come from lib/config.sh (ORCH_* variables)

# ── Stream filter script path ──
_STREAM_FILTER="${BASH_SOURCE[0]%/*}/stream-filter.js"

# ── Build claude command array in caller's scope ──
# Sets: _CLAUDE_CMD array (must be declared by caller or used after call)
_build_claude_cmd() {
  local prompt="$1"
  local model="$2"
  local max_turns="$3"

  _CLAUDE_CMD=(claude -p "$prompt" --model "$model" --max-turns "$max_turns")

  # Permission skipping — required for unattended execution
  if [ "$ORCH_SKIP_PERMISSIONS" = "true" ]; then
    _CLAUDE_CMD+=(--dangerously-skip-permissions)
  fi

  # Verbose + stream-json for real-time progress
  if [ "$ORCH_VERBOSE" = "true" ]; then
    _CLAUDE_CMD+=(--verbose --output-format stream-json)
  fi

  # Extra flags
  if [ -n "$ORCH_CLAUDE_EXTRA_FLAGS" ]; then
    read -ra extra <<< "$ORCH_CLAUDE_EXTRA_FLAGS"
    _CLAUDE_CMD+=("${extra[@]}")
  fi
}

# ── Run claude in prompt mode ──
# Returns: exit code of claude process
run_claude() {
  local project_path="$1"
  local prompt="$2"
  local model="${3:-$ORCH_MODEL}"
  local max_turns="${4:-$ORCH_MAX_TURNS_IMPLEMENT}"
  local log_file="${5:-}"

  _build_claude_cmd "$prompt" "$model" "$max_turns"

  local exit_code=0
  local filter_args=()
  if [ -n "$log_file" ] && [ "$ORCH_SAVE_LOGS" = "true" ]; then
    mkdir -p "$(dirname "$log_file")"
    filter_args=(--log "$log_file")
  fi

  if [ "$ORCH_VERBOSE" = "true" ] && [ -f "$_STREAM_FILTER" ] && command -v node &>/dev/null; then
    # Stream JSON through filter for real-time readable output
    (cd "$project_path" && "${_CLAUDE_CMD[@]}" 2>&1 | node "$_STREAM_FILTER" "${filter_args[@]}") || exit_code=$?
  elif [ -n "$log_file" ] && [ "$ORCH_SAVE_LOGS" = "true" ]; then
    (cd "$project_path" && "${_CLAUDE_CMD[@]}" 2>&1 | tee "$log_file") || exit_code=$?
  else
    (cd "$project_path" && "${_CLAUDE_CMD[@]}" 2>&1) || exit_code=$?
  fi

  return $exit_code
}

# ── Run claude with a prompt file ──
run_claude_file() {
  local project_path="$1"
  local prompt_file="$2"
  local model="${3:-$ORCH_MODEL}"
  local max_turns="${4:-$ORCH_MAX_TURNS_IMPLEMENT}"
  local log_file="${5:-}"

  if [ ! -f "$prompt_file" ]; then
    ui_error "Prompt file not found: $prompt_file"
    return 1
  fi

  local prompt
  prompt=$(cat "$prompt_file")
  run_claude "$project_path" "$prompt" "$model" "$max_turns" "$log_file"
}

# ── Handle step failure ──
# Returns: 0 = continue, 1 = abort
_handle_step_fail() {
  local step_name="$1"

  case "$ORCH_ON_STEP_FAIL" in
    skip)
      ui_warn "Paso '${step_name}' falló — saltando (configurado: skip)"
      return 0
      ;;
    abort)
      ui_error "Paso '${step_name}' falló — abortando sesión (configurado: abort)"
      return 1
      ;;
    ask|*)
      ui_warn "Paso '${step_name}' falló."
      if ui_confirm "¿Continuar con el siguiente paso?"; then
        return 0
      else
        return 1
      fi
      ;;
  esac
}

# ── CI check with retry loop ──
# Returns: 0 = CI passed, 1 = CI failed after all retries
run_ci_check_and_fix() {
  local project_path="$1"
  local model="$2"
  local slug="$3"
  local log_dir="$4"
  local timestamp="$5"
  local session_num="$6"
  local _current_session_name="${7:-Sesión ${session_num}}"

  local attempt=0

  while [ $attempt -lt "$ORCH_CI_MAX_RETRIES" ]; do
    attempt=$((attempt + 1))

    echo ""
    echo -e "  ${BOLD}▸ CI Check (intento ${attempt}/${ORCH_CI_MAX_RETRIES})${RESET}"

    # Run build + lint + test locally first
    save_state "$slug" "$session_num" "ci-check-${attempt}" "running"

    local ci_prompt="Modo batch — no pidas confirmación. Corré build, lint y tests del proyecto localmente. Reportá si pasan o fallan. NO pushees todavía."
    local ci_exit=0
    run_claude "$project_path" "$ci_prompt" "$model" "$ORCH_MAX_TURNS_BUILD" \
      "${log_dir}/${timestamp}-s${session_num}-ci-check-${attempt}.log" || ci_exit=$?

    # Check if it looks like it passed (heuristic: exit code 0)
    if [ $ci_exit -eq 0 ]; then
      telemetry_ci_attempt "$attempt" "$ORCH_CI_MAX_RETRIES" "pass"

      # Determine push strategy
      local push_prompt=""
      if [ "$ORCH_BRANCH_STRATEGY" = "pr" ]; then
        local branch_name="session/${slug}/s${session_num}"
        echo -e "  ${BOLD}▸ Push (branch + PR)${RESET}"
        push_prompt="Build, lint y tests pasaron. Hacé lo siguiente en orden:
1. Commiteá todos los cambios pendientes (si los hay)
2. Creá y switcheá al branch '${branch_name}' (si no existe)
3. Pusheá a origin con: git push -u origin ${branch_name}
4. Creá un Pull Request con gh pr create --base main --head ${branch_name} --title 'S${session_num}: ${_current_session_name}' --body 'Sesión ${session_num} del roadmap - ${_current_session_name}'
Si el branch ya existe, usá el existente. Si gh CLI no está disponible, solo pusheá."
      elif [ "$ORCH_BRANCH_STRATEGY" = "roadmap-branch" ]; then
        local branch_name="roadmap/${slug}"
        echo -e "  ${BOLD}▸ Push (roadmap branch)${RESET}"
        push_prompt="Build, lint y tests pasaron. Hacé lo siguiente en orden:
1. Commiteá todos los cambios pendientes (si los hay)
2. Si no estás en el branch '${branch_name}', switcheá a él (crealo si no existe con: git checkout -b ${branch_name})
3. Pusheá a origin con: git push -u origin ${branch_name}
NO crees Pull Request — se crea al final del roadmap completo."
      else
        echo -e "  ${BOLD}▸ Push${RESET}"
        push_prompt="Build, lint y tests pasaron. Commiteá los cambios pendientes (si los hay) y pusheá a origin."
      fi

      # Push with retries for network failures
      local push_attempt=0
      while [ $push_attempt -lt "$ORCH_PUSH_RETRIES" ]; do
        push_attempt=$((push_attempt + 1))
        run_claude "$project_path" "$push_prompt" "$model" "$ORCH_MAX_TURNS_BUILD" \
          "${log_dir}/${timestamp}-s${session_num}-push-${push_attempt}.log" && break

        if [ $push_attempt -lt "$ORCH_PUSH_RETRIES" ]; then
          local wait_time=$(( ORCH_PUSH_BACKOFF_BASE ** push_attempt ))
          ui_warn "Push falló — reintentando en ${wait_time}s..."
          sleep "$wait_time"
        fi
      done

      # Post-push: handle branch switching
      if [ "$ORCH_BRANCH_STRATEGY" = "pr" ]; then
        (cd "$project_path" && git checkout main 2>/dev/null || git checkout master 2>/dev/null) || true
        ui_ok "PR creado en branch session/${slug}/s${session_num}"
      elif [ "$ORCH_BRANCH_STRATEGY" = "roadmap-branch" ]; then
        # Stay on roadmap branch — next session continues here
        ui_ok "Push a roadmap/${slug} completado (S${session_num})"
      else
        ui_ok "Build + push completado"
      fi
      return 0
    fi

    # CI failed — try to fix
    telemetry_ci_attempt "$attempt" "$ORCH_CI_MAX_RETRIES" "fail"

    if [ $attempt -lt "$ORCH_CI_MAX_RETRIES" ]; then
      echo -e "  ${YELLOW}▸ CI falló — reparando (intento ${attempt}/${ORCH_CI_MAX_RETRIES})${RESET}"
      save_state "$slug" "$session_num" "ci-fix-${attempt}" "running"
      telemetry_ci_attempt "$attempt" "$ORCH_CI_MAX_RETRIES" "fix_attempted"

      local fix_prompt="Modo batch — no pidas confirmación. Build, lint o tests fallaron. Leé los errores del último intento, corregí los problemas, y commiteá las correcciones. NO pushees."
      run_claude "$project_path" "$fix_prompt" "$model" "$ORCH_MAX_TURNS_CI_FIX" \
        "${log_dir}/${timestamp}-s${session_num}-ci-fix-${attempt}.log" || true
    fi
  done

  # Exhausted all retries
  echo ""
  ui_error "CI falló después de ${ORCH_CI_MAX_RETRIES} intentos."

  case "$ORCH_ON_CI_EXHAUST" in
    skip)
      ui_warn "Continuando a la siguiente sesión (configurado: skip)"
      return 0
      ;;
    abort)
      ui_error "Abortando (configurado: abort)"
      return 1
      ;;
    ask|*)
      if ui_confirm "¿Continuar a la siguiente sesión?"; then
        return 0
      else
        return 1
      fi
      ;;
  esac
}

# ══════════════════════════════════════════════════════════════
# SESSION EXECUTION
# ══════════════════════════════════════════════════════════════

run_session_cambio_grande() {
  local project_path="$1"
  local session_num="$2"
  local session_name="$3"
  local model="${4:-$ORCH_MODEL}"
  local slug="$5"

  local log_dir="${ORCH_LOG_DIR:-${CONFIG_DIR}/logs/${slug}}"
  mkdir -p "$log_dir"
  local timestamp
  timestamp=$(date +"%Y%m%d-%H%M%S")

  # Count active steps for progress display
  local total_steps=2  # implement + build are always on
  [ "$ORCH_SKIP_ROLES" != "true" ] && total_steps=$((total_steps + 1))
  [ "$ORCH_SKIP_FIX" != "true" ] && total_steps=$((total_steps + 1))
  [ "$ORCH_SKIP_DOCS" != "true" ] && total_steps=$((total_steps + 1))
  local current_step=0

  ui_info "Sesión ${session_num}: ${session_name}"
  ui_info "Modelo: ${model} | Pasos: ${total_steps} | CI retries: ${ORCH_CI_MAX_RETRIES}"
  echo ""

  # ── Telemetry: start run ──
  telemetry_start_run "$slug" "$session_num" "$model"

  local sessions_dir
  sessions_dir=$(find_session_prompts_dir "$project_path")
  local prompts_dir
  prompts_dir=$(find_support_prompts_dir "$project_path")

  # ── Step: Implement ──
  current_step=$((current_step + 1))
  echo -e "  ${BOLD}▸ Paso ${current_step}/${total_steps}: Implementación${RESET}"
  save_state "$slug" "$session_num" "implement" "running"

  # Find session prompt file (try multiple naming conventions)
  local session_file=""
  if [ -n "$sessions_dir" ]; then
    local candidates=(
      "$(printf "${sessions_dir}/sesion-%02d.md" "$session_num")"
      "$(printf "${sessions_dir}/session-%02d.md" "$session_num")"
      "${sessions_dir}/sesion-${session_num}.md"
      "${sessions_dir}/session-${session_num}.md"
    )
    for candidate in "${candidates[@]}"; do
      if [ -f "$candidate" ]; then
        session_file="$candidate"
        break
      fi
    done
  fi

  telemetry_step_start "implement" "$ORCH_MAX_TURNS_IMPLEMENT"
  local step_exit=0
  if [ -n "$session_file" ]; then
    echo -e "    ${DIM:-}(usando plan: ${session_file##*/})${RESET:-}"
    # Prepend batch-mode instructions to the session file content
    local session_content
    session_content=$(cat "$session_file")
    local prompt="Estás corriendo en modo batch desatendido. NO pidas confirmación, NO esperes aprobación. Ejecutá directamente.

Leé ROADMAP.md para contexto general, y luego seguí este plan detallado para la Sesión ${session_num}:

---
${session_content}
---

Reglas:
- Implementá directamente, commit por tarea atómica
- TDD obligatorio para lógica de negocio
- NO te detengas a preguntar o pedir aprobación
- Si encontrás ambiguedad, elegí la opción más simple y documentá la decisión en un comentario"
    run_claude "$project_path" "$prompt" "$model" "$ORCH_MAX_TURNS_IMPLEMENT" \
      "${log_dir}/${timestamp}-s${session_num}-implement.log" || step_exit=$?
  else
    local prompt="Estás corriendo en modo batch desatendido. NO pidas confirmación, NO esperes aprobación, NO crees planes sin implementar. Ejecutá directamente.

Leé ROADMAP.md, buscá la Sesión ${session_num}: ${session_name}, y ejecutá TODA la implementación descrita ahí.

Reglas:
- Implementá directamente, commit por tarea atómica
- NO crees ni modifiques IMPLEMENTATION_PLAN.md — el plan ya está en ROADMAP.md
- El ROADMAP.md tiene las etapas detalladas de cada sesión, seguí esas etapas
- TDD obligatorio para lógica de negocio
- NO te detengas a preguntar o pedir aprobación — tomá las decisiones técnicas razonables y seguí
- Si encontrás ambiguedad, elegí la opción más simple y documentá la decisión en un comentario"
    run_claude "$project_path" "$prompt" "$model" "$ORCH_MAX_TURNS_IMPLEMENT" \
      "${log_dir}/${timestamp}-s${session_num}-implement.log" || step_exit=$?
  fi

  if [ $step_exit -ne 0 ]; then
    telemetry_step_end "implement" "$step_exit" "failed"
    _handle_step_fail "implementación" || {
      save_state "$slug" "$session_num" "implement" "failed"
      telemetry_end_run "failed"
      return 1
    }
  else
    telemetry_step_end "implement" "0" "success"
  fi

  # ── Step: Role review ──
  if [ "$ORCH_SKIP_ROLES" != "true" ]; then
    current_step=$((current_step + 1))
    echo -e "  ${BOLD}▸ Paso ${current_step}/${total_steps}: Revisión por roles${RESET}"
    save_state "$slug" "$session_num" "roles" "running"
    telemetry_step_start "roles" "$ORCH_MAX_TURNS_SUPPORT"

    step_exit=0
    if [ -n "$prompts_dir" ] && [ -f "${prompts_dir}/apply-roles.md" ]; then
      run_claude_file "$project_path" "${prompts_dir}/apply-roles.md" "$model" "$ORCH_MAX_TURNS_SUPPORT" \
        "${log_dir}/${timestamp}-s${session_num}-roles.log" || step_exit=$?
    else
      local prompt="Modo batch — no pidas confirmación. Revisá los cambios de la Sesión ${session_num} (mirá git log --oneline -20 para identificar los commits recientes). Aplicá los roles de docs/roles/ (si existen). Generá un informe en docs/reviews/ con hallazgos clasificados por severidad: CRÍTICO, ALTO, MEDIO, BAJO. Devolvé un resumen con conteo por severidad."
      run_claude "$project_path" "$prompt" "$model" "$ORCH_MAX_TURNS_SUPPORT" \
        "${log_dir}/${timestamp}-s${session_num}-roles.log" || step_exit=$?
    fi

    if [ $step_exit -ne 0 ]; then
      telemetry_step_end "roles" "$step_exit" "failed"
      _handle_step_fail "revisión por roles" || {
        save_state "$slug" "$session_num" "roles" "failed"
        telemetry_end_run "failed"
        return 1
      }
    else
      telemetry_step_end "roles" "0" "success"
    fi
  fi

  # ── Step: Fix findings (escalated by severity) ──
  if [ "$ORCH_SKIP_FIX" != "true" ]; then
    current_step=$((current_step + 1))
    echo -e "  ${BOLD}▸ Paso ${current_step}/${total_steps}: Corrección de hallazgos${RESET}"
    save_state "$slug" "$session_num" "fix" "running"
    telemetry_step_start "fix" "$ORCH_MAX_TURNS_FIX_PASS"

    local fix_turns="${ORCH_MAX_TURNS_FIX_PASS}"
    local severity_levels=("CRÍTICOS" "ALTOS" "MEDIOS")
    local severity_all_ok=true

    if [ -n "$prompts_dir" ] && [ -f "${prompts_dir}/fix-findings.md" ]; then
      # Custom prompt file — run as single pass
      step_exit=0
      run_claude_file "$project_path" "${prompts_dir}/fix-findings.md" "$model" "$fix_turns" \
        "${log_dir}/${timestamp}-s${session_num}-fix.log" || step_exit=$?
      [ $step_exit -ne 0 ] && severity_all_ok=false
    else
      # Escalated fix: one pass per severity level
      for sev in "${severity_levels[@]}"; do
        echo -e "    ${CYAN}↳ Corrigiendo hallazgos ${sev}${RESET}"
        save_state "$slug" "$session_num" "fix-${sev,,}" "running"

        local sev_lower="${sev,,}"
        local fix_prompt="Leé los informes de revisión en docs/reviews/ (si existen). Corregí SOLO los hallazgos ${sev} que aún no estén resueltos. Commiteá cada corrección. Si no quedan hallazgos ${sev} pendientes, respondé 'No hay hallazgos ${sev} pendientes' y terminá."
        step_exit=0
        run_claude "$project_path" "$fix_prompt" "$model" "$fix_turns" \
          "${log_dir}/${timestamp}-s${session_num}-fix-${sev_lower}.log" || step_exit=$?

        if [ $step_exit -ne 0 ]; then
          echo -e "    ${YELLOW}⚠ Fix de ${sev} no completó (max turns o error)${RESET}"
          severity_all_ok=false
          # Don't abort — continue with next severity and log debt
        fi
      done
    fi

    # Log unresolved findings as technical debt
    echo -e "    ${CYAN}↳ Registrando deuda técnica (hallazgos pendientes)${RESET}"
    local debt_prompt="Leé los informes de revisión en docs/reviews/. Compará con los cambios realizados (git log --oneline -20). Identificá hallazgos que NO fueron resueltos. Escribí un archivo docs/TECH_DEBT.md (o actualizalo si existe) con una sección para la Sesión ${session_num} listando los hallazgos pendientes por severidad. Si todos fueron resueltos, escribí 'Sin deuda técnica pendiente'. Incluí hallazgos BAJOS sin resolver también."
    run_claude "$project_path" "$debt_prompt" "$model" 20 \
      "${log_dir}/${timestamp}-s${session_num}-fix-debt.log" || true

    if [ "$severity_all_ok" = true ]; then
      telemetry_step_end "fix" "0" "success"
    else
      telemetry_step_end "fix" "1" "partial"
      # Don't fail the session — debt was logged
      ui_warn "Algunos hallazgos no se corrigieron — registrados en docs/TECH_DEBT.md"
    fi
  fi

  # ── Step: Document ──
  if [ "$ORCH_SKIP_DOCS" != "true" ]; then
    current_step=$((current_step + 1))
    echo -e "  ${BOLD}▸ Paso ${current_step}/${total_steps}: Documentación${RESET}"
    save_state "$slug" "$session_num" "document" "running"
    telemetry_step_start "document" "$ORCH_MAX_TURNS_SUPPORT"

    step_exit=0
    if [ -n "$prompts_dir" ] && [ -f "${prompts_dir}/document.md" ]; then
      run_claude_file "$project_path" "${prompts_dir}/document.md" "$model" "$ORCH_MAX_TURNS_SUPPORT" \
        "${log_dir}/${timestamp}-s${session_num}-document.log" || step_exit=$?
    else
      local prompt="Documentá lo que se hizo en esta sesión. Actualizá SESSION_LOG.md y ARCHITECTURE.md si aplica. NO modifiques ROADMAP.md (el progreso se trackea automáticamente)."
      run_claude "$project_path" "$prompt" "$model" "$ORCH_MAX_TURNS_SUPPORT" \
        "${log_dir}/${timestamp}-s${session_num}-document.log" || step_exit=$?
    fi

    if [ $step_exit -ne 0 ]; then
      telemetry_step_end "document" "$step_exit" "failed"
      _handle_step_fail "documentación" || {
        save_state "$slug" "$session_num" "document" "failed"
        telemetry_end_run "failed"
        return 1
      }
    else
      telemetry_step_end "document" "0" "success"
    fi
  fi

  # ── Step: Build + Push (with CI retry loop) ──
  current_step=$((current_step + 1))
  echo -e "  ${BOLD}▸ Paso ${current_step}/${total_steps}: Build + Push${RESET}"
  save_state "$slug" "$session_num" "build-push" "running"
  telemetry_step_start "build_push" "$ORCH_MAX_TURNS_BUILD"

  if run_ci_check_and_fix "$project_path" "$model" "$slug" "$log_dir" "$timestamp" "$session_num" "$session_name"; then
    telemetry_step_end "build_push" "0" "success"
    save_state "$slug" "$session_num" "completed" "completed"
    mark_session_completed "$slug" "$session_num"
    telemetry_end_run "completed"
    echo ""
    echo -e "  ${GREEN}✓ Sesión ${session_num} completada${RESET}"
  else
    telemetry_step_end "build_push" "1" "failed"
    save_state "$slug" "$session_num" "build-push" "failed"
    telemetry_end_run "failed"
    echo ""
    echo -e "  ${RED}✗ Sesión ${session_num} falló en build/push${RESET}"
    return 1
  fi
}

# ══════════════════════════════════════════════════════════════
# SIMPLE MODES
# ══════════════════════════════════════════════════════════════

run_cambio() {
  local project_path="$1"
  local description="$2"
  local model="${3:-$ORCH_MODEL}"

  local prompt="Ejecutá /project:cambio para este cambio: ${description}"
  run_claude "$project_path" "$prompt" "$model" "$ORCH_MAX_TURNS_IMPLEMENT"
}

run_roadmap() {
  local project_path="$1"
  local description="$2"
  local model="${3:-$ORCH_MODEL}"

  local prompt="Ejecutá /project:roadmap para este proyecto: ${description}"
  run_claude "$project_path" "$prompt" "$model" "$ORCH_MAX_TURNS_IMPLEMENT"
}

run_sesion() {
  local project_path="$1"
  local model="${2:-$ORCH_MODEL}"

  echo -e "  ${CYAN}Abriendo sesión interactiva de Claude...${RESET}"
  (cd "$project_path" && claude --model "$model")
}
