import { createHash, randomUUID } from 'crypto';
import { render } from '@react-email/components';
import { prisma } from '@/lib/db';
import { resend, EMAIL_FROM } from './client';
import VerificationEmail from './templates/verification';

interface SendVerificationEmailParams {
  userId: string;
  email: string;
  name: string;
}

/**
 * Genera un token de verificación, lo guarda hasheado en DB,
 * y envía el email con el token real en la URL.
 */
export async function sendVerificationEmail({ userId, email, name }: SendVerificationEmailParams): Promise<{ success: true }> {
  const token = randomUUID();
  const tokenHash = createHash('sha256').update(token).digest('hex');

  await prisma.emailVerificationToken.create({
    data: {
      tokenHash,
      userId,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Q SaaS';
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  const html = await render(VerificationEmail({ name, verificationUrl, appName }));

  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: `Verificá tu email — ${appName}`,
    html,
  });

  return { success: true };
}
