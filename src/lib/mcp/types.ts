/**
 * Tool Registry Type Definitions
 *
 * Estas definiciones son la base del sistema de registro de funciones
 * para todo el ecosistema Q Company. Cada BU las usa para definir su
 * registry.ts.
 *
 * IMPORTANTE: Este archivo se copia a cada BU. Si se modifica acá,
 * se debe sincronizar a todos los repos via doc-sync o manualmente.
 */

import type { ZodType } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * Categoría de la función.
 * Determina cómo se expone en setup guide y MCP.
 */
export type ToolCategory =
  | "crud" // CRUD simple (crear, leer, actualizar, eliminar)
  | "process" // Multi-step con lógica de negocio
  | "query" // Solo lectura (métricas, búsquedas, reportes)
  | "integration" // Side-effect externo (enviar email, AFIP, WhatsApp)
  | "human_only"; // Requiere decisión visual/subjetiva

/**
 * Estado de implementación de la función.
 */
export type ToolStatus =
  | "implemented" // Código existe y funciona
  | "planned" // Capacidad diseñada, no implementada
  | "deprecated"; // Existe pero se va a remover

/**
 * Nivel de preparación para ser expuesta como MCP tool.
 */
export type McpReadiness =
  | "ready" // Función pura, Zod schema, JSON in/out
  | "needs_extraction" // Lógica acoplada a request/session/UI
  | "needs_schema" // Desacoplada pero sin Zod schema formal
  | "not_started"; // Capacidad planificada, no implementada

/**
 * Efectos secundarios que la función puede producir.
 * Los agentes usan esto para tomar decisiones informadas.
 */
export type SideEffect =
  | "db_read"
  | "db_write"
  | "db_delete"
  | "send_email"
  | "send_sms"
  | "send_whatsapp"
  | "external_api" // Llama a API externa (AFIP, MercadoPago, etc.)
  | "file_write"
  | "payment" // Cobra dinero
  | "notification"; // Envía notificación push/in-app

// ---------------------------------------------------------------------------
// Tool Definition
// ---------------------------------------------------------------------------

/**
 * Definición de una función/tool individual.
 *
 * Cada función exportada en services/ o actions/ de una BU DEBE tener
 * una entrada correspondiente en el registry.
 */
export interface ToolDefinition {
  /**
   * Identificador único de la tool dentro de la BU.
   * Formato: snake_case, sin prefijo de dominio.
   * Ej: "crear_factura", "listar_contactos", "score_postulacion"
   */
  name: string;

  /**
   * Descripción clara de qué hace la función.
   * Esta descripción se usa en:
   * - MCP tool description (agentes la leen para decidir si usarla)
   * - Setup Guide (humanos la leen para entender qué van a hacer)
   * - llms.txt (modelos la leen para describir el servicio)
   *
   * Escribir en español, imperativo, max 2 oraciones.
   */
  description: string;

  /** Categoría funcional */
  category: ToolCategory;

  /** Estado de implementación */
  status: ToolStatus;

  /** Nivel de preparación para MCP */
  mcpReadiness: McpReadiness;

  /**
   * Ruta al archivo que implementa la función.
   * Formato: "src/lib/services/invoice-service.ts#crearFactura"
   * Donde #crearFactura es el nombre de la función exportada.
   */
  handler: string;

  /**
   * Zod schema de los parámetros de entrada.
   * Si mcpReadiness es "needs_schema", puede ser null temporalmente.
   * Cuando existe, se convierte automáticamente a JSON Schema para MCP.
   */
  inputSchema: ZodType | null;

  /**
   * Zod schema de la respuesta.
   * Opcional — pero recomendado para tools que agentes consumen.
   */
  outputSchema?: ZodType | null;

  /**
   * Lista de side-effects que esta función produce.
   * Un agente puede decidir no llamar una tool con "payment" sin confirmación.
   */
  sideEffects: SideEffect[];

  /**
   * Si true, un agente DEBE pedir confirmación humana antes de ejecutar.
   * Usar para: pagos, envíos irreversibles, eliminaciones, integraciones fiscales.
   */
  requiresHumanConfirm: boolean;

  /**
   * Tools que deben completarse antes de poder ejecutar esta.
   * Usado por el setup guide (deshabilitar pasos no disponibles) y por
   * agentes MCP (saber que deben llamar A antes de B).
   *
   * Ej: emitir_factura depende de crear_factura.
   * Formato: array de tool names del mismo BU registry.
   */
  dependsOn?: string[];

  /**
   * Tags para búsqueda y agrupación.
   * Usados por agentes para descubrir tools relevantes.
   */
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Domain Definition
// ---------------------------------------------------------------------------

/**
 * Un dominio agrupa funciones relacionadas dentro de una BU.
 * Los dominios son estables — representan áreas de negocio, no features.
 */
export interface DomainDefinition {
  /**
   * Identificador del dominio. snake_case.
   * Ej: "facturacion", "inventario", "agentes", "matching"
   */
  domain: string;

  /** Descripción del dominio para humanos y agentes */
  description: string;

  /** Funciones registradas en este dominio */
  tools: ToolDefinition[];

  /**
   * Capacidades probables que aún no están implementadas.
   * No son promesas — son señales de hacia dónde crece el dominio.
   * Formato: array de strings descriptivos.
   */
  plannedCapabilities?: string[];
}

// ---------------------------------------------------------------------------
// BU Registry
// ---------------------------------------------------------------------------

/**
 * Registry completo de una Business Unit.
 * Cada BU tiene exactamente UN registry exportado desde src/lib/mcp/registry.ts
 */
export interface BUToolRegistry {
  /**
   * Identificador de la BU.
   * Debe coincidir con el slug en q-company Board.
   */
  buId: string;

  /** Nombre humano de la BU */
  buName: string;

  /** Descripción general del producto */
  description: string;

  /** URL de producción */
  productionUrl: string;

  /** Versión del registry (semver). Incrementar en cada cambio */
  version: string;

  /** Dominios funcionales de esta BU */
  domains: DomainDefinition[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extrae todas las tools de un registry como lista plana.
 */
export function getAllTools(registry: BUToolRegistry): ToolDefinition[] {
  return registry.domains.flatMap((d) => d.tools);
}

/**
 * Filtra tools que están listas para MCP.
 */
export function getMcpReadyTools(registry: BUToolRegistry): ToolDefinition[] {
  return getAllTools(registry).filter(
    (t) => t.mcpReadiness === "ready" && t.status === "implemented"
  );
}

/**
 * Filtra tools que necesitan trabajo para ser MCP-ready.
 */
export function getToolsNeedingWork(registry: BUToolRegistry): ToolDefinition[] {
  return getAllTools(registry).filter(
    (t) =>
      t.status === "implemented" &&
      (t.mcpReadiness === "needs_extraction" || t.mcpReadiness === "needs_schema")
  );
}

/**
 * Genera un resumen del registry para diagnóstico.
 */
export function getRegistrySummary(registry: BUToolRegistry) {
  const all = getAllTools(registry);
  return {
    buId: registry.buId,
    version: registry.version,
    totalDomains: registry.domains.length,
    totalTools: all.length,
    byStatus: {
      implemented: all.filter((t) => t.status === "implemented").length,
      planned: all.filter((t) => t.status === "planned").length,
      deprecated: all.filter((t) => t.status === "deprecated").length,
    },
    byReadiness: {
      ready: all.filter((t) => t.mcpReadiness === "ready").length,
      needs_extraction: all.filter((t) => t.mcpReadiness === "needs_extraction").length,
      needs_schema: all.filter((t) => t.mcpReadiness === "needs_schema").length,
      not_started: all.filter((t) => t.mcpReadiness === "not_started").length,
    },
    plannedCapabilities: registry.domains.reduce(
      (acc, d) => acc + (d.plannedCapabilities?.length ?? 0),
      0
    ),
  };
}
