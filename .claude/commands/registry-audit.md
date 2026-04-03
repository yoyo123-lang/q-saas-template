# Registry Audit

> Skill para auditar el estado del Tool Registry de esta BU.
> Invocar con: `/project:registry-audit`
> Útil después de un sprint, antes de un deploy, o periódicamente.

## Paso 1: Leer el registry

Leé `src/lib/mcp/registry.ts` y `src/lib/mcp/types.ts`.
Si no existen, informar:

```
❌ Esta BU no tiene Tool Registry configurado.
   Ver: docs/MCP_TOOL_REGISTRY_PROTOCOL.md en q-company
   Paso 1: Crear src/lib/mcp/ con types.ts y registry.ts
```

## Paso 2: Ejecutar los 7 checks

Corré todos los checks en orden. Cada uno produce un resultado: ✅ PASS, ⚠️ WARN, o ❌ FAIL.

### Check 1: Sync — Funciones no registradas

Escaneá los directorios de services y actions de este proyecto.
Para cada función exportada (que no sea helper con prefijo `_`, `validate`, `parse`, `format`, `sanitize`, `log`, `init`, `configure`):

- ¿Tiene entrada correspondiente en el registry?
- Si NO → listarla como ❌ FAIL

**Output:**
```
CHECK 1: SYNC (services → registry)
[✅/❌] [N] funciones exportadas, [N] registradas, [N] sin registrar
  Faltantes:
  - src/lib/services/foo.ts#barFunction
  - src/lib/actions/baz.ts#quxAction
```

### Check 2: Stale — Tools fantasma

Para cada tool en el registry con `status: "implemented"`:

- ¿El archivo referenciado en `handler` existe?
- ¿La función referenciada después del `#` está exportada en ese archivo?
- Si NO → listarla como ⚠️ WARN (código borrado, registry desactualizado)

**Output:**
```
CHECK 2: STALE (registry → services)
[✅/⚠️] [N] tools implementadas, [N] con handler válido, [N] fantasma
  Fantasma:
  - crear_reporte → src/lib/services/report-service.ts#crearReporte (archivo no existe)
```

### Check 3: Schema — Consistencia de readiness

Para cada tool con `mcpReadiness: "ready"`:

- ¿`inputSchema` es distinto de null? Si es null → ❌ FAIL (dice ready pero no tiene schema)
- ¿`status` es "implemented"? Si no → ⚠️ WARN (dice ready pero no está implementada)

Para cada tool con `mcpReadiness: "needs_schema"`:

- ¿`inputSchema` es null? Si NO es null → ⚠️ WARN (ya tiene schema, debería ser "ready")

**Output:**
```
CHECK 3: SCHEMA CONSISTENCY
[✅/❌] [N] tools "ready", [N] con schema válido, [N] inconsistentes
  Inconsistencias:
  - crear_factura: mcpReadiness="ready" pero inputSchema=null
  - listar_contactos: mcpReadiness="needs_schema" pero ya tiene inputSchema
```

### Check 4: Dependencies — dependsOn válidos

Para cada tool con `dependsOn` no vacío:

- ¿Cada nombre referenciado existe como tool en el mismo registry?
- ¿No hay ciclos? (A depende de B, B depende de A)
- Si hay referencia inválida o ciclo → ❌ FAIL

**Output:**
```
CHECK 4: DEPENDENCIES
[✅/❌] [N] tools con dependsOn, [N] referencias válidas, [N] inválidas
  Problemas:
  - emitir_factura.dependsOn=["crear_factur"] → "crear_factur" no existe (¿typo?)
```

### Check 5: Quality — Calidad del registro

Para cada tool con `status: "implemented"`:

- ¿`description` tiene más de 10 caracteres? Si no → ⚠️ WARN
- ¿`sideEffects` es array vacío `[]` en tool con category "integration" o "process"? → ⚠️ WARN (probablemente faltan)
- ¿`tags` está vacío o undefined? → ⚠️ WARN (afecta discoverability)
- ¿`category` es coherente con lo que la función hace? (una función que llama API externa debería ser "integration", no "crud") → revisar con criterio

**Output:**
```
CHECK 5: QUALITY
[✅/⚠️] [N] tools revisadas, [N] con calidad OK, [N] con warnings
  Warnings:
  - score_postulacion: category="crud" pero tiene sideEffect="external_api" → ¿debería ser "process"?
  - listar_facturas: sin tags
```

### Check 6: Progress — Resumen de readiness

Contar y reportar:

```
CHECK 6: PROGRESS REPORT
  Total tools: [N]
  ┌──────────────────────┬───────┬─────┐
  │ MCP Readiness        │ Count │  %  │
  ├──────────────────────┼───────┼─────┤
  │ ready                │   N   │ N%  │
  │ needs_extraction     │   N   │ N%  │
  │ needs_schema         │   N   │ N%  │
  │ not_started          │   N   │ N%  │
  └──────────────────────┴───────┴─────┘

  Por dominio:
  - facturacion: N tools (N ready, N pendientes)
  - inventario: N tools (N ready, N pendientes)
  ...
```

### Check 7: Planned Review — Capacidades implementadas no migradas

Para cada `plannedCapabilities` en cada dominio:

- Buscar en los archivos de services/actions si hay funciones que podrían corresponder a esa capacidad (buscar keywords del texto planned)
- Si hay match probable → ⚠️ WARN (quizás ya se implementó pero no se movió a tools)

**Output:**
```
CHECK 7: PLANNED REVIEW
[✅/⚠️] [N] capacidades planned, [N] posiblemente implementadas
  Posibles:
  - Dominio facturacion: "Factura recurrente" → match en invoice-service.ts#crearFacturaRecurrente
```

## Paso 3: Dashboard consolidado

Generar el dashboard final:

```
═══════════════════════════════════════════════════
  REGISTRY AUDIT — [BU name] — [fecha]
═══════════════════════════════════════════════════

  Check                    │ Status │ Issues
  ─────────────────────────│────────│───────
  1. Sync (svc→registry)   │  ✅    │ 0
  2. Stale (registry→svc)  │  ⚠️    │ 2
  3. Schema consistency    │  ❌    │ 1
  4. Dependencies          │  ✅    │ 0
  5. Quality               │  ⚠️    │ 3
  6. Progress              │  ──    │ 45% ready
  7. Planned review        │  ⚠️    │ 1
  ─────────────────────────│────────│───────
  RESULTADO                │  ⚠️    │ 7 total

  ❌ = Bloquea MCP deployment
  ⚠️ = Requiere atención
  ✅ = OK
═══════════════════════════════════════════════════
```

## Paso 4: Preguntar al usuario

Si hay ❌ FAIL:

```
⛔ Hay [N] problemas que bloquean MCP deployment.
¿Querés que los corrija ahora?
```

Si solo hay ⚠️ WARN:

```
⚠️ Hay [N] warnings que requieren atención.
¿Querés que los corrija, los documentemos, o los ignoramos por ahora?
```

Si todo ✅:

```
✅ Registry audit passed. Esta BU está al día.
```

## Paso 5: Guardar informe

Guardar el resultado en `docs/reviews/YYYY-MM-DD_registry-audit.md`.

Si existe `SESSION_LOG.md`, agregar entrada:

```
### Registry Audit — [fecha]
Resultado: [✅/⚠️/❌]
Checks: [resumen 1 línea]
Informe: docs/reviews/[archivo]
```

---

*El registry no se mantiene solo. Auditalo regularmente.*
