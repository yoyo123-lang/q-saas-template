import type { OrganizationSector } from "@prisma/client";

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
