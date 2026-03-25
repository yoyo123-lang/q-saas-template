#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# q-orchestrator — Structured telemetry & log export
# ══════════════════════════════════════════════════════════════
#
# Records structured events (JSONL) during orchestration runs.
# Used for diagnosing bottlenecks, tuning config, and improving
# the orchestrator itself.
#
# Event log:   ~/.q-orchestrator/telemetry/<slug>/<run-id>.jsonl
# Export:      ~/.q-orchestrator/exports/<slug>-<timestamp>.md
#

TELEMETRY_DIR="${CONFIG_DIR}/telemetry"

# ── Current run state ──
_CURRENT_RUN_ID=""
_CURRENT_RUN_LOG=""
_RUN_START_EPOCH=""

# ── Start a new run ──
telemetry_start_run() {
  local slug="$1"
  local session_num="$2"
  local model="$3"

  _CURRENT_RUN_ID="${slug}-s${session_num}-$(date +%Y%m%d-%H%M%S)"
  _RUN_START_EPOCH=$(date +%s)

  local run_dir="${TELEMETRY_DIR}/${slug}"
  mkdir -p "$run_dir"
  _CURRENT_RUN_LOG="${run_dir}/${_CURRENT_RUN_ID}.jsonl"

  # Record run start with full config snapshot
  _emit_event "run_start" \
    "session_num" "$session_num" \
    "model" "$model" \
    "config_max_turns_implement" "$ORCH_MAX_TURNS_IMPLEMENT" \
    "config_max_turns_support" "$ORCH_MAX_TURNS_SUPPORT" \
    "config_max_turns_build" "$ORCH_MAX_TURNS_BUILD" \
    "config_max_turns_ci_fix" "$ORCH_MAX_TURNS_CI_FIX" \
    "config_ci_max_retries" "$ORCH_CI_MAX_RETRIES" \
    "config_skip_roles" "$ORCH_SKIP_ROLES" \
    "config_skip_fix" "$ORCH_SKIP_FIX" \
    "config_skip_docs" "$ORCH_SKIP_DOCS" \
    "config_on_step_fail" "$ORCH_ON_STEP_FAIL" \
    "config_on_ci_exhaust" "$ORCH_ON_CI_EXHAUST" \
    "config_skip_permissions" "$ORCH_SKIP_PERMISSIONS" \
    "os" "$(uname -s 2>/dev/null || echo 'unknown')" \
    "node_version" "$(node --version 2>/dev/null || echo 'none')" \
    "claude_version" "$(claude --version 2>/dev/null || echo 'unknown')"
}

# ── Record a step starting ──
telemetry_step_start() {
  local step_name="$1"
  local max_turns="$2"

  # Store start time in a temp var for duration calc
  eval "_STEP_START_${step_name//[^a-zA-Z0-9]/_}=$(date +%s)"

  _emit_event "step_start" \
    "step" "$step_name" \
    "max_turns" "$max_turns"
}

# ── Record a step completing ──
telemetry_step_end() {
  local step_name="$1"
  local exit_code="$2"
  local outcome="$3"  # "success", "failed", "skipped", "max_turns_reached"

  # Calculate duration
  local var_name="_STEP_START_${step_name//[^a-zA-Z0-9]/_}"
  local start_epoch="${!var_name:-0}"
  local end_epoch
  end_epoch=$(date +%s)
  local duration=$((end_epoch - start_epoch))

  _emit_event "step_end" \
    "step" "$step_name" \
    "exit_code" "$exit_code" \
    "outcome" "$outcome" \
    "duration_seconds" "$duration"
}

# ── Record CI attempt ──
telemetry_ci_attempt() {
  local attempt_num="$1"
  local max_retries="$2"
  local result="$3"  # "pass", "fail", "fix_attempted"

  _emit_event "ci_attempt" \
    "attempt" "$attempt_num" \
    "max_retries" "$max_retries" \
    "result" "$result"
}

# ── Record push attempt ──
telemetry_push_attempt() {
  local attempt_num="$1"
  local result="$2"  # "success", "network_error", "failed"

  _emit_event "push_attempt" \
    "attempt" "$attempt_num" \
    "result" "$result"
}

# ── Record run end ──
telemetry_end_run() {
  local final_status="$1"  # "completed", "failed", "aborted"

  local end_epoch
  end_epoch=$(date +%s)
  local total_duration=$((end_epoch - _RUN_START_EPOCH))

  _emit_event "run_end" \
    "status" "$final_status" \
    "total_duration_seconds" "$total_duration"
}

# ── Record an arbitrary note (for debugging) ──
telemetry_note() {
  local message="$1"
  _emit_event "note" "message" "$message"
}

# ── Emit a JSONL event ──
_emit_event() {
  [ -z "$_CURRENT_RUN_LOG" ] && return

  local event_type="$1"
  shift

  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Build JSON using node (already validated as available)
  local pairs_json="{"
  pairs_json+="\"ts\":\"${timestamp}\","
  pairs_json+="\"event\":\"${event_type}\","
  pairs_json+="\"run_id\":\"${_CURRENT_RUN_ID}\""

  while [ $# -ge 2 ]; do
    local key="$1"
    local val="$2"
    shift 2
    # Escape quotes in value
    val="${val//\"/\\\"}"
    pairs_json+=",\"${key}\":\"${val}\""
  done

  pairs_json+="}"

  echo "$pairs_json" >> "$_CURRENT_RUN_LOG"
}

# ══════════════════════════════════════════════════════════════
# LOG EXPORT — generates a diagnostic markdown report
# ══════════════════════════════════════════════════════════════

export_diagnostic_report() {
  local slug="$1"
  local output_dir="${CONFIG_DIR}/exports"
  mkdir -p "$output_dir"

  local telemetry_path="${TELEMETRY_DIR}/${slug}"
  if [ ! -d "$telemetry_path" ] || [ -z "$(ls -A "$telemetry_path" 2>/dev/null)" ]; then
    ui_error "No hay datos de telemetría para '${slug}'."
    return 1
  fi

  local timestamp
  timestamp=$(date +%Y%m%d-%H%M%S)
  local output_file="${output_dir}/${slug}-diagnostic-${timestamp}.md"

  _run_json \
    "
const fs = require('fs');
const path = require('path');

const telDir = '$telemetry_path';
const files = fs.readdirSync(telDir).filter(f => f.endsWith('.jsonl')).sort();

if (files.length === 0) { console.log('NO_DATA'); process.exit(0); }

// Parse all events
const runs = [];
let currentRun = null;

for (const file of files) {
  const lines = fs.readFileSync(path.join(telDir, file), 'utf8').trim().split('\n');
  for (const line of lines) {
    try {
      const ev = JSON.parse(line);
      if (ev.event === 'run_start') {
        currentRun = { id: ev.run_id, events: [ev], steps: [], ci_attempts: [], config: ev };
        runs.push(currentRun);
      } else if (currentRun) {
        currentRun.events.push(ev);
        if (ev.event === 'step_end') currentRun.steps.push(ev);
        if (ev.event === 'ci_attempt') currentRun.ci_attempts.push(ev);
      }
    } catch(e) {}
  }
}

// Generate report
let md = '# Diagnostic Report: ${slug}\n\n';
md += '> Generated: ' + new Date().toISOString() + '\n';
md += '> Total runs analyzed: ' + runs.length + '\n\n';

// ── Summary table ──
md += '## Run Summary\n\n';
md += '| Run | Session | Model | Duration | Steps | CI Retries | Status |\n';
md += '|-----|---------|-------|----------|-------|------------|--------|\n';

for (const run of runs) {
  const endEv = run.events.find(e => e.event === 'run_end');
  const status = endEv ? endEv.status : 'unknown';
  const duration = endEv ? Math.round(parseInt(endEv.total_duration_seconds) / 60) + 'min' : '?';
  const model = (run.config.model || '').replace('claude-', '');
  const session = run.config.session_num || '?';
  const stepCount = run.steps.length;
  const ciRetries = run.ci_attempts.length;
  md += '| ' + run.id.slice(-15) + ' | S' + session + ' | ' + model + ' | ' + duration + ' | ' + stepCount + ' | ' + ciRetries + ' | ' + status + ' |\n';
}

// ── Step performance ──
md += '\n## Step Performance\n\n';
md += '| Step | Avg Duration | Success Rate | Max Turns Hit | Total Runs |\n';
md += '|------|-------------|-------------|---------------|------------|\n';

const stepStats = {};
for (const run of runs) {
  for (const s of run.steps) {
    if (!stepStats[s.step]) stepStats[s.step] = { durations: [], outcomes: [], count: 0 };
    stepStats[s.step].durations.push(parseInt(s.duration_seconds) || 0);
    stepStats[s.step].outcomes.push(s.outcome);
    stepStats[s.step].count++;
  }
}

for (const [step, stats] of Object.entries(stepStats)) {
  const avgDur = Math.round(stats.durations.reduce((a,b) => a+b, 0) / stats.count / 60) + 'min';
  const successRate = Math.round(stats.outcomes.filter(o => o === 'success').length / stats.count * 100) + '%';
  const maxTurnsHit = stats.outcomes.filter(o => o === 'max_turns_reached').length;
  md += '| ' + step + ' | ' + avgDur + ' | ' + successRate + ' | ' + maxTurnsHit + ' | ' + stats.count + ' |\n';
}

// ── CI Analysis ──
md += '\n## CI Retry Analysis\n\n';
const ciTotal = runs.reduce((a, r) => a + r.ci_attempts.length, 0);
const ciPasses = runs.reduce((a, r) => a + r.ci_attempts.filter(c => c.result === 'pass').length, 0);
const ciFails = runs.reduce((a, r) => a + r.ci_attempts.filter(c => c.result === 'fail').length, 0);

md += '- Total CI attempts: ' + ciTotal + '\n';
md += '- First-try passes: ' + ciPasses + '\n';
md += '- Failures requiring retry: ' + ciFails + '\n';
if (ciTotal > 0) {
  md += '- First-try success rate: ' + Math.round(ciPasses / ciTotal * 100) + '%\n';
}

// ── Config used across runs ──
md += '\n## Config History\n\n';
md += '| Run | max_impl | max_support | max_build | max_ci_fix | ci_retries | skip_roles | skip_perms |\n';
md += '|-----|----------|-------------|-----------|------------|------------|------------|------------|\n';

for (const run of runs) {
  const c = run.config;
  md += '| ' + run.id.slice(-15) + ' | ' + (c.config_max_turns_implement||'?') + ' | ' + (c.config_max_turns_support||'?') + ' | ' + (c.config_max_turns_build||'?') + ' | ' + (c.config_max_turns_ci_fix||'?') + ' | ' + (c.config_ci_max_retries||'?') + ' | ' + (c.config_skip_roles||'?') + ' | ' + (c.config_skip_permissions||'?') + ' |\n';
}

// ── Failure patterns ──
md += '\n## Failure Patterns\n\n';
const failures = [];
for (const run of runs) {
  for (const s of run.steps) {
    if (s.outcome !== 'success' && s.outcome !== 'skipped') {
      failures.push({ run: run.id, step: s.step, outcome: s.outcome, exit: s.exit_code, dur: s.duration_seconds });
    }
  }
}

if (failures.length === 0) {
  md += 'No failures recorded.\n';
} else {
  md += '| Run | Step | Outcome | Exit Code | Duration |\n';
  md += '|-----|------|---------|-----------|----------|\n';
  for (const f of failures) {
    md += '| ' + f.run.slice(-15) + ' | ' + f.step + ' | ' + f.outcome + ' | ' + f.exit + ' | ' + Math.round(parseInt(f.dur)/60) + 'min |\n';
  }
}

// ── Recommendations ──
md += '\n## Auto-Recommendations\n\n';
const recs = [];

// Check if max_turns is being hit
const maxTurnsHits = Object.entries(stepStats).filter(([k,v]) => v.outcomes.includes('max_turns_reached'));
if (maxTurnsHits.length > 0) {
  for (const [step, stats] of maxTurnsHits) {
    const hitCount = stats.outcomes.filter(o => o === 'max_turns_reached').length;
    recs.push('**Aumentar turnos para ' + step + '**: alcanzó max_turns ' + hitCount + '/' + stats.count + ' veces. Considerar aumentar ORCH_MAX_TURNS_* correspondiente.');
  }
}

// Check CI retry effectiveness
if (ciFails > 0) {
  const fixAttempts = runs.reduce((a, r) => a + r.ci_attempts.filter(c => c.result === 'fix_attempted').length, 0);
  const passAfterFix = runs.reduce((a, r) => {
    let fixed = 0;
    for (let i = 1; i < r.ci_attempts.length; i++) {
      if (r.ci_attempts[i].result === 'pass' && r.ci_attempts[i-1].result !== 'pass') fixed++;
    }
    return a + fixed;
  }, 0);
  if (fixAttempts > 0 && passAfterFix === 0) {
    recs.push('**CI retries no están siendo efectivos**: ' + fixAttempts + ' intentos de fix pero 0 CI passes después. Considerar reducir ORCH_CI_MAX_RETRIES o cambiar ORCH_ON_CI_EXHAUST a \"skip\" para no perder tiempo.');
  }
}

// Check step success rates
for (const [step, stats] of Object.entries(stepStats)) {
  const rate = stats.outcomes.filter(o => o === 'success').length / stats.count;
  if (rate < 0.5 && stats.count >= 2) {
    recs.push('**' + step + ' tiene tasa de éxito baja (' + Math.round(rate*100) + '%)**: revisar el prompt o considerar skipearlo con ORCH_SKIP_*.');
  }
}

// Check total run durations
const runDurations = runs.map(r => {
  const endEv = r.events.find(e => e.event === 'run_end');
  return endEv ? parseInt(endEv.total_duration_seconds) : 0;
}).filter(d => d > 0);

if (runDurations.length > 0) {
  const avgDur = runDurations.reduce((a,b) => a+b, 0) / runDurations.length;
  if (avgDur > 3600) {
    recs.push('**Sesiones muy largas (promedio ' + Math.round(avgDur/60) + 'min)**: considerar dividir sesiones más grandes en el ROADMAP o usar un modelo más rápido para pasos de soporte.');
  }
}

if (recs.length === 0) {
  md += 'No hay recomendaciones automáticas — todo se ve bien.\n';
} else {
  for (const r of recs) {
    md += '- ' + r + '\n';
  }
}

// ── Raw event log (last 3 runs) ──
md += '\n## Raw Events (últimos 3 runs)\n\n';
const recentRuns = runs.slice(-3);
for (const run of recentRuns) {
  md += '### ' + run.id + '\n\n';
  md += '\`\`\`json\n';
  for (const ev of run.events) {
    md += JSON.stringify(ev) + '\n';
  }
  md += '\`\`\`\n\n';
}

fs.writeFileSync('$output_file', md);
console.log('$output_file');
" \
    "print('NODE_REQUIRED')"

  local result
  result=$(cat "$output_file" 2>/dev/null | head -1)

  if [ -f "$output_file" ]; then
    echo "$output_file"
    return 0
  else
    ui_error "Error generando reporte."
    return 1
  fi
}

# ── Export all projects ──
export_all_diagnostics() {
  local output_dir="${CONFIG_DIR}/exports"
  mkdir -p "$output_dir"

  local exported=0

  while IFS='|' read -r idx slug path repo branch; do
    local telemetry_path="${TELEMETRY_DIR}/${slug}"
    if [ -d "$telemetry_path" ] && [ -n "$(ls -A "$telemetry_path" 2>/dev/null)" ]; then
      ui_info "Exportando diagnóstico de ${slug}..."
      local report
      report=$(export_diagnostic_report "$slug")
      if [ -n "$report" ]; then
        ui_ok "${slug} → $(basename "$report")"
        exported=$((exported + 1))
      fi
    fi
  done < <(list_projects)

  if [ $exported -eq 0 ]; then
    ui_warn "No hay datos de telemetría para exportar."
  else
    ui_ok "${exported} reporte(s) exportado(s) a: ${output_dir}"
  fi
}
