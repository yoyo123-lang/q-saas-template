import { describe, it, expect } from "vitest";
import { apiSuccess, apiError, validationError, notFoundError, internalError } from "@/lib/api-response";

async function parseResponse(response: Response) {
  const body = await response.json();
  return { status: response.status, body };
}

describe("apiSuccess", () => {
  it("retorna status 200 por defecto", async () => {
    const res = apiSuccess({ data: { id: 1 } });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("retorna success: true", async () => {
    const res = apiSuccess({ data: { id: 1 } });
    const { body } = await parseResponse(res);
    expect(body.success).toBe(true);
  });

  it("incluye los datos en body.data", async () => {
    const res = apiSuccess({ data: { id: 42, name: "test" } });
    const { body } = await parseResponse(res);
    expect(body.data).toEqual({ id: 42, name: "test" });
  });

  it("acepta status personalizado", async () => {
    const res = apiSuccess({ data: {}, status: 201 });
    const { status } = await parseResponse(res);
    expect(status).toBe(201);
  });

  it("incluye meta con request_id y timestamp", async () => {
    const res = apiSuccess({ data: {} });
    const { body } = await parseResponse(res);
    expect(body.meta).toBeDefined();
    expect(body.meta.request_id).toMatch(/^req_/);
    expect(body.meta.timestamp).toBeDefined();
  });

  it("incluye meta extra cuando se pasa", async () => {
    const res = apiSuccess({ data: {}, meta: { total: 5 } });
    const { body } = await parseResponse(res);
    expect(body.meta.total).toBe(5);
  });
});

describe("apiError", () => {
  it("retorna success: false", async () => {
    const res = apiError({ code: "TEST_ERROR", message: "Error de prueba", status: 400 });
    const { body } = await parseResponse(res);
    expect(body.success).toBe(false);
  });

  it("incluye code y message en body.error", async () => {
    const res = apiError({ code: "TEST_CODE", message: "Test message", status: 422 });
    const { body, status } = await parseResponse(res);
    expect(body.error.code).toBe("TEST_CODE");
    expect(body.error.message).toBe("Test message");
    expect(status).toBe(422);
  });

  it("incluye details cuando se pasa", async () => {
    const res = apiError({ code: "ERR", message: "msg", status: 400, details: { field: "name" } });
    const { body } = await parseResponse(res);
    expect(body.error.details).toEqual({ field: "name" });
  });

  it("no incluye details cuando no se pasa", async () => {
    const res = apiError({ code: "ERR", message: "msg", status: 400 });
    const { body } = await parseResponse(res);
    expect(body.error.details).toBeUndefined();
  });
});

describe("validationError", () => {
  it("retorna status 400", async () => {
    const res = validationError("Campo requerido");
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("usa code VALIDATION_ERROR", async () => {
    const res = validationError("Campo requerido");
    const { body } = await parseResponse(res);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("notFoundError", () => {
  it("retorna status 404", async () => {
    const res = notFoundError();
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("usa code NOT_FOUND", async () => {
    const res = notFoundError();
    const { body } = await parseResponse(res);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("acepta mensaje personalizado", async () => {
    const res = notFoundError("Proyecto no encontrado");
    const { body } = await parseResponse(res);
    expect(body.error.message).toBe("Proyecto no encontrado");
  });
});

describe("internalError", () => {
  it("retorna status 500", async () => {
    const res = internalError();
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });

  it("usa code INTERNAL_ERROR", async () => {
    const res = internalError();
    const { body } = await parseResponse(res);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
