"use server";

import { createHash } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email/send-verification";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";

const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type RegisterResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * Registra un nuevo usuario con email + contraseña.
 *
 * Flujo:
 * 1. Validar input con Zod
 * 2. Verificar que el email no exista (o reactivar si estaba INACTIVE)
 * 3. Hash de contraseña con bcrypt (salt 12)
 * 4. Crear User con status PENDING_VERIFICATION
 * 5. Generar token de verificación, guardar hash SHA-256, y enviar email
 */
export async function registerUser(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return { success: false, error: firstError };
  }

  const { name, email, password } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, status: true },
    });

    if (existingUser) {
      if (existingUser.status === "INACTIVE") {
        // Reactivar usuario inactivo con nueva contraseña
        const passwordHash = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            passwordHash,
            status: "PENDING_VERIFICATION",
            emailVerified: null,
          },
        });

        await sendVerificationEmail({ userId: existingUser.id, email, name });

        return { success: true, message: "Verificá tu email para activar tu cuenta." };
      }

      // Usuario activo o pendiente → ya registrado
      return { success: false, error: "Este email ya está registrado." };
    }

    // Nuevo usuario
    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        status: "PENDING_VERIFICATION",
      },
      select: { id: true },
    });

    await sendVerificationEmail({ userId: newUser.id, email, name });

    return { success: true, message: "Verificá tu email para activar tu cuenta." };
  } catch (err) {
    console.error("[registerUser] error:", err);
    return { success: false, error: "Error al registrar. Intentá de nuevo." };
  }
}

type ActionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Reenvía el email de verificación para un usuario pendiente.
 */
export async function resendVerificationEmail(email: string): Promise<ActionResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, status: true },
    });

    if (!user) {
      return { success: false, error: "Email no encontrado." };
    }

    if (user.status !== "PENDING_VERIFICATION") {
      return { success: false, error: "Este email ya fue verificado." };
    }

    // Invalidar tokens previos
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    await sendVerificationEmail({ userId: user.id, email, name: user.name ?? '' });

    return { success: true };
  } catch (err) {
    console.error("[resendVerificationEmail] error:", err);
    return { success: false, error: "Error al reenviar el email. Intentá de nuevo." };
  }
}

/**
 * Solicita el restablecimiento de contraseña.
 * Siempre retorna success para no revelar si el email existe.
 */
export async function requestPasswordReset(email: string): Promise<{ success: true }> {
  try {
    await sendPasswordResetEmail(email);
  } catch (err) {
    console.error("[requestPasswordReset] error:", err);
  }
  return { success: true };
}

/**
 * Restablece la contraseña usando el token del email.
 */
export async function resetPassword(token: string, newPassword: string): Promise<ActionResult> {
  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.used || resetToken.expires < new Date()) {
      return { success: false, error: "Token inválido o expirado." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
      select: { id: true, status: true },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          // Si estaba pendiente de verificación, activar la cuenta
          ...(user.status === "PENDING_VERIFICATION" && { status: "ACTIVE" }),
        },
      }),
    ]);

    return { success: true };
  } catch (err) {
    console.error("[resetPassword] error:", err);
    return { success: false, error: "Error al restablecer la contraseña. Intentá de nuevo." };
  }
}
