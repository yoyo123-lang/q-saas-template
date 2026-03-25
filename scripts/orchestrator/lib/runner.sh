#!/usr/bin/env bash
# ── Claude CLI runner for q-orchestrator ──
# All settings come from lib/config.sh (ORCH_* variables)

# ── Build claude command with common flags ──
_build_claude_cmd() {
  local prompt="$1"
  local model="$2"
  local max_turns="$3"

  local cmd=(claude -p "$prompt" --model "$model" --max-turns "$max_turns")

  # Permission skipping (for CI/trusted environments)
  if [ "$ORCH_SKIP_PERMISSIONS" = "true" ]; then
    cmd+=(--dangerously-skip-permissions)
  fi

  # Extra flags
  if [ -n "$ORCH_CLAUDE_EXTRA_FLAGS" ]; then
    # Split extra flags by spaces (respecting quotes would need eval, keep simple)
    read -ra extra <<< "$ORCH_CLAUDE_EXTRA_FLAGS"
    cmd+=("${extra[@]}")
  fi

  echo "${cmd[@]}"
}

# ── Run claude in prompt mode ──
# Returns: exit code of claude process
run_claude() {
  local project_path="$1"
  local prompt="$2"
  local model="${3:-$ORCH_MODEL}"
  local max_turns="${4:-$ORCH_MAX_TURNS_IMPLEMENT}"
  local log_file="${5:-}"

  local cmd
  cmd=$(_build_claude_cmd "$prompt" "$model" "$max_turns")

  local exit_code=0
  if [ -n "$log_file" ] && [ "$ORCH_SAVE_LOGS" = "true" ]; then
    mkdir -p "$(dirname "$log_file")"
    (cd "$project_path" && eval "$cmd" 2>&1 | tee "$log_file") || exit_code=$?
  else
    (cd "$project_path" && eval "$cmd" 2>&1) || exit_code=$?
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

  local attempt=0

  while [ $attempt -lt "$ORCH_CI_MAX_RETRIES" ]; do
    attempt=$((attempt + 1))

    echo ""
    echo -e "  ${BOLD}▸ CI Check (intento ${attempt}/${ORCH_CI_MAX_RETRIES})${RESET}"

    # Run build + lint + test locally first
    save_state "$slug" "$session_num" "ci-check-${attempt}" "running"

    local ci_prompt="Corré build, lint y tests del proyecto localmente. Reportá si pasan o fallan. NO pushees todavía."
    local ci_exit=0
    run_claude "$project_path" "$ci_prompt" "$model" "$ORCH_MAX_TURNS_BUILD" \
      "${log_dir}/${timestamp}-s${session_num}-ci-check-${attempt}.log" || ci_exit=$?

    # Check if it looks like it passed (heuristic: exit code 0)
    if [ $ci_exit -eq 0 ]; then
      telemetry_ci_attempt "$attempt" "$ORCH_CI_MAX_RETRIES" "pass"
      # Try push
      echo -e "  ${BOLD}▸ Push${RESET}"
      local push_prompt="Build, lint y tests pasaron. Commiteá los cambios pendientes (si los hay) y pusheá a origin."
      local push_exit=0

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

      ui_ok "Build + push completado"
      return 0
    fi

    # CI failed — try to fix
    telemetry_ci_attempt "$attempt" "$ORCH_CI_MAX_RETRIES" "fail"

    if [ $attempt -lt "$ORCH_CI_MAX_RETRIES" ]; then
      echo -e "  ${YELLOW}▸ CI falló — reparando (intento ${attempt}/${ORCH_CI_MAX_RETRIES})${RESET}"
      save_state "$slug" "$session_num" "ci-fix-${attempt}" "running"
      telemetry_ci_attempt "$attempt" "$ORCH_CI_MAX_RETRIES" "fix_attempted"

      local fix_prompt="Build, lint o tests fallaron. Leé los errores del último intento, corregí los problemas, y commiteá las correcciones. NO pushees."
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

  local session_file=""
  if [ -n "$sessions_dir" ]; then
    session_file=$(printf "${sessions_dir}/session-%02d.md" "$session_num")
  fi

  telemetry_step_start "implement" "$ORCH_MAX_TURNS_IMPLEMENT"
  local step_exit=0
  if [ -n "$session_file" ] && [ -f "$session_file" ]; then
    run_claude_file "$project_path" "$session_file" "$model" "$ORCH_MAX_TURNS_IMPLEMENT" \
      "${log_dir}/${timestamp}-s${session_num}-implement.log" || step_exit=$?
  else
    local prompt="Leé ROADMAP.md y ejecutá la Sesión ${session_num}: ${session_name}. Seguí el proceso de /project:cambio-grande. TDD obligatorio. Un commit por tarea atómica."
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
      local prompt="Revisá el código que acabás de escribir aplicando los roles de docs/roles/ (si existen). Code review obligatorio. Devolvé hallazgos por severidad."
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

  # ── Step: Fix findings ──
  if [ "$ORCH_SKIP_FIX" != "true" ]; then
    current_step=$((current_step + 1))
    echo -e "  ${BOLD}▸ Paso ${current_step}/${total_steps}: Corrección de hallazgos${RESET}"
    save_state "$slug" "$session_num" "fix" "running"
    telemetry_step_start "fix" "$ORCH_MAX_TURNS_SUPPORT"

    step_exit=0
    if [ -n "$prompts_dir" ] && [ -f "${prompts_dir}/fix-findings.md" ]; then
      run_claude_file "$project_path" "${prompts_dir}/fix-findings.md" "$model" "$ORCH_MAX_TURNS_SUPPORT" \
        "${log_dir}/${timestamp}-s${session_num}-fix.log" || step_exit=$?
    else
      local prompt="Leé los informes de revisión en docs/reviews/ (si existen) y corregí todos los hallazgos CRÍTICOS y ALTOS. Commiteá cada corrección."
      run_claude "$project_path" "$prompt" "$model" "$ORCH_MAX_TURNS_SUPPORT" \
        "${log_dir}/${timestamp}-s${session_num}-fix.log" || step_exit=$?
    fi

    if [ $step_exit -ne 0 ]; then
      telemetry_step_end "fix" "$step_exit" "failed"
      _handle_step_fail "corrección de hallazgos" || {
        save_state "$slug" "$session_num" "fix" "failed"
        telemetry_end_run "failed"
        return 1
      }
    else
      telemetry_step_end "fix" "0" "success"
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
      local prompt="Documentá lo que se hizo en esta sesión. Actualizá SESSION_LOG.md, ARCHITECTURE.md si aplica, y ROADMAP.md marcando la sesión ${session_num} como completada."
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

  if run_ci_check_and_fix "$project_path" "$model" "$slug" "$log_dir" "$timestamp" "$session_num"; then
    telemetry_step_end "build_push" "0" "success"
    save_state "$slug" "$session_num" "completed" "completed"
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
