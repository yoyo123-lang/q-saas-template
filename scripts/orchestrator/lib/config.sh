#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# q-orchestrator — Configuration system
# ══════════════════════════════════════════════════════════════
#
# Config is loaded from (in order, later overrides earlier):
#   1. Defaults (this file)
#   2. Global:  ~/.q-orchestrator/config.sh
#   3. Project: <project>/.q-orchestrator.sh
#
# All values can also be overridden via environment variables.
#

# ══════════════════════════════════════════════════════════════
# DEFAULTS — edit ~/.q-orchestrator/config.sh to override
# ══════════════════════════════════════════════════════════════

# ── Model ──
: "${ORCH_MODEL:=claude-sonnet-4-6}"

# ── Turn limits ──
# Max turns for the main implementation step (the heavy work)
: "${ORCH_MAX_TURNS_IMPLEMENT:=80}"
# Max turns for review/fix/document steps (lighter work)
: "${ORCH_MAX_TURNS_SUPPORT:=40}"
# Max turns for build+push step
: "${ORCH_MAX_TURNS_BUILD:=30}"
# Max turns for CI fix attempts
: "${ORCH_MAX_TURNS_CI_FIX:=50}"

# ── CI retry ──
# How many times to retry fixing CI before giving up on this session
: "${ORCH_CI_MAX_RETRIES:=3}"
# Seconds to wait before checking CI status
: "${ORCH_CI_POLL_INTERVAL:=30}"
# Max seconds to wait for CI to complete (timeout)
: "${ORCH_CI_TIMEOUT:=900}"

# ── Session behavior ──
# Skip role review step (faster, less thorough)
: "${ORCH_SKIP_ROLES:=false}"
# Skip fix-findings step (only if you also skip roles)
: "${ORCH_SKIP_FIX:=false}"
# Skip documentation step
: "${ORCH_SKIP_DOCS:=false}"
# Auto-push after build passes (if false, asks for confirmation)
: "${ORCH_AUTO_PUSH:=true}"
# Continue to next session automatically after completing one
: "${ORCH_AUTO_CONTINUE:=true}"
# What to do when a step fails: "skip" (move to next step), "abort" (stop session), "ask" (prompt user)
: "${ORCH_ON_STEP_FAIL:=ask}"
# What to do when CI fails after all retries: "skip" (move to next session), "abort" (stop), "ask"
: "${ORCH_ON_CI_EXHAUST:=ask}"

# ── Git ──
# Auto-pull before starting work on a project
: "${ORCH_AUTO_PULL:=true}"
# Branch to pull from (empty = current branch)
: "${ORCH_PULL_BRANCH:=}"
# Push retries on network failure
: "${ORCH_PUSH_RETRIES:=4}"
# Seconds for exponential backoff base (2, 4, 8, 16...)
: "${ORCH_PUSH_BACKOFF_BASE:=2}"

# ── Logging ──
# Save full session logs
: "${ORCH_SAVE_LOGS:=true}"
# Log directory (empty = use default ~/.q-orchestrator/logs/<slug>/)
: "${ORCH_LOG_DIR:=}"

# ── Claude CLI flags ──
# Additional flags to pass to every claude invocation
# Example: "--allowedTools 'Bash(npm:*),Edit,Write,Read'"
: "${ORCH_CLAUDE_EXTRA_FLAGS:=}"
# Permission mode: pass --dangerously-skip-permissions if true
# The orchestrator runs unattended, so this defaults to true.
# Set to false only if you want to approve each tool use manually.
: "${ORCH_SKIP_PERMISSIONS:=true}"
# Verbose mode: show tool calls and progress in real time
# Useful for monitoring what Claude is doing during long sessions.
: "${ORCH_VERBOSE:=true}"

# ══════════════════════════════════════════════════════════════
# CONFIG LOADING
# ══════════════════════════════════════════════════════════════

_config_loaded=false

load_config() {
  if [ "$_config_loaded" = true ]; then return; fi

  # Global config
  local global_config="${CONFIG_DIR}/config.sh"
  if [ -f "$global_config" ]; then
    # shellcheck disable=SC1090
    source "$global_config"
  fi

  # Project-level config (loaded later when project is selected)
  _config_loaded=true
}

load_project_config() {
  local project_path="$1"
  local project_config="${project_path}/.q-orchestrator.sh"
  if [ -f "$project_config" ]; then
    # shellcheck disable=SC1090
    source "$project_config"
  fi
}

# ── Generate default config file ──
generate_default_config() {
  local target="${1:-${CONFIG_DIR}/config.sh}"
  mkdir -p "$(dirname "$target")"

  cat > "$target" << 'CONFIGEOF'
#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# q-orchestrator — User configuration
# ══════════════════════════════════════════════════════════════
# Uncomment and edit values to override defaults.
# This file is sourced by the orchestrator at startup.
#
# You can also create a per-project config at:
#   <project-root>/.q-orchestrator.sh
#

# ── Model ──
# ORCH_MODEL="claude-sonnet-4-6"         # sonnet (fast, ~$3-5/session)
# ORCH_MODEL="claude-opus-4-6"           # opus (best quality, ~$15-25/session)
# ORCH_MODEL="claude-haiku-4-5-20251001" # haiku (cheap, simple tasks)

# ── Turn limits ──
# ORCH_MAX_TURNS_IMPLEMENT=80   # Main implementation step
# ORCH_MAX_TURNS_SUPPORT=40     # Review, fix, document steps
# ORCH_MAX_TURNS_BUILD=30       # Build + push step
# ORCH_MAX_TURNS_CI_FIX=50      # CI fix attempts

# ── CI retry ──
# ORCH_CI_MAX_RETRIES=3         # Retries before giving up
# ORCH_CI_POLL_INTERVAL=30      # Seconds between CI status checks
# ORCH_CI_TIMEOUT=900           # Max seconds to wait for CI (15 min)

# ── Session behavior ──
# ORCH_SKIP_ROLES=false         # Skip role review step
# ORCH_SKIP_FIX=false           # Skip fix-findings step
# ORCH_SKIP_DOCS=false          # Skip documentation step
# ORCH_AUTO_PUSH=true           # Auto-push after build passes
# ORCH_AUTO_CONTINUE=true       # Auto-continue to next session
# ORCH_ON_STEP_FAIL="ask"       # "skip" | "abort" | "ask"
# ORCH_ON_CI_EXHAUST="ask"      # "skip" | "abort" | "ask"

# ── Git ──
# ORCH_AUTO_PULL=true            # Pull before starting
# ORCH_PUSH_RETRIES=4            # Retries on network failure
# ORCH_PUSH_BACKOFF_BASE=2       # Exponential backoff base (seconds)

# ── Claude CLI ──
# ORCH_CLAUDE_EXTRA_FLAGS=""     # Extra flags for claude CLI
# ORCH_SKIP_PERMISSIONS=true     # Skip permission prompts (required for unattended)
# ORCH_VERBOSE=true              # Show tool calls and progress in real time

# ── Logging ──
# ORCH_SAVE_LOGS=true            # Save session logs
# ORCH_LOG_DIR=""                 # Custom log directory
CONFIGEOF

  echo "$target"
}

# ── Show current config ──
show_config() {
  ui_section "CONFIGURACIÓN ACTIVA"
  ui_empty
  ui_item "" "Modelo:           ${ORCH_MODEL}"
  ui_item "" "Turnos impl:      ${ORCH_MAX_TURNS_IMPLEMENT}"
  ui_item "" "Turnos soporte:   ${ORCH_MAX_TURNS_SUPPORT}"
  ui_item "" "Turnos build:     ${ORCH_MAX_TURNS_BUILD}"
  ui_item "" "Turnos CI fix:    ${ORCH_MAX_TURNS_CI_FIX}"
  ui_empty
  ui_item "" "CI retries:       ${ORCH_CI_MAX_RETRIES}"
  ui_item "" "CI poll:          ${ORCH_CI_POLL_INTERVAL}s"
  ui_item "" "CI timeout:       ${ORCH_CI_TIMEOUT}s"
  ui_empty
  ui_item "" "Skip roles:       ${ORCH_SKIP_ROLES}"
  ui_item "" "Skip fix:         ${ORCH_SKIP_FIX}"
  ui_item "" "Skip docs:        ${ORCH_SKIP_DOCS}"
  ui_item "" "Auto push:        ${ORCH_AUTO_PUSH}"
  ui_item "" "Auto continue:    ${ORCH_AUTO_CONTINUE}"
  ui_item "" "On step fail:     ${ORCH_ON_STEP_FAIL}"
  ui_item "" "On CI exhaust:    ${ORCH_ON_CI_EXHAUST}"
  ui_empty
  ui_item "" "Auto pull:        ${ORCH_AUTO_PULL}"
  ui_item "" "Skip perms:       ${ORCH_SKIP_PERMISSIONS}"
  ui_item "" "Verbose:          ${ORCH_VERBOSE}"
  ui_item "" "Extra flags:      ${ORCH_CLAUDE_EXTRA_FLAGS:-ninguno}"
  ui_empty

  local global_config="${CONFIG_DIR}/config.sh"
  if [ -f "$global_config" ]; then
    ui_item "" "Config global:    ${global_config}"
  else
    ui_item "" "Config global:    (no existe)"
  fi

  ui_section_end
}
