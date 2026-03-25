#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# q-orchestrator — Board API wrapper (issues mode)
# ══════════════════════════════════════════════════════════════
#
# PATCH /api/v1/bu/{buId}/directives/{directiveId}/status
#
# Depends on: lib/config.sh (ORCH_BOARD_URL), lib/ui.sh
#
# Per-BU config (.q-orchestrator.sh in each BU repo):
#   ORCH_BU_ID      — BU identifier in the Board
#   ORCH_BU_API_KEY — API key for the Board (per BU)
#

# ── Get BU ID from project config ──
# Usage: get_bu_id <repo_path>
# Returns: ORCH_BU_ID sourced from <repo_path>/.q-orchestrator.sh
get_bu_id() {
  local repo_path="$1"
  local config_file="${repo_path}/.q-orchestrator.sh"

  if [ ! -f "$config_file" ]; then
    echo ""
    return 0
  fi

  # Source in a subshell to avoid polluting current env
  (
    # shellcheck disable=SC1090
    source "$config_file" 2>/dev/null
    echo "${ORCH_BU_ID:-}"
  )
}

# ── Get BU API key from project config ──
# Usage: get_bu_api_key <repo_path>
# Returns: ORCH_BU_API_KEY sourced from <repo_path>/.q-orchestrator.sh
get_bu_api_key() {
  local repo_path="$1"
  local config_file="${repo_path}/.q-orchestrator.sh"

  if [ ! -f "$config_file" ]; then
    echo ""
    return 0
  fi

  (
    # shellcheck disable=SC1090
    source "$config_file" 2>/dev/null
    echo "${ORCH_BU_API_KEY:-}"
  )
}

# ── Update directive status on the Board ──
# Usage: update_directive_status <bu_id> <directive_id> <status> <notes> [result_json]
#
# status: in_progress | completed | failed
# notes:  free text describing the result
# result_json: optional JSON object with { pr_url, branch, commits, ... }
#              pass empty string or "null" to omit
#
# Returns: 0 if PATCH succeeded or Board URL is not set, 1 on curl error
update_directive_status() {
  local bu_id="$1"
  local directive_id="$2"
  local status="$3"
  local notes="$4"
  local result_json="${5:-null}"
  local repo_path="${6:-}"

  # If Board URL is not configured, log and skip gracefully
  if [ -z "${ORCH_BOARD_URL:-}" ]; then
    ui_warn "ORCH_BOARD_URL no configurado — salteando callback al Board"
    return 0
  fi

  # Get API key
  local api_key=""
  if [ -n "$repo_path" ]; then
    api_key=$(get_bu_api_key "$repo_path")
  fi

  if [ -z "$api_key" ]; then
    ui_warn "Sin API key para BU '${bu_id}' — salteando callback al Board"
    return 0
  fi

  # Escape notes for JSON (replace double quotes and newlines)
  local notes_escaped
  notes_escaped=$(printf '%s' "$notes" | sed 's/"/\\"/g' | tr '\n' ' ')

  # Build payload
  local payload
  payload="{\"status\":\"${status}\",\"notes\":\"${notes_escaped}\",\"result\":${result_json}}"

  local url="${ORCH_BOARD_URL}/api/v1/bu/${bu_id}/directives/${directive_id}/status"

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH \
    -H "x-api-key: ${api_key}" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$url" 2>/dev/null) || {
    ui_warn "curl falló al notificar al Board (directive: ${directive_id})"
    return 0
  }

  if [[ "$http_code" =~ ^2 ]]; then
    ui_info "Board notificado: ${directive_id} → ${status} (HTTP ${http_code})"
  else
    ui_warn "Board respondió HTTP ${http_code} para directive ${directive_id} — continuando"
  fi

  return 0
}

# ── Build result JSON for completed directive ──
# Usage: build_completed_result_json <pr_url> <pr_number> <branch> <commits> <files_changed> <tests_added> <run_id>
build_completed_result_json() {
  local pr_url="$1"
  local pr_number="$2"
  local branch="$3"
  local commits="${4:-0}"
  local files_changed="${5:-0}"
  local tests_added="${6:-0}"
  local run_id="$7"

  # Escape string values: backslashes first, then double quotes
  local pr_url_esc branch_esc run_id_esc
  pr_url_esc=$(printf '%s' "$pr_url"  | sed 's/\\/\\\\/g; s/"/\\"/g')
  branch_esc=$(printf '%s' "$branch"  | sed 's/\\/\\\\/g; s/"/\\"/g')
  run_id_esc=$(printf '%s' "$run_id"  | sed 's/\\/\\\\/g; s/"/\\"/g')

  printf '{"pr_url":"%s","pr_number":%s,"branch":"%s","commits":%s,"files_changed":%s,"tests_added":%s,"run_id":"%s"}' \
    "$pr_url_esc" "$pr_number" "$branch_esc" "$commits" "$files_changed" "$tests_added" "$run_id_esc"
}

# ── Build result JSON for failed directive ──
# Usage: build_failed_result_json <error_type> <last_log> <attempts> <run_id>
build_failed_result_json() {
  local error_type="$1"
  local last_log="$2"
  local attempts="${3:-1}"
  local run_id="$4"

  # Escape string values: backslashes first, then double quotes
  local log_escaped error_escaped run_id_esc
  log_escaped=$(printf '%s' "$last_log"    | sed 's/\\/\\\\/g; s/"/\\"/g')
  error_escaped=$(printf '%s' "$error_type" | sed 's/\\/\\\\/g; s/"/\\"/g')
  run_id_esc=$(printf '%s' "$run_id"        | sed 's/\\/\\\\/g; s/"/\\"/g')

  printf '{"error":"%s","last_log":"%s","attempts":%s,"run_id":"%s"}' \
    "$error_escaped" "$log_escaped" "$attempts" "$run_id_esc"
}
