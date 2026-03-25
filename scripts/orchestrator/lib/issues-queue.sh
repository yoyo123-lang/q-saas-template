#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# q-orchestrator — Issues queue, prioritization & state
# ══════════════════════════════════════════════════════════════
#
# State files: ~/.q-orchestrator/issues-state/{owner_repo}/{issue_number}.json
#
# Queue record format (pipe-separated, from issues-fetch.sh):
#   {repo}|{number}|{directive_id}|{bu_id}|{type}|{priority}|{deadline}|{title}|{instructions_b64}|{requirements_b64}
#
# Depends on: lib/config.sh, lib/ui.sh, lib/projects.sh (_run_json)
#

ISSUES_STATE_DIR="${CONFIG_DIR}/issues-state"

# ── Priority numeric mapping ──
# CRITICAL=0, HIGH=1, MEDIUM=2, LOW=3, UNKNOWN=4
_priority_num() {
  case "${1^^}" in
    CRITICAL) echo 0 ;;
    HIGH)     echo 1 ;;
    MEDIUM)   echo 2 ;;
    LOW)      echo 3 ;;
    *)        echo 4 ;;
  esac
}

# ── State file path for an issue ──
# Usage: _issue_state_file <repo> <issue_number>
# repo: owner/repo  → stored as owner_repo
_issue_state_file() {
  local repo="$1"
  local number="$2"
  local repo_key
  repo_key=$(echo "$repo" | tr '/' '_')
  echo "${ISSUES_STATE_DIR}/${repo_key}/${number}.json"
}

# ── Prioritize issues ──
# Usage: prioritize_issues < {queue records from stdin}
# Outputs: records sorted by priority (CRITICAL first), then by repo/number
prioritize_issues() {
  # Prepend numeric priority as sort key, sort, strip the key
  while IFS='|' read -r repo number directive_id bu_id type priority deadline title instr_b64 req_b64; do
    local pnum
    pnum=$(_priority_num "$priority")
    printf '%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s\n' \
      "$pnum" "$repo" "$number" "$directive_id" "$bu_id" "$type" "$priority" "$deadline" "$title" "$instr_b64" "$req_b64"
  done | sort -t'|' -k1,1n -k2,2 -k3,3n | cut -d'|' -f2-
}

# ── Check if an issue was already processed successfully ──
# Usage: is_issue_already_processed <repo> <number>
# Returns: 0 if status=completed in state file, 1 otherwise
is_issue_already_processed() {
  local repo="$1"
  local number="$2"
  local state_file
  state_file=$(_issue_state_file "$repo" "$number")

  [ -f "$state_file" ] || return 1

  local status
  status=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" \
    | sed 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

  [ "$status" = "completed" ]
}

# ── Mark an issue as started ──
# Usage: mark_issue_started <repo> <number> <directive_id> <run_id>
mark_issue_started() {
  local repo="$1"
  local number="$2"
  local directive_id="$3"
  local run_id="$4"
  local state_file
  state_file=$(_issue_state_file "$repo" "$number")

  mkdir -p "$(dirname "$state_file")"

  local started_at
  started_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")

  cat > "$state_file" << EOF
{
  "directive_id": "${directive_id}",
  "repo": "${repo}",
  "issue_number": ${number},
  "status": "in_progress",
  "started_at": "${started_at}",
  "finished_at": null,
  "pr_url": null,
  "attempts": 1,
  "run_id": "${run_id}",
  "last_log": null
}
EOF
}

# ── Mark an issue as done (completed or failed) ──
# Usage: mark_issue_done <repo> <number> <status> <pr_url> <log_file> [attempts]
# status: completed | failed
mark_issue_done() {
  local repo="$1"
  local number="$2"
  local status="$3"
  local pr_url="${4:-}"
  local log_file="${5:-}"
  local attempts="${6:-1}"
  local state_file
  state_file=$(_issue_state_file "$repo" "$number")

  local finished_at
  finished_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")

  # Read existing started_at and directive_id from state file
  local started_at directive_id run_id
  started_at=$(grep -o '"started_at"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" 2>/dev/null \
    | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
  directive_id=$(grep -o '"directive_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" 2>/dev/null \
    | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
  run_id=$(grep -o '"run_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" 2>/dev/null \
    | sed 's/.*"\([^"]*\)".*/\1/' || echo "")

  # Escape paths for JSON
  local log_json="null"
  [ -n "$log_file" ] && log_json="\"$(echo "$log_file" | sed 's/"/\\"/g')\""

  local pr_json="null"
  [ -n "$pr_url" ] && pr_json="\"$(echo "$pr_url" | sed 's/"/\\"/g')\""

  cat > "$state_file" << EOF
{
  "directive_id": "${directive_id}",
  "repo": "${repo}",
  "issue_number": ${number},
  "status": "${status}",
  "started_at": "${started_at}",
  "finished_at": "${finished_at}",
  "pr_url": ${pr_json},
  "attempts": ${attempts},
  "run_id": "${run_id}",
  "last_log": ${log_json}
}
EOF
}

# ── Build the queue: fetch, filter already-processed, limit ──
# Usage: build_issues_queue <run_id> <repo1> [repo2] ...
# Outputs: up to ORCH_ISSUES_MAX_PER_RUN queue records (one per line)
build_issues_queue() {
  local run_id="$1"
  shift
  local repos=("$@")

  local max="${ORCH_ISSUES_MAX_PER_RUN:-5}"
  local count=0

  # Fetch, prioritize, then filter and limit
  local all_issues
  all_issues=$(fetch_all_issues "${repos[@]}")

  if [ -z "$all_issues" ]; then
    ui_info "No se encontraron issues con label '${ORCH_ISSUES_LABEL}'"
    return 0
  fi

  local prioritized
  prioritized=$(echo "$all_issues" | prioritize_issues)

  while IFS='|' read -r repo number directive_id rest; do
    [ -z "$repo" ] && continue
    [ -z "$number" ] && continue

    # Skip issues without directive_id (malformed)
    if [ -z "$directive_id" ]; then
      ui_warn "Issue #${number} en ${repo}: sin directive_id — ignorado"
      continue
    fi

    # Skip already-completed issues
    if is_issue_already_processed "$repo" "$number"; then
      ui_info "Issue #${number} en ${repo}: ya procesado — saltando"
      continue
    fi

    # Emit record and count
    printf '%s|%s|%s|%s\n' "$repo" "$number" "$directive_id" "$rest"
    count=$((count + 1))

    if [ "$count" -ge "$max" ]; then
      ui_info "Límite de ${max} issues por corrida alcanzado"
      break
    fi
  done <<< "$prioritized"
}
