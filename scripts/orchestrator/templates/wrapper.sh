#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# Wrapper de q-orchestrator para: __PROJECT_SLUG__
# ══════════════════════════════════════════════════════════════
#
# Este archivo se genera una vez y apunta al orquestador central.
# No necesitás volver a descargarlo — solo mantené actualizado
# el repo del orquestador (q-saas-template).
#
# Uso:
#   ./orchestrate.sh                    # Menú interactivo
#   ./orchestrate.sh --mode continue    # Continuar roadmap
#   ./orchestrate.sh --model opus       # Usar Opus
#
set -euo pipefail

# ── Configuración del proyecto ──
PROJECT_SLUG="__PROJECT_SLUG__"
ORCHESTRATOR_PATH="__ORCHESTRATOR_PATH__"

# ── Resolver la ruta al orquestador ──
if [ ! -f "${ORCHESTRATOR_PATH}/q-orchestrator.sh" ]; then
  echo ""
  echo "  [ERROR] Orquestador no encontrado en: ${ORCHESTRATOR_PATH}"
  echo ""
  echo "  Opciones:"
  echo "    1. Cloná q-saas-template si no lo tenés:"
  echo "       git clone <repo-url> ~/q-saas-template"
  echo ""
  echo "    2. Editá este archivo y corregí ORCHESTRATOR_PATH"
  echo ""
  exit 1
fi

# ── Registrar este proyecto si no está registrado ──
# (lo hace silenciosamente la primera vez)
source "${ORCHESTRATOR_PATH}/lib/projects.sh"
source "${ORCHESTRATOR_PATH}/lib/ui.sh"
ensure_config

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT=$(add_project "$PROJECT_SLUG" "$PROJECT_DIR" "__REPO_SLUG__" "__BRANCH__" 2>/dev/null || echo "OK")

# ── Invocar orquestador con este proyecto preseleccionado ──
exec bash "${ORCHESTRATOR_PATH}/q-orchestrator.sh" --project "$PROJECT_SLUG" "$@"
