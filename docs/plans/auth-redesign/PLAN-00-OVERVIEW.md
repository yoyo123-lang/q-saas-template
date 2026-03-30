# PLAN-00: Auth & Onboarding Redesign — Overview

> **Estado**: EN PLANIFICACIÓN
> **Repos afectados**: qontabiliza, q-company, q-saas-template
> **Branch**: `claude/redesign-auth-system-a9qG4`
> **Fecha**: 2026-03-30

---

## Contexto

Reescritura completa del sistema de autenticación y onboarding del ecosistema Q.
**No se reutiliza código existente** — el auth actual tiene demasiados problemas acumulados.

## Decisiones de Arquitectura

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Auth centralizada vs distribuida | **Auth por BU con sync a Q-Company** | Cada BU maneja su auth pero sincroniza usuarios con Q-Company como registro central |
| OAuth providers | **Google ahora + extensible** | Arquitectura lista para Microsoft, Apple, etc. |
| Servicio de email | **Resend** | Simple, buen free tier, ideal para verificación y password reset |
| Onboarding empresarial | **2 pasos universales + pasos BU-specific** | Org + Fiscal son universales; pasos 3+ los define cada BU |
| Onboarding personal | **2 pasos mínimos** | Para BUs orientadas a personas individuales |
| Superadmin | `federicopronesti@institutoiea.edu.ar` | OAuth → directo a dashboard, auto-promote ADMIN |
| Session strategy | JWT | Requerido por NextAuth v5 + Credentials provider |

## Arquitectura de Sincronización

```
┌─────────────────────────────────────────────────────┐
│                   Q-COMPANY (Central)                │
│                                                      │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ GlobalUser   │  │  POST /api/v1/auth/sync     │  │
│  │ Registry     │◄─┤  - Recibe registro de BUs   │  │
│  │ (master)     │  │  - Propaga a otras BUs       │  │
│  └──────────────┘  └─────────────────────────────┘  │
│         │                                            │
│         ▼                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ POST {bu.webhookUrl}/api/v1/auth/user-provision│  │
│  │ → Crea usuario inactivo en cada BU            │  │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         ▲                          │
         │ sync                     │ propagate
         │                          ▼
┌────────────────┐          ┌────────────────┐
│  QONTABILIZA   │          │  FUTURE BU     │
│  (test BU)     │          │  (from template)│
│                │          │                │
│  NextAuth v5   │          │  NextAuth v5   │
│  Google OAuth  │          │  Google OAuth  │
│  Credentials   │          │  Credentials   │
│  Resend emails │          │  Resend emails │
└────────────────┘          └────────────────┘
```

### Flujo de sync:
1. Usuario se registra en Qontabiliza (OAuth o email/password)
2. Qontabiliza notifica a Q-Company: `POST /api/v1/auth/sync`
3. Q-Company registra al usuario en GlobalUser registry
4. Q-Company propaga el usuario como **INACTIVE** a las demás BUs
5. Cuando el usuario entra a otra BU, ya existe → salta a onboarding de esa BU o dashboard

## Onboarding: 2 capas

### Capa Universal (todos los BUs que usen onboarding empresarial)
- **Paso 1**: Organización (sector, nombre, slug)
- **Paso 2**: Datos Fiscales (CUIT, razón social, condición IVA, dirección)

### Capa BU-Specific (configurable por BU)
- Cada BU define pasos adicionales en `src/config/onboarding.config.ts`
- Ejemplo Qontabiliza: Primer Producto, Primer Contacto
- Ejemplo CRM: Canales de comunicación, Primer contacto
- Ejemplo Empleo: Perfil empresa, Primera oferta

### Onboarding Personal (BUs orientadas a individuos)
- **Paso 1**: Perfil (nombre, teléfono, avatar)
- **Paso 2**: Workspace personal

## Planes de Implementación

| Plan | Contenido | Repo principal |
|------|-----------|---------------|
| [PLAN-01-DATABASE](./PLAN-01-DATABASE.md) | Schemas Prisma, migraciones | qontabiliza + q-company |
| [PLAN-02-AUTH-CORE](./PLAN-02-AUTH-CORE.md) | NextAuth config, providers, middleware | qontabiliza |
| [PLAN-03-EMAIL](./PLAN-03-EMAIL.md) | Resend, verificación email, password reset | qontabiliza |
| [PLAN-04-ONBOARDING](./PLAN-04-ONBOARDING.md) | Onboarding universal + BU-specific | qontabiliza |
| [PLAN-05-SYNC](./PLAN-05-SYNC.md) | Cross-BU sync via Q-Company | q-company + qontabiliza |
| [PLAN-06-TEMPLATE](./PLAN-06-TEMPLATE.md) | Portar a q-saas-template | q-saas-template |

## Orden de Ejecución

```
PLAN-01 (DB) → PLAN-02 (Auth) → PLAN-03 (Email) → PLAN-04 (Onboarding) → PLAN-05 (Sync) → PLAN-06 (Template)
```

Cada plan es independiente en sesiones de Sonnet. Después de cada fase, Opus hace QA.

## Variables de Entorno Nuevas

```env
# Resend
RESEND_API_KEY=""
EMAIL_FROM="noreply@qontabiliza.ar"

# Auth (existentes, se mantienen)
AUTH_SECRET=""
ADMIN_EMAIL="federicopronesti@institutoiea.edu.ar"
NEXT_PUBLIC_APP_URL="https://qontabiliza.ar"

# OAuth Google (existentes, se mantienen)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Cross-BU Sync (existentes en board integration)
BOARD_URL="https://q-company.vercel.app"
BOARD_API_KEY=""
BOARD_WEBHOOK_SECRET=""
```

## Dependencias Nuevas

```
resend                    → Envío de emails
@react-email/components   → Templates de email en React
```
