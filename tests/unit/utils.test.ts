import { describe, it, expect } from "vitest";
import { cn, formatDate, formatNumber, formatCurrency } from "@/lib/utils";

describe("cn", () => {
  it("retorna clases simples sin cambios", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resuelve conflictos de Tailwind (la última gana)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("ignora valores falsy", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("acepta objetos condicionales", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe("text-red-500");
  });
});

describe("formatDate", () => {
  it("formatea una fecha en formato argentino DD/MM/AAAA", () => {
    // Usamos una fecha fija UTC para evitar variaciones de timezone
    const date = new Date("2024-03-15T12:00:00.000Z");
    const result = formatDate(date);
    // Verificar que el formato es DD/MM/AAAA
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("acepta un string ISO como input", () => {
    const result = formatDate("2024-01-01T00:00:00.000Z");
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("el resultado contiene el año correcto", () => {
    const date = new Date("2024-06-15T12:00:00.000Z");
    const result = formatDate(date);
    expect(result).toContain("2024");
  });
});

describe("formatNumber", () => {
  it("formatea un entero con decimales", () => {
    const result = formatNumber(1000);
    // Formato argentino: separador de miles = punto, decimal = coma
    expect(result).toContain(",");
  });

  it("formatea mil con separador de miles", () => {
    const result = formatNumber(1000, 0);
    // 1.000 en formato argentino
    expect(result).toBe("1.000");
  });

  it("formatea decimales con coma", () => {
    const result = formatNumber(1.5, 2);
    // 1,50 en formato argentino
    expect(result).toBe("1,50");
  });

  it("respeta el parámetro de cantidad de decimales", () => {
    const result0 = formatNumber(100.5, 0);
    const result2 = formatNumber(100.5, 2);
    const result4 = formatNumber(100.5, 4);
    expect(result0).toBe("101");
    expect(result2).toBe("100,50");
    expect(result4).toBe("100,5000");
  });

  it("formatea un número grande con separador de miles", () => {
    const result = formatNumber(1234567, 0);
    expect(result).toBe("1.234.567");
  });
});

describe("formatCurrency", () => {
  it("formatea pesos argentinos con símbolo", () => {
    expect(formatCurrency(1000.5)).toBe("$ 1.000,50");
  });

  it("formatea cero", () => {
    expect(formatCurrency(0)).toBe("$ 0,00");
  });

  it("respeta decimales custom", () => {
    expect(formatCurrency(1234.5, 0)).toBe("$ 1.235");
  });
});
