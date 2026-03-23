# Q SaaS Template

> Template funcional que combina el sistema de reglas de templete-blanco con código base deployable para SaaS.

## Qué incluye

### Código funcional

- **Auth completa**: Google OAuth con NextAuth v5, allowlist de emails, roles (ADMIN/USER), middleware de protección
- **Dashboard**: Layout con sidebar responsive, header con usuario, breadcrumbs
- **CRUD de ejemplo**: Modelo "Project" con 5 endpoints REST, validación Zod, soft delete, paginación por cursor
- **Componentes UI**: LoadingState, EmptyState, ErrorState, ConfirmDialog, DataTable, StatusBadge
- **Landing pública**: Hero, features, CTA
- **Health check**: `/api/health` con estado de DB
- **SEO**: Metadata dinámica, robots.txt, sitemap.xml
- **Tests**: Unitarios (Zod) + integración (endpoints)

### Sistema de reglas (templete-blanco)

- 13 comandos de proyecto (skills)
- 4 sub-agentes (explorador, implementador, micro-revisor, revisor)
- 9+ roles de auditoría
- Documentación modular completa

## Stack

| Componente | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript (strict) |
| Estilos | Tailwind CSS 4 |
| Base de datos | Supabase (PostgreSQL) |
| ORM | Prisma 6 |
| Auth | NextAuth v5 + Google OAuth |
| Validación | Zod 3 |
| Deploy | Vercel |

## Setup en 5 minutos

### 1. Clonar y configurar

```bash
gh repo create mi-producto --template q-saas-template --private
cd mi-producto
cp .env.example .env.local
```

### 2. Completar variables de entorno

Editar `.env.local` con:
- `DATABASE_URL` y `DIRECT_URL` de Supabase
- `NEXTAUTH_SECRET` (generar con `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` de Google Cloud Console
- `ADMIN_EMAIL` para el seed

### 3. Base de datos

```bash
npm install
npx prisma db push
npm run db:seed
```

### 4. Desarrollo

```bash
npm run dev
```

### 5. Personalizar

```bash
# Llenar BLUEPRINT.md con los datos del producto
# Abrir Claude Code
claude
# Correr el onboarding
/project:sesion
```

## Cómo arrancar un proyecto nuevo

1. Clonar este template
2. Llenar `BLUEPRINT.md` con los datos del producto
3. Correr `/project:sesion` en Claude Code
4. Claude Code transforma el esqueleto: renombra modelos, crea entidades, aplica diseño
5. Correr `/project:cierre` al terminar

**Tiempo estimado**: 30-60 minutos (vs. 4-8 horas desde cero)

## Qué NO incluye (usar playbooks)

- Pasarelas de pago → playbook específico por pasarela
- Bot de Telegram → `/project:telegram`
- reCAPTCHA → `/project:recaptcha`
- Notificaciones, i18n, emails transaccionales, analytics

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levantar en desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | Lint con ESLint |
| `npm run test` | Correr tests |
| `npm run db:generate` | Regenerar Prisma client |
| `npm run db:push` | Push schema a DB |
| `npm run db:seed` | Seed de admin |

## Skills de Claude Code

| Comando | Qué hace |
|---|---|
| `/project:sesion` | Mini-onboarding al arrancar sesión |
| `/project:cierre` | Cierre ordenado de sesión |
| `/project:cambio` | Cambio puntual con revisión automática |
| `/project:cambio-grande` | Cambio multi-etapa con revisión por etapa |
| `/project:diseño` | Contexto visual para crear/mejorar pantallas |
| `/project:debug` | Debugging estructurado |
| `/project:deploy` | Verificación pre-deploy y push |
| `/project:oauth` | Integración OAuth con Google |
| `/project:recaptcha` | Integración reCAPTCHA v3 |
| `/project:telegram` | Bot de Telegram con LLM |

## Estructura

```
src/
├── app/
│   ├── layout.tsx              # Layout raíz con providers
│   ├── page.tsx                # Landing pública
│   ├── login/                  # Login con Google
│   ├── unauthorized/           # Acceso denegado
│   ├── dashboard/              # Rutas protegidas
│   │   ├── layout.tsx          # Sidebar + header
│   │   ├── page.tsx            # Dashboard home
│   │   └── projects/           # CRUD de ejemplo
│   └── api/
│       ├── auth/               # NextAuth handler
│       ├── health/             # Health check
│       └── v1/projects/        # REST endpoints
├── components/
│   ├── layout/                 # Sidebar, header, breadcrumbs
│   └── shared/                 # Componentes reutilizables
├── lib/                        # Auth, DB, validaciones, helpers
├── hooks/                      # React hooks custom
└── types/                      # TypeScript types
```
