# Descubrimiento de modelo de negocio

> Skill para descubrir y documentar el modelo de negocio de un proyecto existente.
> Invocar con: `/project:descubrimiento`
> Este es un proceso INTERACTIVO: Claude recorre el código, infiere lo que puede, y pregunta lo que no puede.
>
> **Este comando es idempotente.** Podés correrlo cada vez que cambien las reglas de negocio.
> Actualiza tanto `BUSINESS_MODEL.md` como `BUSINESS_TECHNICAL_MAP.md`.

## Cuándo usar

- Al adoptar el template en un proyecto existente (ver `docs/ADOPCION_PROYECTOS_EXISTENTES.md`)
- Cuando se necesita actualizar `docs/BUSINESS_MODEL.md` después de cambios grandes
- Cuando se agregan roles de capa 2 (Business Logic, Data/Analytics) por primera vez
- **Cuando cambian reglas de negocio** y hay que regenerar el mapa técnico

## Paso 1: Verificar contexto

Leé en silencio:
- `docs/BUSINESS_MODEL.md` — si ya existe, es una actualización, no un descubrimiento desde cero
- `docs/ARCHITECTURE.md` — para entender el stack y la estructura

Si `BUSINESS_MODEL.md` ya tiene contenido, avisale al usuario:

> Ya existe un BUSINESS_MODEL.md con contenido. ¿Querés que lo actualice con lo que encuentre en el código, o que empiece de cero?

## Paso 2: Recorrer el código

Usá sub-agentes o recorrelo vos mismo. Buscá evidencia concreta de:

### Autenticación y roles
- Archivos de auth (login, registro, middleware de auth)
- Definición de roles (enum, constantes, tabla de roles)
- Middleware de permisos (quién puede qué)
- Provider de OAuth (Google, GitHub, etc.)

### Billing y planes
- Integraciones con pasarelas (Stripe, MercadoPago, Payway)
- Definición de planes (nombres, precios, límites)
- Lógica de trial (duración, qué pasa al vencer)
- Webhooks de pago
- Lógica de upgrade/downgrade

### Entidades de dominio
- Modelos de base de datos (schemas, migrations, models)
- Relaciones entre entidades (foreign keys, joins)
- Campos que implican reglas (status, role, plan, expires_at)

### Tracking y analytics
- Integraciones con analytics (Google Analytics, Mixpanel, Amplitude, PostHog)
- Eventos trackeados (track, identify, page)
- Dashboard o reportes internos

### Integraciones externas
- APIs de terceros (keys en .env, SDKs importados)
- Webhooks (endpoints que reciben callbacks)
- Servicios de email (SendGrid, Resend, SES)

## Paso 3: Generar borrador

Con lo que encontraste, generá un borrador de `docs/BUSINESS_MODEL.md` siguiendo la estructura del template. Para cada sección:

- **Si pudiste inferirlo del código:** Completá con lo que encontraste y citá dónde lo viste (archivo y línea)
- **Si no pudiste inferirlo:** Dejá marcado como `[PREGUNTA PARA EL USUARIO]` con una pregunta concreta

### Formato del borrador

Presentá el borrador al usuario con este formato:

```
## Borrador de Modelo de Negocio

Recorrí el código y esto es lo que encontré. Lo que está marcado con ❓
necesito que me lo confirmes o corrijas.

### Tipo de proyecto
[lo que inferiste]

### Monetización
Encontré [X] planes en `[archivo:línea]`:
- Plan A: $X/mes, límite de Y
- Plan B: $X/mes, límite de Y
❓ ¿Estos planes están vigentes? ¿Falta alguno?

### Roles
Encontré estos roles en `[archivo:línea]`: admin, member, viewer
❓ ¿Qué puede hacer cada uno?

[... etc para cada sección]
```

## Paso 4: Hacer preguntas

Después de presentar el borrador, hacé las preguntas pendientes. Reglas:

- **Máximo 5 preguntas por ronda.** Si hay más, priorizá las más importantes.
- **Preguntas concretas, no abiertas.** "¿El trial dura 14 o 30 días?" > "¿Cómo funciona el trial?"
- **Si el usuario dice "no sé"**, marcar como `[POR DEFINIR]` y seguir.
- **Si el usuario corrige algo que inferiste**, actualizar y agradecer.

Podés hacer hasta 3 rondas de preguntas. Si después de 3 rondas quedan cosas sin resolver, dejá las secciones como `[POR DEFINIR]`.

## Paso 5: Generar documento final

Con las respuestas del usuario, generá la versión final de `docs/BUSINESS_MODEL.md`:

1. Completá todas las secciones del template
2. Las secciones que quedaron sin resolver marcalas como `[POR DEFINIR — razón]`
3. Agregá la fecha en el historial de cambios
4. Mostrá un resumen al usuario:

```
✅ BUSINESS_MODEL.md generado/actualizado.

Secciones completas: X/Y
Secciones pendientes: Z (marcadas como [POR DEFINIR])

Próximo paso recomendado: correr el Business Logic Reviewer para
verificar que el código cumple estas reglas.
```

## Paso 6: Generar BUSINESS_TECHNICAL_MAP.md

Con el `BUSINESS_MODEL.md` finalizado, generá o actualizá `docs/BUSINESS_TECHNICAL_MAP.md`. Este archivo traduce las reglas de negocio en implicaciones técnicas agrupadas por dominio.

### Proceso

1. Leé `docs/BUSINESS_MODEL.md` completo
2. Para cada regla de negocio, identificá qué dominio técnico la necesita
3. Completá cada sección del mapa con implicaciones concretas y accionables

### Secciones y qué extraer

| Sección del mapa | Qué buscar en BUSINESS_MODEL.md |
|---|---|
| **Código** | Entidades de dominio, invariantes que afectan estructura de código, patrones requeridos |
| **QA** | Límites de plan (casos borde), transiciones de estado, reglas CUANDO/ENTONCES que necesitan test |
| **Seguridad** | Roles y permisos, validaciones que DEBEN ser server-side, datos sensibles por tipo de usuario |
| **Performance** | Jobs diferidos, cálculos pesados, cacheos requeridos, operaciones con alta frecuencia |
| **Infraestructura** | Invariantes de datos (constraints de DB), webhooks críticos, retención de datos, backups |
| **UX** | Flujos obligatorios de onboarding, mensajes de error con CTA de upgrade, estados vacíos con guía |

### Formato de cada entrada

Cada entrada debe ser concreta y accionable, no genérica:

```
## Seguridad

- Límites de plan se validan server-side, nunca solo en frontend (BUSINESS_MODEL §Reglas por plan)
- Roles: owner > admin > member > viewer — nunca permitir escalación (BUSINESS_MODEL §Autenticación)
- Datos de facturación solo visibles para owner y admin (BUSINESS_MODEL §Reglas por plan, regla 3)
```

### Si es una actualización

Si `BUSINESS_TECHNICAL_MAP.md` ya existe:
1. No borrar secciones — actualizar las existentes
2. Marcar con `[NUEVO]` las entradas agregadas en esta corrida
3. Marcar con `[ACTUALIZADO]` las entradas que cambiaron
4. Dejar las que no cambiaron sin marcar
5. Actualizar el historial de cambios al final

### Mostrá resumen al usuario

```
✅ BUSINESS_TECHNICAL_MAP.md generado/actualizado.

Secciones completadas: X/6
Entradas nuevas: N
Entradas actualizadas: M

Los roles técnicos (docs/roles/tech/) ahora van a consultar este mapa
antes de cada revisión.
```

## Paso 7: Recomendar siguiente acción

Según lo que encontraste, sugerí:

- Si hay reglas de negocio claras → "Podés correr el Business Logic Reviewer ahora"
- Si hay tracking implementado → "Podés correr el Data/Analytics Reviewer ahora"
- Si faltan muchas definiciones → "Te sugiero completar las secciones [POR DEFINIR] antes de correr los roles de revisión"
- Si se generó el mapa técnico → "Los roles técnicos ya van a tener contexto de negocio en la próxima revisión"

---

*Documentar el negocio no es burocracia. Es la diferencia entre construir lo correcto y construir correctamente lo incorrecto.*
