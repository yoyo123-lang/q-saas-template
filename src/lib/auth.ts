import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const allowed = await prisma.allowedEmail.findUnique({
        where: { email: user.email },
      });
      return !!allowed;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Query por PK para inyectar rol en sesión. Costo: 1 query/request autenticado.
        // Tradeoff aceptado — ver docs/KNOWN_ISSUES.md para alternativa JWT.
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        session.user.role = dbUser?.role ?? "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Si el usuario recién creado es el admin configurado, promoverlo a ADMIN
      if (!user.email || user.email !== process.env.ADMIN_EMAIL) return;
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      } catch (err) {
        console.error("[auth] Error al promover admin en primer login:", err);
      }
    },
  },
});
