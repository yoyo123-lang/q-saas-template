# Arquitectura del Proyecto

> Fuente de verdad de arquitectura para q-saas-template.

## 1) Visión del proyecto

- **Proyecto en una oración:** Template funcional que combina el sistema de reglas de templete-blanco con código base deployable para SaaS.
- **Problema que resuelve / para quién:** Elimina las 4-8 horas de setup inicial en cada proyecto nuevo para operadores solo que trabajan con Claude Code.
- **Objetivos de negocio:** Lanzar productos Q (Qobra, Qautiva, Qontacta, Qontrata, Qapitaliza) y proyectos nuevos con velocidad.
- **Alcance:** Auth + Layout + CRUD ejemplo + Componentes UI + Health + SEO + Deploy config. NO incluye pagos, notificaciones, i18n, emails, analytics.
- **Estado actual:** MVP
- **Roadmap:** Extender con playbooks según necesidad de cada proyecto.

## 2) Arquitectura del sistema

### 2.1 Diagrama general

```text
[Browser] → [Next.js App Router] → [API Routes /api/v1/*]
                    ↓                         ↓
              [Middleware]              [Prisma ORM]
              (cookie check)                  ↓
                    ↓                   [Supabase PostgreSQL]
              [Layout Auth]
              (role check via DB)
```

### 2.2 Estilo arquitectónico

- Tipo: Monolito modular (Next.js App Router con route groups)
- Justificación: Operador solo, velocidad de desarrollo, un solo deploy.

### 2.3 Módulos

| Módulo | Responsabilidad | Datos que maneja |
|---|---|---|
| auth | Login Google OAuth, allowlist, roles, middleware | User, Account, Session, AllowedEmail |
| layout | Sidebar, header, breadcrumbs, navegación | Config de navegación |
| projects (ejemplo) | CRUD completo como patrón replicable | Project |
| shared | Componentes UI reutilizables, helpers | - |
| api | Endpoints REST estandarizados | Respuestas con contrato API_STANDARDS |
| seo | Metadata, robots, sitemap, OG tags | - |

### 2.4 Modelo de protección de rutas (3 capas)

| Capa | Dónde | Qué verifica | Toca DB? | Limitación |
|---|---|---|---|---|
| 1. Middleware | `src/middleware.ts` | Cookie de sesión existe | No | Cookie expirada o corrupta pasa el check |
| 2. Layout | `src/app/dashboard/layout.tsx` | Sesión válida vía `auth()` | Sí | No verifica rol — solo autenticación |
| 3. API routes | `requireAuth()` / `requireAdmin()` | Sesión + rol | Sí (vía session callback) | — |

**Por qué el middleware no valida la sesión:** El Edge Runtime no puede ejecutar Prisma ni queries a DB. El middleware es una optimización que evita cargar la página completa para usuarios sin cookie. La seguridad real está en las capas 2 y 3.

**Consecuencia:** Un usuario con cookie expirada verá brevemente la carga del layout antes de ser redirigido a `/login` por la Capa 2. Esto es aceptable para el template.

### 2.5 Comunicación interna

| Origen | Destino | Mecanismo |
|---|---|---|
| Middleware | Auth config | Cookie check (no DB) |
| Layout | Prisma/DB | `auth()` → verificación de rol |
| API routes | Prisma/DB | Queries directas |
| Client components | API routes | `fetch` via hooks custom |

### 2.6 Dependencias externas

| Servicio | Uso | Riesgo | Fallback |
|---|---|---|---|
| Google OAuth | Autenticación | Medio | Sin fallback (único provider) |
| Supabase | Base de datos | Bajo | PostgreSQL estándar (migrable) |
| Vercel | Deploy | Bajo | Railway como alternativa |

### 2.7 ADRs

- `ADR-0001-sistema-documentacion-modular.md` — Documentación modular con CLAUDE.md corto
- `ADR-0002-mejoras-inspiradas-en-superpowers.md` — Mejoras del sistema de reglas
- `ADR-0003-template-con-codigo-base.md` — Decisión de agregar código funcional al template
- `ADR-0004-versiones-reales-del-stack.md` — Versiones reales usadas (Next.js 15, Zod 3) y decisiones de downgrade

## 3) Stack tecnológico

| Componente | Tecnología | Versión | Motivo |
|---|---|---|---|
| Lenguaje | TypeScript | 5.x (strict) | Consistencia, tipos |
| Framework | Next.js | 15.x (App Router) | LTS estable, máximo contexto Claude Code |
| Estilos | Tailwind CSS | 4.x | Mobile-first, ya en uso |
| Base de datos | PostgreSQL (Supabase) | 15+ | Tier gratuito, auth integrada |
| ORM | Prisma | 6.x | Tipos auto-generados |
| Auth | NextAuth (Auth.js) | v5 (beta) | Playbook probado |
| Validación | Zod | 3.x | Server-side, inferencia, API estable |
| UI | Tailwind + Radix UI | - | Componentes custom (shadcn/ui se instala por proyecto) |
| Deploy | Vercel | n/a | Ya en uso |

### 3.1 Tecnologías prohibidas/deprecadas

- No usar NextAuth v4 (usar v5 beta)
- No usar Pages Router (usar App Router)
- No usar CSS modules ni styled-components (usar Tailwind)
- No usar JWT para sesiones (usar sesiones en DB)

## 4) Estructura de carpetas

```text
q-saas-template/
├── CLAUDE.md                       # Reglas del agente (templete-blanco)
├── BLUEPRINT.md                    # Formulario para proyectos nuevos
├── README.md                       # Instrucciones de setup
├── SESSION_LOG.md                  # Memoria entre sesiones
├── .claude/                        # Agentes, comandos, settings
├── docs/                           # Documentación modular
├── prisma/
│   ├── schema.prisma               # Modelos: User, Account, Session, AllowedEmail, Project
│   └── seed.ts                     # Seed del admin
├── supabase/
│   └── migrations/                 # SQL migrations
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Layout raíz
│   │   ├── page.tsx                # Landing pública
│   │   ├── login/                  # Login con Google OAuth
│   │   ├── unauthorized/           # Acceso denegado
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/ # NextAuth handler
│   │   │   ├── health/             # Health check
│   │   │   └── v1/projects/        # CRUD ejemplo
│   │   └── dashboard/              # Rutas protegidas
│   │       ├── layout.tsx          # Auth check + sidebar
│   │       ├── page.tsx            # Dashboard home
│   │       └── projects/           # Páginas del CRUD
│   ├── components/
│   │   ├── layout/                 # Sidebar, header, breadcrumbs, nav-config
│   │   └── shared/                 # Loading, empty, error, etc.
│   ├── lib/
│   │   ├── auth.ts                 # Config NextAuth
│   │   ├── db.ts                   # Cliente Prisma
│   │   ├── require-admin.ts        # Helper autorización
│   │   ├── api-response.ts         # Helpers respuesta API
│   │   ├── validations/            # Schemas Zod
│   │   └── utils.ts                # cn, formatDate, formatNumber
│   ├── hooks/                      # React hooks custom
│   ├── types/                      # TypeScript types
│   └── middleware.ts               # Protección de rutas
├── tests/
│   ├── unit/                       # Tests unitarios
│   └── integration/                # Tests de handlers con mocks (API routes)
└── public/                         # Assets estáticos
```

## 5) Variables de entorno

Definidas en `.env.example`:

| Variable | Propósito | Requerida |
|---|---|---|
| DATABASE_URL | Conexión a Supabase PostgreSQL | Sí |
| DIRECT_URL | Conexión directa (migraciones) | Sí |
| NEXTAUTH_URL | URL base de la app | Sí (dev) |
| NEXTAUTH_SECRET | Secret para firmar sesiones | Sí |
| GOOGLE_CLIENT_ID | OAuth client ID | Sí |
| GOOGLE_CLIENT_SECRET | OAuth client secret | Sí |
| ADMIN_EMAIL | Email del admin (seed + auto-promoción a ADMIN en primer login) | Sí |

## 6) Restricciones conocidas

- Formato argentino obligatorio: números (1.000,50), fechas (DD/MM/AAAA)
- Español argentino en toda la UI
- El template incluye componentes UI custom (Tailwind + Radix). shadcn/ui se instala por proyecto con `npx shadcn@latest init`
- TDD obligatorio para lógica de negocio
- Archivos del templete-blanco no se modifican (excepto ARCHITECTURE.md y README.md)

---

*Última actualización: 2026-03-23*
