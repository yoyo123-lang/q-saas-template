#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# q-orchestrator — GitHub issues fetch + parse (issues mode)
# ══════════════════════════════════════════════════════════════
#
# Depends on: gh CLI, lib/config.sh, lib/ui.sh
#
# Issue format expected (set by q-company Board):
#   Title:  [BOARD] {title}
#   Labels: board-directive, {type}
#   Body:
#     <!-- board:directive_id={id} -->
#     <!-- board:bu_id={id} -->
#     | Tipo      | {TYPE}     |
#     | Prioridad | {PRIORITY} |
#     | Deadline  | {date|—}   |
#     ## Instrucciones
#     {instructions text}
#     ## Requisitos de implementación
#     {requirements text}
#

# ── Fetch open issues for a single repo ──
# Usage: fetch_open_issues <owner/repo>
# Outputs: one line per issue, pipe-separated:
#   {number}|{title}|{body_base64}
fetch_open_issues() {
  local repo="$1"
  local label="${ORCH_ISSUES_LABEL:-board-directive}"

  if ! command -v gh &>/dev/null; then
    ui_error "gh CLI no encontrado — requerido para modo issues"
    return 1
  fi

  # gh returns JSON array; we extract number, title, body
  local raw
  raw=$(gh issue list \
    --repo "$repo" \
    --state open \
    --label "$label" \
    --json number,title,body \
    --limit 100 \
    2>/dev/null) || {
    ui_warn "No se pudieron obtener issues de ${repo}"
    return 0
  }

  # Parse JSON with node or python via stdin (no jq, no _run_json — data piped)
  _parse_issues_json "$raw"
}

# ── Parse issues JSON array from stdin/arg — portable (no jq, no _run_json) ──
# Usage: _parse_issues_json <json_string>
# Outputs: one line per issue: {number}|{title}|{body_base64}
_parse_issues_json() {
  local raw="$1"
  [ -z "$raw" ] && return 0

  if command -v node &>/dev/null; then
    echo "$raw" | node -e "
const raw = require('fs').readFileSync('/dev/stdin','utf8');
const issues = JSON.parse(raw);
issues.forEach(i => {
  const b = Buffer.from(i.body || '').toString('base64').replace(/\n/g, '');
  console.log(i.number + '|' + i.title.replace(/\|/g, '_') + '|' + b);
});
" 2>/dev/null || true
  elif command -v python3 &>/dev/null; then
    echo "$raw" | python3 -c "
import sys, json, base64
for i in json.load(sys.stdin):
    b = base64.b64encode((i.get('body') or '').encode()).decode()
    print(str(i['number']) + '|' + i['title'].replace('|', '_') + '|' + b)
" 2>/dev/null || true
  elif command -v python &>/dev/null; then
    echo "$raw" | python -c "
import sys, json, base64
for i in json.load(sys.stdin):
    b = base64.b64encode((i.get('body') or '').encode()).decode()
    print(str(i['number']) + '|' + i['title'].replace('|', '_') + '|' + b)
" 2>/dev/null || true
  else
    ui_error "No se encontró node o python3 para parsear issues JSON"
    return 1
  fi
}

# ── Portable base64 decode — Linux (-d) and macOS (-D) ──
_b64decode() {
  echo "$1" | base64 -d 2>/dev/null || echo "$1" | base64 -D 2>/dev/null || echo ""
}

# ── Check if issue body contains the board directive marker ──
# Usage: is_board_directive <body>
# Returns: 0 if it is a board directive, 1 if not
is_board_directive() {
  local body="$1"
  echo "$body" | grep -q '<!--[[:space:]]*board:directive_id='
}

# ── Parse a single field from board HTML comment ──
# Usage: _parse_board_comment <body> <key>
# Example: _parse_board_comment "$body" "directive_id"
_parse_board_comment() {
  local body="$1"
  local key="$2"
  # Portable: grep -oP not available on macOS BSD grep → use sed
  echo "$body" \
    | grep "board:${key}=" \
    | sed "s/.*board:${key}=\([^[:space:]>-]*\).*/\1/" \
    | head -1 \
    | tr -d ' '
}

# ── Parse a field from the markdown table ──
# Usage: _parse_table_field <body> <field_label>
# Example: _parse_table_field "$body" "Prioridad"
_parse_table_field() {
  local body="$1"
  local field="$2"
  # Match table row: | Prioridad | VALUE |
  echo "$body" | grep -i "^[[:space:]]*|[[:space:]]*${field}[[:space:]]*|" \
    | head -1 \
    | sed 's/.*|[^|]*|[[:space:]]*//' \
    | sed 's/[[:space:]]*|.*//' \
    | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

# ── Extract a section of the body between two ## headings ──
# Usage: _parse_section <body> <heading>
# Returns: everything from "## heading" until the next "##" or end of body
_parse_section() {
  local body="$1"
  local heading="$2"
  echo "$body" | awk "/^##[[:space:]]+${heading}/{found=1; next} found && /^##[[:space:]]/{found=0} found{print}" \
    | sed '/^[[:space:]]*$/d' \
    | head -100
}

# ── Parse full issue body into structured fields ──
# Usage: parse_issue_body <body>
# Outputs: key=value lines:
#   directive_id=...
#   bu_id=...
#   type=...
#   priority=...
#   deadline=...
#   instructions=<base64>
#   requirements=<base64>
parse_issue_body() {
  local body="$1"

  local directive_id bu_id type priority deadline instructions requirements

  directive_id=$(_parse_board_comment "$body" "directive_id")
  bu_id=$(_parse_board_comment "$body" "bu_id")
  type=$(_parse_table_field "$body" "Tipo")
  priority=$(_parse_table_field "$body" "Prioridad")
  deadline=$(_parse_table_field "$body" "Deadline")

  # Normalize priority to uppercase
  priority=$(echo "$priority" | tr '[:lower:]' '[:upper:]')
  # Normalize type to uppercase with underscores
  type=$(echo "$type" | tr '[:lower:]' '[:upper:]' | tr ' -' '__')

  # Deadline: treat em-dash and variants as empty
  if [[ "$deadline" == "—" || "$deadline" == "--" || "$deadline" == "-" || -z "$deadline" ]]; then
    deadline=""
  fi

  # Extract sections and base64 encode to avoid pipe issues
  instructions=$(_parse_section "$body" "Instrucciones")
  requirements=$(_parse_section "$body" "Requisitos de implementación")

  local instructions_b64 requirements_b64
  instructions_b64=$(echo "$instructions" | base64 | tr -d '\n')
  requirements_b64=$(echo "$requirements" | base64 | tr -d '\n')

  echo "directive_id=${directive_id}"
  echo "bu_id=${bu_id}"
  echo "type=${type}"
  echo "priority=${priority}"
  echo "deadline=${deadline}"
  echo "instructions_b64=${instructions_b64}"
  echo "requirements_b64=${requirements_b64}"
}

# ── Format issue into the internal queue record ──
# Usage: format_issue_for_queue <repo> <number> <title> <body>
# Outputs: pipe-separated record:
#   {repo}|{number}|{directive_id}|{bu_id}|{type}|{priority}|{deadline}|{title}|{instructions_b64}|{requirements_b64}
format_issue_for_queue() {
  local repo="$1"
  local number="$2"
  local title="$3"
  local body="$4"

  # Parse body fields
  local directive_id bu_id type priority deadline instructions_b64 requirements_b64

  while IFS='=' read -r key value; do
    case "$key" in
      directive_id)    directive_id="$value" ;;
      bu_id)           bu_id="$value" ;;
      type)            type="$value" ;;
      priority)        priority="$value" ;;
      deadline)        deadline="$value" ;;
      instructions_b64) instructions_b64="$value" ;;
      requirements_b64) requirements_b64="$value" ;;
    esac
  done < <(parse_issue_body "$body")

  printf '%s|%s|%s|%s|%s|%s|%s|%s|%s|%s\n' \
    "$repo" \
    "$number" \
    "$directive_id" \
    "$bu_id" \
    "${type:-UNKNOWN}" \
    "${priority:-LOW}" \
    "${deadline:-}" \
    "$title" \
    "${instructions_b64:-}" \
    "${requirements_b64:-}"
}

# ── Fetch and format all board-directive issues from N repos ──
# Usage: fetch_all_issues <repo1> [repo2] ...
# Outputs: one formatted queue record per line
fetch_all_issues() {
  local repos=("$@")

  for repo in "${repos[@]}"; do
    [ -z "$repo" ] && continue
    ui_info "Fetching issues de ${repo}..."

    while IFS='|' read -r number title body_b64; do
      [ -z "$number" ] && continue

      # Decode body (portable: Linux -d, macOS -D)
      local body
      body=$(_b64decode "$body_b64")

      # Skip non-board issues
      if ! is_board_directive "$body"; then
        continue
      fi

      format_issue_for_queue "$repo" "$number" "$title" "$body"
    done < <(fetch_open_issues "$repo")
  done
}
