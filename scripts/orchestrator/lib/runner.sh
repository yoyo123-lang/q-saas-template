#!/usr/bin/env bash
# ── Claude CLI runner for q-orchestrator ──

# ── Default settings ──
DEFAULT_MODEL="claude-sonnet-4-6"
DEFAULT_MAX_TURNS=50
DEFAULT_MAX_TURNS_FIX=30

# ── Run claude in prompt mode ──
run_claude() {
  local project_path="$1"
  local prompt="$2"
  local model="${3:-$DEFAULT_MODEL}"
  local max_turns="${4:-$DEFAULT_MAX_TURNS}"
  local log_file="${5:-}"

  local cmd=(claude -p "$prompt" --model "$model" --max-turns "$max_turns")

  if [ -n "$log_file" ]; then
    mkdir -p "$(dirname "$log_file")"
    (cd "$project_path" && "${cmd[@]}" 2>&1 | tee "$log_file")
  else
    (cd "$project_path" && "${cmd[@]}" 2>&1)
  fi
}

# ── Run claude with a prompt file ──
run_claude_file() {
  local project_path="$1"
  local prompt_file="$2"
  local model="${3:-$DEFAULT_MODEL}"
  local max_turns="${4:-$DEFAULT_MAX_TURNS}"
  local log_file="${5:-}"

  if [ ! -f "$prompt_file" ]; then
    ui_error "Prompt file not found: $prompt_file"
    return 1
  fi

  local prompt
  prompt=$(cat "$prompt_file")
  run_claude "$project_path" "$prompt" "$model" "$max_turns" "$log_file"
}

# ── Execute a session from ROADMAP (cambio-grande mode) ──
run_session_cambio_grande() {
  local project_path="$1"
  local session_num="$2"
  local session_name="$3"
  local model="$4"
  local slug="$5"
  local log_dir="${CONFIG_DIR}/logs/${slug}"

  mkdir -p "$log_dir"
  local timestamp
  timestamp=$(date +"%Y%m%d-%H%M%S")

  ui_info "Sesión ${session_num}: ${session_name}"
  ui_info "Modelo: ${model}"
  echo ""

  local sessions_dir
  sessions_dir=$(find_session_prompts_dir "$project_path")
  local prompts_dir
  prompts_dir=$(find_support_prompts_dir "$project_path")

  # ── Step 1: Implement ──
  echo -e "  ${BOLD}▸ Paso 1/5: Implementación${RESET}"
  save_state "$slug" "$session_num" "implement" "running"

  local session_file
  if [ -n "$sessions_dir" ]; then
    session_file=$(printf "${sessions_dir}/session-%02d.md" "$session_num")
  fi

  if [ -n "$session_file" ] && [ -f "$session_file" ]; then
    run_claude_file "$project_path" "$session_file" "$model" "$DEFAULT_MAX_TURNS" \
      "${log_dir}/${timestamp}-s${session_num}-implement.log"
  else
    # No session file — use inline prompt referencing ROADMAP
    local prompt="Leé ROADMAP.md y ejecutá la Sesión ${session_num}: ${session_name}. Seguí el proceso de /project:cambio-grande. TDD obligatorio. Un commit por tarea atómica."
    run_claude "$project_path" "$prompt" "$model" "$DEFAULT_MAX_TURNS" \
      "${log_dir}/${timestamp}-s${session_num}-implement.log"
  fi

  # ── Step 2: Role review ──
  echo -e "  ${BOLD}▸ Paso 2/5: Revisión por roles${RESET}"
  save_state "$slug" "$session_num" "roles" "running"

  if [ -n "$prompts_dir" ] && [ -f "${prompts_dir}/apply-roles.md" ]; then
    run_claude_file "$project_path" "${prompts_dir}/apply-roles.md" "$model" "$DEFAULT_MAX_TURNS_FIX" \
      "${log_dir}/${timestamp}-s${session_num}-roles.log"
  else
    local prompt="Revisá el código que acabás de escribir aplicando los roles de docs/roles/ (si existen). Code review obligatorio. Devolvé hallazgos por severidad."
    run_claude "$project_path" "$prompt" "$model" "$DEFAULT_MAX_TURNS_FIX" \
      "${log_dir}/${timestamp}-s${session_num}-roles.log"
  fi

  # ── Step 3: Fix findings ──
  echo -e "  ${BOLD}▸ Paso 3/5: Corrección de hallazgos${RESET}"
  save_state "$slug" "$session_num" "fix" "running"

  if [ -n "$prompts_dir" ] && [ -f "${prompts_dir}/fix-findings.md" ]; then
    run_claude_file "$project_path" "${prompts_dir}/fix-findings.md" "$model" "$DEFAULT_MAX_TURNS_FIX" \
      "${log_dir}/${timestamp}-s${session_num}-fix.log"
  else
    local prompt="Leé los informes de revisión en docs/reviews/ (si existen) y corregí todos los hallazgos CRÍTICOS y ALTOS. Commiteá cada corrección."
    run_claude "$project_path" "$prompt" "$model" "$DEFAULT_MAX_TURNS_FIX" \
      "${log_dir}/${timestamp}-s${session_num}-fix.log"
  fi

  # ── Step 4: Document ──
  echo -e "  ${BOLD}▸ Paso 4/5: Documentación${RESET}"
  save_state "$slug" "$session_num" "document" "running"

  if [ -n "$prompts_dir" ] && [ -f "${prompts_dir}/document.md" ]; then
    run_claude_file "$project_path" "${prompts_dir}/document.md" "$model" "$DEFAULT_MAX_TURNS_FIX" \
      "${log_dir}/${timestamp}-s${session_num}-document.log"
  else
    local prompt="Documentá lo que se hizo en esta sesión. Actualizá SESSION_LOG.md, ARCHITECTURE.md si aplica, y ROADMAP.md marcando la sesión ${session_num} como completada."
    run_claude "$project_path" "$prompt" "$model" "$DEFAULT_MAX_TURNS_FIX" \
      "${log_dir}/${timestamp}-s${session_num}-document.log"
  fi

  # ── Step 5: Build + Push ──
  echo -e "  ${BOLD}▸ Paso 5/5: Build + Push${RESET}"
  save_state "$slug" "$session_num" "push" "running"

  local push_prompt="Corré build, lint y tests del proyecto. Si todo pasa, commiteá y pusheá. Si algo falla, arreglalo primero."
  run_claude "$project_path" "$push_prompt" "$model" "$DEFAULT_MAX_TURNS_FIX" \
    "${log_dir}/${timestamp}-s${session_num}-push.log"

  save_state "$slug" "$session_num" "completed" "completed"
  echo ""
  echo -e "  ${GREEN}✓ Sesión ${session_num} completada${RESET}"
}

# ── Execute a single cambio (change) ──
run_cambio() {
  local project_path="$1"
  local description="$2"
  local model="$3"

  local prompt="Ejecutá /project:cambio para este cambio: ${description}"
  run_claude "$project_path" "$prompt" "$model" "$DEFAULT_MAX_TURNS"
}

# ── Execute a roadmap creation ──
run_roadmap() {
  local project_path="$1"
  local description="$2"
  local model="$3"

  local prompt="Ejecutá /project:roadmap para este proyecto: ${description}"
  run_claude "$project_path" "$prompt" "$model" "$DEFAULT_MAX_TURNS"
}

# ── Execute a free session ──
run_sesion() {
  local project_path="$1"
  local model="$2"

  local prompt="Ejecutá /project:sesion — iniciá sesión de trabajo y esperá instrucciones del usuario."
  # Free session needs interactive mode, not -p
  echo -e "  ${CYAN}Abriendo sesión interactiva de Claude...${RESET}"
  (cd "$project_path" && claude --model "$model")
}
