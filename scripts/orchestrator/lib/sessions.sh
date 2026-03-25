#!/usr/bin/env bash
# ── Session detection from ROADMAP.md ──

# ── Parse ROADMAP.md to extract sessions ──
# Returns: "session_num|session_name|status" per line
# Status: completed / pending / in-progress
parse_roadmap() {
  local project_path="$1"
  local roadmap_file="${project_path}/ROADMAP.md"

  if [ ! -f "$roadmap_file" ]; then
    return 1
  fi

  if [ "$_JSON_TOOL" = "node" ] || [ "$_JSON_TOOL" = "" ]; then
    node -e "
const fs = require('fs');
const content = fs.readFileSync('${roadmap_file}', 'utf8');
const pattern = /###\\s+Sesi[oó]n\\s+(\\d+)\\s*:\\s*(.+?)(?:\\n|$)/gi;
let match;
while ((match = pattern.exec(content)) !== null) {
  let num = parseInt(match[1]);
  let name = match[2].trim();
  let status = 'pending';
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const nextMatch = rest.match(/###\\s+Sesi[oó]n\\s+\\d+/i);
  const section = nextMatch ? rest.slice(0, nextMatch.index) : rest;
  const head = section.slice(0, 200).toLowerCase();
  if (name.includes('~~') || name.includes('✅') || head.includes('[x]')) {
    status = 'completed'; name = name.replace(/[~✅]/g, '').trim();
  } else if (name.includes('🔄') || head.includes('en progreso')) {
    status = 'in-progress'; name = name.replace(/🔄/g, '').trim();
  }
  console.log(num + '|' + name + '|' + status);
}
"
  else
    "$_JSON_TOOL" -c "
import re
with open('${roadmap_file}') as f:
    content = f.read()
pattern = r'###\s+Sesi[oó]n\s+(\d+)\s*:\s*(.+?)(?:\n|$)'
for m in re.finditer(pattern, content, re.IGNORECASE):
    num = int(m.group(1))
    name = m.group(2).strip()
    start = m.end()
    nx = re.search(r'###\s+Sesi[oó]n\s+\d+', content[start:], re.IGNORECASE)
    end = start + nx.start() if nx else len(content)
    section = content[start:end]
    head = section[:200].lower()
    if '~~' in name or '✅' in name or '[x]' in head:
        status = 'completed'; name = re.sub(r'[~✅]', '', name).strip()
    elif '🔄' in name or 'en progreso' in head:
        status = 'in-progress'; name = re.sub(r'🔄', '', name).strip()
    else:
        status = 'pending'
    print(f'{num}|{name}|{status}')
"
  fi
}

# ── Count pending sessions ──
count_pending_sessions() {
  local project_path="$1"
  local count=0
  while IFS='|' read -r num name status; do
    if [ "$status" = "pending" ] || [ "$status" = "in-progress" ]; then
      count=$((count + 1))
    fi
  done < <(parse_roadmap "$project_path")
  echo "$count"
}

# ── Get next pending session number ──
next_pending_session() {
  local project_path="$1"
  while IFS='|' read -r num name status; do
    if [ "$status" = "pending" ] || [ "$status" = "in-progress" ]; then
      echo "$num"
      return 0
    fi
  done < <(parse_roadmap "$project_path")
  echo "0"
}

# ── Check if project has session prompt files ──
# Looks for scripts/sessions/session-*.md OR sessions/session-*.md
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
# Returns a string of flags: roadmap,sessions,prompts,claude-md
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

  # Remove trailing comma
  echo "${caps%,}"
}
