# Protocolo: MCP Tool Registry por BU

> Documento normativo para todo el ecosistema Q Company.
> Define cómo cada Business Unit mapea, registra, expone y mantiene sus funciones
> para ser consumidas por humanos (setup guide) y agentes (MCP).
>
> NOTA TERMINOLÓGICA: "Setup Guide" es la interfaz de configuración y discovery
> para humanos. NO confundir con "Onboarding" que es el flujo de registro/alta
> en la plataforma (crear cuenta, configurar organización, datos fiscales, etc.).

## Contexto

Q Company adopta estándares agénticos abiertos (A2A, MCP, llms.txt, Schema.org).
Para que cada BU pueda exponer un MCP server, necesitamos primero un **inventario
estructurado y enforced** de todas las funciones que cada producto ofrece.

Este inventario (el **Tool Registry**) es la fuente única de verdad que alimenta:

```
registry.ts (fuente única de verdad)
     │
     ├──→ MCP server        (expone tools para agentes)
     ├──→ Setup Guide        (genera formularios/guías para humanos)
     ├──→ Pre-commit hook    (valida que toda función esté registrada)
     ├──→ Compliance checker (verifica exposición desde q-company)
     ├──→ /llms.txt          (se genera desde descriptions del registry)
     ├──→ /.well-known/agent.json (capabilities desde registry)
     └──→ OpenAPI spec       (schema de inputs/outputs)
```

---

## Parte 1: Estructura del Registry

### 1.1 Organización por Dominios

Cada BU organiza sus funciones en **dominios de negocio**. Los dominios son estables
(un sistema de facturación siempre tendrá "Facturación"). Las funciones dentro de
cada dominio crecen con el tiempo.

```
BU: qontabiliza
├── Dominio: Facturación
│   ├── crear_factura
│   ├── emitir_factura
│   └── listar_facturas
├── Dominio: Inventario
│   ├── registrar_movimiento
│   └── consultar_stock
└── Dominio: Caja
    ├── abrir_caja
    └── cerrar_caja
```

### 1.2 Archivo Registry

Cada BU tiene UN archivo de registro:

```
src/lib/mcp/registry.ts
```

Este archivo exporta el registry completo de la BU. Es TypeScript tipado — si una
referencia a un Zod schema o handler se rompe, **no compila**.

### 1.3 Categorías de funciones

| Categoría | Descripción | ¿MCP Tool? | ¿Wizard? |
|-----------|-------------|------------|----------|
| `crud` | Operaciones CRUD simples (crear contacto, listar productos) | Sí | Sí (formulario) |
| `process` | Multi-step con lógica de negocio (emitir factura, scoring candidato) | Sí, orquestado | Sí (stepper guiado) |
| `query` | Solo lectura (métricas, búsquedas, reportes) | Sí | Sí (dashboard) |
| `integration` | Side-effect externo (enviar WhatsApp, publicar en AFIP) | Sí, con guardrails | Sí (botón + confirm) |
| `human_only` | Requiere decisión visual/subjetiva (elegir diseño, aprobar candidato) | No (read-only como mucho) | Sí |

### 1.4 Niveles de MCP-readiness

| Nivel | Significado | Qué falta |
|-------|-------------|-----------|
| `ready` | Función pura, Zod schema, JSON in/out, sin dependencias de UI | Nada — se puede exponer |
| `needs_extraction` | Lógica existe pero acoplada a request/session/UI | Extraer a función pura |
| `needs_schema` | Función existe y está desacoplada pero sin Zod schema formal | Agregar Zod schema |
| `not_started` | Capacidad planificada, no implementada | Implementar |

---

## Parte 2: Type Definition

El type `ToolRegistry` se define en un paquete compartido o se copia en cada BU.
Ver archivo complementario: `src/lib/mcp/types.ts`

Principios del type:

- Cada tool tiene `name`, `description`, `category`, `status`, `mcpReadiness`
- El `inputSchema` referencia un Zod schema real (importado, no string)
- El `handler` es la ruta al archivo + función que implementa la lógica
- `sideEffects` lista qué efectos tiene (para que agentes tomen decisiones informadas)
- `requiresHumanConfirm` indica si un agente necesita confirmación antes de ejecutar
- `dependsOn` lista tools que deben completarse antes (para setup guide y agentes)
- `domain` agrupa la función en su dominio de negocio

---

## Parte 3: Funciones futuras

No se predicen funciones individuales. Se usa un patrón de **capacidades probables
por dominio**.

Cada dominio en el registry puede incluir un campo `plannedCapabilities`:

```typescript
{
  domain: "facturacion",
  description: "Gestión de facturas y comprobantes fiscales",
  tools: [ /* funciones existentes */ ],
  plannedCapabilities: [
    "Factura recurrente — programar emisión automática",
    "Exportar libro IVA — reporte fiscal periódico",
    "Duplicar factura — crear desde existente",
  ]
}
```

Estas no son promesas. Son señales de hacia dónde crece el dominio.
Cuando se implementen, se mueven a `tools` con el schema completo.

---

## Parte 4: Enforcement — Los 3 niveles

### Nivel 1: CLAUDE.md (guía para Claude Code y humanos)

Cada BU agrega a su CLAUDE.md la sección de Tool Registry.
Ver archivo complementario: `docs/CLAUDE_MD_ADDENDUM_TOOL_REGISTRY.md`

**Qué enforce:** Que Claude Code recuerde registrar funciones nuevas.
**Debilidad:** Se puede ignorar. Es una sugerencia fuerte, no un gate.

### Nivel 2: Hook pre-commit (gate automático local)

Script que valida en cada commit que toda función exportada en `src/lib/services/`
(o `src/lib/actions/`) esté registrada en `src/lib/mcp/registry.ts`.

Ver archivo complementario: `scripts/check-registry-sync.js`

**Qué enforce:** Que ningún commit agregue funciones sin registrar.
**Debilidad:** Un desarrollador puede desactivar hooks localmente.

Configuración en `.claude/settings.json`:

```json
{
  "hooks": {
    "pre-commit": [
      {
        "command": "node scripts/check-registry-sync.js",
        "description": "Verifica sync entre services y tool registry"
      }
    ]
  }
}
```

### Nivel 3: Compliance checker en q-company (verificación centralizada)

Extender el compliance checker existente (`src/lib/agentic-standards/`) para:

1. Leer el `registry.ts` de cada BU via GitHub API (el scanner ya hace esto)
2. Si la BU tiene MCP server: verificar que todo tool con `mcpReadiness: "ready"` esté expuesto
3. Reportar gaps en el dashboard del Board
4. Generar alertas si hay funciones en services sin registro

**Qué enforce:** Que la exposición MCP coincida con el registry.
**Esto no se puede ignorar** — corre en CI desde q-company.

---

## Parte 5: Flujo completo

```
Desarrollador (humano o Claude Code) agrega función nueva
        │
        ▼
¿Está en registry.ts? ──→ NO → Pre-commit hook BLOQUEA
        │                       "Agregá X a src/lib/mcp/registry.ts"
        ▼ SÍ
Commit pasa
        │
        ▼
CI (q-company scanner semanal)
        │
        ├──→ ¿Registry sincronizado con exports de services/?
        │         NO → Alerta en Board dashboard
        │
        ├──→ ¿MCP server expone todo lo que registry dice "ready"?
        │         NO → Compliance status: FAILED
        │
        └──→ Todo OK → Compliance status: VERIFIED ✓
```

---

## Parte 6: Cómo aplicar en cada BU

### Paso 1: Crear estructura

```bash
mkdir -p src/lib/mcp
# Copiar types.ts desde q-company o paquete compartido
# Crear registry.ts con dominios vacíos
```

### Paso 2: Mapear funciones existentes

Recorrer `src/lib/services/` y `src/lib/actions/`:
- Listar todas las funciones exportadas
- Clasificarlas por dominio y categoría
- Evaluar mcpReadiness
- Registrarlas en registry.ts

### Paso 3: Agregar hook pre-commit

Copiar `scripts/check-registry-sync.js` y configurar en settings.

### Paso 4: Agregar sección a CLAUDE.md

Copiar el addendum de Tool Registry.

### Paso 5: Estandarizar interfaces (cuando se trabaje MCP)

Para cada función con `mcpReadiness: "needs_extraction"` o `"needs_schema"`:
- Extraer a función pura si está acoplada
- Agregar Zod schema si falta
- Asegurar retorno JSON (no Response, no redirect)
- Desacoplar auth del browser (API key, no cookie)

### Paso 6: Implementar MCP server (fase final)

Con el registry completo y funciones estandarizadas:
- Crear MCP server que lee del registry
- Exponer tools automáticamente
- Publicar endpoint

---

## Parte 7: Relación con otras piezas

| Artefacto | Se genera desde | Doc de referencia |
|-----------|----------------|-------------------|
| MCP server | registry.ts (tools con mcpReadiness: ready) | Este documento |
| Setup Guide | registry.ts (todos los tools + dependsOn) | *Fase 2: Diseño del Setup Guide* |
| agent.json (A2A) | registry.ts (domains → skills) | `Q-IMPLEMENTACION-ESTANDARES-AGENTIVOS.md` |
| llms.txt | registry.ts (descriptions) | `Q-IMPLEMENTACION-ESTANDARES-AGENTIVOS.md` |
| OpenAPI spec | registry.ts (inputSchema/outputSchema) | `docs/API_STANDARDS.md` |
| Compliance check | registry.ts vs MCP server expuesto | `src/lib/agentic-standards/` |

---

## Fases del roadmap

| Fase | Entregable | Estado |
|------|-----------|--------|
| **Fase 1** | Tool Registry Protocol (este documento) + types + mapeo por BU | ← Estamos acá |
| **Fase 2** | Diseño del Setup Guide (consume el registry, NO es el onboarding de plataforma) | Próximo |
| **Fase 3** | Plan de implementación MCP por BU | Próximo |

---

## Regla de oro

> **No documentés qué hay que hacer. Documentá cómo se verifica que se hizo.**
>
> El registry como código TypeScript + hook pre-commit + compliance checker
> = triple gate que ni Claude Code ni un humano pueden saltear.
