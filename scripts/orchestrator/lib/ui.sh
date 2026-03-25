#!/usr/bin/env bash
# ── UI helpers for q-orchestrator ──

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  BOLD="\033[1m"
  DIM="\033[2m"
  RED="\033[31m"
  GREEN="\033[32m"
  YELLOW="\033[33m"
  CYAN="\033[36m"
  RESET="\033[0m"
else
  BOLD="" DIM="" RED="" GREEN="" YELLOW="" CYAN="" RESET=""
fi

# ── Display functions ──

ui_header() {
  clear
  echo ""
  echo -e "  ${BOLD}╔════════════════════════════════════════════════════════╗${RESET}"
  echo -e "  ${BOLD}║                                                        ║${RESET}"
  echo -e "  ${BOLD}║        Q - O R C H E S T R A T O R                     ║${RESET}"
  echo -e "  ${BOLD}║        Orquestador agnóstico de sesiones                ║${RESET}"
  echo -e "  ${BOLD}║                                                        ║${RESET}"
  echo -e "  ${BOLD}╚════════════════════════════════════════════════════════╝${RESET}"
  echo ""
}

ui_section() {
  local title="$1"
  echo ""
  echo -e "  ${BOLD}┌────────────────────────────────────────────────────────┐${RESET}"
  echo -e "  ${BOLD}│  ${CYAN}${title}${RESET}${BOLD}$(printf '%*s' $((52 - ${#title})) '')│${RESET}"
  echo -e "  ${BOLD}├────────────────────────────────────────────────────────┤${RESET}"
}

ui_section_end() {
  echo -e "  ${BOLD}└────────────────────────────────────────────────────────┘${RESET}"
}

ui_item() {
  local marker="$1"
  local text="$2"
  echo -e "  ${BOLD}│${RESET}   ${marker} ${text}$(printf '%*s' $((50 - ${#text} - ${#marker})) '')${BOLD}│${RESET}"
}

ui_empty() {
  echo -e "  ${BOLD}│${RESET}$(printf '%56s' '')${BOLD}│${RESET}"
}

ui_ok() {
  echo -e "  ${GREEN}[OK]${RESET} $1"
}

ui_warn() {
  echo -e "  ${YELLOW}[!!]${RESET} $1"
}

ui_error() {
  echo -e "  ${RED}[ERROR]${RESET} $1"
}

ui_info() {
  echo -e "  ${DIM}[INFO]${RESET} $1"
}

ui_prompt() {
  local prompt="$1"
  echo -ne "  ${BOLD}${prompt}${RESET} "
}

ui_confirm() {
  local prompt="${1:-¿Continuar?}"
  local answer
  ui_prompt "${prompt} (y/n):"
  read -r answer
  [[ "$answer" =~ ^[yYsS]$ ]]
}

# ── Menu builder ──
# Usage: ui_menu "title" "option1" "option2" ...
# Returns: selected index (1-based) in $MENU_CHOICE
MENU_CHOICE=""

ui_menu() {
  local title="$1"
  shift
  local options=("$@")
  local count=${#options[@]}

  ui_section "$title"
  ui_empty
  for i in "${!options[@]}"; do
    local num=$((i + 1))
    ui_item "[${num}]" "${options[$i]}"
  done
  ui_empty
  ui_section_end
  echo ""

  while true; do
    ui_prompt "Elegir opción [1-${count}]:"
    read -r MENU_CHOICE
    if [[ "$MENU_CHOICE" =~ ^[0-9]+$ ]] && [ "$MENU_CHOICE" -ge 1 ] && [ "$MENU_CHOICE" -le "$count" ]; then
      return 0
    fi
    ui_error "Opción inválida."
  done
}

# ── Spinner (for background waits) ──
ui_spinner() {
  local pid=$1
  local msg="${2:-Procesando...}"
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    echo -ne "\r  ${frames[$i]} ${msg}"
    i=$(( (i + 1) % ${#frames[@]} ))
    sleep 0.1
  done
  echo -ne "\r  ✓ ${msg}\n"
}
