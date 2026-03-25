#!/usr/bin/env bash
# ── Project registry for q-orchestrator ──

CONFIG_DIR="${Q_ORCH_CONFIG_DIR:-$HOME/.q-orchestrator}"
PROJECTS_FILE="${CONFIG_DIR}/projects.json"
STATE_DIR="${CONFIG_DIR}/state"

# ── Convert Git Bash paths (/c/Users/...) to Windows paths (C:/Users/...) ──
# Node.js on Windows doesn't understand MSYS-style /c/ paths.
_to_native_path() {
  if command -v cygpath &>/dev/null; then
    cygpath -m "$1"
  else
    echo "$1"
  fi
}

# ── Detect JSON tool (node preferred — works reliably on Windows) ──
_JSON_TOOL=""
_detect_json_tool() {
  if [ -n "$_JSON_TOOL" ]; then return; fi
  if command -v node &>/dev/null; then
    _JSON_TOOL="node"
  elif command -v python3 &>/dev/null && python3 -c "print('ok')" &>/dev/null; then
    _JSON_TOOL="python3"
  elif command -v python &>/dev/null && python -c "print('ok')" &>/dev/null; then
    _JSON_TOOL="python"
  fi
}
_detect_json_tool

# ── Run a snippet in the detected JSON tool ──
_run_json() {
  local node_code="$1"
  local python_code="$2"
  case "$_JSON_TOOL" in
    node)    node -e "$node_code" ;;
    python3) python3 -c "$python_code" ;;
    python)  python -c "$python_code" ;;
    *)       echo "[ERROR] No JSON tool (need node or python3)" >&2; return 1 ;;
  esac
}

# ── Ensure config exists ──
ensure_config() {
  mkdir -p "$CONFIG_DIR" "$STATE_DIR"
  if [ ! -f "$PROJECTS_FILE" ]; then
    echo '{"projects":[]}' > "$PROJECTS_FILE"
  fi
}

# ── Helper: get native path for PROJECTS_FILE ──
_pf() { _to_native_path "$PROJECTS_FILE"; }

# ── Helper: get native path for a state file ──
_sf() { _to_native_path "${STATE_DIR}/${1}.json"; }

# ── List projects ──
list_projects() {
  ensure_config
  local pf; pf=$(_pf)
  _run_json \
    "const fs=require('fs');
const data=JSON.parse(fs.readFileSync('$pf','utf8'));
data.projects.forEach((p,i)=>{
  console.log((i+1)+'|'+p.slug+'|'+p.path+'|'+(p.repo||'')+'|'+(p.branch||'main'));
});" \
    "
import json
with open('$pf') as f:
    data = json.load(f)
for i, p in enumerate(data['projects']):
    print(f\"{i+1}|{p['slug']}|{p['path']}|{p.get('repo','')}|{p.get('branch','main')}\")
"
}

# ── Get project count ──
project_count() {
  ensure_config
  local pf; pf=$(_pf)
  _run_json \
    "console.log(JSON.parse(require('fs').readFileSync('$pf','utf8')).projects.length)" \
    "import json; print(len(json.load(open('$pf'))['projects']))"
}

# ── Get project field by index (0-based) ──
get_project_field() {
  local idx="$1" field="$2"
  ensure_config
  local pf; pf=$(_pf)
  _run_json \
    "const d=JSON.parse(require('fs').readFileSync('$pf','utf8'));
console.log(d.projects[$idx]?.['$field']||'');" \
    "
import json
data = json.load(open('$pf'))
print(data['projects'][$idx].get('$field',''))
"
}

# ── Add project ──
add_project() {
  local slug="$1" path="$2" repo="${3:-}" branch="${4:-main}"
  ensure_config

  if [ ! -d "$path" ]; then
    ui_error "El directorio no existe: $path"
    return 1
  fi
  [ ! -d "$path/.git" ] && ui_warn "No es un repositorio git: $path"

  local pf; pf=$(_pf)
  # Convert the project path to native too (stored in JSON, read by node later)
  local native_path; native_path=$(_to_native_path "$path")

  _run_json \
    "const fs=require('fs');
const d=JSON.parse(fs.readFileSync('$pf','utf8'));
if(d.projects.some(p=>p.slug==='$slug')){console.log('DUPLICATE');process.exit(0);}
d.projects.push({slug:'$slug',path:'$native_path',repo:'$repo',branch:'$branch'});
fs.writeFileSync('$pf',JSON.stringify(d,null,2));
console.log('OK');" \
    "
import json
with open('$pf') as f:
    data = json.load(f)
for p in data['projects']:
    if p['slug'] == '$slug':
        print('DUPLICATE')
        exit(0)
data['projects'].append({
    'slug': '$slug',
    'path': '$native_path',
    'repo': '$repo',
    'branch': '$branch'
})
with open('$pf', 'w') as f:
    json.dump(data, f, indent=2)
print('OK')
"
}

# ── Remove project by index (0-based) ──
remove_project() {
  local idx="$1"
  ensure_config
  local pf; pf=$(_pf)
  _run_json \
    "const fs=require('fs');
const d=JSON.parse(fs.readFileSync('$pf','utf8'));
const r=d.projects.splice($idx,1)[0];
fs.writeFileSync('$pf',JSON.stringify(d,null,2));
console.log(r.slug);" \
    "
import json
with open('$pf') as f:
    data = json.load(f)
removed = data['projects'].pop($idx)
with open('$pf', 'w') as f:
    json.dump(data, f, indent=2)
print(removed['slug'])
"
}

# ── State management per project ──

get_state_file() {
  echo "${STATE_DIR}/${1}.json"
}

read_state() {
  local slug="$1" field="$2"
  local state_file="${STATE_DIR}/${slug}.json"

  if [ ! -f "$state_file" ]; then
    echo ""; return
  fi

  local sf; sf=$(_sf "$slug")
  _run_json \
    "const d=JSON.parse(require('fs').readFileSync('$sf','utf8'));
console.log(d['$field']||'');" \
    "
import json
with open('$sf') as f:
    data = json.load(f)
print(data.get('$field', ''))
"
}

save_state() {
  local slug="$1" session="$2" step="$3" status="$4"
  local sf; sf=$(_sf "$slug")
  local timestamp; timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  _run_json \
    "const fs=require('fs');
fs.writeFileSync('$sf',JSON.stringify({
  session:$session,step:'$step',status:'$status',updated_at:'$timestamp'
},null,2));" \
    "
import json
data = {
    'session': $session,
    'step': '$step',
    'status': '$status',
    'updated_at': '$timestamp'
}
with open('$sf', 'w') as f:
    json.dump(data, f, indent=2)
"
}
