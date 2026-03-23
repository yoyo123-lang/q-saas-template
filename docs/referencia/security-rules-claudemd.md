> **NOTA:** Las reglas operativas de este archivo fueron incorporadas a
> `docs/REGLAS_PREVENTIVAS.md`, que es la fuente de verdad para reglas
> preventivas de desarrollo. Este archivo se mantiene como referencia
> del razonamiento detrás de cada regla (por qué funciona, datos de
> OWASP, OpenSSF, Veracode, etc.).
>
> No duplicar reglas de acá al CLAUDE.md — usar REGLAS_PREVENTIVAS.md.

---

# Reglas de Seguridad para CLAUDE.md

> Este archivo contiene reglas de seguridad para pegar en el `CLAUDE.md` de cada proyecto.
> El objetivo es PREVENIR vulnerabilidades durante la generación de código, no detectarlas después.
> Basado en OWASP Top 10 2025, OpenSSF Security Guide for AI Code Assistants, y las reglas
> de TikiTribe/claude-secure-coding-rules.
>
> Copiá la sección "REGLAS PARA COPIAR" al CLAUDE.md de tu proyecto.
> Adaptá según el stack (las reglas están pensadas para Node.js/TypeScript pero
> los principios aplican a cualquier lenguaje).

## Por qué esto funciona

Las auditorías detectan problemas que ya existen. Estas reglas los previenen.
Cuando Claude Code lee el CLAUDE.md antes de generar código, aplica estas restricciones
automáticamente. Es como poner barandas en la ruta en vez de poner ambulancias al pie
del barranco.

Según la comunidad de OpenSSF, prompts de seguridad específicos reducen
significativamente las vulnerabilidades generadas. Un prompt genérico como
"generá un login" produce código inseguro. Un prompt con reglas como las de abajo
produce código que hashea contraseñas, valida inputs, y usa rate limiting
desde el arranque.

---

## REGLAS PARA COPIAR

Pegá todo lo que está entre las líneas de abajo en tu `CLAUDE.md`, dentro de una
sección `## Seguridad`:

---

```markdown
## Seguridad

### Reglas estrictas (nunca violar)

- **NUNCA hardcodear secretos**: contraseñas, API keys, tokens, private keys van SIEMPRE
  en variables de entorno. Si necesitás un ejemplo, usá `"YOUR_API_KEY_HERE"` o
  `process.env.API_KEY`. Nunca generar valores que parezcan reales.
- **NUNCA concatenar inputs del usuario en queries**: usar SIEMPRE queries parametrizadas
  (`$1`, `?`, prepared statements). Esto aplica a SQL, MongoDB, y cualquier base de datos.
- **NUNCA usar `eval()`, `exec()`, `Function()` con datos del usuario**.
- **NUNCA exponer stack traces al usuario**: los errores que llegan al cliente deben ser
  genéricos. Loguear el detalle en el servidor.
- **NUNCA devolver campos sensibles en APIs**: password hash, tokens internos, IDs de
  sesión no deben aparecer en respuestas JSON.
- **NUNCA usar MD5 o SHA1 para hashear contraseñas**: usar bcrypt o argon2.
- **NUNCA instalar dependencias sin verificar**: antes de agregar un paquete, confirmar
  que existe en el registro oficial, tiene actividad reciente, y descargas significativas.

### Reglas de autorización (OWASP #1)

- Todo endpoint que reciba un ID de recurso DEBE verificar que el usuario autenticado
  tiene permiso sobre ESE recurso. No alcanza con verificar que está logueado.
- La verificación de permisos SIEMPRE ocurre en el servidor, nunca solo en el frontend.
- Las rutas de administración requieren verificación de rol explícita.
- Si generás un CRUD, cada operación debe incluir verificación de ownership:
  `WHERE id = $resourceId AND user_id = $currentUserId`

### Reglas de validación

- TODO input del usuario se valida en el servidor, aunque también se valide en el frontend.
- Usar una librería de validación (zod, joi, class-validator) — no validar manualmente.
- Los campos numéricos deben tener rangos razonables (min/max).
- Los uploads de archivos validan tipo MIME, extensión, y tamaño máximo.
- Las fechas se validan como fechas reales.

### Reglas de configuración

- CORS: especificar dominios exactos, nunca `*` en producción.
- Cookies de sesión: flags `Secure`, `HttpOnly`, `SameSite=Strict`.
- Headers: incluir `X-Content-Type-Options: nosniff` y `X-Frame-Options: DENY`.
- NODE_ENV debe ser `production` en producción (nunca dejar `development`).

### Reglas para pagos (si aplica)

- Los datos de tarjeta (PAN, CVV) NUNCA deben tocar nuestro servidor.
  Usar tokenización del procesador (Payway, Decidir, Stripe).
- Los webhooks de pago DEBEN validar firma del origen.
- Los webhooks DEBEN ser idempotentes (mismo webhook 2 veces = misma acción 1 vez).
- Los montos se validan en el servidor, no confiar en lo que envía el frontend.
- Las credenciales del procesador van en variables de entorno.

### Reglas para logging

- NUNCA loguear: contraseñas, tokens, números de tarjeta, CVV, DNI completo.
- SÍ loguear: intentos de acceso fallidos, cambios de permisos, operaciones de pago
  (sin datos sensibles), errores de sistema con contexto suficiente.
- Incluir request_id o correlation_id para rastrear operaciones de punta a punta.

### Reglas para dependencias

- Antes de agregar una dependencia nueva, verificar:
  1. Que existe en el registro oficial (npmjs.com / pypi.org)
  2. Que tiene descargas significativas (>1000/semana)
  3. Que tiene repositorio público con actividad reciente
  4. Que no es una librería entera cuando solo necesitamos una función
- Si una dependencia no cumple estos criterios, buscar una alternativa o implementar
  la funcionalidad directamente.
- Preferir dependencias con 0 subdependencias cuando sea posible.
```

---

## Cómo agregar al proyecto

1. Abrí el `CLAUDE.md` de tu proyecto
2. Copiá todo el bloque de arriba (desde `## Seguridad`)
3. Pegalo al final del archivo o en la sección que corresponda
4. Adaptá según tu stack:
   - Si usás Python: cambiá `process.env` por `os.environ`, `bcrypt` por `passlib.hash.bcrypt`
   - Si usás Django: agregá regla de `SECURE_SSL_REDIRECT = True`
   - Si usás Astro/sitios estáticos: podés omitir las secciones de auth y pagos

## Qué efecto tiene

Con estas reglas en el CLAUDE.md, cuando le pidas a Claude Code:

- "Creá un endpoint de login" → va a usar bcrypt, rate limiting, y tokens con expiración.
- "Agregá un endpoint para ver los pagos de un usuario" → va a incluir verificación de ownership.
- "Conectá con la API de Payway" → va a poner las credenciales en env vars y validar webhooks.
- "Instalá una librería para parsear CSV" → va a verificar que existe y tiene actividad.

No es infalible, pero reduce drásticamente los problemas más comunes.

## Prompt de activación

No necesita prompt. Se activa solo cuando Claude Code lee el CLAUDE.md al empezar a trabajar.

---

*Las mejores vulnerabilidades son las que nunca se escriben.*
