export type OnboardingStepId =
  // Universal steps (all BUs — no modificar)
  | 'organization'
  | 'fiscal-data'
  // --- BU-SPECIFIC STEPS ---
  // Personalizá estos pasos según tu producto.
  // Ejemplos:
  //   ERP: 'first-product', 'first-contact'
  //   CRM: 'communication-channels', 'first-contact'
  //   Job Board: 'company-profile', 'first-job'
  | 'example-step';

export type PersonalStepId = 'profile' | 'workspace';

export interface OnboardingStep {
  id: OnboardingStepId | PersonalStepId;
  label: string;
  description: string;
  required: boolean;
}

export interface OnboardingConfig {
  businessSteps: OnboardingStep[];
  personalSteps: OnboardingStep[];
  allowedTypes: ('BUSINESS' | 'PERSONAL')[];
  /** Si solo hay un tipo, skip pantalla de selección */
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
    // Reemplazá 'example-step' con los pasos específicos de tu producto.
    // Para agregar un paso:
    //   1. Agregá el id al type OnboardingStepId (arriba)
    //   2. Agregá la entrada acá (businessSteps)
    //   3. Creá la página en src/app/onboarding/{step-id}/page.tsx
    //   4. Creá el componente form en src/components/onboarding/
    //   5. Creá la server action en src/lib/actions/onboarding.ts
    {
      id: 'example-step',
      label: 'Paso de ejemplo',
      description: 'Reemplazá esto con el primer paso específico de tu BU',
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
