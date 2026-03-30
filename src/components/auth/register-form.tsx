"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { OAuthButtons } from "./oauth-buttons";
import { registerUser } from "@/lib/actions/auth";

const registerSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FieldErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);
    setSuccessMessage(null);

    const result = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
      });

      if (!res.success) {
        setServerError(res.error ?? "Error al registrarse. Intentá de nuevo.");
        return;
      }

      setSuccessMessage(res.message ?? "Revisá tu email para verificar tu cuenta.");
    } catch {
      setServerError("Error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (successMessage) {
    return (
      <div className="rounded-md bg-green-50 px-4 py-6 text-center">
        <p className="text-sm font-medium text-green-700">{successMessage}</p>
        <p className="mt-2 text-xs text-green-600">
          Una vez verificado tu email, podrás ingresar.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          Ir al login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <OAuthButtons />

      <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        <span>o</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="reg-name" className="text-sm font-medium text-gray-700">
            Nombre
          </label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Tu nombre"
          />
          {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="reg-email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="tu@email.com"
          />
          {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="reg-password" className="text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Mínimo 8 caracteres"
          />
          {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="reg-confirm" className="text-sm font-medium text-gray-700">
            Confirmar contraseña
          </label>
          <input
            id="reg-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Repetí tu contraseña"
          />
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Registrando..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Ingresá
        </Link>
      </p>
    </div>
  );
}
