#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# q-orchestrator — Issues mode runner (núcleo)
# ══════════════════════════════════════════════════════════════
#
# Entry point: run_issues_mode()
#
# Depends on:
#   lib/config.sh       — ORCH_ISSUES_* variables
#   lib/ui.sh           — ui_* display functions
#   lib/runner.sh       — run_claude(), run_ci_check_and_fix()
#   lib/projects.sh     — save_state(), _run_json()
#   lib/issues-fetch.sh     — fetch_all_issues()
#   lib/issues-queue.sh     — build_issues_queue(), mark_issue_*
#   lib/issues-board-api.sh — update_directive_status()
#   lib/issues-report.sh    — generate_morning_report()
#

# ── Ensure a BU repo is cloned or up-to-date ──
# Usage: ensure_repo_cloned <repo> <workspace>
# Returns: 0 and sets _REPO_LOCAL_PATH to the local path
_REPO_LOCAL_PATH=""
ensure_repo_cloned() {
  local repo="$1"
  local workspace="${2:-${ORCH_ISSUES_WORKSPACE:-${HOME}/projects}}"

  local repo_name="${repo##*/}"
  local local_path="${workspace}/${repo_name}"

  mkdir -p "$workspace"

  if [ -d "${local_path}/.git" ]; then
    ui_info "Actualizando ${repo_name}..."
    (cd "$local_path" && git fetch origin --prune 2>/dev/null && \
      git checkout main 2>/dev/null || git checkout master 2>/dev/null || true) || true
    (cd "$local_path" && git pull origin HEAD --ff-only 2>/dev/null) || true
  else
    ui_info "Clonando ${repo}..."
    if ! git clone --depth 1 "https://github.com/${repo}.git" "$local_path" 2>&1; then
      ui_error "No se pudo clonar ${repo}"
      return 1
    fi
  fi

  _REPO_LOCAL_PATH="$local_path"
  return 0
}

# ── Create directive branch ──
# Usage: create_directive_branch <repo_path> <directive_id>
create_directive_branch() {
  local repo_path="$1"
  local directive_id="$2"
  local branch="directive/${directive_id}"

  (cd "$repo_path" && git checkout main 2>/dev/null || git checkout master 2>/dev/null || true) || true
  (cd "$repo_path" && git checkout -b "$branch" 2>/dev/null || \
    git checkout "$branch" 2>/dev/null) || {
    ui_warn "No se pudo crear/cambiar al branch ${branch}"
    return 1
  }

  echo "$branch"
}

# ── Build the implementation prompt ──
# Usage: build_implementation_prompt <type> <priority> <deadline> <instructions> <requirements>
build_implementation_prompt() {
  local type="$1"
  local priority="$2"
  local deadline="${3:-sin deadline}"
  local instructions="$4"
  local requirements="$5"

  cat << PROMPT
Estás corriendo en modo batch desatendido. NO pidas confirmación.

Esta tarea viene de una directiva del Board de Q Company.

## Directiva
- Tipo: ${type}
- Prioridad: ${priority}
- Deadline: ${deadline:-sin deadline}

## Instrucciones
${instructions}

## Requisitos
${requirements}

## Reglas
- Implementá directamente, commit por tarea atómica
- TDD obligatorio para lógica de negocio
- Si encontrás ambiguedad, elegí la opción más simple
- NO modifiques archivos fuera del alcance de la directiva
- Al terminar, hacé un resumen de qué cambiaste y por qué
PROMPT
}

# ── Create a draft PR for the directive branch ──
# Usage: create_draft_pr <repo_path> <repo> <branch> <directive_id> <title> <issue_number>
# Returns: PR URL in _PR_URL, PR number in _PR_NUMBER
_PR_URL=""
_PR_NUMBER=""
create_draft_pr() {
  local repo_path="$1"
  local repo="$2"
  local branch="$3"
  local directive_id="$4"
  local title="$5"
  local issue_number="$6"

  if ! command -v gh &>/dev/null; then
    ui_warn "gh CLI no disponible — saltando creación de PR"
    return 0
  fi

  local draft_flag=""
  [ "${ORCH_ISSUES_DRAFT_PR:-true}" = "true" ] && draft_flag="--draft"

  local pr_title="[Directive] ${title}"
  local pr_body="Implementación automática de la directiva del Board.

- **Directive ID**: \`${directive_id}\`
- **Issue**: #${issue_number}
- **Branch**: \`${branch}\`

> Generado automáticamente por q-orchestrator en modo issues."

  local pr_url
  pr_url=$(cd "$repo_path" && gh pr create \
    --repo "$repo" \
    --base main \
    --head "$branch" \
    --title "$pr_title" \
    --body "$pr_body" \
    $draft_flag \
    2>/dev/null) || {
    ui_warn "No se pudo crear el PR para directive/${directive_id}"
    _PR_URL=""
    _PR_NUMBER=""
    return 0
  }

  _PR_URL="$pr_url"
  # Extract PR number from URL
  _PR_NUMBER=$(echo "$pr_url" | grep -oP '\d+$' || echo "")
  ui_ok "PR creado: ${pr_url}"
}

# ── Comment on the GitHub issue with the result ──
# Usage: comment_on_issue <repo> <issue_number> <status> <pr_url> <error_msg>
comment_on_issue() {
  local repo="$1"
  local issue_number="$2"
  local status="$3"
  local pr_url="${4:-}"
  local error_msg="${5:-}"

  if ! command -v gh &>/dev/null; then
    return 0
  fi

  local body
  if [ "$status" = "completed" ]; then
    body="✅ **Directiva implementada automáticamente por q-orchestrator**

**PR Draft**: ${pr_url:-*(no disponible)*}

La implementación fue completada. Por favor revisá el PR, corré los tests manualmente si es necesario, y mergueá cuando sea apropiado."
  else
    body="❌ **Implementación automática falló (q-orchestrator)**

**Error**: ${error_msg:-ver log}

La implementación falló después de ${ORCH_CI_MAX_RETRIES:-3} intentos. Requiere intervención manual."
  fi

  gh issue comment "$issue_number" \
    --repo "$repo" \
    --body "$body" \
    2>/dev/null || ui_warn "No se pudo comentar en issue #${issue_number}"
}

# ── Handle failure for a single issue ──
handle_issue_failure() {
  local repo="$1"
  local issue_number="$2"
  local directive_id="$3"
  local bu_id="$4"
  local repo_path="$5"
  local error_type="$6"
  local log_file="$7"
  local attempts="$8"
  local run_id="$9"

  ui_error "Issue #${issue_number} en ${repo}: falló (${error_type})"

  mark_issue_done "$repo" "$issue_number" "failed" "" "$log_file" "$attempts"

  # Comment on issue
  comment_on_issue "$repo" "$issue_number" "failed" "" "$error_type"

  # Notify Board
  local failed_json
  failed_json=$(build_failed_result_json "$error_type" "$log_file" "$attempts" "$run_id")
  update_directive_status "$bu_id" "$directive_id" "failed" \
    "Implementación falló después de ${attempts} intentos. Error: ${error_type}." \
    "$failed_json" \
    "$repo_path"
}

# ── Process a single issue ──
# Usage: process_single_issue <queue_record> <run_id> <model> <log_dir>
# Queue record format: repo|number|directive_id|bu_id|type|priority|deadline|title|instr_b64|req_b64
process_single_issue() {
  local record="$1"
  local run_id="$2"
  local model="$3"
  local log_dir="$4"

  # Parse record fields
  local repo number directive_id bu_id type priority deadline title instr_b64 req_b64
  IFS='|' read -r repo number directive_id bu_id type priority deadline title instr_b64 req_b64 <<< "$record"

  local repo_name="${repo##*/}"
  local timestamp
  timestamp=$(date +"%Y%m%d-%H%M%S")

  ui_section "ISSUE #${number} — ${repo_name}"
  ui_item "" "Directiva: ${directive_id}"
  ui_item "" "Tipo:      ${type} | Prioridad: ${priority}"
  ui_item "" "Título:    ${title}"
  ui_section_end
  echo ""

  # ── Mark started ──
  mark_issue_started "$repo" "$number" "$directive_id" "$run_id"

  # ── Notify Board: in_progress ──
  local repo_path=""
  # We don't have repo_path yet; will get it after clone
  update_directive_status "$bu_id" "$directive_id" "in_progress" \
    "Iniciando implementación en q-orchestrator." "null" ""

  # ── Clone / update repo ──
  local workspace="${ORCH_ISSUES_WORKSPACE:-${HOME}/projects}"
  if ! ensure_repo_cloned "$repo" "$workspace"; then
    handle_issue_failure "$repo" "$number" "$directive_id" "$bu_id" \
      "" "clone_failed" "" "1" "$run_id"
    return 1
  fi
  repo_path="$_REPO_LOCAL_PATH"

  local issue_log_dir="${log_dir}/${repo_name}"
  mkdir -p "$issue_log_dir"

  # ── Create directive branch ──
  local branch
  branch=$(create_directive_branch "$repo_path" "$directive_id") || {
    handle_issue_failure "$repo" "$number" "$directive_id" "$bu_id" \
      "$repo_path" "branch_failed" "" "1" "$run_id"
    return 1
  }

  # ── Decode instructions and requirements ──
  local instructions requirements
  instructions=$(echo "$instr_b64" | base64 -d 2>/dev/null || echo "Ver issue #${number}")
  requirements=$(echo "$req_b64" | base64 -d 2>/dev/null || echo "")

  # ── Build implementation prompt ──
  local impl_prompt
  impl_prompt=$(build_implementation_prompt "$type" "$priority" "$deadline" \
    "$instructions" "$requirements")

  # ── Run implementation via run_claude() ──
  ui_info "Implementando directiva ${directive_id}..."
  local impl_log="${issue_log_dir}/${timestamp}-${directive_id}-implement.log"
  local impl_exit=0

  run_claude "$repo_path" "$impl_prompt" "$model" \
    "$ORCH_MAX_TURNS_IMPLEMENT" "$impl_log" || impl_exit=$?

  if [ $impl_exit -ne 0 ]; then
    handle_issue_failure "$repo" "$number" "$directive_id" "$bu_id" \
      "$repo_path" "implementation_failed" "$impl_log" "1" "$run_id"
    return 1
  fi

  # ── CI check, fix and push via run_ci_check_and_fix() ──
  # We repurpose session_num=1 and slug=directive_id for log naming
  local directive_slug
  directive_slug=$(echo "$directive_id" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')

  # Override CI push behavior: always use PR strategy for issues mode
  local orig_branch_strategy="$ORCH_BRANCH_STRATEGY"
  ORCH_BRANCH_STRATEGY="pr"

  ui_info "Ejecutando CI y push para issue #${number}..."
  local ci_exit=0
  run_ci_check_and_fix "$repo_path" "$model" "$directive_slug" \
    "$issue_log_dir" "$timestamp" "1" "${title}" || ci_exit=$?

  # Restore
  ORCH_BRANCH_STRATEGY="$orig_branch_strategy"

  local last_ci_log
  last_ci_log=$(ls -t "${issue_log_dir}"/${timestamp}-*-ci-*.log 2>/dev/null | head -1 || echo "")

  if [ $ci_exit -ne 0 ]; then
    handle_issue_failure "$repo" "$number" "$directive_id" "$bu_id" \
      "$repo_path" "ci_failed" "$last_ci_log" "$ORCH_CI_MAX_RETRIES" "$run_id"
    return 1
  fi

  # ── Create draft PR ──
  create_draft_pr "$repo_path" "$repo" "$branch" "$directive_id" "$title" "$number"
  local pr_url="$_PR_URL"
  local pr_number="$_PR_NUMBER"

  # ── Gather git stats ──
  local commits files_changed
  commits=$(cd "$repo_path" && git log "main..${branch}" --oneline 2>/dev/null | wc -l | tr -d ' ' || echo "0")
  files_changed=$(cd "$repo_path" && git diff --name-only "main..${branch}" 2>/dev/null | wc -l | tr -d ' ' || echo "0")

  # ── Mark done ──
  mark_issue_done "$repo" "$number" "completed" "$pr_url" "$last_ci_log" "1"

  # ── Comment on issue ──
  comment_on_issue "$repo" "$number" "completed" "$pr_url" ""

  # ── Notify Board: completed ──
  local result_json
  result_json=$(build_completed_result_json \
    "$pr_url" "${pr_number:-0}" "$branch" \
    "$commits" "$files_changed" "0" "$run_id")
  update_directive_status "$bu_id" "$directive_id" "completed" \
    "PR draft creado. ${commits} commits, ${files_changed} archivos, tests pasando." \
    "$result_json" "$repo_path"

  echo ""
  ui_ok "Issue #${number} completado → ${pr_url:-branch ${branch}}"
  return 0
}

# ══════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════

# ── run_issues_mode: main entry point for --mode issues ──
# Usage: run_issues_mode <_ignored_project_path> <_ignored_slug> <model>
#
# Does NOT use project_path/slug — operates on ORCH_ISSUES_REPOS instead.
run_issues_mode() {
  local model="${3:-$ORCH_MODEL}"

  ui_header
  ui_section "MODO ISSUES — Q Company Board"
  ui_empty

  # Check ORCH_ISSUES_REPOS
  if [ -z "${ORCH_ISSUES_REPOS:-}" ]; then
    ui_error "ORCH_ISSUES_REPOS no configurado."
    ui_info "Agregá los repos en ~/.q-orchestrator/config.sh:"
    ui_info '  ORCH_ISSUES_REPOS="owner/repo1 owner/repo2"'
    ui_section_end
    return 1
  fi

  read -ra repos <<< "$ORCH_ISSUES_REPOS"
  ui_item "" "Repos:   ${ORCH_ISSUES_REPOS}"
  ui_item "" "Modelo:  ${model}"
  ui_item "" "Máx:     ${ORCH_ISSUES_MAX_PER_RUN:-5} issues por corrida"
  ui_section_end

  # ── Setup ──
  local run_id
  run_id=$(date +"%Y%m%d-%H%M%S")
  local log_dir="${ORCH_LOG_DIR:-${CONFIG_DIR}/logs/issues}"
  mkdir -p "$log_dir"
  mkdir -p "${ORCH_ISSUES_REPORT_DIR:-${CONFIG_DIR}/reports}"
  mkdir -p "$ISSUES_STATE_DIR"

  local run_start
  run_start=$(date +%s)

  echo ""
  ui_info "Corrida ${run_id} — $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  # ── Build queue ──
  ui_info "Escaneando issues..."
  local queue_records=()
  local all_repo_issues
  all_repo_issues=$(build_issues_queue "$run_id" "${repos[@]}")

  while IFS= read -r line; do
    [ -z "$line" ] && continue
    queue_records+=("$line")
  done <<< "$all_repo_issues"

  local total_in_queue=${#queue_records[@]}

  if [ "$total_in_queue" -eq 0 ]; then
    echo ""
    ui_ok "No hay issues pendientes para procesar."
    generate_morning_report "$run_id" "$run_start" 0 0 0 "" "$model"
    return 0
  fi

  ui_info "Issues en cola: ${total_in_queue}"
  echo ""

  # ── Process each issue ──
  local completed=0 failed=0
  local results_log="${log_dir}/${run_id}-results.tsv"

  for record in "${queue_records[@]}"; do
    local repo number
    IFS='|' read -r repo number _ <<< "$record"

    echo ""
    echo -e "  ${BOLD}══════════════════════════════════════════${RESET}"
    echo -e "  ${BOLD}  Issue #${number} — ${repo##*/}${RESET}"
    echo -e "  ${BOLD}══════════════════════════════════════════${RESET}"
    echo ""

    local issue_exit=0
    process_single_issue "$record" "$run_id" "$model" "$log_dir" || issue_exit=$?

    if [ $issue_exit -eq 0 ]; then
      completed=$((completed + 1))
      echo "${repo}|${number}|completed|${_PR_URL:-}" >> "$results_log"
    else
      failed=$((failed + 1))
      echo "${repo}|${number}|failed|" >> "$results_log"
    fi
  done

  local run_end
  run_end=$(date +%s)

  # ── Generate morning report ──
  echo ""
  ui_info "Generando morning report..."
  generate_morning_report \
    "$run_id" "$run_start" "$completed" "$failed" "$total_in_queue" \
    "$results_log" "$model"

  # ── Summary ──
  echo ""
  ui_section "RESUMEN CORRIDA ${run_id}"
  ui_item "" "Completados: ${completed}"
  ui_item "" "Fallidos:    ${failed}"
  ui_item "" "Total cola:  ${total_in_queue}"
  local elapsed=$(( run_end - run_start ))
  ui_item "" "Duración:    $((elapsed / 60)) min $((elapsed % 60)) seg"
  ui_section_end
  echo ""
}
