# Blueprint del Proyecto

> Llená este archivo antes de correr `/project:sesion` en un proyecto nuevo.
> Claude Code lo lee y usa para transformar el template genérico en tu producto.

## Identidad

- **Nombre del producto**: [completar]
- **Dominio**: [completar — ej: qobra.com.ar]
- **Descripción en una oración**: [completar — qué problema resuelve y para quién]
- **Tipo de proyecto**: [SaaS con billing / SaaS interno / Herramienta interna / Dashboard]

## Usuarios

- **¿Quién lo usa?**: [completar — ej: "administradores de consorcios en Argentina"]
- **Roles necesarios** (además de ADMIN/USER): [completar o "ninguno"]
- **¿Cómo se registran?**: [allowlist / registro abierto / invitación]

## Entidades de dominio

> Describí las "cosas" principales que maneja tu producto. Claude Code va a crear los modelos, migraciones, y CRUDs basándose en esto.

### Entidad principal: [nombre — ej: "Propiedad", "Alumno", "Factura"]
- Campos: [lista de campos con tipo — ej: "nombre (texto), dirección (texto), unidades (número), administrador_id (relación a User)"]
- Estados posibles: [ej: "activa, suspendida, baja"]

### Entidades secundarias (si hay):
- [nombre]: [campos principales]
- [nombre]: [campos principales]

### Relaciones:
- [ej: "Un User administra muchas Propiedades. Una Propiedad tiene muchas Unidades."]

## Pantallas principales

> Listá las pantallas que necesitás. Claude Code va a crear las rutas y páginas.

1. **Dashboard**: [qué muestra — ej: "resumen de propiedades, cobros del mes, alertas"]
2. **Listado de [entidad]**: [qué columnas, qué filtros, qué acciones]
3. **Detalle de [entidad]**: [qué información muestra, qué acciones tiene]
4. **[otra pantalla]**: [descripción]

## Monetización

- **Modelo**: [gratis / freemium / suscripción / por uso / ads / ninguno]
- **Pasarela de pago**: [ninguna / MercadoPago / Stripe / otra]
- **Planes** (si aplica):
  - Free: [límites]
  - Pro: [precio, límites]
  - Enterprise: [precio, límites]

## Integraciones

- [ ] Bot de Telegram → correr `/project:telegram` después del setup
- [ ] reCAPTCHA → correr `/project:recaptcha` después del setup
- [ ] API externa: [nombre y URL]
- [ ] Webhooks: [de dónde y para qué]

## Diseño

- **Paleta de colores**: [primario en hex, acento en hex, o "default"]
- **Referencia visual**: [URL de un sitio que te guste como se ve, o "ninguna"]
- **Estilo en 3 palabras**: [ej: "profesional, limpio, serio" o "moderno, colorido, amigable"]

## 6. Autenticación y Onboarding
- ¿Qué tipo de onboarding necesita tu BU? (empresarial / personal / ambos)
- ¿Qué pasos adicionales de onboarding necesita tu BU? (describir brevemente)
  Ejemplos: ERP → Primer producto. CRM → Canales de comunicación. Job Board → Primera oferta.
- ¿Necesita roles adicionales además de ADMIN/USER? (describir)

## Notas adicionales

[Cualquier cosa que Claude Code deba saber antes de arrancar — restricciones, decisiones ya tomadas, cosas que no querés]
