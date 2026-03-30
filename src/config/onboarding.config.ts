export type OnboardingStepId =
  // Universal steps (all BUs)
  | 'organization'
  | 'fiscal-data';
  // BU-specific steps: agregar acá al personalizar (ver comentario abajo)

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
    // Ejemplos por tipo de producto:
    //   ERP → { id: 'first-product', label: 'Primer producto', required: false }
    //   CRM → { id: 'communication-channels', label: 'Canales de comunicación', required: false }
    //   Job Board → { id: 'company-profile', label: 'Perfil de empresa', required: false }
    // {
    //   id: 'example-step',
    //   label: 'Tu primer recurso',
    //   description: 'Cargá el primer recurso de tu BU (personalizar)',
    //   required: false,
    // },
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
