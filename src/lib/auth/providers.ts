import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const providers = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    allowDangerousEmailAccountLinking: true,
  }),

  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          passwordHash: true,
          status: true,
          role: true,
        },
      });

      if (!user) return null;

      if (user.status === "PENDING_VERIFICATION") {
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      if (user.status === "SUSPENDED") {
        throw new Error("ACCOUNT_SUSPENDED");
      }

      if (!user.passwordHash) {
        throw new Error("USE_OAUTH");
      }

      const valid = await bcrypt.compare(
        credentials.password as string,
        user.passwordHash
      );

      if (!valid) {
        throw new Error("INVALID_CREDENTIALS");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];
