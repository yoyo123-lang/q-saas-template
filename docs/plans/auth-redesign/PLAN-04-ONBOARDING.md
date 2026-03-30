# PLAN-04: Onboarding — Universal + BU-Specific

> **Repo**: qontabiliza
> **Prerequisito**: PLAN-02 (Auth Core) + PLAN-03 (Email) completados
> **Estimación**: 2-3 sesiones de Sonnet

---

## Objetivo

Reescribir el onboarding con arquitectura de 2 capas:
- **Capa universal** (pasos 1-2): Organización + Datos Fiscales — común a todo el ecosistema Q
- **Capa BU-specific** (pasos 3+): Definidos por cada BU en su config

Agregar onboarding personal para BUs orientadas a individuos.

## IMPORTANTE

- **BORRAR** el onboarding actual completo y reescribir
- El onboarding empresarial pasos 1-2 (org + fiscal) son universales para todo el ecosistema
- Los pasos 3+ son opcionales y cada BU los define en `onboarding.config.ts`
- El onboarding personal es independiente (profile + workspace)
- Usar `OnboardingProgress` model para persistir estado entre sesiones

## Estructura del Onboarding

### Empresarial (Qontabiliza)
| Paso | ID | Tipo | Contenido |
|------|----|------|-----------|
| 1 | `organization` | UNIVERSAL | Sector, nombre, slug |
| 2 | `fiscal-data` | UNIVERSAL | CUIT, razón social, condición IVA, dirección |
| 3 | `first-product` | BU-SPECIFIC | Nombre, SKU, categoría, precio |
| 4 | `first-contact` | BU-SPECIFIC | Nombre, email, teléfono, CUIT, condición IVA |

### Personal
| Paso | ID | Contenido |
|------|----|-----------|
| 1 | `profile` | Nombre completo, teléfono (opcional), avatar |
| 2 | `workspace` | Nombre del workspace, preferencias |

---

## Tareas Atómicas

### T4.1: Eliminar onboarding existente
- **Eliminar**:
  - `src/app/onboarding/` (toda la carpeta)
  - `src/components/onboarding/` (toda la carpeta)
  - `src/components/organizations/create-organization-form*` (si existe y es solo para onboarding)
- **NO eliminar**: modelos de Organization, Membership en schema (son de negocio)

### T4.2: Crear configuración de onboarding
- **Archivo**: `src/config/onboarding.config.ts`
- **Contenido**:

```typescript
export type OnboardingStepId =
  // Universal steps (all BUs)
  | 'organization'
  | 'fiscal-data'
  // BU-specific steps (Qontabiliza)
  | 'first-product'
  | 'first-contact';

export type PersonalStepId = 'profile' | 'workspace';

export interface OnboardingStep {
  id: OnboardingStepId | PersonalStepId;
  label: string;           // "Tu organización", "Datos fiscales", etc.
  description: string;     // Texto corto debajo del label
  required: boolean;
}

export interface OnboardingConfig {
  businessSteps: OnboardingStep[];
  personalSteps: OnboardingStep[];
  allowedTypes: ('BUSINESS' | 'PERSONAL')[];
  // Si solo hay un tipo, skip pantalla de selección
  skipTypeSelection: boolean;
}

export const onboardingConfig: OnboardingConfig = {
  businessSteps: [
    // --- UNIVERSAL STEPS (no modificar en BUs) ---
    {
      id: 'organization',
      label: 'Tu organización',
      description: 'Creá tu espacio de trabajo',
      required: true,
    },
    {
      id: 'fiscal-data',
      label: 'Datos fiscales',
      description: 'Información fiscal de tu organización',
      required: true,
    },
    // --- BU-SPECIFIC STEPS (personalizar por BU) ---
    {
      id: 'first-product',
      label: 'Primer producto',
      description: 'Cargá tu primer producto o servicio',
      required: false,  // Se puede omitir con "Omitir paso"
    },
    {
      id: 'first-contact',
      label: 'Primer cliente',
      description: 'Cargá tu primer cliente o proveedor',
      required: false,
    },
  ],
  personalSteps: [
    {
      id: 'profile',
      label: 'Tu perfil',
      description: 'Completá tu información personal',
      required: true,
    },
    {
      id: 'workspace',
      label: 'Tu espacio',
      description: 'Configurá tu espacio de trabajo',
      required: true,
    },
  ],
  allowedTypes: ['BUSINESS', 'PERSONAL'],
  skipTypeSelection: false,
};
```

### T4.3: Crear layout de onboarding
- **Archivo**: `src/app/onboarding/layout.tsx`
- **Contenido** (server component):
```
1. Verificar auth (redirect a /login si no hay sesión)
2. Leer OnboardingProgress del usuario en DB
3. Si ya completó onboarding → redirect a /dashboard
4. Renderizar:
   - Header con logo + "Configuración inicial"
   - Progress bar dinámico basado en onboardingConfig
   - {children}
```

### T4.4: Crear componente ProgressBar dinámico
- **Archivo**: `src/components/onboarding/progress-bar.tsx`
- **Contenido** (client component):
  - Recibe: `steps: OnboardingStep[]`, `currentStep: number`
  - Renderiza pasos numerados con estados: completado / actual / pendiente
  - Responsive: en mobile muestra solo paso actual de N
  - Reutiliza el estilo visual del onboarding actual (círculos numerados + labels)

### T4.5: Crear página de selección de tipo
- **Archivo**: `src/app/onboarding/page.tsx`
- **Contenido** (server component):
```
1. Si onboardingConfig.skipTypeSelection → redirect al primer paso del tipo default
2. Si ya hay OnboardingProgress en curso → redirect al paso actual
3. Renderizar selector con cards:
   - Card "Empresa" → clic crea OnboardingProgress type=BUSINESS, redirect paso 1
   - Card "Personal" → clic crea OnboardingProgress type=PERSONAL, redirect paso 1
```

### T4.6: Crear componente TypeSelector
- **Archivo**: `src/components/onboarding/type-selector.tsx`
- **Contenido** (client component):
  - Dos cards grandes:
    - Empresa: icono edificio, "Para negocios, comercios, organizaciones", "Incluye datos fiscales y organización"
    - Personal: icono persona, "Para uso individual", "Sin datos fiscales ni organización"
  - Al hacer click → llama server action `startOnboarding(type)`

### T4.7: Crear server action startOnboarding
- **Archivo**: `src/lib/actions/onboarding.ts`
- **Contenido**:
```typescript
// startOnboarding(type: OnboardingType)
// 1. Obtener session del usuario
// 2. Calcular totalSteps según tipo y onboardingConfig
// 3. Crear OnboardingProgress en DB
// 4. Redirect al primer paso según tipo
```

### T4.8: Crear paso 1 — Organización (UNIVERSAL)
- **Archivo**: `src/app/onboarding/organization/page.tsx`
- **Contenido** (server component):
  - Verificar que el OnboardingProgress actual esté en step 1 y type BUSINESS
  - Renderizar `<OrganizationForm />`
  - Cargar datos parciales de OnboardingProgress.data si existen (usuario volvió)

### T4.9: Crear componente OrganizationForm
- **Archivo**: `src/components/onboarding/organization-form.tsx`
- **Contenido** (client component):
  - `<SectorSelector />` — grid de cards con sectores (mantener los 8 sectores actuales)
  - Input: Nombre de la empresa
  - Input: Slug (auto-generado desde nombre, editable)
  - Validación Zod: nombre min 2 chars, slug formato URL-safe
  - Submit → server action `saveOrganizationStep(data)`
  - Botón "Siguiente →"

### T4.10: Crear componente SectorSelector
- **Archivo**: `src/components/onboarding/sector-selector.tsx`
- **Contenido** (client component):
  - Grid 4x2 con los sectores:
    - Comercio, Servicios, Educación, Otro (fila 1)
    - Salud, Industria, Gastronomía, Agro (fila 2)
  - Cada card con icono + título + descripción breve
  - Selección visual con borde highlight
  - Mantener los mismos sectores e iconos del diseño actual (ver screenshot)

### T4.11: Crear server action saveOrganizationStep
- **Archivo**: `src/lib/actions/onboarding.ts` (agregar)
- **Contenido**:
```typescript
// saveOrganizationStep(data: { sector, name, slug })
// 1. Validar con Zod
// 2. Verificar que slug no exista
// 3. Crear Organization en DB con sector y nombre
// 4. Crear Membership con role OWNER para el usuario actual
// 5. Crear Warehouse default (como hace el onboarding actual)
// 6. Setear cookie active-org-id
// 7. Actualizar OnboardingProgress: currentStep = 2, guardar data parcial
// 8. Redirect → /onboarding/fiscal-data
```

### T4.12: Crear paso 2 — Datos Fiscales (UNIVERSAL)
- **Archivo**: `src/app/onboarding/fiscal-data/page.tsx`
- **Contenido**:
  - Verificar OnboardingProgress step >= 2
  - Renderizar `<FiscalDataForm />`

### T4.13: Crear componente FiscalDataForm
- **Archivo**: `src/components/onboarding/fiscal-data-form.tsx`
- **Contenido** (client component):
  - Campos:
    - CUIT (formato XX-XXXXXXXX-X, validación de dígito verificador)
    - Razón Social
    - Condición frente al IVA (dropdown: Responsable Inscripto, Monotributista, Exento, Consumidor Final, etc.)
    - Dirección (calle, número, ciudad, provincia, CP)
    - Punto de venta (numérico, 1-99999)
  - Validación Zod para cada campo
  - Botón "← Anterior" + "Siguiente →"
  - Submit → server action `saveFiscalDataStep(data)`

### T4.14: Crear server action saveFiscalDataStep
- **Archivo**: `src/lib/actions/onboarding.ts` (agregar)
- **Contenido**:
```typescript
// saveFiscalDataStep(data)
// 1. Validar con Zod
// 2. Actualizar Organization.fiscalData (JSON field)
// 3. Actualizar OnboardingProgress: currentStep = 3
// 4. Si no hay más pasos requeridos → marcar completedAt y redirect /dashboard
// 5. Si hay pasos BU-specific → redirect al siguiente paso
```

### T4.15: Crear paso 3 — Primer Producto (BU-SPECIFIC: Qontabiliza)
- **Archivo**: `src/app/onboarding/first-product/page.tsx`
- **Contenido**:
  - Verificar que este paso existe en onboardingConfig
  - Renderizar `<FirstProductForm />`
  - Mostrar botón "Omitir paso" si `required: false`

### T4.16: Crear componente FirstProductForm
- **Archivo**: `src/components/onboarding/first-product-form.tsx`
- **Contenido** (client component):
  - Campos: nombre, SKU (auto-generado, editable), categoría (opcional), precio base, tasa IVA
  - Validación Zod
  - Botones: "← Anterior" + "Omitir" (si no required) + "Siguiente →"
  - Submit → server action `saveFirstProductStep(data)`

### T4.17: Crear server action saveFirstProductStep
- **Archivo**: `src/lib/actions/onboarding.ts` (agregar)
- **Contenido**:
```typescript
// saveFirstProductStep(data)
// 1. Validar con Zod
// 2. Crear Product en DB (con orgId del onboarding)
// 3. Crear Category default si no existe
// 4. Actualizar OnboardingProgress: currentStep + 1
// 5. Redirect al siguiente paso o completar
```

### T4.18: Crear paso 4 — Primer Contacto (BU-SPECIFIC: Qontabiliza)
- **Archivo**: `src/app/onboarding/first-contact/page.tsx`
- **Contenido**:
  - Verificar que este paso existe en onboardingConfig
  - Renderizar `<FirstContactForm />`
  - Botón "Omitir paso" si no required

### T4.19: Crear componente FirstContactForm
- **Archivo**: `src/components/onboarding/first-contact-form.tsx`
- **Contenido** (client component):
  - Campos: nombre, email, teléfono, tipo (cliente/proveedor), CUIT (opcional), condición IVA (opcional)
  - Validación Zod
  - Botones: "← Anterior" + "Omitir" + "Finalizar →"
  - Submit → server action `saveFirstContactStep(data)`

### T4.20: Crear server action saveFirstContactStep
- **Archivo**: `src/lib/actions/onboarding.ts` (agregar)
- **Contenido**:
```typescript
// saveFirstContactStep(data)
// 1. Validar con Zod
// 2. Crear Contact en DB
// 3. Marcar OnboardingProgress.completedAt = now()
// 4. Actualizar User status si necesario
// 5. Redirect → /dashboard
```

### T4.21: Crear server action skipStep
- **Archivo**: `src/lib/actions/onboarding.ts` (agregar)
- **Contenido**:
```typescript
// skipOnboardingStep()
// 1. Leer OnboardingProgress actual
// 2. Verificar que el paso actual tiene required: false en config
// 3. Incrementar currentStep
// 4. Si era el último paso → completar onboarding
// 5. Redirect al siguiente paso o /dashboard
```

### T4.22: Crear paso personal 1 — Perfil
- **Archivo**: `src/app/onboarding/profile/page.tsx`
- **Contenido**:
  - Verificar OnboardingProgress type === PERSONAL
  - Renderizar `<ProfileForm />`

### T4.23: Crear componente ProfileForm
- **Archivo**: `src/components/onboarding/profile-form.tsx`
- **Contenido** (client component):
  - Campos: nombre completo (pre-fill de auth), teléfono (opcional), avatar (upload o OAuth image)
  - Submit → server action `saveProfileStep(data)`
  - Botón "Siguiente →"

### T4.24: Crear paso personal 2 — Workspace
- **Archivo**: `src/app/onboarding/workspace/page.tsx`
- **Contenido**:
  - Renderizar `<WorkspaceForm />`

### T4.25: Crear componente WorkspaceForm
- **Archivo**: `src/components/onboarding/workspace-form.tsx`
- **Contenido** (client component):
  - Campos: nombre del workspace, zona horaria (auto-detect, editable)
  - Submit → server action `saveWorkspaceStep(data)`
  - Crea Organization con tipo personal (sector: OTHER o nuevo enum PERSONAL)
  - Botón "Finalizar →"

### T4.26: Crear server actions para pasos personales
- **Archivo**: `src/lib/actions/onboarding.ts` (agregar)
- **Contenido**: `saveProfileStep()` y `saveWorkspaceStep()` similares a los empresariales pero más simples

### T4.27: Actualizar redirect post-auth
- **Archivos**: `src/lib/auth/callbacks.ts`
- **Acción**: En el signIn callback, después de auth exitoso:
  - Si user tiene OnboardingProgress sin completar → redirect `/onboarding`
  - Si user no tiene OnboardingProgress ni Organization → redirect `/onboarding`
  - Si user tiene Organization y onboarding completo → redirect `/dashboard`
  - Si user es ADMIN → redirect `/dashboard` (skip onboarding check)

### T4.28: Verificar compilación y flujo completo
- **Comando**: `npx tsc --noEmit`
- **Test manual flow**:
  1. Registro → verificar email → seleccionar tipo → completar pasos → dashboard
  2. OAuth → seleccionar tipo → completar pasos → dashboard
  3. Cerrar browser en paso 2 → volver → continuar en paso 2

---

## Checklist de Validación

- [ ] Onboarding viejo completamente eliminado
- [ ] `onboarding.config.ts` define pasos universales + BU-specific
- [ ] Progress bar dinámico según config
- [ ] Selector de tipo (Business/Personal) funciona
- [ ] `skipTypeSelection` funciona (si hay un solo tipo, skip)
- [ ] Paso 1 (Org): sector selector + nombre + slug
- [ ] Paso 2 (Fiscal): CUIT + razón social + IVA + dirección
- [ ] Pasos BU-specific son opcionales (botón "Omitir")
- [ ] OnboardingProgress persiste entre sesiones (browser close)
- [ ] Pasos personales funcionan (profile + workspace)
- [ ] Redirect post-auth funciona correctamente
- [ ] Admin no pasa por onboarding
- [ ] `npx tsc --noEmit` pasa
