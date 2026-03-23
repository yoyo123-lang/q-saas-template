# Seguridad

> Reglas mínimas para desarrollo seguro por defecto.

## 1) Checklist pre-commit

- [ ] Validación de input en frontera (API/form/eventos).
- [ ] Queries parametrizadas.
- [ ] Endpoints protegidos con auth + autorización por rol/permiso.
- [ ] Sin secretos en código o logs.
- [ ] Manejo de errores sin filtrar detalles internos.
- [ ] Revisión de dependencias vulnerables.

## 2) Autenticación y autorización

## 2.1 Login

- Mecanismo: JWT / sesiones / OAuth2 (definir por proyecto).
- Password hashing: Argon2/bcrypt/scrypt (nunca MD5/SHA1).

## 2.2 Tokens

- Access token corto (ej. 15-30 min).
- Refresh token con rotación.
- Revocación al logout, cambio de password o incidente.

## 2.3 Roles y permisos

- RBAC/ABAC explícito.
- Verificación en cada endpoint sensible.

## 2.4 Forgot password (flujo mínimo)

1. Solicitud con email/identificador.
2. Token de recuperación de un solo uso y corto TTL.
3. Confirmación de nueva password con política de complejidad.
4. Invalidación de sesiones/tokens previos.
5. Notificación de seguridad al usuario.

## 3) Seguridad de aplicación

- Protección SQL/NoSQL injection: siempre parametrizar.
- XSS: escape/sanitización de output en UI.
- CSRF: token CSRF en apps con cookies/sesión.
- CORS restringido por ambiente.
- Rate limiting (login, recovery, endpoints críticos).

## 4) Uploads de archivos

- Lista de MIME permitidos.
- Tamaño máximo por endpoint.
- Almacenamiento fuera del web root.
- Escaneo antimalware si aplica.

## 5) Secretos y configuración

- Secretos sólo en vault/env manager.
- `.env.example` obligatorio sin valores reales.
- Rotación periódica de claves (definir ventana por criticidad).
- Ambientes separados (dev/staging/prod) sin compartir secretos.

## 6) Headers recomendados

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`
- `Referrer-Policy`

## 7) Auditoría y respuesta

- Log de eventos de seguridad con `request_id`/`actor_id`.
- Alertas ante patrones anómalos (fuerza bruta, token reuse, etc.).
- Incidentes: seguir `OPERATIONS.md`.
