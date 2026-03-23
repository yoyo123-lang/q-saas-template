# Estándares de API y Comunicación

> Contratos REST, formato de respuestas, paginación y webhooks.

## 1) Convenciones de URL

- Estilo RESTful por recurso.
- Plural para colecciones (`/users`, `/orders`).
- Versionado obligatorio en path (`/api/v1/...`).
- Evitar verbos en endpoint (usar métodos HTTP).

## 2) Métodos HTTP

- `GET`: lectura.
- `POST`: creación.
- `PUT`: reemplazo completo.
- `PATCH`: actualización parcial.
- `DELETE`: borrado lógico o solicitud de eliminación.

## 3) Contrato estándar de respuesta

### Éxito

```json
{
  "success": true,
  "data": {},
  "meta": {
    "request_id": "req_123",
    "timestamp": "2026-02-18T12:00:00Z"
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "field": "email",
      "reason": "invalid_format"
    }
  },
  "meta": {
    "request_id": "req_123",
    "timestamp": "2026-02-18T12:00:00Z"
  }
}
```

## 4) Mapa base de errores HTTP

| HTTP | code sugerido | Caso |
|---|---|---|
| 400 | VALIDATION_ERROR | Payload inválido |
| 401 | UNAUTHORIZED | Falta token o credenciales |
| 403 | FORBIDDEN | Sin permisos |
| 404 | NOT_FOUND | Recurso inexistente |
| 409 | CONFLICT | Estado incompatible |
| 422 | BUSINESS_RULE_VIOLATION | Regla de negocio |
| 429 | RATE_LIMITED | Demasiadas requests |
| 500 | INTERNAL_ERROR | Error inesperado |
| 503 | UPSTREAM_UNAVAILABLE | Dependencia caída |

## 5) Paginación, filtros y búsqueda

### Paginación por cursor (preferida)

`GET /api/v1/orders?limit=25&cursor=abc123`

Respuesta:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "next_cursor": "def456",
    "limit": 25,
    "has_more": true
  }
}
```

### Reglas

- `limit` máximo recomendado: 100.
- Nunca devolver colecciones completas sin paginación.
- Definir orden estable para evitar duplicados/saltos.

## 6) Idempotencia y reintentos

- `POST` sensibles (pagos, cobros, envíos) deben soportar `Idempotency-Key`.
- Reintentos en cliente sólo para errores transitorios (5xx/timeout), con backoff exponencial.

## 7) Webhooks

- Validar firma HMAC.
- Usar ventana de tolerancia temporal.
- Almacenar `event_id` para deduplicación.
- Responder 2xx rápido y procesar async cuando sea posible.

## 8) Documentación obligatoria

- Mantener contrato en OpenAPI/Swagger o Postman.
- Cada endpoint nuevo debe incluir:
  - request/response ejemplo,
  - códigos de error,
  - requisitos auth,
  - límites de rate limit.
