import NextAuth from "next-auth";
import { providers } from "./providers";
import { callbacks } from "./callbacks";
import { adapter } from "./adapter";

// NextAuth v5 requiere AUTH_URL con protocolo completo.
// En Vercel, VERCEL_URL solo tiene el hostname (sin https://), lo que causa
// TypeError: Invalid URL al construir URLs de callback.
if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.AUTH_URL = `https://${process.env.VERCEL_URL}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  // JWT strategy requerida para que CredentialsProvider funcione con PrismaAdapter en NextAuth v5 beta.
  // Con "database" (default), la sesión de credentials nunca se establece (bug conocido del beta).
  session: { strategy: "jwt" },
  trustHost: true,
  debug: process.env.NODE_ENV !== "production" || !!process.env.AUTH_DEBUG,
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks,
  events: {
    async createUser({ user }) {
      // Si el usuario recién creado vía OAuth es el admin configurado, promoverlo
      if (!user.email || user.email !== process.env.ADMIN_EMAIL) return;
      try {
        await import("@/lib/db").then(({ prisma }) =>
          prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN", status: "ACTIVE", emailVerified: new Date() },
          })
        );
      } catch (err) {
        console.error("[auth] Error al promover admin en primer login:", err);
      }
    },
  },
  logger: {
    error(error) {
      console.error("[auth][error]", {
        message: error.message,
        name: error.name,
        cause: error.cause,
        stack: error.stack?.split("\n").slice(0, 5).join("\n"),
      });
    },
    warn(code) {
      console.warn("[auth][warn]", code);
    },
  },
});
