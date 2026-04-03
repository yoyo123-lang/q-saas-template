/**
 * Tool Registry — [BU_NAME] ([BU_DESCRIPTION])
 *
 * Este archivo es la fuente única de verdad para MCP y Setup Guide.
 * Cada función exportada en src/lib/actions/ y src/lib/services/ DEBE
 * tener una entrada correspondiente acá.
 *
 * INSTRUCCIONES PARA NUEVA BU:
 * 1. Reemplazá buId, buName, description y productionUrl
 * 2. Definí tus dominios de negocio (los ejemplos de abajo son del template)
 * 3. Escaneá src/lib/actions/ y src/lib/services/ para registrar funciones
 * 4. Evaluá mcpReadiness de cada función
 * 5. Incrementá version en cada cambio
 *
 * Ver: docs/MCP_TOOL_REGISTRY_PROTOCOL.md
 */

import type { BUToolRegistry } from "./types";

export const registry: BUToolRegistry = {
  buId: "mi-bu", // TODO: Reemplazar con el slug de tu BU en q-company Board
  buName: "Mi BU", // TODO: Nombre humano de tu BU
  description:
    "Descripción del producto SaaS.", // TODO: Describir tu producto
  productionUrl: "https://mi-bu.example.com", // TODO: URL de producción
  version: "0.1.0",
  domains: [
    // ─── Auth (ejemplo del template) ──────────────────────────
    {
      domain: "auth",
      description:
        "Autenticación de usuarios: registro, login, recuperación de contraseña, gestión de sesiones.",
      tools: [
        {
          name: "register_user",
          description:
            "Registrar un nuevo usuario con email y contraseña. Crea organización si es tipo BUSINESS.",
          category: "process",
          status: "implemented",
          mcpReadiness: "needs_extraction",
          handler: "src/lib/actions/auth.ts#register",
          inputSchema: null,
          sideEffects: ["db_write", "send_email"],
          requiresHumanConfirm: false,
          tags: ["auth", "register", "signup"],
        },
        {
          name: "login_user",
          description:
            "Iniciar sesión con email y contraseña via NextAuth credentials provider.",
          category: "process",
          status: "implemented",
          mcpReadiness: "needs_extraction",
          handler: "src/lib/actions/auth.ts#login",
          inputSchema: null,
          sideEffects: ["db_read"],
          requiresHumanConfirm: false,
          tags: ["auth", "login"],
        },
      ],
      plannedCapabilities: [
        "Login con Google OAuth",
        "Verificación de email post-registro",
        "Autenticación de dos factores (2FA/TOTP)",
        "Gestión de sesiones activas",
      ],
    },

    // ─── Onboarding (ejemplo del template) ────────────────────
    {
      domain: "onboarding",
      description:
        "Flujo de onboarding post-registro: configuración de organización, datos fiscales, preferencias.",
      tools: [
        {
          name: "complete_onboarding_step",
          description:
            "Completar un paso del onboarding y avanzar al siguiente. Marca progreso en OnboardingProgress.",
          category: "process",
          status: "implemented",
          mcpReadiness: "needs_extraction",
          handler: "src/lib/actions/onboarding.ts#completeStep",
          inputSchema: null,
          sideEffects: ["db_write"],
          requiresHumanConfirm: false,
          tags: ["onboarding", "step", "progress"],
        },
      ],
      plannedCapabilities: [
        "Onboarding personalizado por tipo de organización",
        "Skip de pasos opcionales",
        "Reanudar onboarding incompleto",
      ],
    },

    // ─── Projects (ejemplo CRUD del template) ─────────────────
    // TODO: Reemplazar con los dominios reales de tu BU
    {
      domain: "projects",
      description:
        "CRUD de ejemplo del template. Reemplazar con el dominio principal de tu BU.",
      tools: [
        // TODO: Registrar las funciones reales de tu dominio
        // Ejemplo:
        // {
        //   name: "create_project",
        //   description: "Crear un nuevo proyecto.",
        //   category: "crud",
        //   status: "implemented",
        //   mcpReadiness: "needs_extraction",
        //   handler: "src/lib/actions/projects.ts#createProject",
        //   inputSchema: null,
        //   sideEffects: ["db_write"],
        //   requiresHumanConfirm: false,
        //   tags: ["project", "create"],
        // },
      ],
      plannedCapabilities: [
        "CRUD completo del dominio principal",
        "Búsqueda y filtrado avanzado",
        "Exportación de datos",
      ],
    },
  ],
};

export default registry;
