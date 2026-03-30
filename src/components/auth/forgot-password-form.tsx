"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
    } catch {
      // ignorar — siempre mostramos el mismo mensaje
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Revisá tu email</h1>
        <p className="text-sm text-gray-600">
          Si el email existe, te enviamos instrucciones para restablecer tu contraseña.
        </p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Olvidé mi contraseña</h1>
        <p className="mt-1 text-sm text-gray-600">
          Ingresá tu email y te enviamos un link para restablecer tu contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="tu@email.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar instrucciones"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="text-blue-600 hover:underline">
          Volver al login
        </Link>
      </p>
    </div>
  );
}
