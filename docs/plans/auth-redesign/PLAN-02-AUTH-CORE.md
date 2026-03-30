# PLAN-02: Auth Core — Reescritura Completa

> **Repo**: qontabiliza
> **Prerequisito**: PLAN-01 (Database) completado
> **Estimación**: 2-3 sesiones de Sonnet

---

## Objetivo

Reescribir completamente la configuración de NextAuth, providers, callbacks, middleware, páginas de login/registro, y guards de protección de rutas.

## IMPORTANTE

- **BORRAR** los archivos auth existentes y crear nuevos desde cero
- No reutilizar `src/lib/auth.ts` actual — tiene workarounds acumulados
- No reutilizar `src/app/login/` actual
- No reutilizar `src/lib/actions/register.ts`
- No reutilizar `src/middleware.ts` actual

---

## Tareas Atómicas

### T2.1: Eliminar archivos auth existentes
- **Eliminar estos archivos/carpetas**:
  - `src/lib/auth.ts`
  - `src/app/login/` (toda la carpeta)
  - `src/lib/actions/register.ts`
  - `src/middleware.ts`
  - `src/lib/require-tenant.ts`
  - `src/lib/require-admin.ts`
  - `src/lib/require-org-membership.ts`
  - `src/app/api/auth/[...nextauth]/` (toda la carpeta)
- **No eliminar** nada en dashboard/, onboarding/ (eso se hace en PLAN-04), ni archivos de negocio

### T2.2: Crear estructura de carpetas auth
- **Crear**:
```
src/lib/auth/
├── config.ts        # Export principal de NextAuth
├── providers.ts     # Providers configurados
├── callbacks.ts     # signIn, jwt, session callbacks
├── adapter.ts       # PrismaAdapter customizado (si necesario)
└── guards.ts        # requireAuth, requireAdmin, requireOrg helpers
```

### T2.3: Escribir providers.ts
- **Archivo**: `src/lib/auth/providers.ts`
- **Contenido**:
  - Google Provider con `allowDangerousEmailAccountLinking: true`
  - Credentials Provider que:
    - Recibe email + password
    - Busca User por email
    - Verifica que `status !== PENDING_VERIFICATION` (email no verificado → error específico)
    - Verifica que `status !== SUSPENDED`
    - Verifica que `passwordHash` existe (si no → error "Usá Google para ingresar")
    - Compara password con bcrypt
    - Retorna user data
  - Arquitectura extensible: providers en array, fácil agregar Microsoft, etc.

### T2.4: Escribir callbacks.ts
- **Archivo**: `src/lib/auth/callbacks.ts`
- **Callbacks**:

#### signIn callback
```
Lógica:
1. Si es OAuth (account.provider !== "credentials"):
   a. Buscar User existente por email
   b. Si existe con status INACTIVE → cambiar a ACTIVE
   c. Si NO existe → se crea automáticamente por PrismaAdapter
      - Setear status: ACTIVE, emailVerified: now()
   d. Si email === ADMIN_EMAIL → asignar role: ADMIN
   e. Verificar que no se linkee un provider diferente al mismo email
      (permitir link si es primer OAuth, bloquear si ya tiene otro provider)
2. Si es Credentials:
   a. Retornar true (la validación ya se hizo en authorize())
```

#### jwt callback
```
Lógica:
1. En primer sign-in (trigger === "signIn"):
   - Agregar al token: userId, role, status, email, name, image
2. En refreshes posteriores:
   - Retornar token existente (no re-query DB en cada request)
```

#### session callback
```
Lógica:
1. Copiar datos del JWT al session.user:
   - id, role, status, email, name, image
```

### T2.5: Escribir adapter.ts (si necesario)
- **Archivo**: `src/lib/auth/adapter.ts`
- **Contenido**:
  - Si PrismaAdapter funciona directo con el nuevo schema → solo exportar `PrismaAdapter(prisma)`
  - Si hay incompatibilidades con NextAuth beta.30 → crear adapter customizado que:
    - Al crear usuario via OAuth, setee `status: ACTIVE` y `emailVerified: new Date()`
    - Maneje el campo `passwordHash` (que PrismaAdapter no conoce)
  - **Testear primero** si PrismaAdapter funciona out-of-the-box antes de customizar

### T2.6: Escribir config.ts
- **Archivo**: `src/lib/auth/config.ts`
- **Contenido**:
  - Exportar `const { handlers, signIn, signOut, auth }` de NextAuth
  - Usar JWT strategy
  - Configurar pages: `{ signIn: "/login", error: "/login" }`
  - Importar providers, callbacks, adapter
  - Exportar el auth config completo

### T2.7: Crear route handler NextAuth
- **Archivo**: `src/app/api/auth/[...nextauth]/route.ts`
- **Contenido**: Importar handlers de `src/lib/auth/config.ts` y exportar GET, POST

### T2.8: Escribir guards.ts
- **Archivo**: `src/lib/auth/guards.ts`
- **Exportar estas funciones**:

#### requireAuth()
```typescript
// Para server components y API routes
// Llama a auth(), verifica sesión, retorna session o throw/redirect
```

#### requireAdmin()
```typescript
// Extiende requireAuth() + verifica role === ADMIN
```

#### requireOrg(orgId: string)
```typescript
// Extiende requireAuth() + verifica membership en la org
// Lee active-org-id de cookie si orgId no se pasa explícitamente
```

#### requireTenant()
```typescript
// Para API routes: verifica auth + lee active-org-id cookie + valida membership
// Retorna { session, organization, membership } o responde con error HTTP
```

### T2.9: Reescribir middleware.ts
- **Archivo**: `src/middleware.ts`
- **Contenido**:
  - Rutas públicas: `/`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/unauthorized`, `/api/auth/*`, `/api/health`, `/api/cron/*`, `/api/v1/auth/*`
  - Para rutas protegidas:
    - Verificar existencia de cookie `authjs.session-token` o `__Secure-authjs.session-token`
    - Si no hay cookie → redirect `/login`
  - NO validar el JWT en middleware (Edge Runtime no puede correr Prisma)
  - Usar `export const config = { matcher: [...] }` para eficiencia

### T2.10: Crear página de login
- **Archivo**: `src/app/(auth)/login/page.tsx`
- **Contenido**:
  - Server component que lee searchParams (error, callbackUrl)
  - Renderiza `<LoginForm />`
  - Layout limpio, centrado, con logo Qontabiliza

### T2.11: Crear componente LoginForm
- **Archivo**: `src/components/auth/login-form.tsx`
- **Contenido** (client component `"use client"`):
  - Botón "Continuar con Google" → llama `signIn("google")`
  - Separador "o"
  - Form: email + password
  - Submit → llama `signIn("credentials", { email, password })`
  - Link "¿No tenés cuenta? Registrate" → `/register`
  - Link "¿Olvidaste tu contraseña?" → `/forgot-password`
  - Manejo de errores:
    - `EMAIL_NOT_VERIFIED` → "Verificá tu email primero. ¿Reenviar?"
    - `INVALID_CREDENTIALS` → "Email o contraseña incorrectos"
    - `USE_OAUTH` → "Esta cuenta usa Google. Ingresá con Google."
    - `ACCOUNT_SUSPENDED` → "Tu cuenta fue suspendida"
  - Usar Zod para validación client-side (email formato, password no vacío)

### T2.12: Crear página de registro
- **Archivo**: `src/app/(auth)/register/page.tsx`
- **Contenido**:
  - Server component
  - Renderiza `<RegisterForm />`

### T2.13: Crear componente RegisterForm
- **Archivo**: `src/components/auth/register-form.tsx`
- **Contenido** (client component):
  - Botón "Continuar con Google" → llama `signIn("google")`
  - Separador "o"
  - Form: nombre, email, contraseña, confirmar contraseña
  - Submit → llama server action `registerUser()`
  - Validación Zod:
    - name: min 2 chars
    - email: formato válido
    - password: min 8 chars
    - confirmPassword: debe coincidir
  - Link "¿Ya tenés cuenta? Ingresá" → `/login`

### T2.14: Crear componente OAuthButtons
- **Archivo**: `src/components/auth/oauth-buttons.tsx`
- **Contenido** (client component):
  - Componente reutilizable con botón Google
  - Extensible: recibe un array de providers habilitados
  - Cada botón llama `signIn(provider)`
  - Muestra loading state mientras redirige

### T2.15: Crear layout para auth pages
- **Archivo**: `src/app/(auth)/layout.tsx`
- **Contenido**:
  - Layout centrado en pantalla
  - Logo arriba
  - Card con contenido (el form)
  - Sin sidebar, sin header
  - Si el user ya está logueado → redirect a `/dashboard`

### T2.16: Crear server action registerUser
- **Archivo**: `src/lib/actions/auth.ts`
- **Contenido**:

```typescript
"use server"

// registerUser(formData)
// 1. Validar con Zod (name, email, password)
// 2. Verificar que el email no exista
//    - Si existe con status INACTIVE → activar y setear passwordHash
//    - Si existe con status ACTIVE → error "Email ya registrado"
// 3. Hash password con bcrypt (salt: 12)
// 4. Crear User con status: PENDING_VERIFICATION
// 5. Generar token de verificación (crypto.randomUUID())
// 6. Guardar hash SHA-256 del token en EmailVerificationToken
// 7. Enviar email de verificación via Resend (PLAN-03)
// 8. Retornar { success: true, message: "Verificá tu email" }
```

### T2.17: Actualizar dashboard layout
- **Archivo**: `src/app/dashboard/layout.tsx`
- **Acción**: Actualizar imports de auth para usar nuevo `src/lib/auth/config.ts`
  - Cambiar `import { auth } from "@/lib/auth"` → `import { auth } from "@/lib/auth/config"`
  - Mantener la lógica de:
    - Redirect a `/login` si no auth
    - Redirect a `/onboarding` si no tiene orgs
    - Leer active-org-id de cookie
  - Actualizar referencias a campos de User si cambiaron

### T2.18: Actualizar imports en archivos de negocio
- **Acción**: Buscar todos los archivos que importan de `@/lib/auth` y actualizar a `@/lib/auth/config`
- Buscar con grep: `from "@/lib/auth"` o `from '@/lib/auth'`
- También actualizar imports de `require-tenant`, `require-admin`, `require-org-membership` → `@/lib/auth/guards`

### T2.19: Verificar compilación TypeScript
- **Comando**: `npx tsc --noEmit`
- **Esperado**: Sin errores de tipos en archivos auth
- Pueden quedar errores en onboarding (se arregla en PLAN-04) y email (PLAN-03)

---

## Checklist de Validación

- [ ] `src/lib/auth.ts` viejo NO existe
- [ ] `src/app/login/` viejo NO existe
- [ ] `src/lib/auth/config.ts` exporta `{ handlers, signIn, signOut, auth }`
- [ ] Google provider configurado con `allowDangerousEmailAccountLinking: true`
- [ ] Credentials provider valida email verificado antes de permitir login
- [ ] JWT callback incluye userId, role, status
- [ ] Middleware protege rutas correctamente
- [ ] `/login` renderiza form con OAuth + credentials
- [ ] `/register` renderiza form con OAuth + credentials
- [ ] `registerUser` action crea user con PENDING_VERIFICATION
- [ ] ADMIN_EMAIL se auto-promueve a ADMIN en signIn callback
- [ ] Guards exportan: requireAuth, requireAdmin, requireOrg, requireTenant
- [ ] Todos los imports actualizados (no quedan refs a `@/lib/auth` viejo)
- [ ] `npx tsc --noEmit` pasa (excepto errores esperados de onboarding/email)
