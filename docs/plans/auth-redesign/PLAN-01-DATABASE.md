# PLAN-01: Database — Schema Rewrite

> **Repo**: qontabiliza (principal) + q-company
> **Prerequisito**: Ninguno (es el primer paso)
> **Estimación**: 1 sesión de Sonnet

---

## Objetivo

Reescribir los modelos de auth en Prisma. Agregar modelos para verificación de email, password reset, y tracking de onboarding. En Q-Company agregar GlobalUser registry.

## IMPORTANTE

- **NO reutilizar los modelos auth existentes**. Borrar y reescribir.
- Pre-MVP: se puede hacer `prisma db push` directamente, no hay datos en producción que preservar.
- Mantener intactos los modelos de negocio (Product, Invoice, Sale, etc.) — solo reescribir auth + onboarding.

---

## Tareas Atómicas — Qontabiliza

### T1.1: Leer el schema actual completo
- **Archivo**: `prisma/schema.prisma`
- **Acción**: Leer y entender qué modelos son de auth y cuáles de negocio
- **No modificar aún**

### T1.2: Eliminar modelos auth existentes del schema
- **Archivo**: `prisma/schema.prisma`
- **Eliminar estos modelos**:
  - `User` (se reescribe)
  - `Account` (se reescribe)
  - `Session` (se reescribe)
  - `VerificationToken` (se reescribe)
  - `AllowedEmail` (ya no se necesita — el control es por verificación de email)
- **NO eliminar**: Organization, Membership, Product, Invoice, Sale, Contact, Category, Warehouse, StockMovement, CashRegister, PaymentRecord, AuditLog, Plan, Subscription, ni ningún modelo de negocio
- **Nota**: Al eliminar User, las relaciones de Membership y otros modelos que referencian userId se romperán temporalmente. Eso se arregla en T1.3.

### T1.3: Escribir nuevos modelos auth
- **Archivo**: `prisma/schema.prisma`
- **Agregar exactamente estos modelos**:

```prisma
// ============================================
// AUTH MODELS — Reescritura completa
// ============================================

enum Role {
  ADMIN
  USER
}

enum UserStatus {
  PENDING_VERIFICATION  // Email no verificado (registro con credentials)
  ACTIVE                // Verificado y activo
  INACTIVE              // Creado por sync cross-BU, aún no activó en esta BU
  SUSPENDED             // Suspendido por admin
}

model User {
  id              String     @id @default(cuid())
  email           String     @unique
  name            String?
  image           String?
  emailVerified   DateTime?
  passwordHash    String?    // bcrypt hash, null si solo usa OAuth
  role            Role       @default(USER)
  status          UserStatus @default(PENDING_VERIFICATION)
  globalUserId    String?    // ID en Q-Company GlobalUser registry (sync)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  accounts                Account[]
  sessions                Session[]
  memberships             Membership[]
  emailVerificationTokens EmailVerificationToken[]
  onboardingProgress      OnboardingProgress[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String  // "oauth" | "credentials"
  provider          String  // "google" | "microsoft" | etc.
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model EmailVerificationToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique  // SHA-256 hash del token real
  userId    String
  expires   DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique  // SHA-256 hash del token real
  email     String
  expires   DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

### T1.4: Escribir modelo OnboardingProgress
- **Archivo**: `prisma/schema.prisma`
- **Agregar**:

```prisma
// ============================================
// ONBOARDING MODELS
// ============================================

enum OnboardingType {
  BUSINESS   // Org + Fiscal + pasos BU-specific
  PERSONAL   // Profile + Workspace
}

model OnboardingProgress {
  id             String         @id @default(cuid())
  userId         String
  organizationId String?
  type           OnboardingType
  currentStep    Int            @default(1)
  totalSteps     Int
  completedAt    DateTime?
  data           Json           @default("{}")  // Datos parciales guardados entre pasos
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization? @relation(fields: [organizationId], references: [id])

  @@unique([userId, organizationId])
}
```

### T1.5: Actualizar relaciones en modelos existentes
- **Archivo**: `prisma/schema.prisma`
- **Acción**: Verificar que `Membership`, `AuditLog`, y cualquier modelo que tenga `userId` apunte correctamente al nuevo `User`
- Agregar `onboardingProgress OnboardingProgress[]` al modelo `Organization` si no existe
- Verificar que no queden referencias rotas

### T1.6: Actualizar seed.ts
- **Archivo**: `prisma/seed.ts`
- **Acción**: Reescribir para que:
  - Cree el admin user con `status: ACTIVE`, `emailVerified: new Date()`, `role: ADMIN`
  - Use `passwordHash` en vez de `password` (bcrypt hash)
  - NO cree `AllowedEmail` (ya no existe)
  - Mantenga la creación de plans, org demo, etc.

### T1.7: Ejecutar prisma db push
- **Comando**: `npx prisma db push --force-reset`
- **Nota**: `--force-reset` porque es pre-MVP y estamos reescribiendo
- Luego: `npx prisma generate`
- Luego: `npm run db:seed` (si el seed existe)

### T1.8: Verificar que la app compila (con errores esperados)
- **Comando**: `npx tsc --noEmit`
- **Esperado**: Errores en archivos auth existentes que referencian modelos viejos
- **No arreglar aún** — eso se hace en PLAN-02
- **Documentar** qué archivos tienen errores de tipos para referencia en PLAN-02

---

## Tareas Atómicas — Q-Company

### T1.9: Leer el schema actual de Q-Company
- **Archivo**: `prisma/schema.prisma` (en repo q-company)
- **Acción**: Leer para entender la estructura actual

### T1.10: Agregar modelos GlobalUser y BuRegistration
- **Archivo**: `prisma/schema.prisma` (en repo q-company)
- **Agregar** (no modificar modelos existentes):

```prisma
// ============================================
// GLOBAL USER REGISTRY — Cross-BU sync
// ============================================

enum GlobalUserStatus {
  ACTIVE
  SUSPENDED
}

enum BuUserStatus {
  INACTIVE    // Creado por sync, no activó en esta BU
  ONBOARDING  // Activó pero no completó onboarding
  ACTIVE      // Completamente activo
}

model GlobalUser {
  id              String           @id @default(cuid())
  email           String           @unique
  name            String?
  image           String?
  emailVerified   DateTime?
  authProvider    String?          // "google", "credentials", "microsoft"
  status          GlobalUserStatus @default(ACTIVE)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  buRegistrations BuRegistration[]
}

model BuRegistration {
  id           String       @id @default(cuid())
  globalUserId String
  buSlug       String       // "qontabiliza", "qobra", "qontacta", etc.
  status       BuUserStatus @default(INACTIVE)
  registeredAt DateTime     @default(now())
  activatedAt  DateTime?

  globalUser GlobalUser @relation(fields: [globalUserId], references: [id], onDelete: Cascade)

  @@unique([globalUserId, buSlug])
  @@index([buSlug])
}
```

### T1.11: Ejecutar prisma db push en Q-Company
- **Comando**: `npx prisma db push`
- **Nota**: NO usar `--force-reset` en Q-Company. Solo agregar modelos nuevos.
- Luego: `npx prisma generate`

---

## Checklist de Validación

- [ ] Schema de qontabiliza compila: `npx prisma validate`
- [ ] Schema de q-company compila: `npx prisma validate`
- [ ] `npx prisma generate` funciona en ambos repos
- [ ] El enum `UserStatus` tiene los 4 estados correctos
- [ ] `EmailVerificationToken` usa `tokenHash` (no plaintext)
- [ ] `PasswordResetToken` usa `tokenHash` (no plaintext)
- [ ] `OnboardingProgress` tiene `@@unique([userId, organizationId])`
- [ ] Modelos de negocio (Product, Invoice, etc.) NO fueron modificados
- [ ] Seed actualizado y funciona
