#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# Test: verificar que el parser procesa correctamente el formato
# de q-company Board (post-cambios 2026-03-25)
# ══════════════════════════════════════════════════════════════
#
# Usage: bash scripts/orchestrator/tests/test-issue-parse.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=../lib/ui.sh
source "${SCRIPT_DIR}/lib/ui.sh"
# shellcheck source=../lib/issues-fetch.sh
source "${SCRIPT_DIR}/lib/issues-fetch.sh"

PASS=0
FAIL=0

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ ${label}"
    PASS=$((PASS + 1))
  else
    echo "  ❌ ${label}"
    echo "     expected: '${expected}'"
    echo "     got:      '${actual}'"
    FAIL=$((FAIL + 1))
  fi
}

assert_true() {
  local label="$1"
  if eval "$2"; then
    echo "  ✅ ${label}"
    PASS=$((PASS + 1))
  else
    echo "  ❌ ${label}"
    FAIL=$((FAIL + 1))
  fi
}

# ── Sample body: formato exacto generado por q-company post-2026-03-25 ──
SAMPLE_BODY='<!-- Q-DIRECTIVE-META
directive_id: cmn6c4tie0001at03czi15ff3
signature: abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
-->
<!-- board:directive_id=cmn6c4tie0001at03czi15ff3 -->
<!-- board:bu_id=bu-test-456 -->
## Directiva del Board — Q Company

| Campo | Valor |
|---|---|
| Tipo | TECHNICAL_DIRECTIVE |
| Prioridad | HIGH |
| Deadline | 2026-06-15 |

## Instrucciones

Implementar soporte para llms.txt en el proyecto.

## Requisitos de implementación

- Crear el archivo llms.txt en la raíz
- Agregar tests unitarios'

# ── Sample body with dashed ID (edge case) ──
DASHED_BODY='<!-- board:directive_id=dir-test-123 -->
<!-- board:bu_id=bu-test-456 -->
| Tipo | FEATURE |
| Prioridad | LOW |
| Deadline | — |
## Instrucciones
Test con guiones en ID.
## Requisitos de implementación
- ninguno'

# ── Sample body with no deadline ──
NO_DEADLINE_BODY='<!-- board:directive_id=abc123 -->
<!-- board:bu_id=bu-1 -->
| Tipo | BUG_FIX |
| Prioridad | CRITICAL |
| Deadline | — |
## Instrucciones
Fix urgente.
## Requisitos de implementación
- fix the thing'

echo ""
echo "── Test: is_board_directive ──"
assert_true "detecta body con comment board:directive_id" 'is_board_directive "$SAMPLE_BODY"'
assert_true "detecta body con ID con guiones" 'is_board_directive "$DASHED_BODY"'
assert_true "no detecta body sin marker" '! is_board_directive "# Título\nSin marker aquí"'

echo ""
echo "── Test: _parse_board_comment ──"
assert_eq "directive_id CUID (sin guiones)" \
  "cmn6c4tie0001at03czi15ff3" \
  "$(_parse_board_comment "$SAMPLE_BODY" "directive_id")"

assert_eq "directive_id con guiones" \
  "dir-test-123" \
  "$(_parse_board_comment "$DASHED_BODY" "directive_id")"

assert_eq "bu_id" \
  "bu-test-456" \
  "$(_parse_board_comment "$SAMPLE_BODY" "bu_id")"

echo ""
echo "── Test: parse_issue_body (formato completo q-company) ──"
PARSED=$(parse_issue_body "$SAMPLE_BODY")

assert_eq "directive_id" "cmn6c4tie0001at03czi15ff3" \
  "$(echo "$PARSED" | grep "^directive_id=" | sed "s/^directive_id=//")"

assert_eq "bu_id" "bu-test-456" \
  "$(echo "$PARSED" | grep "^bu_id=" | sed "s/^bu_id=//")"

assert_eq "type" "TECHNICAL_DIRECTIVE" \
  "$(echo "$PARSED" | grep "^type=" | sed "s/^type=//")"

assert_eq "priority" "HIGH" \
  "$(echo "$PARSED" | grep "^priority=" | sed "s/^priority=//")"

assert_eq "deadline" "2026-06-15" \
  "$(echo "$PARSED" | grep "^deadline=" | sed "s/^deadline=//")"

# Verify instructions decode to expected content
INSTR_B64=$(echo "$PARSED" | grep "^instructions_b64=" | sed "s/^instructions_b64=//")
INSTR_TEXT=$(_b64decode "$INSTR_B64")
assert_true "instructions contiene texto esperado" \
  'echo "$INSTR_TEXT" | grep -q "llms.txt"'

echo ""
echo "── Test: deadline em-dash normalizado a vacío ──"
PARSED_ND=$(parse_issue_body "$NO_DEADLINE_BODY")
assert_eq "deadline em-dash → vacío" "" \
  "$(echo "$PARSED_ND" | grep "^deadline=" | sed "s/^deadline=//")"

echo ""
echo "── Test: ID con guiones en parse_issue_body ──"
PARSED_DASHED=$(parse_issue_body "$DASHED_BODY")
assert_eq "directive_id con guiones" "dir-test-123" \
  "$(echo "$PARSED_DASHED" | grep "^directive_id=" | sed "s/^directive_id=//")"

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Todos los tests pasaron (${PASS}/${PASS})"
  exit 0
else
  echo "❌ ${FAIL} test(s) fallaron (${PASS}/$((PASS + FAIL)) OK)"
  exit 1
fi
