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

  if command -v python3 &>/dev/null; then
    python3 << 'PYEOF'
import re, sys

roadmap_path = sys.argv[1] if len(sys.argv) > 1 else ""
if not roadmap_path:
    sys.exit(1)

with open(roadmap_path) as f:
    content = f.read()

# Find session headers: ### Sesión N: name or ### Session N: name
# Also match checkboxes: - [x] or - [ ]
sessions = []
pattern = r'###\s+Sesi[oó]n\s+(\d+)\s*:\s*(.+?)(?:\n|$)'
matches = re.finditer(pattern, content, re.IGNORECASE)

for m in matches:
    num = int(m.group(1))
    name = m.group(2).strip()

    # Look for completion markers in the text after this header
    start = m.end()
    # Find next session header or end of file
    next_match = re.search(r'###\s+Sesi[oó]n\s+\d+', content[start:], re.IGNORECASE)
    end = start + next_match.start() if next_match else len(content)
    section = content[start:end]

    # Detect status from markers
    if '~~' in name or '✅' in name or '[x]' in section.lower()[:200]:
        status = 'completed'
        name = re.sub(r'[~✅]', '', name).strip()
    elif '🔄' in name or 'en progreso' in section.lower()[:200]:
        status = 'in-progress'
        name = re.sub(r'🔄', '', name).strip()
    else:
        status = 'pending'

    sessions.append(f"{num}|{name}|{status}")

for s in sessions:
    print(s)
PYEOF
  elif command -v node &>/dev/null; then
    node << 'NODEEOF'
const fs = require('fs');
const roadmapPath = process.argv[1] || '';
if (!roadmapPath) process.exit(1);

const content = fs.readFileSync(roadmapPath, 'utf8');
const pattern = /###\s+Sesi[oó]n\s+(\d+)\s*:\s*(.+?)(?:\n|$)/gi;
let match;
const sessions = [];

while ((match = pattern.exec(content)) !== null) {
  let num = parseInt(match[1]);
  let name = match[2].trim();
  let status = 'pending';

  // Look at section content
  const start = match.index + match[0].length;
  const nextPattern = /###\s+Sesi[oó]n\s+\d+/i;
  const rest = content.slice(start);
  const nextMatch = rest.match(nextPattern);
  const section = nextMatch ? rest.slice(0, nextMatch.index) : rest;
  const sectionHead = section.slice(0, 200).toLowerCase();

  if (name.includes('~~') || name.includes('✅') || sectionHead.includes('[x]')) {
    status = 'completed';
    name = name.replace(/[~✅]/g, '').trim();
  } else if (name.includes('🔄') || sectionHead.includes('en progreso')) {
    status = 'in-progress';
    name = name.replace(/🔄/g, '').trim();
  }

  sessions.push(`${num}|${name}|${status}`);
}

sessions.forEach(s => console.log(s));
NODEEOF
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
