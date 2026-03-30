import { Resend } from 'resend';

// Lazy singleton — avoids throwing during Next.js build when RESEND_API_KEY is not set.
let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Q App <noreply@example.com>';
