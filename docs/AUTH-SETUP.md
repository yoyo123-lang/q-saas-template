# Auth Setup Guide — Q SaaS Template

## Stack
- NextAuth v5 (Auth.js) — Google OAuth + Email/Password
- Resend — Transactional email
- Prisma + Supabase PostgreSQL

## Features
- Google OAuth (extensible a Microsoft, Apple, etc.)
- Email/password con verificación de email
- Password reset
- Cross-registration (el mismo email funciona con OAuth y credentials)
- Cross-BU user sync con Q-Company central registry
- Onboarding configurable: 2 pasos universales (org + fiscal) + pasos BU-specific

## Quick Setup

### 1. Variables de entorno
Copiá `.env.example` a `.env.local` y completá todas las variables AUTH.

| Variable | Descripción |
|---|---|
| `AUTH_SECRET` | Secret para firmar sesiones — `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Email del admin (auto-promovido a ADMIN en primer login) |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (ej: `https://mi-app.com`) |
| `NEXT_PUBLIC_APP_NAME` | Nombre visible en emails y UI (ej: `Mi SaaS`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `RESEND_API_KEY` | API key de Resend para emails transaccionales |
| `EMAIL_FROM` | Dirección de envío (ej: `Mi App <noreply@mi-app.com>`) |
| `BU_SLUG` | Identificador de esta BU en Q-Company (ej: `mi-bu`) |
| `BOARD_URL` | URL de Q-Company Board |
| `BOARD_API_KEY` | API key de esta BU en Q-Company |
| `BOARD_WEBHOOK_SECRET` | Secret para validar webhooks entrantes del Board |

### 2. Google OAuth
1. Ir a [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Crear OAuth 2.0 Client ID (Web application)
3. Agregar Authorized redirect URI: `{NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
4. Copiar Client ID y Secret a `.env.local`

### 3. Resend
1. Crear cuenta en [resend.com](https://resend.com)
2. Verificar tu dominio de envío (o usar el dominio de testing para dev)
3. Crear API key
4. Setear `RESEND_API_KEY` y `EMAIL_FROM` en `.env.local`

### 4. Base de datos
```bash
npx prisma db push && npm run db:seed
```

### 5. Configuración de onboarding
Editar `src/config/onboarding.config.ts`:
- Pasos universales (org + fiscal): NO modificar — son compartidos por todas las BUs
- Pasos BU-specific: descomentar el ejemplo y personalizar para tu producto
- Pasos personales: ajustar si tu BU apunta a individuos

## Agregar un paso de onboarding BU-specific
1. Agregar el step ID al tipo `OnboardingStepId` en `onboarding.config.ts`
2. Agregar la entrada en el array `businessSteps`
3. Crear la página: `src/app/onboarding/{step-id}/page.tsx`
4. Crear el form component: `src/components/onboarding/{step-id}-form.tsx`
5. Crear la server action en `src/lib/actions/onboarding.ts`
6. Agregar la ruta al `STEP_ROUTES` map en `onboarding.ts`

## Agregar un nuevo provider OAuth
1. Instalar el paquete del provider si es necesario
2. Agregar el provider en `src/lib/auth/providers.ts`
3. Agregar las variables de entorno a `.env.example`
4. Agregar el redirect URI en la consola del provider

## Modelo de protección de rutas (3 capas)
- **Capa 1**: `src/middleware.ts` — verifica que la cookie de sesión exista (Edge Runtime, rápido)
- **Capa 2**: Dashboard layout — valida la sesión completa con `auth()`
- **Capa 3**: API routes — usar `requireAuth()`, `requireAdmin()`, `requireTenant()` de `@/lib/auth/guards`

## Cross-BU sync
Cuando un usuario se registra en esta BU, se notifica a Q-Company (`BOARD_URL/api/v1/auth/sync`).
Q-Company propaga el usuario como INACTIVE a las otras BUs.
Esta BU recibe usuarios entrantes en `POST /api/v1/auth/user-provision`.

El sync es fire-and-forget: nunca bloquea el flujo principal de auth.
