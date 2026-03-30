/**
 * Convierte un string en un slug URL-safe:
 * - Minúsculas
 * - Sin acentos
 * - Solo letras, números y guiones
 * - Máximo 60 caracteres
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}
