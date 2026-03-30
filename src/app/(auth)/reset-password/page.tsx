import { createHash } from 'crypto';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    redirect('/forgot-password');
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetToken || resetToken.used || resetToken.expires < new Date()) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Link inválido o expirado</h1>
        <p className="text-sm text-gray-600">
          El link para restablecer la contraseña expiró o ya fue utilizado.
        </p>
        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
          Solicitar un nuevo link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
