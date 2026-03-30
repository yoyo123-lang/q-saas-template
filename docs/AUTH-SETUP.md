# Auth Setup Guide — Q SaaS Template

## Qué incluye

- Login con Google OAuth + Email/Password
- Verificación de email (via Resend)
- Password reset
- Cross-BU sync con Q-Company
- Onboarding configurable (empresarial + personal)

---

## Setup rápido

### 1. Variables de entorno

Copiá `.env.example` como `.env.local` y completá:

| Variable | Descripción | Cómo obtenerla |
|---|---|---|
| `AUTH_SECRET` | Secret para firmar sesiones JWT | `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Email del admin (se promueve a ADMIN en primer login) | Tu email |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app | `http://localhost:3000` en dev |
| `NEXT_PUBLIC_APP_NAME` | Nombre visible de la app | Ej: `"Mi SaaS"` |
| `GOOGLE_CLIENT_ID` | OAuth Google | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth Google | Google Cloud Console |
| `RESEND_API_KEY` | Para envío de emails | resend.com |
| `EMAIL_FROM` | Remitente de emails | `"App <noreply@tudominio.com>"` |
| `BU_SLUG` | Identificador de esta BU en el ecosistema Q | Acordar con admin de Q-Company |
| `BOARD_URL` | URL de Q-Company Board | `https://q-company.vercel.app` |
| `BOARD_API_KEY` | API key de esta BU | Obtenida del Board al registrar la BU |
| `BOARD_WEBHOOK_SECRET` | Para validar webhooks del Board | Obtenida del Board |

### 2. Google OAuth

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear un proyecto (o usar uno existente)
3. Habilitar **Google+ API** o **People API**
4. Ir a **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Tipo de aplicación: **Web application**
6. Agregar Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (desarrollo)
   - `https://tu-dominio.com/api/auth/callback/google` (producción)
7. Copiar `Client ID` y `Client Secret` al `.env.local`

### 3. Resend (Email)

1. Crear cuenta en [resend.com](https://resend.com)
2. **Dominios → Add Domain** y verificar tu dominio (o usar `@resend.dev` para testing)
3. **API Keys → Create API Key** con permisos de envío
4. Copiar la key a `RESEND_API_KEY`
5. Setear `EMAIL_FROM`: `"Nombre App <noreply@tu-dominio.com>"`

### 4. Configurar onboarding

Editar `src/config/onboarding.config.ts`:

```typescript
export const onboardingConfig: OnboardingConfig = {
  businessSteps: [
    // UNIVERSAL — no modificar
    { id: 'organization', ... },
    { id: 'fiscal-data', ... },
    // BU-SPECIFIC — personalizar
    { id: 'example-step', ... },  // ← reemplazar con tus pasos
  ],
  personalSteps: [
    { id: 'profile', ... },
    { id: 'workspace', ... },
  ],
  allowedTypes: ['BUSINESS', 'PERSONAL'],
  skipTypeSelection: false,
};
```

**Reglas:**
- Pasos universales (`organization`, `fiscal-data`): NO modificar
- Pasos BU-specific: personalizar según tu producto
- Para deshabilitar el tipo PERSONAL: `allowedTypes: ['BUSINESS'], skipTypeSelection: true`

### 5. Registrar BU en Q-Company

1. Contactar al admin del Board en Q-Company
2. Proveer `BU_SLUG` (ej: `"mi-saas"`) y la URL de tu app
3. Recibir: `BOARD_API_KEY` y `BOARD_WEBHOOK_SECRET`
4. Agregar al `.env.local`

El endpoint `/api/v1/auth/user-provision` recibirá las notificaciones del Board para crear usuarios INACTIVE en tu BU.

---

## Agregar nuevo provider OAuth

1. Instalar el provider si es necesario (ver [Auth.js providers](https://authjs.dev/reference/core/providers))
2. Agregar en `src/lib/auth/providers.ts`:
   ```typescript
   import GitHub from "next-auth/providers/github";
   export const providers = [
     Google({ ... }),
     GitHub({ clientId: ..., clientSecret: ... }),  // ← agregar
   ];
   ```
3. Agregar variables de entorno en `.env.local` y `.env.example`
4. Agregar la redirect URI en el dashboard del provider

## Agregar paso de onboarding BU-specific

1. Agregar el step ID al tipo `OnboardingStepId` en `src/config/onboarding.config.ts`
2. Agregar la entrada en `onboardingConfig.businessSteps`
3. Agregar la ruta en `STEP_ROUTES` en `src/lib/actions/onboarding.ts`
4. Crear la página en `src/app/onboarding/{step-id}/page.tsx`
5. Crear el componente form en `src/components/onboarding/{step-id}-form.tsx`
6. Crear la server action en `src/lib/actions/onboarding.ts`

Ver `src/app/onboarding/example-step/` y `src/components/onboarding/example-step-form.tsx` como referencia.

## Modelo de protección de rutas (3 capas)

| Capa | Dónde | Qué verifica |
|---|---|---|
| 1. Middleware | `src/middleware.ts` | Cookie de sesión existe (Edge Runtime) |
| 2. Layout | `src/app/dashboard/layout.tsx` | Sesión válida vía `auth()` |
| 3. API routes | `requireAuth()` / `requireAdmin()` / `requireTenant()` | Sesión + rol + org |

Usar `requireAuth`, `requireAdmin`, `requireOrg`, `requireTenant` de `src/lib/auth/guards.ts` en API routes.
