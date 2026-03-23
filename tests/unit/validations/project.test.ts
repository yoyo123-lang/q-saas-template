import { describe, it, expect } from "vitest";
import { createProjectSchema, updateProjectSchema } from "@/lib/validations/project";

describe("createProjectSchema", () => {
  it("acepta un nombre válido", () => {
    const result = createProjectSchema.safeParse({ name: "Mi proyecto" });
    expect(result.success).toBe(true);
  });

  it("acepta nombre con descripción", () => {
    const result = createProjectSchema.safeParse({
      name: "Mi proyecto",
      description: "Una descripción",
    });
    expect(result.success).toBe(true);
  });

  it("acepta descripción null", () => {
    const result = createProjectSchema.safeParse({
      name: "Mi proyecto",
      description: null,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza nombre vacío", () => {
    const result = createProjectSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre con solo espacios", () => {
    const result = createProjectSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("rechaza sin nombre", () => {
    const result = createProjectSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rechaza nombre mayor a 100 caracteres", () => {
    const result = createProjectSchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rechaza descripción mayor a 1000 caracteres", () => {
    const result = createProjectSchema.safeParse({
      name: "Test",
      description: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateProjectSchema", () => {
  it("acepta campos parciales", () => {
    const result = updateProjectSchema.safeParse({ name: "Nuevo nombre" });
    expect(result.success).toBe(true);
  });

  it("acepta objeto vacío", () => {
    const result = updateProjectSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("acepta status válido", () => {
    const result = updateProjectSchema.safeParse({ status: "PAUSED" });
    expect(result.success).toBe(true);
  });

  it("rechaza status inválido", () => {
    const result = updateProjectSchema.safeParse({ status: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("acepta todos los status válidos", () => {
    const validStatuses = ["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];
    for (const status of validStatuses) {
      const result = updateProjectSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });
});
