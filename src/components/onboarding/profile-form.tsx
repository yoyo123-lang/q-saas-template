"use client";

import { useState, useTransition } from "react";
import { saveProfileStep } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
  initialName: string;
  avatarUrl?: string;
}

export function ProfileForm({ initialName, avatarUrl }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (isPending) return;
    if (!fullName.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await saveProfileStep({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      });

      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  const nameError = attempted && !fullName.trim() ? "El nombre es requerido" : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar preview (solo lectura) */}
      {avatarUrl && (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-16 w-16 rounded-full object-cover"
          />
          <p className="text-sm text-gray-500">
            Foto de tu cuenta de Google
          </p>
        </div>
      )}

      {/* Nombre completo */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
          Nombre completo
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Tu nombre completo"
          maxLength={100}
          autoFocus
          className={cn(
            "mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
            nameError
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          )}
        />
        {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
      </div>

      {/* Teléfono */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Teléfono <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+54 11 1234-5678"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          onClick={() => setAttempted(true)}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Siguiente →"}
        </button>
      </div>
    </form>
  );
}
