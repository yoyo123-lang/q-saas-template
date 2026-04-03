#!/usr/bin/env node

/**
 * check-registry-sync.js
 *
 * Hook pre-commit que valida que toda función exportada en services/
 * y actions/ esté registrada en src/lib/mcp/registry.ts.
 *
 * USO:
 *   node scripts/check-registry-sync.js
 *
 * CONFIGURACIÓN:
 *   En .claude/settings.json:
 *   {
 *     "hooks": {
 *       "pre-commit": [{
 *         "command": "node scripts/check-registry-sync.js"
 *       }]
 *     }
 *   }
 *
 * CÓMO FUNCIONA:
 *   1. Escanea src/lib/services/**\/*.ts y src/lib/actions/**\/*.ts
 *   2. Extrae funciones exportadas (export function X / export async function X)
 *   3. Lee src/lib/mcp/registry.ts y extrae handlers registrados
 *   4. Compara: si hay funciones sin registrar, bloquea con mensaje claro
 *
 * NOTA: Este script es un template. Cada BU lo copia y puede ajustar
 * las rutas de escaneo según su estructura.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ---------------------------------------------------------------------------
// Configuración — ajustar por BU si la estructura difiere
// ---------------------------------------------------------------------------

/** Directorios a escanear por funciones exportadas */
const SCAN_DIRS = ["src/lib/actions"];

/** Archivo de registry */
const REGISTRY_FILE = "src/lib/mcp/registry.ts";

/** Patrones de funciones a ignorar (helpers internos, no tools) */
const IGNORE_PATTERNS = [
  /^_/, // funciones que empiezan con _
  /^get(Prisma|DB|Client)/, // getters de infraestructura
  /^init/, // inicializadores
  /^configure/, // configuración
  /^validate/, // validadores internos (no son tools)
  /^parse/, // parsers internos
  /^format/, // formatters internos
  /^sanitize/, // sanitizers
  /^log/, // logging
  /^handle(Error|Exception)/, // error handlers
];

// ---------------------------------------------------------------------------
// Funciones
// ---------------------------------------------------------------------------

function findTsFiles(dir) {
  const fullDir = path.resolve(dir);
  if (!fs.existsSync(fullDir)) return [];

  const files = [];
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractExportedFunctions(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const functions = [];

  // Match: export function name / export async function name
  const regex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      file: path.relative(process.cwd(), filePath),
    });
  }

  // Match: export const name = async (
  const constRegex = /export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
  while ((match = constRegex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      file: path.relative(process.cwd(), filePath),
    });
  }

  return functions;
}

function extractRegistryHandlers(registryPath) {
  const fullPath = path.resolve(registryPath);
  if (!fs.existsSync(fullPath)) return [];

  const content = fs.readFileSync(fullPath, "utf-8");
  const handlers = [];

  // Match handler: "src/lib/services/foo.ts#barFunction"
  const regex = /handler:\s*["']([^"']+)#(\w+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    handlers.push({
      file: match[1],
      name: match[2],
    });
  }

  return handlers;
}

function shouldIgnore(functionName) {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(functionName));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const registryPath = path.resolve(REGISTRY_FILE);

  // Si el registry no existe aún, solo advertir (no bloquear)
  if (!fs.existsSync(registryPath)) {
    console.log(
      "⚠️  src/lib/mcp/registry.ts no existe aún. " +
        "Crear el archivo antes de agregar funciones a services/.\n" +
        "Ver: docs/MCP_TOOL_REGISTRY_PROTOCOL.md"
    );
    process.exit(0);
  }

  // 1. Escanear funciones exportadas
  const allFunctions = [];
  for (const dir of SCAN_DIRS) {
    const files = findTsFiles(dir);
    for (const file of files) {
      allFunctions.push(...extractExportedFunctions(file));
    }
  }

  // 2. Filtrar las que se ignoran
  const relevantFunctions = allFunctions.filter(
    (fn) => !shouldIgnore(fn.name)
  );

  // 3. Leer handlers del registry
  const registeredHandlers = extractRegistryHandlers(REGISTRY_FILE);
  const registeredSet = new Set(
    registeredHandlers.map((h) => `${h.file}#${h.name}`)
  );

  // 4. Encontrar funciones no registradas
  const unregistered = relevantFunctions.filter((fn) => {
    const key = `${fn.file}#${fn.name}`;
    return !registeredSet.has(key);
  });

  if (unregistered.length === 0) {
    console.log("✅ Tool registry sincronizado con services/actions.");
    process.exit(0);
  }

  // 5. Reportar y bloquear
  console.error("❌ Funciones no registradas en tool registry:\n");
  for (const fn of unregistered) {
    console.error(`   - ${fn.file}#${fn.name}`);
  }
  console.error(
    "\n📋 Agregá estas funciones a src/lib/mcp/registry.ts" +
      "\n   Si la función es un helper interno, prefijala con _ para excluirla." +
      "\n   Ver: docs/MCP_TOOL_REGISTRY_PROTOCOL.md\n"
  );

  process.exit(1);
}

main();
