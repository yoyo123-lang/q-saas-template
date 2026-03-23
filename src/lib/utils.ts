import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind de forma segura (merge + conditional) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea una fecha en formato argentino DD/MM/AAAA */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Formatea un número en formato argentino (1.000,50) */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formatea un monto en pesos argentinos ($ 1.000,50) */
export function formatCurrency(value: number, decimals = 2): string {
  return `$ ${formatNumber(value, decimals)}`;
}
