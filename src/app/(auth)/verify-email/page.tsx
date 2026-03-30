import { createHash } from 'crypto';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email/send-welcome';
import { syncUserToBoard } from '@/lib/sync/user-sync';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  // Sin token: mostrar pantalla "Revisá tu email"
  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Revisá tu email</h1>
        <p className="text-sm text-gray-600">
          Te enviamos un link de verificación. Revisá tu bandeja de entrada.
        </p>
        <p className="text-xs text-gray-500">
          ¿No llegó?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Volver al login
          </Link>
        </p>
      </div>
    );
  }

  // Hashear token y buscar en DB
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, name: true, email: true, status: true } } },
  });

  // Token inválido o no encontrado
  if (!verificationToken) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Token inválido</h1>
        <p className="text-sm text-gray-600">
          El link de verificación es inválido o ya fue usado.
        </p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          Volver al login
        </Link>
      </div>
    );
  }

  // Token expirado
  if (verificationToken.used || verificationToken.expires < new Date()) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Link expirado</h1>
        <p className="text-sm text-gray-600">
          El link de verificación expiró o ya fue utilizado.
        </p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          Volver al login
        </Link>
      </div>
    );
  }

  // Token válido: marcar como usado y activar usuario
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { tokenHash },
      data: { used: true },
    }),
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    }),
  ]);

  // Enviar email de bienvenida (fire-and-forget)
  sendWelcomeEmail({
    email: verificationToken.user.email,
    name: verificationToken.user.name ?? 'Usuario',
  });

  // Sync a Q-Company (fire-and-forget)
  syncUserToBoard({
    id: verificationToken.userId,
    email: verificationToken.user.email,
    name: verificationToken.user.name,
    emailVerified: new Date(),
    authProvider: 'credentials',
  });

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Email verificado</h1>
      <p className="text-sm text-gray-600">
        Tu cuenta fue activada correctamente.
      </p>
      <Link
        href="/login"
        className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Ir al login
      </Link>
    </div>
  );
}
