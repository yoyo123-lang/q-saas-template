"use client";

import { useState, useTransition } from "react";
import { saveWorkspaceStep } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";

// Zonas horarias más comunes en Argentina y Latinoamérica
const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (GMT-3)" },
  { value: "America/Santiago", label: "Chile (GMT-3/-4)" },
  { value: "America/Bogota", label: "Colombia (GMT-5)" },
  { value: "America/Lima", label: "Perú (GMT-5)" },
  { value: "America/Mexico_City", label: "México (GMT-6/-5)" },
  { value: "America/Montevideo", label: "Uruguay (GMT-3)" },
  { value: "America/Sao_Paulo", label: "Brasil (GMT-3)" },
  { value: "America/Caracas", label: "Venezuela (GMT-4)" },
] as const;

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/Argentina/Buenos_Aires";
  }
}

export function WorkspaceForm() {
  const [isPending, startTransition] = useTransition();
  const [workspaceName, setWorkspaceName] = useState("");
  const [timezone, setTimezone] = useState(detectTimezone());
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (isPending) return;
    if (!workspaceName.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await saveWorkspaceStep({
        workspaceName: workspaceName.trim(),
        timezone,
      });

      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  const nameError = attempted && !workspaceName.trim() ? "El nombre del espacio es requerido" : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nombre del workspace */}
      <div>
        <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700">
          Nombre del espacio
        </label>
        <input
          id="workspaceName"
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="Mi espacio de trabajo"
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
        <p className="mt-1 text-xs text-gray-400">
          Podés usar tu nombre, el nombre de tu proyecto, etc.
        </p>
      </div>

      {/* Zona horaria */}
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
          Zona horaria
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
          {/* Fallback si la zona auto-detectada no está en la lista */}
          {!TIMEZONES.some((tz) => tz.value === timezone) && (
            <option value={timezone}>{timezone}</option>
          )}
        </select>
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
          {isPending ? "Finalizando..." : "Finalizar →"}
        </button>
      </div>
    </form>
  );
}
