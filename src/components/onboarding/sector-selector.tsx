"use client";

import { useState } from "react";
import {
  ShoppingBag,
  Briefcase,
  GraduationCap,
  Heart,
  Factory,
  UtensilsCrossed,
  Wheat,
  Building2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTOR_DISPLAY_NAMES } from "@/lib/sector-config";
import type { OrganizationSector } from "@prisma/client";

interface SectorOption {
  value: OrganizationSector;
  label: string;
  description: string;
  icon: React.ElementType;
}

const ALL_SECTORS: SectorOption[] = [
  {
    value: "COMMERCE",
    label: SECTOR_DISPLAY_NAMES.COMMERCE,
    description: "Retail, mayorista, kiosco, ferretería",
    icon: ShoppingBag,
  },
  {
    value: "SERVICES",
    label: SECTOR_DISPLAY_NAMES.SERVICES,
    description: "Consultora, estudio, agencia, freelance",
    icon: Briefcase,
  },
  {
    value: "EDUCATION",
    label: SECTOR_DISPLAY_NAMES.EDUCATION,
    description: "Instituto, academia, colegio, universidad",
    icon: GraduationCap,
  },
  {
    value: "OTHER",
    label: SECTOR_DISPLAY_NAMES.OTHER,
    description: "Incluye todos los módulos disponibles",
    icon: Building2,
  },
  {
    value: "HEALTH",
    label: SECTOR_DISPLAY_NAMES.HEALTH,
    description: "Consultorio, clínica, óptica, veterinaria",
    icon: Heart,
  },
  {
    value: "MANUFACTURING",
    label: SECTOR_DISPLAY_NAMES.MANUFACTURING,
    description: "Fábrica, taller, manufactura",
    icon: Factory,
  },
  {
    value: "GASTRONOMY",
    label: SECTOR_DISPLAY_NAMES.GASTRONOMY,
    description: "Restaurante, bar, cafetería, dark kitchen",
    icon: UtensilsCrossed,
  },
  {
    value: "AGRO",
    label: SECTOR_DISPLAY_NAMES.AGRO,
    description: "Campo, hacienda, agroindustria, cooperativa",
    icon: Wheat,
  },
];

/** Los 4 sectores que se muestran por defecto (los más comunes). */
const PRIMARY_SECTORS = ALL_SECTORS.slice(0, 4);
const SECONDARY_SECTORS = ALL_SECTORS.slice(4);

interface SectorSelectorProps {
  value: OrganizationSector;
  onChange: (sector: OrganizationSector) => void;
}

export function SectorSelector({ value, onChange }: SectorSelectorProps) {
  const isSecondary = SECONDARY_SECTORS.some((s) => s.value === value);
  const [showAll, setShowAll] = useState(isSecondary);

  const visibleSectors = showAll ? ALL_SECTORS : PRIMARY_SECTORS;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visibleSectors.map((sector) => {
          const Icon = sector.icon;
          const isSelected = value === sector.value;
          return (
            <button
              key={sector.value}
              type="button"
              onClick={() => onChange(sector.value)}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-sm transition-colors",
                isSelected
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <Icon
                className={cn("h-6 w-6 shrink-0", isSelected ? "text-indigo-600" : "text-gray-400")}
              />
              <span className="font-medium leading-tight">{sector.label}</span>
              <span className="text-[11px] leading-tight text-gray-400">{sector.description}</span>
            </button>
          );
        })}
      </div>

      {!showAll && SECONDARY_SECTORS.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className="h-3 w-3" />
          Ver más sectores
        </button>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Elegí el que más se parezca a tu actividad. Se puede cambiar después desde Configuración.
      </p>
    </div>
  );
}
