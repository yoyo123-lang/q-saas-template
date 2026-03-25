#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# q-orchestrator — Orquestador agnóstico de sesiones Claude Code
# ══════════════════════════════════════════════════════════════
#
# Cross-platform (Linux, macOS, WSL, Git Bash on Windows).
# No hardcoded projects — register any repo, pick your workflow.
#
# Usage:
#   ./q-orchestrator.sh                    # Interactive menu
#   ./q-orchestrator.sh --project <slug>   # Skip project selection
#   ./q-orchestrator.sh --project <slug> --mode continue  # Auto-continue
#
set -euo pipefail

# ── Resolve script location ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Load libraries ──
source "${SCRIPT_DIR}/lib/ui.sh"
source "${SCRIPT_DIR}/lib/projects.sh"
source "${SCRIPT_DIR}/lib/sessions.sh"
source "${SCRIPT_DIR}/lib/runner.sh"

# ── Help ──
show_help() {
  echo "q-orchestrator — Orquestador agnóstico de sesiones Claude Code"
  echo ""
  echo "Usage:"
  echo "  ./q-orchestrator.sh                          Interactive menu"
  echo "  ./q-orchestrator.sh --project <slug>         Skip project selection"
  echo "  ./q-orchestrator.sh --project <slug> --mode continue"
  echo "  ./q-orchestrator.sh --model claude-opus-4-6"
  echo ""
  echo "Modes: continue, roadmap, cambio-grande, cambio, sesion"
  echo ""
  echo "Config: ~/.q-orchestrator/projects.json"
}

# ── Parse CLI args ──
ARG_PROJECT=""
ARG_MODE=""
ARG_MODEL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) ARG_PROJECT="$2"; shift 2 ;;
    --mode)    ARG_MODE="$2"; shift 2 ;;
    --model)   ARG_MODEL="$2"; shift 2 ;;
    --help|-h) show_help; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Check dependencies ──
check_deps() {
  local ok=true

  if ! command -v claude &>/dev/null; then
    ui_error "Claude CLI no encontrado. Instalá con: npm install -g @anthropic-ai/claude-code"
    ok=false
  fi

  if ! command -v git &>/dev/null; then
    ui_error "Git no encontrado."
    ok=false
  fi

  # On Windows, "python3" may be a Store alias that opens the Store instead of running.
  # Check node first (more likely on Windows), then python3 with a real execution test.
  local has_json_tool=false
  if command -v node &>/dev/null; then
    has_json_tool=true
  elif command -v python3 &>/dev/null && python3 -c "print('ok')" &>/dev/null; then
    has_json_tool=true
  elif command -v python &>/dev/null && python -c "print('ok')" &>/dev/null; then
    has_json_tool=true
  fi

  if [ "$has_json_tool" = false ]; then
    ui_error "Se necesita node o python3 para gestionar estado."
    ok=false
  fi

  if [ "$ok" = false ]; then
    echo ""
    ui_error "Hay dependencias faltantes. Resolvelas antes de continuar."
    exit 1
  fi
}

# ── Diagnostic ──
run_diagnostic() {
  ui_header
  ui_section "DIAGNÓSTICO DEL ENTORNO"
  ui_empty

  if command -v claude &>/dev/null; then
    ui_item "[OK]" "Claude CLI: $(claude --version 2>/dev/null || echo 'instalado')"
  else
    ui_item "[X]" "Claude CLI no encontrado"
  fi

  if command -v git &>/dev/null; then
    ui_item "[OK]" "$(git --version)"
  else
    ui_item "[X]" "Git no encontrado"
  fi

  if command -v node &>/dev/null; then
    ui_item "[OK]" "Node.js $(node --version)"
  else
    ui_item "[!!]" "Node.js no encontrado"
  fi

  # Test python3 with actual execution to avoid Windows Store alias
  local py_version
  if py_version=$(python3 --version 2>/dev/null) && [[ "$py_version" == *"Python"* ]]; then
    ui_item "[OK]" "$py_version"
  elif py_version=$(python --version 2>/dev/null) && [[ "$py_version" == *"Python"* ]]; then
    ui_item "[OK]" "$py_version"
  else
    ui_item "[--]" "Python no instalado (opcional si tenés Node)"
  fi

  local count
  count=$(project_count)
  ui_item "[OK]" "Proyectos registrados: ${count}"

  ui_empty
  ui_section_end

  # Show registered projects
  if [ "$count" -gt 0 ]; then
    ui_section "PROYECTOS REGISTRADOS"
    ui_empty
    while IFS='|' read -r idx slug path repo branch; do
      local caps
      caps=$(detect_capabilities "$path")
      ui_item "${idx}." "${slug} → ${path}"
      ui_item "  " "caps: ${caps:-ninguna}"
    done < <(list_projects)
    ui_empty
    ui_section_end
  fi

  echo ""
  read -rp "  Presioná Enter para volver..."
}

# ══════════════════════════════════════════════════════════════
# PROJECT MANAGEMENT
# ══════════════════════════════════════════════════════════════

manage_projects() {
  while true; do
    ui_header

    # Show GitHub option only if gh CLI is available
    if command -v gh &>/dev/null; then
      ui_menu "GESTIÓN DE PROYECTOS" \
        "Clonar desde GitHub" \
        "Registrar proyecto local" \
        "Ver proyectos registrados" \
        "Eliminar proyecto" \
        "Volver al menú principal"

      case "$MENU_CHOICE" in
        1) clone_from_github ;;
        2) register_project ;;
        3) show_projects ;;
        4) remove_project_menu ;;
        5) return ;;
      esac
    else
      ui_menu "GESTIÓN DE PROYECTOS" \
        "Registrar proyecto local" \
        "Ver proyectos registrados" \
        "Eliminar proyecto" \
        "Instalar GitHub CLI (instrucciones)" \
        "Volver al menú principal"

      case "$MENU_CHOICE" in
        1) register_project ;;
        2) show_projects ;;
        3) remove_project_menu ;;
        4) show_gh_install_help ;;
        5) return ;;
      esac
    fi
  done
}

# ── Clone from GitHub ──
clone_from_github() {
  echo ""

  # Check gh auth
  if ! gh auth status &>/dev/null 2>&1; then
    ui_error "No estás logueado en GitHub CLI."
    ui_info "Ejecutá: gh auth login"
    echo ""
    read -rp "  Presioná Enter para volver..."
    return
  fi

  ui_info "Buscando tus repositorios en GitHub..."
  echo ""

  # Fetch repos (owned by user, sorted by last push)
  local repos_raw
  repos_raw=$(gh repo list --limit 30 --json nameWithOwner,description,updatedAt --jq '.[] | .nameWithOwner + "|" + (.description // "sin descripción")' 2>/dev/null)

  if [ -z "$repos_raw" ]; then
    ui_error "No se pudieron obtener los repositorios."
    echo ""
    read -rp "  Presioná Enter para volver..."
    return
  fi

  # Build menu
  local repo_names=()
  local repo_options=()
  local i=1

  while IFS='|' read -r name desc; do
    repo_names+=("$name")
    # Truncate description for display
    local short_desc="${desc:0:40}"
    repo_options+=("${name} — ${short_desc}")
    i=$((i + 1))
  done <<< "$repos_raw"

  if [ ${#repo_names[@]} -eq 0 ]; then
    ui_warn "No se encontraron repositorios."
    echo ""
    read -rp "  Presioná Enter para volver..."
    return
  fi

  # Add search option at the end
  repo_options+=("Buscar otro repo por nombre")

  ui_menu "SELECCIONAR REPOSITORIO" "${repo_options[@]}"

  local selected_repo=""

  if [ "$MENU_CHOICE" -le "${#repo_names[@]}" ]; then
    selected_repo="${repo_names[$((MENU_CHOICE - 1))]}"
  else
    # Search by name
    echo ""
    ui_prompt "Nombre del repo (usuario/repo):"
    read -r selected_repo
    if [ -z "$selected_repo" ]; then return; fi

    # Verify it exists
    if ! gh repo view "$selected_repo" &>/dev/null 2>&1; then
      ui_error "Repo '${selected_repo}' no encontrado."
      echo ""
      read -rp "  Presioná Enter para volver..."
      return
    fi
  fi

  echo ""
  ui_info "Repo seleccionado: ${selected_repo}"

  # Ask where to clone
  local default_dir="$HOME/projects"
  ui_prompt "Carpeta destino (Enter para ${default_dir}):"
  read -r clone_dir
  [ -z "$clone_dir" ] && clone_dir="$default_dir"
  clone_dir="${clone_dir/#\~/$HOME}"

  # Create dir if needed
  mkdir -p "$clone_dir"

  # Extract repo name for the folder
  local repo_short="${selected_repo##*/}"
  local clone_path="${clone_dir}/${repo_short}"

  if [ -d "$clone_path" ]; then
    ui_warn "La carpeta ya existe: ${clone_path}"
    if ui_confirm "¿Usar la carpeta existente?"; then
      # Just register, don't clone
      :
    else
      echo ""
      read -rp "  Presioná Enter para volver..."
      return
    fi
  else
    echo ""
    ui_info "Clonando ${selected_repo}..."
    if ! gh repo clone "$selected_repo" "$clone_path" 2>&1; then
      ui_error "Error al clonar."
      echo ""
      read -rp "  Presioná Enter para volver..."
      return
    fi
    ui_ok "Clonado en: ${clone_path}"
  fi

  # Auto-register
  local slug="$repo_short"
  echo ""
  ui_prompt "Slug del proyecto (Enter para '${slug}'):"
  read -r custom_slug
  [ -n "$custom_slug" ] && slug="$custom_slug"

  # Detect default branch
  local branch
  branch=$(cd "$clone_path" && git symbolic-ref --short HEAD 2>/dev/null || echo "main")

  local result
  result=$(add_project "$slug" "$clone_path" "$selected_repo" "$branch")

  if [ "$result" = "OK" ]; then
    ui_ok "Proyecto '${slug}' registrado y listo para usar."
  elif [ "$result" = "DUPLICATE" ]; then
    ui_warn "Ya existe un proyecto con slug '${slug}'."
  fi

  echo ""
  read -rp "  Presioná Enter para continuar..."
}

# ── GitHub CLI install help ──
show_gh_install_help() {
  echo ""
  ui_section "INSTALAR GITHUB CLI"
  ui_empty
  ui_item "" "Windows: winget install GitHub.cli"
  ui_item "" "   o: choco install gh"
  ui_item "" ""
  ui_item "" "macOS:   brew install gh"
  ui_item "" "Linux:   https://github.com/cli/cli"
  ui_item "" ""
  ui_item "" "Después: gh auth login"
  ui_empty
  ui_section_end
  echo ""
  read -rp "  Presioná Enter para volver..."
}

register_project() {
  echo ""
  ui_prompt "Slug del proyecto (nombre corto, sin espacios):"
  read -r slug
  [ -z "$slug" ] && return

  ui_prompt "Ruta absoluta al proyecto:"
  read -r path
  [ -z "$path" ] && return

  # Expand ~ if present
  path="${path/#\~/$HOME}"

  ui_prompt "Repo GitHub (usuario/repo, Enter para omitir):"
  read -r repo

  ui_prompt "Branch principal (Enter para 'main'):"
  read -r branch
  [ -z "$branch" ] && branch="main"

  local result
  result=$(add_project "$slug" "$path" "$repo" "$branch")

  if [ "$result" = "OK" ]; then
    ui_ok "Proyecto '${slug}' registrado."
  elif [ "$result" = "DUPLICATE" ]; then
    ui_warn "Ya existe un proyecto con slug '${slug}'."
  else
    ui_error "Error al registrar proyecto."
  fi

  echo ""
  read -rp "  Presioná Enter para continuar..."
}

show_projects() {
  ui_header
  local count
  count=$(project_count)

  if [ "$count" -eq 0 ]; then
    ui_warn "No hay proyectos registrados."
    echo ""
    read -rp "  Presioná Enter para volver..."
    return
  fi

  ui_section "PROYECTOS REGISTRADOS"
  ui_empty

  while IFS='|' read -r idx slug path repo branch; do
    ui_item "${idx}." "${slug}"
    ui_item "  " "Path: ${path}"
    [ -n "$repo" ] && ui_item "  " "Repo: ${repo}"
    ui_item "  " "Branch: ${branch}"

    local caps
    caps=$(detect_capabilities "$path")
    ui_item "  " "Caps: ${caps:-ninguna detectada}"

    if [ -f "${path}/ROADMAP.md" ]; then
      local pending
      pending=$(count_pending_sessions "$path")
      local next
      next=$(next_pending_session "$path")
      ui_item "  " "Roadmap: ${pending} sesiones pendientes (próxima: ${next})"
    fi

    ui_empty
  done < <(list_projects)

  ui_section_end
  echo ""
  read -rp "  Presioná Enter para volver..."
}

remove_project_menu() {
  local count
  count=$(project_count)

  if [ "$count" -eq 0 ]; then
    ui_warn "No hay proyectos para eliminar."
    echo ""
    read -rp "  Presioná Enter para volver..."
    return
  fi

  echo ""
  show_projects

  ui_prompt "Número del proyecto a eliminar (0 para cancelar):"
  read -r num

  if [ "$num" = "0" ] || [ -z "$num" ]; then
    return
  fi

  local idx=$((num - 1))
  if [ "$idx" -lt 0 ] || [ "$idx" -ge "$count" ]; then
    ui_error "Número inválido."
    read -rp "  Presioná Enter para volver..."
    return
  fi

  local removed
  removed=$(remove_project "$idx")
  ui_ok "Proyecto '${removed}' eliminado del registro."
  echo ""
  read -rp "  Presioná Enter para continuar..."
}

# ══════════════════════════════════════════════════════════════
# PROJECT SELECTION
# ══════════════════════════════════════════════════════════════

# Selected project globals
SELECTED_SLUG=""
SELECTED_PATH=""
SELECTED_REPO=""
SELECTED_BRANCH=""

select_project() {
  if [ -n "$ARG_PROJECT" ]; then
    # Find by slug from CLI arg
    while IFS='|' read -r idx slug path repo branch; do
      if [ "$slug" = "$ARG_PROJECT" ]; then
        SELECTED_SLUG="$slug"
        SELECTED_PATH="$path"
        SELECTED_REPO="$repo"
        SELECTED_BRANCH="$branch"
        return 0
      fi
    done < <(list_projects)
    ui_error "Proyecto '${ARG_PROJECT}' no encontrado."
    return 1
  fi

  local count
  count=$(project_count)

  if [ "$count" -eq 0 ]; then
    ui_warn "No hay proyectos registrados. Registrá uno primero."
    register_project
    count=$(project_count)
    [ "$count" -eq 0 ] && return 1
  fi

  # Build options array
  local options=()
  local slugs=()
  local paths=()
  local repos=()
  local branches=()

  while IFS='|' read -r idx slug path repo branch; do
    local label="${slug} — ${path}"
    if [ -f "${path}/ROADMAP.md" ]; then
      local pending
      pending=$(count_pending_sessions "$path")
      label="${label} [${pending} pendientes]"
    fi
    options+=("$label")
    slugs+=("$slug")
    paths+=("$path")
    repos+=("$repo")
    branches+=("$branch")
  done < <(list_projects)

  ui_menu "SELECCIONAR PROYECTO" "${options[@]}"
  local idx=$((MENU_CHOICE - 1))

  SELECTED_SLUG="${slugs[$idx]}"
  SELECTED_PATH="${paths[$idx]}"
  SELECTED_REPO="${repos[$idx]}"
  SELECTED_BRANCH="${branches[$idx]}"

  return 0
}

# ══════════════════════════════════════════════════════════════
# MODEL SELECTION
# ══════════════════════════════════════════════════════════════

SELECTED_MODEL="$DEFAULT_MODEL"

select_model() {
  if [ -n "$ARG_MODEL" ]; then
    SELECTED_MODEL="$ARG_MODEL"
    return
  fi

  ui_menu "MODELO DE CLAUDE" \
    "Sonnet 4.6 (rápido, ~\$3-5/sesión)" \
    "Opus 4.6 (mejor calidad, ~\$15-25/sesión)" \
    "Haiku 4.5 (económico, tareas simples)"

  case "$MENU_CHOICE" in
    1) SELECTED_MODEL="claude-sonnet-4-6" ;;
    2) SELECTED_MODEL="claude-opus-4-6" ;;
    3) SELECTED_MODEL="claude-haiku-4-5-20251001" ;;
  esac
}

# ══════════════════════════════════════════════════════════════
# MODE SELECTION & EXECUTION
# ══════════════════════════════════════════════════════════════

select_and_run_mode() {
  local project_path="$SELECTED_PATH"
  local slug="$SELECTED_SLUG"
  local model="$SELECTED_MODEL"

  # ── Auto-pull: sync with remote before detecting capabilities ──
  if [ -d "${project_path}/.git" ]; then
    ui_info "Sincronizando con remoto..."
    local current_branch
    current_branch=$(cd "$project_path" && git symbolic-ref --short HEAD 2>/dev/null || echo "main")
    (cd "$project_path" && git pull origin "$current_branch" --ff-only 2>/dev/null) || true
  fi

  local caps
  caps=$(detect_capabilities "$project_path")

  # Build mode options based on capabilities
  local options=()
  local modes=()

  if [[ "$caps" == *"roadmap"* ]]; then
    local pending
    pending=$(count_pending_sessions "$project_path")
    options+=("Continuar roadmap (${pending} sesiones pendientes)")
    modes+=("continue")
  fi

  options+=("Crear roadmap nuevo")
  modes+=("roadmap")

  options+=("Cambio grande (multi-etapa con revisión)")
  modes+=("cambio-grande")

  options+=("Cambio puntual (1 etapa con revisión)")
  modes+=("cambio")

  options+=("Sesión libre (interactiva)")
  modes+=("sesion")

  ui_menu "MODO DE TRABAJO — ${slug}" "${options[@]}"
  local selected_mode="${modes[$((MENU_CHOICE - 1))]}"

  # Override with CLI arg if provided
  [ -n "$ARG_MODE" ] && selected_mode="$ARG_MODE"

  case "$selected_mode" in
    continue)  run_mode_continue "$project_path" "$slug" "$model" ;;
    roadmap)   run_mode_roadmap "$project_path" "$slug" "$model" ;;
    cambio-grande) run_mode_cambio_grande "$project_path" "$slug" "$model" ;;
    cambio)    run_mode_cambio "$project_path" "$slug" "$model" ;;
    sesion)    run_mode_sesion "$project_path" "$slug" "$model" ;;
  esac
}

# ── Mode: Continue roadmap ──
run_mode_continue() {
  local project_path="$1"
  local slug="$2"
  local model="$3"

  ui_header
  ui_section "ROADMAP — ${slug}"
  ui_empty

  # Show all sessions with status
  local sessions=()
  local session_nums=()
  local session_names=()
  local pending_indices=()
  local i=0

  while IFS='|' read -r num name status; do
    local marker="[ ]"
    [ "$status" = "completed" ] && marker="[X]"
    [ "$status" = "in-progress" ] && marker="[>]"
    ui_item "$marker" "S${num} ${name}"
    sessions+=("${num}|${name}|${status}")
    session_nums+=("$num")
    session_names+=("$name")
    if [ "$status" = "pending" ] || [ "$status" = "in-progress" ]; then
      pending_indices+=("$i")
    fi
    i=$((i + 1))
  done < <(parse_roadmap "$project_path")

  ui_empty
  ui_section_end

  if [ ${#pending_indices[@]} -eq 0 ]; then
    echo ""
    ui_ok "Todas las sesiones están completadas."
    read -rp "  Presioná Enter para volver..."
    return
  fi

  echo ""
  local next_idx="${pending_indices[0]}"
  local next_num="${session_nums[$next_idx]}"
  local next_name="${session_names[$next_idx]}"

  ui_info "Próxima sesión: S${next_num} — ${next_name}"
  echo ""

  ui_menu "¿QUÉ HACER?" \
    "Ejecutar S${next_num} (siguiente pendiente)" \
    "Elegir sesión específica" \
    "Ejecutar todas las pendientes (automático)" \
    "Volver"

  case "$MENU_CHOICE" in
    1)
      run_session_cambio_grande "$project_path" "$next_num" "$next_name" "$model" "$slug"
      ;;
    2)
      ui_prompt "Número de sesión:"
      read -r chosen_num
      local chosen_name=""
      for j in "${!session_nums[@]}"; do
        if [ "${session_nums[$j]}" = "$chosen_num" ]; then
          chosen_name="${session_names[$j]}"
          break
        fi
      done
      if [ -z "$chosen_name" ]; then
        ui_error "Sesión ${chosen_num} no encontrada en el roadmap."
        read -rp "  Presioná Enter para volver..."
        return
      fi
      run_session_cambio_grande "$project_path" "$chosen_num" "$chosen_name" "$model" "$slug"
      ;;
    3)
      echo ""
      ui_warn "Se van a ejecutar ${#pending_indices[@]} sesiones secuencialmente."
      if ui_confirm "¿Continuar?"; then
        for pidx in "${pending_indices[@]}"; do
          local snum="${session_nums[$pidx]}"
          local sname="${session_names[$pidx]}"
          echo ""
          echo -e "  ${BOLD}══════════════════════════════════════════${RESET}"
          echo -e "  ${BOLD}  SESIÓN ${snum}: ${sname}${RESET}"
          echo -e "  ${BOLD}══════════════════════════════════════════${RESET}"
          echo ""
          run_session_cambio_grande "$project_path" "$snum" "$sname" "$model" "$slug"
        done
        echo ""
        ui_ok "Todas las sesiones completadas."
      fi
      ;;
    4) return ;;
  esac

  echo ""
  read -rp "  Presioná Enter para continuar..."
}

# ── Mode: New roadmap ──
run_mode_roadmap() {
  local project_path="$1"
  local slug="$2"
  local model="$3"

  echo ""
  ui_prompt "Describí el proyecto en 1-2 oraciones:"
  read -r description

  if [ -z "$description" ]; then
    ui_error "Necesito una descripción del proyecto."
    return
  fi

  echo ""
  ui_info "Generando roadmap con Claude..."
  run_roadmap "$project_path" "$description" "$model"
  echo ""
  read -rp "  Presioná Enter para continuar..."
}

# ── Mode: Cambio grande ──
run_mode_cambio_grande() {
  local project_path="$1"
  local slug="$2"
  local model="$3"

  echo ""
  ui_prompt "Describí el cambio grande:"
  read -r description

  if [ -z "$description" ]; then
    ui_error "Necesito una descripción del cambio."
    return
  fi

  echo ""
  ui_info "Ejecutando cambio grande con Claude..."
  local prompt="Ejecutá /project:cambio-grande para este cambio: ${description}"
  run_claude "$project_path" "$prompt" "$model" "$DEFAULT_MAX_TURNS"
  echo ""
  read -rp "  Presioná Enter para continuar..."
}

# ── Mode: Cambio puntual ──
run_mode_cambio() {
  local project_path="$1"
  local slug="$2"
  local model="$3"

  echo ""
  ui_prompt "Describí el cambio:"
  read -r description

  if [ -z "$description" ]; then
    ui_error "Necesito una descripción del cambio."
    return
  fi

  echo ""
  ui_info "Ejecutando cambio con Claude..."
  run_cambio "$project_path" "$description" "$model"
  echo ""
  read -rp "  Presioná Enter para continuar..."
}

# ── Mode: Free session ──
run_mode_sesion() {
  local project_path="$1"
  local slug="$2"
  local model="$3"

  run_sesion "$project_path" "$model"
}

# ══════════════════════════════════════════════════════════════
# MAIN MENU
# ══════════════════════════════════════════════════════════════

main_menu() {
  while true; do
    ui_header

    # Show quick status
    local count
    count=$(project_count)
    ui_info "Proyectos registrados: ${count}"

    # Show projects with pending work
    if [ "$count" -gt 0 ]; then
      echo ""
      while IFS='|' read -r idx slug path repo branch; do
        if [ -f "${path}/ROADMAP.md" ]; then
          local pending
          pending=$(count_pending_sessions "$path")
          if [ "$pending" -gt 0 ]; then
            ui_info "  ${slug}: ${pending} sesiones pendientes"
          fi
        fi
      done < <(list_projects)
    fi

    ui_menu "MENÚ PRINCIPAL" \
      "Trabajar en un proyecto" \
      "Gestionar proyectos" \
      "Diagnóstico del entorno" \
      "Ver logs" \
      "Salir"

    case "$MENU_CHOICE" in
      1)
        if select_project; then
          select_model
          select_and_run_mode
        fi
        ;;
      2) manage_projects ;;
      3) run_diagnostic ;;
      4) view_logs ;;
      5) echo ""; echo "  Hasta luego!"; echo ""; exit 0 ;;
    esac
  done
}

# ── View logs ──
view_logs() {
  ui_header
  local log_dir="${CONFIG_DIR}/logs"

  if [ ! -d "$log_dir" ] || [ -z "$(ls -A "$log_dir" 2>/dev/null)" ]; then
    ui_warn "No hay logs todavía."
    echo ""
    read -rp "  Presioná Enter para volver..."
    return
  fi

  ui_section "LOGS RECIENTES"
  ui_empty

  local log_files=()
  while IFS= read -r f; do
    log_files+=("$f")
    local basename
    basename=$(basename "$f")
    ui_item "" "$basename"
  done < <(find "$log_dir" -name "*.log" -type f | sort -r | head -15)

  ui_empty
  ui_section_end

  echo ""
  ui_prompt "Nombre del log a ver (Enter para volver):"
  read -r log_name

  if [ -z "$log_name" ]; then
    return
  fi

  local found
  found=$(find "$log_dir" -name "*${log_name}*" -type f | head -1)
  if [ -n "$found" ]; then
    less "$found"
  else
    ui_error "Log no encontrado."
    read -rp "  Presioná Enter para volver..."
  fi
}

# ══════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════

check_deps
ensure_config

# If CLI args provide enough info, skip menu
if [ -n "$ARG_PROJECT" ] && [ -n "$ARG_MODE" ]; then
  if select_project; then
    [ -n "$ARG_MODEL" ] && SELECTED_MODEL="$ARG_MODEL"
    select_and_run_mode
  fi
  exit $?
fi

main_menu
