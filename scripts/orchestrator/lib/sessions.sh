#!/usr/bin/env bash
# ── Session detection from ROADMAP.md ──
# Progress is tracked in ~/.q-orchestrator/roadmap-progress/<slug>.json
# NOT by parsing markdown markers — that approach is fragile.

PROGRESS_DIR="${CONFIG_DIR}/roadmap-progress"
mkdir -p "$PROGRESS_DIR" 2>/dev/null

# ── Parse ROADMAP.md to extract session LIST (names only) ──
# Returns: "session_num|session_name" per line
# Does NOT determine status — that comes from the progress file
_list_roadmap_sessions() {
  local project_path="$1"
  local roadmap_file="${project_path}/ROADMAP.md"

  if [ ! -f "$roadmap_file" ]; then
    return 1
  fi

  local native_roadmap
  native_roadmap=$(_to_native_path "$roadmap_file")

  if [ "$_JSON_TOOL" = "node" ] || [ "$_JSON_TOOL" = "" ]; then
    node -e "
const fs = require('fs');
const content = fs.readFileSync('${native_roadmap}', 'utf8');
const pattern = /###\\s+Sesi[oó]n\\s+(\\d+)\\s*:\\s*(.+?)(?:\\n|$)/gi;
let match;
while ((match = pattern.exec(content)) !== null) {
  let num = parseInt(match[1]);
  let name = match[2].trim().replace(/[~✅🔄]/g, '').trim();
  console.log(num + '|' + name);
}
"
  else
    "$_JSON_TOOL" -c "
import re
with open('${native_roadmap}') as f:
    content = f.read()
pattern = r'###\s+Sesi[oó]n\s+(\d+)\s*:\s*(.+?)(?:\n|$)'
for m in re.finditer(pattern, content, re.IGNORECASE):
    num = int(m.group(1))
    name = re.sub(r'[~✅🔄]', '', m.group(2)).strip()
    print(f'{num}|{name}')
"
  fi
}

# ── Progress file path for a project ──
_progress_file() {
  local slug="$1"
  echo "${PROGRESS_DIR}/${slug}.json"
}

# ── Read completed sessions from progress file ──
# Returns space-separated list of completed session numbers
_read_completed_sessions() {
  local slug="$1"
  local pf
  pf=$(_to_native_path "$(_progress_file "$slug")")

  if [ ! -f "$(_progress_file "$slug")" ]; then
    echo ""
    return
  fi

  if [ "$_JSON_TOOL" = "node" ] || [ "$_JSON_TOOL" = "" ]; then
    node -e "
const d = JSON.parse(require('fs').readFileSync('${pf}', 'utf8'));
console.log((d.completed || []).join(' '));
"
  else
    "$_JSON_TOOL" -c "
import json
with open('${pf}') as f:
    d = json.load(f)
print(' '.join(str(x) for x in d.get('completed', [])))
"
  fi
}

# ── Mark a session as completed in progress file ──
mark_session_completed() {
  local slug="$1"
  local session_num="$2"
  local pf
  pf=$(_to_native_path "$(_progress_file "$slug")")

  mkdir -p "$PROGRESS_DIR" 2>/dev/null

  if [ "$_JSON_TOOL" = "node" ] || [ "$_JSON_TOOL" = "" ]; then
    node -e "
const fs = require('fs');
let d = {};
try { d = JSON.parse(fs.readFileSync('${pf}', 'utf8')); } catch(e) {}
if (!d.completed) d.completed = [];
const num = ${session_num};
if (!d.completed.includes(num)) d.completed.push(num);
d.completed.sort((a,b) => a - b);
d.updated_at = new Date().toISOString();
fs.writeFileSync('${pf}', JSON.stringify(d, null, 2));
"
  else
    "$_JSON_TOOL" -c "
import json, os
from datetime import datetime, timezone
pf = '${pf}'
d = {}
if os.path.exists(pf):
    with open(pf) as f:
        d = json.load(f)
completed = d.get('completed', [])
num = ${session_num}
if num not in completed:
    completed.append(num)
completed.sort()
d['completed'] = completed
d['updated_at'] = datetime.now(timezone.utc).isoformat()
with open(pf, 'w') as f:
    json.dump(d, f, indent=2)
"
  fi
}

# ── Reset progress (for new roadmap) ──
reset_roadmap_progress() {
  local slug="$1"
  local pf
  pf="$(_progress_file "$slug")"
  rm -f "$pf"
}

# ── Parse ROADMAP.md with status from progress file ──
# Returns: "session_num|session_name|status" per line
parse_roadmap() {
  local project_path="$1"
  local slug="${2:-}"

  # If no slug provided, try to find it from project path
  if [ -z "$slug" ]; then
    while IFS='|' read -r idx s p repo branch; do
      if [ "$p" = "$project_path" ]; then
        slug="$s"
        break
      fi
    done < <(list_projects)
  fi

  local completed_str=""
  if [ -n "$slug" ]; then
    completed_str=$(_read_completed_sessions "$slug")
  fi

  while IFS='|' read -r num name; do
    local status="pending"
    # Check if this session number is in the completed list
    for c in $completed_str; do
      if [ "$c" = "$num" ]; then
        status="completed"
        break
      fi
    done
    echo "${num}|${name}|${status}"
  done < <(_list_roadmap_sessions "$project_path")
}

# ── Count pending sessions ──
count_pending_sessions() {
  local project_path="$1"
  local slug="${2:-}"
  local count=0
  while IFS='|' read -r num name status; do
    if [ "$status" = "pending" ]; then
      count=$((count + 1))
    fi
  done < <(parse_roadmap "$project_path" "$slug")
  echo "$count"
}

# ── Get next pending session number ──
next_pending_session() {
  local project_path="$1"
  local slug="${2:-}"
  while IFS='|' read -r num name status; do
    if [ "$status" = "pending" ]; then
      echo "$num"
      return 0
    fi
  done < <(parse_roadmap "$project_path" "$slug")
  echo "0"
}

# ── Check if project has session prompt files ──
find_session_prompts_dir() {
  local project_path="$1"

  if [ -d "${project_path}/scripts/sessions" ]; then
    echo "${project_path}/scripts/sessions"
  elif [ -d "${project_path}/sessions" ]; then
    echo "${project_path}/sessions"
  else
    echo ""
  fi
}

# ── Check if project has support prompt files ──
find_support_prompts_dir() {
  local project_path="$1"

  if [ -d "${project_path}/scripts/prompts" ]; then
    echo "${project_path}/scripts/prompts"
  elif [ -d "${project_path}/prompts" ]; then
    echo "${project_path}/prompts"
  else
    echo ""
  fi
}

# ── Detect project capabilities ──
detect_capabilities() {
  local project_path="$1"
  local caps=""

  [ -f "${project_path}/ROADMAP.md" ] && caps="${caps}roadmap,"
  [ -n "$(find_session_prompts_dir "$project_path")" ] && caps="${caps}sessions,"
  [ -n "$(find_support_prompts_dir "$project_path")" ] && caps="${caps}prompts,"
  [ -f "${project_path}/CLAUDE.md" ] && caps="${caps}claude-md,"
  [ -f "${project_path}/.claude/commands/cambio-grande.md" ] && caps="${caps}cambio-grande,"
  [ -f "${project_path}/.claude/commands/cambio.md" ] && caps="${caps}cambio,"
  [ -f "${project_path}/.claude/commands/sesion.md" ] && caps="${caps}sesion,"

  echo "${caps%,}"
}
