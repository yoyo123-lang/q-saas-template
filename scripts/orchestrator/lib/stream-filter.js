#!/usr/bin/env node
// ── Stream filter for q-orchestrator ──
// Reads stream-json from claude CLI and outputs human-readable progress.
// Usage: claude -p "..." --output-format stream-json --verbose | node stream-filter.js [--log file.log]
//
// Shows: tool calls (Read, Write, Edit, Bash), assistant text, errors, cost.
// Hides: thinking blocks, raw JSON, init events, rate limit events.

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Optional log file from args
let logFile = null;
const logIdx = process.argv.indexOf('--log');
if (logIdx !== -1 && process.argv[logIdx + 1]) {
  const logPath = process.argv[logIdx + 1];
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  logFile = fs.createWriteStream(logPath, { flags: 'a' });
}

const TOOL_ICONS = {
  Read: '📖',
  Write: '📝',
  Edit: '✏️',
  Bash: '⚡',
  Glob: '🔍',
  Grep: '🔎',
  Agent: '🤖',
  TodoWrite: '📋',
  WebSearch: '🌐',
  WebFetch: '🌐',
};

const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';

let turnCount = 0;
let lastToolName = '';

function log(line) {
  process.stdout.write(line + '\n');
  if (logFile) logFile.write(line + '\n');
}

function truncate(str, max = 120) {
  if (!str) return '';
  str = str.replace(/\n/g, ' ').trim();
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatToolUse(toolUse) {
  const name = toolUse.name || 'unknown';
  const icon = TOOL_ICONS[name] || '🔧';
  const input = toolUse.input || {};

  let detail = '';
  switch (name) {
    case 'Read':
      detail = input.file_path ? path.basename(input.file_path) : '';
      break;
    case 'Write':
      detail = input.file_path ? path.basename(input.file_path) : '';
      break;
    case 'Edit':
      detail = input.file_path ? path.basename(input.file_path) : '';
      break;
    case 'Bash':
      detail = truncate(input.command || input.description || '', 100);
      break;
    case 'Glob':
      detail = input.pattern || '';
      break;
    case 'Grep':
      detail = `"${input.pattern || ''}"` + (input.glob ? ` in ${input.glob}` : '');
      break;
    case 'Agent':
      detail = input.description || '';
      break;
    case 'TodoWrite':
      detail = (input.todos || []).length + ' items';
      break;
    default:
      detail = truncate(JSON.stringify(input), 80);
  }

  return `  ${icon} ${CYAN}${name}${RESET} ${DIM}${detail}${RESET}`;
}

function formatToolResult(content, toolName) {
  if (!content) return '';
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  if (str.length < 5) return '';

  // For bash, show a short preview of the output
  if (toolName === 'Bash') {
    const lines = str.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const preview = lines.length <= 3
        ? lines.map(l => `     ${DIM}${truncate(l, 100)}${RESET}`).join('\n')
        : `     ${DIM}${truncate(lines[0], 100)}${RESET}\n     ${DIM}... (${lines.length} lines)${RESET}`;
      return preview;
    }
  }
  return '';
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  // Write raw JSON to log file
  if (logFile) logFile.write(line + '\n');

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return; // skip non-JSON lines
  }

  const type = event.type;

  if (type === 'system' && event.subtype === 'init') {
    log(`${DIM}  Sesión: ${event.session_id || '?'}  |  Modelo: ${event.model || '?'}${RESET}`);
    return;
  }

  if (type === 'assistant' && event.message) {
    const msg = event.message;
    if (!msg.content) return;

    for (const block of msg.content) {
      // Tool use
      if (block.type === 'tool_use') {
        lastToolName = block.name;
        log(formatToolUse(block));
      }

      // Text output from assistant
      if (block.type === 'text' && block.text) {
        const text = block.text.trim();
        if (text) {
          // Show first 3 lines of assistant text
          const lines = text.split('\n').slice(0, 3);
          for (const l of lines) {
            log(`  ${GREEN}▸${RESET} ${truncate(l, 140)}`);
          }
          if (text.split('\n').length > 3) {
            log(`  ${DIM}  ... (${text.split('\n').length} lines)${RESET}`);
          }
        }
      }
    }

    // Track turns
    if (msg.stop_reason === 'end_turn' || msg.stop_reason === 'tool_use') {
      turnCount++;
    }
  }

  // Tool results
  if (type === 'user' && event.message) {
    const msg = event.message;
    if (!msg.content || !Array.isArray(msg.content)) return;

    for (const block of msg.content) {
      if (block.type === 'tool_result') {
        const content = typeof block.content === 'string'
          ? block.content
          : Array.isArray(block.content)
            ? block.content.map(c => c.text || '').join('')
            : '';

        if (block.is_error) {
          log(`  ${RED}✗ Error: ${truncate(content, 120)}${RESET}`);
        } else {
          const preview = formatToolResult(content, lastToolName);
          if (preview) log(preview);
        }
      }
    }
  }

  // Final result
  if (type === 'result') {
    log('');
    const dur = event.duration_ms ? (event.duration_ms / 1000).toFixed(1) : '?';
    const cost = event.total_cost_usd ? `$${event.total_cost_usd.toFixed(4)}` : '?';
    const turns = event.num_turns || turnCount;
    const status = event.is_error ? `${RED}ERROR${RESET}` : `${GREEN}OK${RESET}`;
    log(`  ${BOLD}Resultado: ${status}  |  ${turns} turnos  |  ${dur}s  |  ${cost}${RESET}`);

    if (event.is_error && event.result) {
      log(`  ${RED}${truncate(event.result, 200)}${RESET}`);
    }
  }
});

rl.on('close', () => {
  if (logFile) logFile.end();
});
