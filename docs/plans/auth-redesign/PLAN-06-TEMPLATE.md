# PLAN-06: Portar a Q-SaaS-Template

> **Repo**: q-saas-template
> **Prerequisito**: PLAN-01 a PLAN-05 completados y testeados en Qontabiliza
> **Estimación**: 1-2 sesiones de Sonnet

---

## Objetivo

Portar el sistema de auth y onboarding completo al template base q-saas-template, para que cualquier nueva BU del ecosistema Q arranque con auth funcional, verificación de email, OAuth, y onboarding configurable.

## IMPORTANTE

- El template debe ser **genérico**: sin referencias específicas a Qontabiliza
- Los pasos BU-specific del onboarding deben ser **ejemplos** que el desarrollador personaliza
- La documentación es clave: un desarrollador nuevo debe poder entender y configurar el auth
- Mantener la convención del template: `Project` como modelo de ejemplo

---

## Tareas Atómicas

### T6.1: Actualizar schema Prisma del template
- **Archivo**: `prisma/schema.prisma` (en repo q-saas-template)
- **Acción**:
  - Reemplazar modelos auth actuales con los nuevos (copiar de qontabiliza)
  - Agregar `OnboardingProgress`
  - Agregar `EmailVerificationToken`, `PasswordResetToken`
  - Agregar `Organization` y `Membership` si no existen
  - Mantener modelo `Project` como ejemplo de modelo de negocio
  - Agregar `globalUserId` al User
  - Agregar enums: UserStatus, OnboardingType, Role

### T6.2: Copiar módulo auth completo
- **Origen**: qontabiliza `src/lib/auth/`
- **Destino**: q-saas-template `src/lib/auth/`
- **Archivos**: config.ts, providers.ts, callbacks.ts, adapter.ts, guards.ts
- **Modificar**:
  - Cambiar `ADMIN_EMAIL` reference a genérica (leer de env)
  - Remover cualquier referencia hardcodeada a "qontabiliza"
  - Mantener comentarios explicativos para el desarrollador

### T6.3: Copiar módulo email completo
- **Origen**: qontabiliza `src/lib/email/`
- **Destino**: q-saas-template `src/lib/email/`
- **Archivos**: client.ts, send-verification.ts, send-password-reset.ts, send-welcome.ts, templates/
- **Modificar**:
  - Templates: reemplazar "Qontabiliza" por variable `APP_NAME` (leer de env o config)
  - Hacer genérico: el template debe decir el nombre de la app, no uno hardcodeado

### T6.4: Copiar módulo sync
- **Origen**: qontabiliza `src/lib/sync/`
- **Destino**: q-saas-template `src/lib/sync/`
- **Archivos**: user-sync.ts, hmac.ts
- **Modificar**:
  - Reemplazar `'qontabiliza'` hardcodeado por variable de entorno `BU_SLUG`
  - Agregar `BU_SLUG` a `.env.example`

### T6.5: Copiar páginas auth
- **Origen**: qontabiliza `src/app/(auth)/`
- **Destino**: q-saas-template `src/app/(auth)/`
- **Páginas**: login, register, verify-email, forgot-password, reset-password
- **Componentes**: copiar `src/components/auth/` completo
- **Modificar**: Remover referencias específicas a Qontabiliza del UI

### T6.6: Copiar onboarding (versión template)
- **Origen**: qontabiliza `src/app/onboarding/` + `src/components/onboarding/`
- **Destino**: q-saas-template
- **Modificar**:
  - **onboarding.config.ts**: Poner pasos BU-specific como ejemplo comentado
  ```typescript
  // --- BU-SPECIFIC STEPS ---
  // Personalizá estos pasos según tu producto.
  // Ejemplos:
  //   ERP: first-product, first-contact
  //   CRM: communication-channels, first-contact
  //   Job Board: company-profile, first-job
  {
    id: 'example-step',
    label: 'Paso de ejemplo',
    description: 'Reemplazá esto con el primer paso específico de tu BU',
    required: false,
  },
  ```
  - Mantener pasos universales (org + fiscal) intactos
  - Mantener pasos personales intactos
  - Crear un paso de ejemplo genérico en vez de first-product/first-contact

### T6.7: Copiar endpoint de provisioning
- **Origen**: qontabiliza `src/app/api/v1/auth/user-provision/`
- **Destino**: q-saas-template `src/app/api/v1/auth/user-provision/`

### T6.8: Copiar middleware
- **Origen**: qontabiliza `src/middleware.ts`
- **Destino**: q-saas-template `src/middleware.ts`

### T6.9: Copiar server actions
- **Origen**: qontabiliza `src/lib/actions/auth.ts`, `src/lib/actions/onboarding.ts`
- **Destino**: q-saas-template mismas rutas

### T6.10: Actualizar .env.example
- **Archivo**: `.env.example` (en repo q-saas-template)
- **Agregar**:
```env
# ===== AUTH =====
AUTH_SECRET=""                    # openssl rand -base64 32
ADMIN_EMAIL=""                   # Email del admin (auto-promote a ADMIN)
NEXT_PUBLIC_APP_URL=""           # URL pública de la app
NEXT_PUBLIC_APP_NAME=""          # Nombre visible de la app

# ===== OAUTH =====
GOOGLE_CLIENT_ID=""              # Google Cloud Console → Credentials
GOOGLE_CLIENT_SECRET=""

# ===== EMAIL (Resend) =====
RESEND_API_KEY=""                # https://resend.com/api-keys
EMAIL_FROM=""                    # "App Name <noreply@domain.com>"

# ===== CROSS-BU SYNC =====
BU_SLUG=""                       # Slug de esta BU en el ecosistema Q (ej: "qontabiliza")
BOARD_URL=""                     # URL de Q-Company Board
BOARD_API_KEY=""                 # API key de esta BU en Q-Company
BOARD_WEBHOOK_SECRET=""          # Secret para validar webhooks entrantes
```

### T6.11: Actualizar seed.ts
- **Archivo**: `prisma/seed.ts`
- **Acción**: Actualizar para usar nuevos modelos (copiar patrón de qontabiliza seed)

### T6.12: Actualizar package.json
- **Archivo**: `package.json`
- **Agregar dependencias**: `resend`, `@react-email/components`

### T6.13: Eliminar archivos auth viejos del template
- **Eliminar**:
  - `src/lib/auth.ts` viejo
  - `src/app/login/` viejo
  - Cualquier referencia al AllowedEmail system

### T6.14: Crear documentación AUTH-SETUP.md
- **Archivo**: `docs/AUTH-SETUP.md` (en repo q-saas-template)
- **Contenido**:

```markdown
# Auth Setup Guide — Q SaaS Template

## Qué incluye
- Login con Google OAuth + Email/Password
- Verificación de email (via Resend)
- Password reset
- Cross-BU sync con Q-Company
- Onboarding configurable (empresarial + personal)

## Setup rápido

### 1. Variables de entorno
[Listar cada variable con explicación]

### 2. Google OAuth
- Ir a Google Cloud Console
- Crear credenciales OAuth 2.0
- Redirect URI: {APP_URL}/api/auth/callback/google

### 3. Resend
- Crear cuenta en resend.com
- Verificar dominio (o usar dominio de testing)
- Copiar API key

### 4. Configurar onboarding
- Editar src/config/onboarding.config.ts
- Pasos universales (org + fiscal): NO modificar
- Pasos BU-specific: personalizar según tu producto
- Personal steps: ajustar si necesario

### 5. Registrar BU en Q-Company
[Instrucciones para registrar la nueva BU]

## Agregar nuevo provider OAuth
1. Instalar provider package (si necesario)
2. Agregar en src/lib/auth/providers.ts
3. Agregar variables de entorno
4. Agregar redirect URI en el provider

## Agregar paso de onboarding
1. Agregar step ID al type OnboardingStepId
2. Agregar entrada en onboardingConfig.businessSteps
3. Crear página en src/app/onboarding/{step-id}/page.tsx
4. Crear componente form en src/components/onboarding/
5. Crear server action en src/lib/actions/onboarding.ts
```

### T6.15: Actualizar BLUEPRINT.md
- **Archivo**: `BLUEPRINT.md` (en repo q-saas-template)
- **Agregar sección**:
```markdown
## 6. Autenticación y Onboarding
- ¿Qué tipo de onboarding necesita? (empresarial / personal / ambos)
- ¿Qué pasos adicionales de onboarding necesita tu BU? (describir)
- ¿Necesita roles adicionales además de ADMIN/USER? (describir)
```

### T6.16: Verificar que el template compila
- **Comando**: `npx tsc --noEmit`
- **Comando**: `npm run build`
- **Esperado**: Sin errores

### T6.17: Actualizar ARCHITECTURE.md del template
- **Archivo**: `docs/ARCHITECTURE.md`
- **Agregar sección de Auth**:
  - Diagrama de flujo de auth
  - Descripción de las 3 capas de protección
  - Referencia a archivos clave
  - Explicación de la sync cross-BU

---

## Checklist de Validación

- [ ] Template NO tiene referencias hardcodeadas a "Qontabiliza"
- [ ] `APP_NAME` se lee de env o config (no hardcodeado)
- [ ] `BU_SLUG` se lee de env (no hardcodeado)
- [ ] Pasos universales de onboarding están intactos
- [ ] Pasos BU-specific son ejemplos configurables
- [ ] `.env.example` tiene todas las variables nuevas documentadas
- [ ] `AUTH-SETUP.md` explica setup completo
- [ ] `BLUEPRINT.md` tiene sección de auth/onboarding
- [ ] `npm run build` pasa sin errores
- [ ] `npx tsc --noEmit` pasa
- [ ] Seed funciona con nuevos modelos
- [ ] Un desarrollador nuevo puede seguir AUTH-SETUP.md y tener auth funcionando
