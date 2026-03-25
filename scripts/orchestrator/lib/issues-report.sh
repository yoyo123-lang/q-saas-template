#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# q-orchestrator — Morning report generator (issues mode)
# ══════════════════════════════════════════════════════════════
#
# Output: ~/.q-orchestrator/reports/morning-report-{YYYYMMDD}.md
#
# Depends on: lib/config.sh (ORCH_ISSUES_REPORT_DIR), lib/ui.sh
#             lib/issues-queue.sh (_issue_state_file, ISSUES_STATE_DIR)
#

# ── Format seconds into human-readable duration ──
_format_duration() {
  local seconds="$1"
  if [ "$seconds" -ge 3600 ]; then
    printf '%dh %dm' "$((seconds / 3600))" "$(( (seconds % 3600) / 60 ))"
  elif [ "$seconds" -ge 60 ]; then
    printf '%dm %ds' "$((seconds / 60))" "$((seconds % 60))"
  else
    printf '%ds' "$seconds"
  fi
}

# ── Format a single issue result block for the report ──
# Usage: format_issue_result <repo> <issue_number> <status>
# Reads state file for details
format_issue_result() {
  local repo="$1"
  local issue_number="$2"
  local status="$3"

  local state_file
  state_file=$(_issue_state_file "$repo" "$issue_number")

  local repo_name="${repo##*/}"
  local directive_id pr_url started_at finished_at attempts last_log

  if [ -f "$state_file" ]; then
    directive_id=$(grep -o '"directive_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" \
      | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
    pr_url=$(grep -o '"pr_url"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" \
      | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
    started_at=$(grep -o '"started_at"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" \
      | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
    finished_at=$(grep -o '"finished_at"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" \
      | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
    attempts=$(grep -o '"attempts"[[:space:]]*:[[:space:]]*[0-9]*' "$state_file" \
      | grep -o '[0-9]*$' || echo "1")
    last_log=$(grep -o '"last_log"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" \
      | sed 's/.*"\([^"]*\)".*/\1/' || echo "")
  fi

  # Calculate duration if we have both timestamps
  local duration_str=""
  if [ -n "$started_at" ] && [ -n "$finished_at" ]; then
    local start_epoch end_epoch
    start_epoch=$(date -d "$started_at" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$started_at" +%s 2>/dev/null || echo "0")
    end_epoch=$(date -d "$finished_at" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$finished_at" +%s 2>/dev/null || echo "0")
    if [ "$start_epoch" -gt 0 ] && [ "$end_epoch" -gt 0 ]; then
      duration_str=$(_format_duration $(( end_epoch - start_epoch )))
    fi
  fi

  if [ "$status" = "completed" ]; then
    cat << EOF

### [${repo_name}] Issue #${issue_number}
- **Directive**: \`${directive_id:-desconocida}\`
- **PR**: ${pr_url:-*(no disponible)*}
- **Branch**: \`directive/${directive_id:-?}\`
- **Duración**: ${duration_str:-desconocida}
EOF
  else
    cat << EOF

### [${repo_name}] Issue #${issue_number}
- **Directive**: \`${directive_id:-desconocida}\`
- **Estado**: FALLÓ
- **Intentos**: ${attempts:-1}/${ORCH_CI_MAX_RETRIES:-3}
- **Log**: ${last_log:-*(no disponible)*}
- **Acción sugerida**: Revisar el log y re-procesar manualmente
EOF
  fi
}

# ── Generate the morning report ──
# Usage: generate_morning_report <run_id> <run_start_epoch> <completed> <failed> <total_queued> <results_tsv> <model>
generate_morning_report() {
  local run_id="$1"
  local run_start="$2"
  local completed="$3"
  local failed="$4"
  local total_queued="$5"
  local results_tsv="${6:-}"
  local model="${7:-}"

  local report_dir="${ORCH_ISSUES_REPORT_DIR:-${CONFIG_DIR}/reports}"
  mkdir -p "$report_dir"

  local date_str
  date_str=$(date +"%Y-%m-%d")
  local report_file="${report_dir}/morning-report-${date_str}.md"

  # Calculate run duration
  local run_end
  run_end=$(date +%s)
  local elapsed=$(( run_end - run_start ))
  local duration_str
  duration_str=$(_format_duration "$elapsed")

  local run_start_str
  run_start_str=$(date -d "@${run_start}" +"%H:%M" 2>/dev/null || \
    date -r "$run_start" +"%H:%M" 2>/dev/null || echo "?")
  local run_end_str
  run_end_str=$(date +"%H:%M")

  # Collect completed and failed records from results TSV
  local completed_records=() failed_records=()
  local not_processed=$(( total_queued - completed - failed ))

  if [ -n "$results_tsv" ] && [ -f "$results_tsv" ]; then
    while IFS='|' read -r repo number status pr_url; do
      [ -z "$repo" ] && continue
      if [ "$status" = "completed" ]; then
        completed_records+=("${repo}|${number}|${pr_url}")
      else
        failed_records+=("${repo}|${number}|")
      fi
    done < "$results_tsv"
  fi

  # ── Write report ──
  {
    cat << EOF
# Morning Report — ${date_str}

> Corrida: ${run_start_str} — ${run_end_str} | Duración: ${duration_str}
> Issues procesados: $((completed + failed))/${total_queued} | PRs creados: ${completed}
> Modelo: ${model:-desconocido} | Run ID: ${run_id}

EOF

    # Completed section
    if [ ${#completed_records[@]} -gt 0 ]; then
      echo "## Completados (${#completed_records[@]})"
      for rec in "${completed_records[@]}"; do
        local repo number
        IFS='|' read -r repo number _ <<< "$rec"
        format_issue_result "$repo" "$number" "completed"
      done
      echo ""
    fi

    # Failed section
    if [ ${#failed_records[@]} -gt 0 ]; then
      echo "## Fallidos (${#failed_records[@]})"
      for rec in "${failed_records[@]}"; do
        local repo number
        IFS='|' read -r repo number _ <<< "$rec"
        format_issue_result "$repo" "$number" "failed"
      done
      echo ""
    fi

    # Pending / not processed
    if [ "$not_processed" -gt 0 ]; then
      echo "## Pendientes (no procesados por límite o sin cambios)"
      echo ""
      echo "> ${not_processed} issues no fueron procesados en esta corrida."
      echo "> Aumentá ORCH_ISSUES_MAX_PER_RUN o ejecutá de nuevo mañana."
      echo ""
    fi

    # Footer
    echo "---"
    echo ""
    echo "*Generado por q-orchestrator modo issues — $(date)*"
  } > "$report_file"

  ui_ok "Morning report: ${report_file}"
}
