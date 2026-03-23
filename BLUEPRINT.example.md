# Blueprint de Ejemplo — q-saas-template

> Este archivo es un ejemplo de cómo llenar BLUEPRINT.md al clonar el template.
> Copiá BLUEPRINT.md, renombralo y completá los campos con los datos de tu producto.
> Este ejemplo describe el propio template como si fuera un proyecto nuevo.

## Identidad

- **Nombre del producto**: q-saas-template
- **Dominio**: n/a (es un template)
- **Descripción en una oración**: Template funcional para lanzar SaaS rápidamente con auth, dashboard, CRUD de ejemplo y configuración de deploy lista para usar.
- **Tipo de proyecto**: Herramienta interna / Template

## Usuarios

- **¿Quién lo usa?**: Operadores solos que trabajan con Claude Code para construir productos SaaS
- **Roles necesarios** (además de ADMIN/USER): ninguno
- **¿Cómo se registran?**: allowlist — solo el admin agrega emails en la tabla AllowedEmail

## Entidades de dominio

### Entidad principal: Project
- Campos: name (texto, requerido, max 100 chars), description (texto, opcional, max 1000 chars), status (enum: ACTIVE/PAUSED/COMPLETED/ARCHIVED), userId (relación a User), deletedAt (soft delete)
- Estados posibles: ACTIVE (activo), PAUSED (pausado), COMPLETED (completado), ARCHIVED (archivado)

### Entidades secundarias:
- User: name, email, image, role (ADMIN/USER)
- AllowedEmail: email (allowlist para controlar quién puede hacer login)

### Relaciones:
- Un User tiene muchos Projects. Un Project pertenece a un solo User.

## Pantallas principales

1. **Dashboard**: tarjetas con resumen de proyectos por estado (total, activos, pausados, completados, archivados). Link rápido a nuevo proyecto.
2. **Listado de proyectos**: tabla con nombre, estado y fecha de creación. Ordenable por columna. Botón "Nuevo proyecto". Click en fila navega al detalle.
3. **Detalle de proyecto**: muestra nombre, estado y descripción. Botón "Editar" abre formulario inline con campos nombre, descripción y estado. Botón "Eliminar" con confirmación.
4. **Nuevo proyecto**: formulario con nombre (requerido) y descripción (opcional). Validación client-side. Redirige al listado tras crear.
5. **Login**: botón "Ingresar con Google". Redirige al dashboard si ya autenticado.

## Monetización

- **Modelo**: ninguno (es un template)
- **Pasarela de pago**: ninguna

## Integraciones

- [ ] Bot de Telegram → correr `/project:telegram` después del setup
- [ ] reCAPTCHA → correr `/project:recaptcha` después del setup

## Diseño

- **Paleta de colores**: default (grises neutros — gray-900, gray-50, white)
- **Referencia visual**: ninguna
- **Estilo en 3 palabras**: profesional, limpio, funcional

## Notas adicionales

- Usá este template como base y reemplazá la entidad "Project" por la entidad principal de tu dominio.
- El patrón CRUD (modelo Prisma → validaciones Zod → API routes → hook → páginas) es el que Claude Code debe replicar para nuevas entidades.
- shadcn/ui no está pre-instalado. Si lo necesitás, corré `npx shadcn@latest init` después del setup.
