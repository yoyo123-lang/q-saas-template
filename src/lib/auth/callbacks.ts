import type { Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import type { UserStatus, Role } from "@prisma/client";
import { syncUserToBoard, notifyUserActivated } from "@/lib/sync/user-sync";

interface SignInParams {
  user: { id?: string; email?: string | null; name?: string | null; image?: string | null };
  account?: Account | null;
  profile?: Profile;
}

interface JwtParams {
  token: JWT;
  user?: { id?: string; email?: string | null; name?: string | null; image?: string | null } | null;
  trigger?: "signIn" | "signUp" | "update";
}

interface SessionParams {
  session: {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: Role;
      status: UserStatus;
      needsOnboarding?: boolean;
    };
  };
  token: JWT;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const callbacks: any = {
  async signIn({ user, account }: SignInParams): Promise<boolean> {
    if (!user.email) return false;

    // Credentials: validación ya hecha en authorize()
    if (account?.provider === "credentials") return true;

    // OAuth: verificar que no haya una cuenta Google diferente ya vinculada
    if (account?.provider === "google" && account?.providerAccountId) {
      const linkedAccount = await prisma.account.findFirst({
        where: {
          provider: "google",
          user: { email: user.email },
          NOT: { providerAccountId: account.providerAccountId },
        },
        select: { providerAccountId: true },
      });

      if (linkedAccount) {
        console.error("[auth] Blocked: different Google account already linked", {
          email: user.email,
          attempted: account.providerAccountId.slice(0, 8),
        });
        return false;
      }
    }

    // OAuth: activar usuario INACTIVE (llegó vía sync cross-BU)
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, status: true, role: true },
    });

    if (existing) {
      const updates: { status?: UserStatus; role?: Role; emailVerified?: Date } = {};
      let wasInactive = false;

      if (existing.status === "INACTIVE") {
        updates.status = "ACTIVE";
        updates.emailVerified = new Date();
        wasInactive = true;
      }

      if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL && existing.role !== "ADMIN") {
        updates.role = "ADMIN";
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({ where: { id: existing.id }, data: updates });
      }

      // Si era INACTIVE y se activó vía OAuth → notificar activación a Q-Company
      if (wasInactive) {
        notifyUserActivated(user.email).catch((err) => {
          console.warn("[auth] Error notificando activación a Q-Company", { email: user.email, error: err });
        });
      }
    }

    // Sync OAuth user a Q-Company (fire-and-forget)
    const dbUser = existing ?? await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });
    if (dbUser) {
      syncUserToBoard({
        id: dbUser.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: new Date(),
        authProvider: "google",
      }).catch((err) => {
        console.warn("[auth] Error sincronizando usuario OAuth con Q-Company", { email: user.email, error: err });
      });
    }

    return true;
  },

  async jwt({ token, user, trigger }: JwtParams): Promise<JWT> {
    if (trigger === "signIn" && user?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, status: true, email: true, name: true, image: true },
      });

      token.userId = user.id;
      token.role = dbUser?.role ?? "USER";
      token.status = dbUser?.status ?? "ACTIVE";
      token.email = dbUser?.email ?? user.email;
      token.name = dbUser?.name ?? user.name;
      token.picture = dbUser?.image ?? user.image;

      // Admin omite verificación de onboarding
      if (dbUser?.role === "ADMIN") {
        token.needsOnboarding = false;
      } else {
        // Verificar si el usuario necesita completar onboarding
        const [incompleteProgress, completedProgress] = await Promise.all([
          prisma.onboardingProgress.findFirst({
            where: { userId: user.id, completedAt: null },
            select: { id: true },
          }),
          prisma.onboardingProgress.findFirst({
            where: { userId: user.id, completedAt: { not: null } },
            select: { id: true },
          }),
        ]);

        const hasOrg = await prisma.membership.findFirst({
          where: { userId: user.id },
          select: { id: true },
        });

        token.needsOnboarding =
          !!incompleteProgress ||
          (!completedProgress && !hasOrg);
      }
    }

    return token;
  },

  async session({ session, token }: SessionParams) {
    if (session.user && token) {
      session.user.id = (token.userId ?? token.sub) as string;
      session.user.role = (token.role as Role) ?? "USER";
      session.user.status = (token.status as UserStatus) ?? "ACTIVE";
      session.user.email = token.email ?? session.user.email;
      session.user.name = token.name ?? session.user.name;
      session.user.image = (token.picture as string | null) ?? session.user.image;
      session.user.needsOnboarding = (token.needsOnboarding as boolean | undefined) ?? false;
    }
    return session;
  },
};
