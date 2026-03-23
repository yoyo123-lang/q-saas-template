# Reglas Preventivas de Desarrollo

> **Objetivo:** Evitar que los problemas se generen, no encontrarlos después.
>
> Estas reglas fueron destiladas de los 6 roles de auditoría (`docs/roles/`) y de
> `security-rules-claudemd.md`. Los roles siguen existiendo para verificación post-desarrollo.
> Este archivo existe para que Claude Code aplique las reglas DURANTE la generación de código.
>
> **Referencia desde CLAUDE.md:**
> Agregar una sola línea: `- Seguir reglas preventivas → ver docs/REGLAS_PREVENTIVAS.md`

---

## Estructura y legibilidad (de Code Reviewer)

- Una función = una responsabilidad. Si necesitás "y" para describir qué hace, son dos funciones.
- Máximo 30 líneas por función. Si se pasa, partir.
- Nombres que digan QUÉ HACE: `getUserById()`, no `getData()`. `isPaymentValid`, no `flag`.
- Early return siempre. Nada de pirámides de ifs anidados.
- Imports organizados: primero externos, después internos. No importar lo que no se usa.
- Cero código comentado. Para eso está Git.
- Cero console.log de debug en código que se commitea.

## Robustez de datos (de QA Engineer)

- Todo campo de formulario valida: vacío, caracteres especiales (ñ, acentos, emojis), y longitud máxima.
- Todo campo numérico rechaza negativos y valores absurdos cuando corresponde.
- Las fechas recibidas del usuario se validan como fechas reales (no 31 de febrero ni año 1900).
- Todo listado tiene estado vacío visible ("No hay datos todavía").
- Todo botón que envía datos se deshabilita mientras procesa (evitar doble click).
- Todo indicador de carga visible cuando algo tarda más de 300ms.
- Feedback de éxito visible cuando una acción funciona.
- Formato argentino para números (1.000,50) y fechas (DD/MM/AAAA).
- Si una API externa no responde, la app no se queda colgada — mostrar error claro con opción de reintentar.

## Seguridad (de Security Auditor + security-rules-claudemd.md)

### Datos de entrada
- Queries parametrizadas SIEMPRE. Nunca concatenar input del usuario en queries.
- Todo input del usuario se valida en el SERVIDOR, aunque también se valide en el frontend.
- Usar librería de validación (zod, joi, class-validator) para inputs. No validar manualmente con ifs.
- Los uploads de archivos validan tipo MIME, extensión, y tamaño máximo.
- Nunca usar `eval()`, `exec()`, `Function()` ni equivalentes con datos del usuario.

### Autorización
- Todo endpoint que recibe un ID de recurso verifica que el usuario autenticado tiene permiso sobre ESE recurso específico. No alcanza con verificar que está logueado.
- Al generar un CRUD, cada operación incluye verificación de ownership: `WHERE id = $resourceId AND user_id = $currentUserId`.
- Las rutas de admin requieren verificación de rol explícita en el servidor.
- La verificación de permisos SIEMPRE ocurre en el servidor, nunca solo en el frontend.

### Autenticación
- Passwords hasheados con bcrypt o argon2. Nunca MD5 ni SHA1.
- Tokens de sesión con fecha de expiración.
- Cookies de sesión con flags: `Secure`, `HttpOnly`, `SameSite=Strict`.

### Respuestas y errores
- Los mensajes de error al usuario son genéricos. El detalle se loguea en el servidor. Nunca exponer stack traces, queries SQL, ni rutas internas.
- Las respuestas de API nunca devuelven campos internos: password hash, tokens de sesión, IDs internos que el usuario no necesita ver.

### Configuración
- Secretos SOLO en variables de entorno. Nunca en código ni en logs.
- `.env` en `.gitignore`. `.env.example` con todas las variables documentadas sin valores reales.
- CORS restringido al dominio correcto. Nunca `*` en producción con credenciales.
- Headers de seguridad: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
- `NODE_ENV = production` en producción. Nunca dejar `development`.

## Dependencias

- Antes de agregar una dependencia nueva, verificar:
  1. Que existe en el registro oficial (npmjs.com / pypi.org)
  2. Que tiene descargas significativas (>1.000/semana)
  3. Que tiene repositorio público con actividad reciente
  4. Que no es una librería entera cuando solo necesitamos una función
- Si no cumple estos criterios, buscar alternativa o implementar directamente.
- Preferir dependencias con pocas o cero subdependencias.

## Performance (de Performance Engineer)

- Nunca `SELECT *` — pedir solo las columnas necesarias.
- Todo listado paginado. Nunca devolver colecciones enteras.
- Cero queries dentro de loops (problema N+1). Si necesitás datos de N registros, hacé 1 query con todos los IDs.
- Timeout configurado para toda llamada a API externa o base de datos.
- Nunca hacer llamadas a APIs externas dentro de loops.
- Imágenes optimizadas con lazy loading.
- Tareas pesadas (emails, PDFs, reportes) en background, no en el thread principal.

## Operabilidad (de DevOps / SRE)

- Toda app con backend tiene un endpoint `/health` que verifica conexión a base de datos y servicios críticos.
- Toda variable de entorno necesaria está documentada en `.env.example` con su propósito.
- Todo log de error incluye: QUÉ se intentó, CON QUÉ datos, QUÉ salió mal.
- Incluir `request_id` o correlation_id para rastrear operaciones de punta a punta.
- Loguear eventos de seguridad: intentos de acceso fallidos, cambios de permisos, operaciones de pago (sin datos sensibles).
- Nunca loguear: contraseñas, tokens, números de tarjeta, DNI completo.
- Reintentos con backoff exponencial para operaciones que pueden fallar temporalmente.
- Borrado lógico (soft delete) en datos de usuario.

## Testing (de TDD.md)

- Para lógica de negocio, servicios y endpoints: escribir el test ANTES del código (TDD).
- El test debe fallar antes de escribir el código de producción. Si pasa sin código, el test no sirve.
- No escribir más código del necesario para pasar el test actual.
- No commitear con tests que fallan. No comentar tests para que "pase el build".
- Al menos testear: happy path + un caso de error + un edge case por función.

## Verificación antes de declarar completado (de Superpowers)

> **Regla no negociable:** Nunca declarar una tarea "completa" sin ejecutar un comando de verificación fresco y leer la salida completa.

### El gate de verificación

Antes de cualquier afirmación de éxito, seguir estos 5 pasos en orden:

1. **Identificar** el comando que prueba tu afirmación (test, build, lint, curl, etc.)
2. **Ejecutar** el comando completo y fresco (no sirve uno anterior)
3. **Leer** la salida completa y el exit code
4. **Confirmar** que la salida realmente prueba lo que afirmás
5. **Recién entonces** declarar completado, citando la evidencia

Saltear cualquier paso es incorrecto, no eficiente.

### Qué NO cuenta como verificación

- Un test que corriste hace 5 minutos (antes de los últimos cambios)
- Verificaciones parciales ("el lint pasa" pero no corriste los tests)
- Extrapolar ("si A funciona, B seguro también")
- Asumir que un fix funciona sin comprobarlo
- Confiar en el reporte de un sub-agente sin ver la evidencia
- Expresar confianza sin datos ("estoy seguro de que funciona")

### Red flags — detenerse si te escuchás diciendo:

- "Should work", "probably fixed", "seems to be working"
- "Done!", "Listo!", "Completado!" antes de ejecutar verificación
- "Ya lo comprobé antes" (¿antes de los últimos cambios?)
- "Es un cambio trivial, no necesita verificación"
- "Los tests tardan mucho, pero seguro pasan"

### Anti-racionalizaciones comunes

| Lo que te decís | La realidad |
|---|---|
| "Es un cambio trivial, no necesita test" | Los cambios triviales que rompen cosas son los más comunes |
| "Ya sé que funciona, lo vi antes" | ¿Antes de cuáles cambios? Ejecutalo de nuevo |
| "Los tests tardan mucho" | Un deploy roto tarda más |
| "Solo cambié un string/config" | Verificá igual — 10 segundos vs. un bug en producción |
| "El linter ya lo revisó" | El linter no verifica lógica ni regresiones |

## Anti-racionalizaciones de TDD

> Racionalizaciones que los agentes usan para saltear test-first. Ninguna es válida.

| Lo que te decís | Por qué está mal |
|---|---|
| "Primero escribo el código para entender el problema, después el test" | Entender el problema ES definir qué debe pasar — eso es el test |
| "Es solo un helper/util, no necesita test" | Si tiene lógica, necesita test. Si no tiene lógica, no necesita existir |
| "El framework ya lo testea" | El framework testea el framework, no tu lógica de negocio |
| "Es código de UI, no se puede testear fácilmente" | Separá la lógica de la presentación. Testeá la lógica |
| "Ya tengo el código en la cabeza, es más rápido escribirlo primero" | Más rápido ≠ mejor. El test documenta la intención |
| "Es un refactor, los tests existentes lo cubren" | Corré los tests existentes ANTES y DESPUÉS. Si no hay tests, es aún más motivo para escribir uno |
| "Son solo tipos/interfaces, no necesitan test" | Correcto — pero si tienen lógica de validación, sí |
| "El deadline es ajustado" | Sin tests vas a pasar más tiempo debuggeando que escribiendo tests |
| "Ya lo probé manualmente" | Probalo automáticamente para que la verificación sobreviva al próximo cambio |

## Anti-racionalizaciones de seguridad

| Lo que te decís | Por qué está mal |
|---|---|
| "Es un endpoint interno, no necesita auth" | Los endpoints internos se exponen eventualmente |
| "Solo usuarios de confianza van a usar esto" | Eso no se puede garantizar, y no cuesta validar |
| "Es solo para desarrollo, después lo saco" | El código "temporal" tiene tendencia a llegar a producción |
| "La validación del frontend ya cubre esto" | El frontend se puede bypasear con una request directa |
| "Es solo un SELECT, no puede hacer daño" | Un SELECT sin paginación puede tirar el servidor |

## Consistencia cross-capa (de Consistency Reviewer)

> Antes de commitear un cambio que toca más de una capa (frontend, backend, base de datos), verificar alineación.

### Tipos

- Si modificás un tipo/interfaz en el frontend, verificá que el DTO/schema equivalente en el backend coincida (campos, tipos, opcionalidad).
- Si modificás un DTO en el backend, verificá que el tipo del frontend se actualice.
- Si hay enums o constantes compartidas, verificá que tengan los mismos valores en ambas capas.
- Si los nombres de campos difieren entre capas (camelCase vs snake_case), verificá que exista un mapper explícito.

### Endpoints

- Si creás un endpoint nuevo en el backend, verificá que exista la llamada correspondiente en el frontend (o documentá que es API pública).
- Si creás una llamada a API en el frontend, verificá que el endpoint exista en el backend con el mismo método HTTP, ruta y parámetros.
- Si cambiás la firma de un endpoint (parámetros, body, respuesta), verificá que todas las llamadas del frontend se actualicen.

### Schema y migraciones

- Si agregás un campo al modelo/ORM, verificá que exista una migración que agregue la columna correspondiente.
- Si creás una migración que modifica el schema, verificá que el modelo refleje el cambio (tipo, nullable, default).
- Si eliminás un campo del modelo, verificá que exista una migración que lo elimine.

### Anti-racionalizaciones de consistencia

| Lo que te decís | Por qué está mal |
|---|---|
| "El frontend se va a adaptar después" | Si no se adapta ahora, se rompe en runtime |
| "Es solo un campo nuevo, el frontend no lo usa todavía" | Si el campo es requerido en BE, el FE va a fallar al enviar sin él |
| "La migración la hago en otro PR" | Sin migración, el modelo apunta a una columna que no existe |
| "Los tipos son parecidos, va a andar" | "Parecido" no es "igual" — un campo `string` vs `number` rompe silenciosamente |
| "Ya lo voy a cruzar cuando integre" | La integración es AHORA, no después |

## Producto y UX (de Product Reviewer)

- En 5 segundos se entiende qué hace la app/sitio. El título y las primeras palabras explican el valor.
- Los call-to-action (botones principales) son claros y visibles.
- Textos en español argentino natural. No traducciones robóticas ni "Lorem ipsum" que quedó.
- Cada página tiene title tag descriptivo y único, meta description útil, y URLs legibles.
- Open Graph tags para que se vea bien al compartir en redes.
- Sitemap.xml y robots.txt presentes.
- Navegación completa por teclado. Contraste de texto suficiente.

---

## Reglas adicionales para proyectos con pagos

> Aplicar solo si el proyecto maneja pagos (Payway, Mobbex, MercadoPago, Stripe).

- Los datos de tarjeta (PAN completo, CVV) NUNCA tocan nuestro servidor. Usar tokenización del procesador.
- Los webhooks de pago validan la firma del origen.
- Los webhooks son idempotentes: recibir el mismo webhook 2 veces produce la misma acción 1 vez.
- Los montos se validan en el servidor. No confiar en lo que envía el frontend.
- Las credenciales del procesador van en variables de entorno, separadas por ambiente.

---

## Enforcement de planificación

> Racionalizaciones para saltear los gates de planificación. Ninguna es válida.
> Referencia: gates definidos en `.claude/commands/cambio-grande.md` (paso 2b).

| Lo que te decís | Por qué está mal |
|---|---|
| "Es un cambio chico, no necesita estimación" | Sin estimación no sabés si te va a tomar 10 min o 2 horas — y el usuario tampoco |
| "Ya sé cuánto va a tardar, no hace falta escribirlo" | La estimación no es para vos, es para el plan y para el usuario |
| "Es todo backend, no necesito plan separado de frontend" | Si el cambio toca API y el proyecto tiene frontend, el FE se va a romper sin plan |
| "No es fullstack, son solo tipos compartidos" | Tipos compartidos = es fullstack. Si cambiás un tipo en BE y no en FE, se rompe |
| "La migración la agrego al final cuando todo funcione" | Sin migración el deploy falla — agregarla "al final" es apostar a que te vas a acordar |
| "Supabase genera las migraciones automáticamente" | Supabase genera migraciones si usás el dashboard, no si editás el modelo en código |
| "El gate de validación es burocracia" | El gate tarda 30 segundos. Un deploy roto tarda horas |
| "Ya pasé el gate en el cambio anterior, no hace falta de nuevo" | Cada cambio-grande tiene su propio gate. Contextos distintos, riesgos distintos |

---

## Cómo usar este archivo

**Claude Code lo lee al arrancar** (referenciado desde CLAUDE.md) y aplica estas reglas mientras genera código. No es un checklist post-desarrollo — es un estándar de generación.

**Las auditorías de `docs/roles/` siguen corriendo** después del desarrollo para detectar lo que solo se puede verificar con el código terminado: performance real, cálculos correctos, responsividad, flujo de usuario, código muerto, dependencias vulnerables.

**Si las auditorías encuentran un problema que se podría haber prevenido**, evaluar si falta una regla acá y agregarla. Este archivo crece con el uso, igual que `KNOWN_ISSUES.md`.

---

## Origen de las reglas

Cada sección fue destilada de:
- Estructura y legibilidad → `docs/roles/tech/code-reviewer.md`
- Robustez de datos → `docs/roles/tech/qa-engineer.md`
- Seguridad → `docs/roles/tech/security-auditor.md` + `security-rules-claudemd.md`
- Dependencias → `security-rules-claudemd.md` + `docs/roles/tech/security-audit-post-sprint.md`
- Performance → `docs/roles/tech/performance-engineer.md`
- Operabilidad → `docs/roles/tech/devops-sre.md`
- Producto y UX → `docs/roles/business/product-reviewer.md`
- Consistencia cross-capa → `docs/roles/tech/consistency-reviewer.md`
- Verificación antes de completar → Superpowers (`obra/superpowers`, skill `verification-before-completion`)
- Anti-racionalizaciones → Superpowers (skills `test-driven-development`, `verification-before-completion`, `systematic-debugging`)

Las fuentes originales mantienen el checklist completo de verificación post-desarrollo.
Este archivo contiene solo las reglas que se pueden aplicar DURANTE la generación.
