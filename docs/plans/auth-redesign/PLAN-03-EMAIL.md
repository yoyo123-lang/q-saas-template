# PLAN-03: Email — Resend Integration

> **Repo**: qontabiliza
> **Prerequisito**: PLAN-02 (Auth Core) completado
> **Estimación**: 1 sesión de Sonnet

---

## Objetivo

Integrar Resend para envío de emails transaccionales: verificación de email, password reset, y bienvenida. Crear las páginas de verificación y recuperación de contraseña.

## IMPORTANTE

- Usar `resend` package (no Supabase Auth emails, no SendGrid)
- Templates de email en React con `@react-email/components`
- Tokens siempre hasheados con SHA-256 en DB — nunca guardar plaintext
- Los tokens van en la URL como query param — el hash se compara en el server

---

## Tareas Atómicas

### T3.1: Instalar dependencias
- **Comando**: `npm install resend @react-email/components`
- Verificar que se agregaron al package.json

### T3.2: Crear cliente Resend
- **Archivo**: `src/lib/email/client.ts`
- **Contenido**:
```typescript
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
export const EMAIL_FROM = process.env.EMAIL_FROM || 'Qontabiliza <noreply@qontabiliza.ar>';
```

### T3.3: Crear template de verificación de email
- **Archivo**: `src/lib/email/templates/verification.tsx`
- **Contenido**:
  - Componente React Email
  - Título: "Verificá tu email"
  - Body: "Hacé click en el botón para verificar tu cuenta en Qontabiliza"
  - Botón CTA con link: `{APP_URL}/verify-email?token={token}`
  - Texto: "Este link expira en 24 horas"
  - Footer con nombre de la app
  - Estilo limpio, responsive, sin exceso de diseño

### T3.4: Crear template de password reset
- **Archivo**: `src/lib/email/templates/password-reset.tsx`
- **Contenido**:
  - Componente React Email
  - Título: "Restablecé tu contraseña"
  - Body: "Recibimos un pedido para restablecer tu contraseña"
  - Botón CTA con link: `{APP_URL}/reset-password?token={token}`
  - Texto: "Este link expira en 1 hora. Si no pediste esto, ignorá este email."
  - Footer

### T3.5: Crear template de bienvenida
- **Archivo**: `src/lib/email/templates/welcome.tsx`
- **Contenido**:
  - Componente React Email
  - Título: "Bienvenido/a a Qontabiliza"
  - Body: "Tu cuenta fue verificada. Ya podés empezar a usar Qontabiliza."
  - Botón CTA: `{APP_URL}/login`
  - Footer

### T3.6: Crear función sendVerificationEmail
- **Archivo**: `src/lib/email/send-verification.ts`
- **Contenido**:
```typescript
// 1. Generar token: crypto.randomUUID()
// 2. Hashear token: SHA-256 (crypto.createHash('sha256').update(token).digest('hex'))
// 3. Guardar en DB: EmailVerificationToken con tokenHash, userId, expires (24h)
// 4. Enviar email via Resend con el token REAL (no el hash) en la URL
// 5. Retornar { success: true }
```

### T3.7: Crear función sendPasswordResetEmail
- **Archivo**: `src/lib/email/send-password-reset.ts`
- **Contenido**:
```typescript
// 1. Buscar user por email — si no existe, retornar success (no revelar si email existe)
// 2. Invalidar tokens de reset previos para ese email (marcar used: true)
// 3. Generar token: crypto.randomUUID()
// 4. Hashear: SHA-256
// 5. Guardar en DB: PasswordResetToken con tokenHash, email, expires (1h)
// 6. Enviar email via Resend con token REAL en URL
// 7. Retornar { success: true }
```

### T3.8: Crear función sendWelcomeEmail
- **Archivo**: `src/lib/email/send-welcome.ts`
- **Contenido**:
```typescript
// 1. Enviar email via Resend con template de bienvenida
// 2. Fire-and-forget (no bloquear el flujo si falla)
```

### T3.9: Crear página verify-email
- **Archivo**: `src/app/(auth)/verify-email/page.tsx`
- **Contenido** (server component):
```
1. Leer searchParams.token
2. Si no hay token → mostrar pantalla "Revisá tu email"
   - Con botón "Reenviar email de verificación" (si hay session)
3. Si hay token:
   a. Hashear token con SHA-256
   b. Buscar EmailVerificationToken por tokenHash
   c. Validar: no expirado, no usado
   d. Marcar token como used
   e. Actualizar User: status → ACTIVE, emailVerified → now()
   f. Enviar email de bienvenida (fire-and-forget)
   g. Sync a Q-Company (llamar a user-sync, se implementa en PLAN-05)
   h. Mostrar pantalla "Email verificado" con botón "Ir al login"
4. Si token inválido → mostrar "Token inválido o expirado" con link a reenviar
```

### T3.10: Crear server action resendVerification
- **Archivo**: `src/lib/actions/auth.ts` (agregar a archivo existente de PLAN-02)
- **Contenido**:
```typescript
// resendVerificationEmail(email: string)
// 1. Buscar user por email
// 2. Si no existe o ya verificado → error
// 3. Invalidar tokens previos (marcar used: true)
// 4. Llamar sendVerificationEmail()
// 5. Retornar { success: true }
```

### T3.11: Crear página forgot-password
- **Archivo**: `src/app/(auth)/forgot-password/page.tsx`
- **Contenido**:
  - Server component → renderiza `<ForgotPasswordForm />`

### T3.12: Crear componente ForgotPasswordForm
- **Archivo**: `src/components/auth/forgot-password-form.tsx`
- **Contenido** (client component):
  - Form: solo email
  - Submit → llama server action `requestPasswordReset(email)`
  - Siempre muestra "Si el email existe, te enviamos instrucciones" (no revelar si existe)
  - Link "Volver al login" → `/login`

### T3.13: Crear server action requestPasswordReset
- **Archivo**: `src/lib/actions/auth.ts` (agregar)
- **Contenido**:
```typescript
// requestPasswordReset(email: string)
// 1. Llamar sendPasswordResetEmail(email)
// 2. Retornar { success: true } siempre (security: no revelar si email existe)
```

### T3.14: Crear página reset-password
- **Archivo**: `src/app/(auth)/reset-password/page.tsx`
- **Contenido** (server component):
```
1. Leer searchParams.token
2. Si no hay token → redirect a /forgot-password
3. Hashear token, buscar PasswordResetToken
4. Si inválido/expirado → mostrar error con link a /forgot-password
5. Si válido → renderizar <ResetPasswordForm token={token} />
```

### T3.15: Crear componente ResetPasswordForm
- **Archivo**: `src/components/auth/reset-password-form.tsx`
- **Contenido** (client component):
  - Form: nueva contraseña + confirmar contraseña
  - Validación Zod: min 8 chars, deben coincidir
  - Submit → llama server action `resetPassword(token, password)`
  - Éxito → mostrar "Contraseña actualizada" + redirect a `/login`

### T3.16: Crear server action resetPassword
- **Archivo**: `src/lib/actions/auth.ts` (agregar)
- **Contenido**:
```typescript
// resetPassword(token: string, newPassword: string)
// 1. Hashear token con SHA-256
// 2. Buscar PasswordResetToken por tokenHash
// 3. Validar: no expirado, no usado
// 4. Marcar token como used
// 5. Hash nueva password con bcrypt (salt: 12)
// 6. Actualizar User.passwordHash
// 7. Si User.status era PENDING_VERIFICATION → cambiar a ACTIVE (ya tiene password)
// 8. Retornar { success: true }
```

### T3.17: Integrar envío de verificación en registerUser
- **Archivo**: `src/lib/actions/auth.ts`
- **Acción**: En la server action `registerUser` (creada en PLAN-02), agregar la llamada a `sendVerificationEmail()` después de crear el user
- Esto conecta PLAN-02 con PLAN-03

### T3.18: Verificar compilación
- **Comando**: `npx tsc --noEmit`
- **Esperado**: Sin errores en archivos de email y auth
- Pueden quedar errores en onboarding (PLAN-04) y sync (PLAN-05)

---

## Checklist de Validación

- [ ] `resend` y `@react-email/components` instalados
- [ ] `RESEND_API_KEY` documentada en `.env.example`
- [ ] `EMAIL_FROM` documentada en `.env.example`
- [ ] Template de verificación renderiza correctamente
- [ ] Template de password reset renderiza correctamente
- [ ] Tokens SIEMPRE se guardan como SHA-256 hash en DB
- [ ] Tokens en URL son el valor real (no el hash)
- [ ] Verificación de email cambia status a ACTIVE
- [ ] Password reset invalida tokens previos del mismo email
- [ ] Forgot password NO revela si el email existe
- [ ] Todas las páginas auth están bajo `(auth)/` route group
- [ ] `registerUser` envía email de verificación al crear user
- [ ] `npx tsc --noEmit` pasa para archivos de email
