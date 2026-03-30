import { render } from '@react-email/components';
import { getResend, EMAIL_FROM } from './client';
import WelcomeEmail from './templates/welcome';

interface SendWelcomeEmailParams {
  email: string;
  name: string;
}

/**
 * Envía email de bienvenida después de verificar la cuenta.
 * Fire-and-forget: no bloquear el flujo si falla.
 */
export function sendWelcomeEmail({ email, name }: SendWelcomeEmailParams): void {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginUrl = `${appUrl}/login`;

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Q App';
  render(WelcomeEmail({ name, loginUrl, appName }))
    .then((html) =>
      getResend().emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: `Bienvenido/a a ${process.env.NEXT_PUBLIC_APP_NAME || 'Q App'}`,
        html,
      })
    )
    .catch((err) => {
      console.error('[sendWelcomeEmail] error:', err);
    });
}
