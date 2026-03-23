import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

interface SuccessOptions<T> {
  data: T;
  status?: number;
  meta?: Record<string, unknown>;
}

interface ErrorOptions {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

function baseMeta(extra?: Record<string, unknown>) {
  return {
    request_id: `req_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

/** Respuesta exitosa siguiendo el contrato de API_STANDARDS.md */
export function apiSuccess<T>({ data, status = 200, meta }: SuccessOptions<T>) {
  return NextResponse.json(
    { success: true, data, meta: baseMeta(meta) },
    { status }
  );
}

/** Respuesta de error siguiendo el contrato de API_STANDARDS.md */
export function apiError({ code, message, status, details }: ErrorOptions) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      meta: baseMeta(),
    },
    { status }
  );
}

/** Error de validación (400) */
export function validationError(message: string, details?: Record<string, unknown>) {
  return apiError({ code: "VALIDATION_ERROR", message, status: 400, details });
}

/** No encontrado (404) */
export function notFoundError(message = "Recurso no encontrado") {
  return apiError({ code: "NOT_FOUND", message, status: 404 });
}

/** Error interno (500) */
export function internalError(message = "Error interno del servidor") {
  return apiError({ code: "INTERNAL_ERROR", message, status: 500 });
}
