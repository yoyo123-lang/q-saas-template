import { createHash, randomUUID } from 'crypto';
import { render } from '@react-email/components';
import { prisma } from '@/lib/db';
import { resend, EMAIL_FROM } from './client';
import PasswordResetEmail from './templates/password-reset';

/**
 * Genera un token de reset de contraseña, lo guarda hasheado en DB,
 * y envía el email con el token real en la URL.
 * Si el email no existe, retorna success igualmente (no revelar si el email existe).
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: true }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { success: true };
  }

  // Invalidar tokens previos para este email
  await prisma.passwordResetToken.updateMany({
    where: { email, used: false },
    data: { used: true },
  });

  const token = randomUUID();
  const tokenHash = createHash('sha256').update(token).digest('hex');

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      email,
      expires: new Date(Date.now() + 60 * 60 * 1000), // 1h
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Q App';
  const html = await render(PasswordResetEmail({ resetUrl, appName }));

  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: `Restablecé tu contraseña — ${process.env.NEXT_PUBLIC_APP_NAME || 'Q App'}`,
    html,
  });

  return { success: true };
}
