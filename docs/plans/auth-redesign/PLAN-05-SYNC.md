# PLAN-05: Cross-BU Sync via Q-Company

> **Repos**: q-company (principal) + qontabiliza
> **Prerequisito**: PLAN-02 (Auth Core) completado, PLAN-01 (DB en Q-Company) completado
> **Estimación**: 1-2 sesiones de Sonnet

---

## Objetivo

Implementar la sincronización de usuarios entre BUs a través de Q-Company como registro central. Cuando un usuario se registra en una BU, Q-Company lo propaga como inactivo a las demás.

## IMPORTANTE

- La sync es **fire-and-forget** desde la BU: no bloquea el registro si Q-Company no responde
- Q-Company propaga a otras BUs de forma asíncrona
- Los webhooks entre servicios usan HMAC para validación
- Si la BU destino no responde, Q-Company loguea el error pero no reintenta (v1 simple)

---

## Tareas Atómicas — Q-Company

### T5.1: Crear endpoint POST /api/v1/auth/sync
- **Archivo**: `src/app/api/v1/auth/sync/route.ts` (en repo q-company)
- **Contenido**:
```typescript
// POST /api/v1/auth/sync
// Headers: x-api-key: qb_{slug}_{hex} (API key de la BU)
//
// Body: {
//   email: string
//   name: string | null
//   image: string | null
//   emailVerified: boolean
//   authProvider: "google" | "credentials"
//   buSlug: string
// }
//
// Lógica:
// 1. Validar API key contra BusinessUnit registrada (usar auth existente de Q-Company)
// 2. Validar body con Zod
// 3. Buscar GlobalUser por email
//    a. Si no existe → crear con datos recibidos
//    b. Si existe → actualizar name/image si estaban null
// 4. Crear/actualizar BuRegistration para la BU origen (status: ACTIVE)
// 5. Propagar a otras BUs (T5.3)
// 6. Retornar { globalUserId, isNew }
```

### T5.2: Crear data access layer para GlobalUser
- **Archivo**: `src/lib/data/global-users.ts` (en repo q-company)
- **Contenido**:
```typescript
// findGlobalUserByEmail(email: string)
// createGlobalUser(data: {...})
// updateGlobalUser(id: string, data: {...})
// findBuRegistrations(globalUserId: string)
// createBuRegistration(data: {...})
// updateBuRegistration(globalUserId: string, buSlug: string, data: {...})
```

### T5.3: Crear lógica de propagación a otras BUs
- **Archivo**: `src/lib/auth/user-propagation.ts` (en repo q-company)
- **Contenido**:
```typescript
// propagateUserToOtherBus(globalUser: GlobalUser, originBuSlug: string)
//
// 1. Obtener lista de BUs registradas (excluyendo la BU origen)
//    - Las BUs están en la tabla BusinessUnit existente de Q-Company
// 2. Para cada BU que tenga webhookUrl configurado:
//    a. Verificar que no existe ya una BuRegistration para esta BU
//    b. POST {bu.webhookUrl}/api/v1/auth/user-provision
//       Headers: {
//         'Content-Type': 'application/json',
//         'x-webhook-secret': HMAC-SHA256(body, bu.webhookSecret)
//       }
//       Body: {
//         email, name, image, globalUserId, status: 'INACTIVE'
//       }
//    c. Si responde 200 → crear BuRegistration con status INACTIVE
//    d. Si falla → loguear error, continuar con siguiente BU
// 3. Fire-and-forget: no bloquear si alguna BU falla
```

### T5.4: Agregar webhookUrl a BusinessUnit (si no existe)
- **Archivo**: `prisma/schema.prisma` (en repo q-company)
- **Acción**: Verificar si el modelo BusinessUnit tiene campo `webhookUrl`
  - Si no → agregarlo: `webhookUrl String?`
  - Si ya existe (por el sistema de directives) → reutilizarlo
- **Nota**: El campo puede ser el mismo que usa directives para enviar webhooks a BUs

### T5.5: Crear endpoint de activación
- **Archivo**: `src/app/api/v1/auth/activate/route.ts` (en repo q-company)
- **Contenido**:
```typescript
// POST /api/v1/auth/activate
// Headers: x-api-key (de la BU)
// Body: { email: string, buSlug: string }
//
// Lógica:
// 1. Buscar GlobalUser por email
// 2. Actualizar BuRegistration para esa BU: status → ACTIVE, activatedAt → now()
// 3. Retornar { success: true }
//
// Se llama cuando un usuario INACTIVE completa onboarding en una BU
```

---

## Tareas Atómicas — Qontabiliza

### T5.6: Crear función de sync a Q-Company
- **Archivo**: `src/lib/sync/user-sync.ts` (en repo qontabiliza)
- **Contenido**:
```typescript
// syncUserToBoard(user: { email, name, image, emailVerified, authProvider })
//
// 1. POST {BOARD_URL}/api/v1/auth/sync
//    Headers: { 'x-api-key': BOARD_API_KEY }
//    Body: { ...user, buSlug: 'qontabiliza' }
// 2. Si responde OK → guardar globalUserId en User
// 3. Si falla → loguear warning, no bloquear el flujo
//    (el usuario sigue funcionando en esta BU sin sync)
//
// NOTA: Fire-and-forget. Usar try/catch sin throw.
```

### T5.7: Crear función de activación en Q-Company
- **Archivo**: `src/lib/sync/user-sync.ts` (agregar)
- **Contenido**:
```typescript
// notifyUserActivated(email: string)
//
// 1. POST {BOARD_URL}/api/v1/auth/activate
//    Headers: { 'x-api-key': BOARD_API_KEY }
//    Body: { email, buSlug: 'qontabiliza' }
// 2. Fire-and-forget
```

### T5.8: Crear endpoint de provisioning
- **Archivo**: `src/app/api/v1/auth/user-provision/route.ts` (en repo qontabiliza)
- **Contenido**:
```typescript
// POST /api/v1/auth/user-provision
// Headers: x-webhook-secret: HMAC signature
//
// Body: {
//   email: string
//   name: string | null
//   image: string | null
//   globalUserId: string
//   status: 'INACTIVE'
// }
//
// Lógica:
// 1. Validar HMAC signature:
//    - Calcular HMAC-SHA256 del body con BOARD_WEBHOOK_SECRET
//    - Comparar con header (timing-safe comparison)
// 2. Validar body con Zod
// 3. Buscar User por email
//    a. Si existe → actualizar globalUserId si estaba null
//    b. Si no existe → crear User con status INACTIVE, globalUserId seteado
// 4. Retornar 200 { success: true }
```

### T5.9: Integrar sync en flujos existentes
- **Archivos a modificar**:

#### En verify-email (PLAN-03):
- Después de verificar email → llamar `syncUserToBoard(user)`

#### En signIn callback (PLAN-02):
- Cuando se crea usuario via OAuth → llamar `syncUserToBoard(user)`
- Cuando usuario INACTIVE se activa → llamar `notifyUserActivated(email)`

#### En onboarding completion (PLAN-04):
- Cuando se completa onboarding → llamar `notifyUserActivated(email)`

### T5.10: Agregar middleware público para endpoint de provisioning
- **Archivo**: `src/middleware.ts` (en repo qontabiliza)
- **Acción**: Agregar `/api/v1/auth/*` a la lista de rutas públicas
  - Ya debería estar si se siguió PLAN-02 T2.9, pero verificar

### T5.11: Crear utilidad HMAC
- **Archivo**: `src/lib/sync/hmac.ts` (en repo qontabiliza)
- **Contenido**:
```typescript
import { createHmac, timingSafeEqual } from 'crypto';

export function verifyHmacSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### T5.12: Verificar compilación en ambos repos
- **Comando** (qontabiliza): `npx tsc --noEmit`
- **Comando** (q-company): `npx tsc --noEmit`

---

## Flujo Completo de Sync

```
1. Usuario se registra en Qontabiliza (OAuth o email/password)
   ↓
2. Qontabiliza crea User local
   ↓
3. Después de verificación (credentials) o inmediatamente (OAuth):
   → POST q-company/api/v1/auth/sync
   ↓
4. Q-Company:
   a. Crea GlobalUser
   b. Crea BuRegistration (qontabiliza, ACTIVE)
   c. Para cada otra BU registrada:
      → POST {bu.webhookUrl}/api/v1/auth/user-provision
   ↓
5. Otras BUs crean User con status INACTIVE
   ↓
6. Cuando el usuario entra a otra BU:
   - Ya existe (INACTIVE)
   - Se activa → pasa al onboarding de esa BU
   - No necesita re-registrarse
```

---

## Checklist de Validación

- [ ] Endpoint `/api/v1/auth/sync` en Q-Company funciona
- [ ] GlobalUser se crea correctamente
- [ ] BuRegistration se crea para BU origen (ACTIVE) y otras (INACTIVE)
- [ ] Propagación a otras BUs usa HMAC
- [ ] Endpoint `/api/v1/auth/user-provision` en Qontabiliza funciona
- [ ] HMAC validation usa timing-safe comparison
- [ ] Sync es fire-and-forget (no bloquea el registro si falla)
- [ ] globalUserId se guarda en User local después de sync
- [ ] `/api/v1/auth/*` está en rutas públicas del middleware
- [ ] Errores de sync se loguean pero no crashean el flujo
- [ ] `npx tsc --noEmit` pasa en ambos repos
