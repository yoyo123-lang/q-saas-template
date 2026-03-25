#!/usr/bin/env bash
# ── Project registry for q-orchestrator ──

CONFIG_DIR="${Q_ORCH_CONFIG_DIR:-$HOME/.q-orchestrator}"
PROJECTS_FILE="${CONFIG_DIR}/projects.json"
STATE_DIR="${CONFIG_DIR}/state"

# ── Ensure config exists ──
ensure_config() {
  mkdir -p "$CONFIG_DIR" "$STATE_DIR"
  if [ ! -f "$PROJECTS_FILE" ]; then
    echo '{"projects":[]}' > "$PROJECTS_FILE"
  fi
}

# ── List projects ──
# Returns JSON array of projects
list_projects() {
  ensure_config
  if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
with open('$PROJECTS_FILE') as f:
    data = json.load(f)
for i, p in enumerate(data['projects']):
    print(f\"{i+1}|{p['slug']}|{p['path']}|{p.get('repo','')}|{p.get('branch','main')}\")
"
  elif command -v node &>/dev/null; then
    node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$PROJECTS_FILE','utf8'));
data.projects.forEach((p,i) => {
  console.log((i+1)+'|'+p.slug+'|'+p.path+'|'+(p.repo||'')+'|'+(p.branch||'main'));
});
"
  else
    ui_error "Se necesita python3 o node para leer configuración."
    return 1
  fi
}

# ── Get project count ──
project_count() {
  ensure_config
  if command -v python3 &>/dev/null; then
    python3 -c "import json; print(len(json.load(open('$PROJECTS_FILE'))['projects']))"
  elif command -v node &>/dev/null; then
    node -e "console.log(JSON.parse(require('fs').readFileSync('$PROJECTS_FILE','utf8')).projects.length)"
  fi
}

# ── Get project field by index (0-based) ──
get_project_field() {
  local idx="$1"
  local field="$2"
  ensure_config
  if command -v python3 &>/dev/null; then
    python3 -c "
import json
data = json.load(open('$PROJECTS_FILE'))
print(data['projects'][$idx].get('$field',''))
"
  elif command -v node &>/dev/null; then
    node -e "
const d=JSON.parse(require('fs').readFileSync('$PROJECTS_FILE','utf8'));
console.log(d.projects[$idx]?.['$field']||'');
"
  fi
}

# ── Add project ──
add_project() {
  local slug="$1"
  local path="$2"
  local repo="${3:-}"
  local branch="${4:-main}"

  ensure_config

  # Validate path
  if [ ! -d "$path" ]; then
    ui_error "El directorio no existe: $path"
    return 1
  fi

  if [ ! -d "$path/.git" ]; then
    ui_warn "No es un repositorio git: $path"
  fi

  if command -v python3 &>/dev/null; then
    python3 -c "
import json
with open('$PROJECTS_FILE') as f:
    data = json.load(f)
# Check for duplicate slug
for p in data['projects']:
    if p['slug'] == '$slug':
        print('DUPLICATE')
        exit(0)
data['projects'].append({
    'slug': '$slug',
    'path': '$path',
    'repo': '$repo',
    'branch': '$branch'
})
with open('$PROJECTS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
print('OK')
"
  elif command -v node &>/dev/null; then
    node -e "
const fs=require('fs');
const d=JSON.parse(fs.readFileSync('$PROJECTS_FILE','utf8'));
if(d.projects.some(p=>p.slug==='$slug')){console.log('DUPLICATE');process.exit(0);}
d.projects.push({slug:'$slug',path:'$path',repo:'$repo',branch:'$branch'});
fs.writeFileSync('$PROJECTS_FILE',JSON.stringify(d,null,2));
console.log('OK');
"
  fi
}

# ── Remove project by index (0-based) ──
remove_project() {
  local idx="$1"
  ensure_config
  if command -v python3 &>/dev/null; then
    python3 -c "
import json
with open('$PROJECTS_FILE') as f:
    data = json.load(f)
removed = data['projects'].pop($idx)
with open('$PROJECTS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
print(removed['slug'])
"
  elif command -v node &>/dev/null; then
    node -e "
const fs=require('fs');
const d=JSON.parse(fs.readFileSync('$PROJECTS_FILE','utf8'));
const r=d.projects.splice($idx,1)[0];
fs.writeFileSync('$PROJECTS_FILE',JSON.stringify(d,null,2));
console.log(r.slug);
"
  fi
}

# ── State management per project ──

get_state_file() {
  local slug="$1"
  echo "${STATE_DIR}/${slug}.json"
}

read_state() {
  local slug="$1"
  local field="$2"
  local state_file
  state_file=$(get_state_file "$slug")

  if [ ! -f "$state_file" ]; then
    echo ""
    return
  fi

  if command -v python3 &>/dev/null; then
    python3 -c "
import json
with open('$state_file') as f:
    data = json.load(f)
print(data.get('$field', ''))
"
  elif command -v node &>/dev/null; then
    node -e "
const d=JSON.parse(require('fs').readFileSync('$state_file','utf8'));
console.log(d['$field']||'');
"
  fi
}

save_state() {
  local slug="$1"
  local session="$2"
  local step="$3"
  local status="$4"
  local state_file
  state_file=$(get_state_file "$slug")

  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  if command -v python3 &>/dev/null; then
    python3 -c "
import json
data = {
    'session': $session,
    'step': '$step',
    'status': '$status',
    'updated_at': '$timestamp'
}
with open('$state_file', 'w') as f:
    json.dump(data, f, indent=2)
"
  elif command -v node &>/dev/null; then
    node -e "
const fs=require('fs');
fs.writeFileSync('$state_file',JSON.stringify({
  session:$session,step:'$step',status:'$status',updated_at:'$timestamp'
},null,2));
"
  fi
}
