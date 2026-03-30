import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

// Workaround para bug en NextAuth v5 beta.30: allowDangerousEmailAccountLinking no funciona.
// handleLogin() lanza OAuthAccountNotLinked cuando getUserByEmail() retorna un usuario pero
// no existe un Account para ese provider, ignorando el flag. Fix: override getUserByEmail
// para retornar null siempre → handleLogin nunca llega al throw. Override createUser para
// retornar el usuario existente si el email ya existe, evitando duplicados. Auth.js luego
// llama a linkAccount() para vincular el nuevo provider.
const base = PrismaAdapter(prisma);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adapter: any = {
  ...base,

  getUserByEmail: async (_email: string) => null,

  createUser: async (data: {
    name?: string | null;
    email: string;
    image?: string | null;
    emailVerified: Date | null;
  }) => {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });

    if (existing) {
      // Si el usuario existente es INACTIVE, activarlo al linkearse con OAuth
      if (existing.status === "INACTIVE") {
        await prisma.user.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", emailVerified: new Date() },
        });
      }
      return existing;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return base.createUser!(data as any);
  },
};
