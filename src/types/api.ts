/** Respuesta exitosa de la API */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    request_id: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

/** Respuesta de error de la API */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}

/** Respuesta genérica de la API */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Meta de paginación por cursor */
export interface PaginationMeta {
  next_cursor: string | null;
  limit: number;
  has_more: boolean;
}
