import type { OrganizationSector } from "@prisma/client";

/** Todos los módulos disponibles en el sistema. El orden importa: es el orden del sidebar. */
export const MODULE_KEYS = [
  "dashboard",
  "products",
  "contacts",
  "invoices",
  "sales",
  "stock",
  "cash",
  "reports",
  "settings",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

/**
 * Módulos visibles por defecto para cada sector.
 * products está activo en todos los sectores porque es la entidad base para facturar.
 * Lo que cambia es su label (Servicios, Cursos, Prestaciones, etc.).
 */
export const SECTOR_PRESETS: Record<OrganizationSector, ModuleKey[]> = {
  COMMERCE: ["dashboard", "products", "contacts", "invoices", "sales", "stock", "cash", "reports", "settings"],
  SERVICES: ["dashboard", "products", "contacts", "invoices", "cash", "reports", "settings"],
  EDUCATION: ["dashboard", "products", "contacts", "invoices", "cash", "reports", "settings"],
  HEALTH: ["dashboard", "products", "contacts", "invoices", "cash", "reports", "settings"],
  MANUFACTURING: ["dashboard", "products", "contacts", "invoices", "stock", "cash", "reports", "settings"],
  GASTRONOMY: ["dashboard", "products", "contacts", "invoices", "sales", "stock", "cash", "reports", "settings"],
  AGRO: ["dashboard", "products", "contacts", "invoices", "stock", "cash", "reports", "settings"],
  OTHER: ["dashboard", "products", "contacts", "invoices", "sales", "stock", "cash", "reports", "settings"],
};

/** Labels del sidebar por sector. Solo se definen los que difieren del label por defecto. */
export const SECTOR_LABELS: Partial<Record<OrganizationSector, Partial<Record<ModuleKey, string>>>> = {
  SERVICES: { products: "Servicios" },
  EDUCATION: { products: "Cursos", contacts: "Alumnos" },
  HEALTH: { products: "Prestaciones", contacts: "Pacientes" },
  MANUFACTURING: { stock: "Inventario" },
  GASTRONOMY: { products: "Carta", stock: "Insumos" },
};

/**
 * Retorna los módulos visibles para una organización.
 * Si enabledModules no es un array válido, usa el preset del sector (zero-config).
 * Keys inválidas se ignoran silenciosamente (protección contra datos corruptos en DB).
 */
export function getVisibleModules(org: {
  sector: OrganizationSector;
  enabledModules: unknown;
}): ModuleKey[] {
  if (!Array.isArray(org.enabledModules)) {
    return SECTOR_PRESETS[org.sector];
  }

  const valid = org.enabledModules.filter((k): k is ModuleKey =>
    MODULE_KEYS.includes(k as ModuleKey)
  );

  // Si el array tiene datos pero ninguno válido, caer al preset
  if (valid.length === 0) {
    return SECTOR_PRESETS[org.sector];
  }

  return valid;
}

/**
 * Retorna el label de un módulo para un sector dado.
 * Si no hay label específico, retorna undefined (el caller usa su label por defecto).
 */
export function getModuleLabel(
  moduleKey: ModuleKey,
  sector: OrganizationSector
): string | undefined {
  return SECTOR_LABELS[sector]?.[moduleKey];
}

/**
 * Labels para el paso 3 del onboarding (primer producto/servicio/curso).
 * Incluye el título, el placeholder del input, y si trackStock debe estar activo por defecto.
 */
export const SECTOR_ONBOARDING_PRODUCT: Record<
  OrganizationSector,
  { title: string; placeholder: string; trackStock: boolean }
> = {
  COMMERCE: { title: "Tu primer producto", placeholder: "Ej: Camiseta básica, Auriculares...", trackStock: true },
  SERVICES: { title: "Tu primer servicio", placeholder: "Ej: Consultoría hora, Diseño de logo...", trackStock: false },
  EDUCATION: { title: "Tu primer curso", placeholder: "Ej: Inglés nivel 1, Taller de pintura...", trackStock: false },
  HEALTH: { title: "Tu primera prestación", placeholder: "Ej: Consulta médica, Limpieza dental...", trackStock: false },
  MANUFACTURING: { title: "Tu primer producto", placeholder: "Ej: Silla de madera, Tornillo M8...", trackStock: true },
  GASTRONOMY: { title: "Tu primer plato", placeholder: "Ej: Milanesa napolitana, Café cortado...", trackStock: true },
  AGRO: { title: "Tu primer producto", placeholder: "Ej: Maíz (tn), Soja (tn), Trigo (tn)...", trackStock: true },
  OTHER: { title: "Tu primer producto", placeholder: "Ej: Producto o servicio principal...", trackStock: true },
};

/**
 * Labels para el paso 4 del onboarding (primer cliente/alumno/paciente).
 */
export const SECTOR_ONBOARDING_CONTACT: Record<
  OrganizationSector,
  { title: string; placeholder: string }
> = {
  COMMERCE: { title: "Tu primer cliente", placeholder: "Ej: Juan Pérez, Empresa S.A." },
  SERVICES: { title: "Tu primer cliente", placeholder: "Ej: Juan Pérez, Empresa S.A." },
  EDUCATION: { title: "Tu primer alumno", placeholder: "Ej: María García" },
  HEALTH: { title: "Tu primer paciente", placeholder: "Ej: Carlos López" },
  MANUFACTURING: { title: "Tu primer cliente", placeholder: "Ej: Distribuidora Norte S.A." },
  GASTRONOMY: { title: "Tu primer cliente", placeholder: "Ej: Eventos Corp S.A." },
  AGRO: { title: "Tu primer cliente", placeholder: "Ej: Acopiadora del Sur S.A." },
  OTHER: { title: "Tu primer cliente", placeholder: "Ej: Juan Pérez, Empresa S.A." },
};

/** Valores válidos del enum OrganizationSector. Fuente de verdad para validación client-side. */
export const VALID_SECTORS = Object.keys(SECTOR_PRESETS) as OrganizationSector[];

/**
 * Parsea un string a OrganizationSector con fallback a OTHER.
 * Útil para leer query params de sector en las páginas de onboarding.
 */
export function parseSector(raw: string | null): OrganizationSector {
  if (raw && VALID_SECTORS.includes(raw as OrganizationSector)) {
    return raw as OrganizationSector;
  }
  return "OTHER";
}

/** Retorna el nombre UI del sector para mostrar en la interfaz. */
export const SECTOR_DISPLAY_NAMES: Record<OrganizationSector, string> = {
  COMMERCE: "Comercio",
  SERVICES: "Servicios",
  EDUCATION: "Educación",
  HEALTH: "Salud",
  MANUFACTURING: "Industria",
  GASTRONOMY: "Gastronomía",
  AGRO: "Agro",
  OTHER: "Otro",
};
