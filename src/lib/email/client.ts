import { Resend } from 'resend';

// Usar 're_placeholder' como fallback para que el constructor no lance en build time.
// En runtime, si RESEND_API_KEY no está seteado, los envíos fallarán con error claro.
export const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder');

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Q SaaS';
const defaultFrom = `${appName} <noreply@example.com>`;
export const EMAIL_FROM = process.env.EMAIL_FROM || defaultFrom;
