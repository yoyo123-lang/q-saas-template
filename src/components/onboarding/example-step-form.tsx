"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveExampleStep, skipOnboardingStep } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";

/**
 * Formulario de ejemplo para paso BU-specific.
 * Reemplazá este componente con el formulario específico de tu producto.
 *
 * Ejemplos de qué podría ir acá:
 *   ERP: primer producto
 *   CRM: primer canal de comunicación
 *   Job Board: primer oferta laboral
 */

interface ExampleStepFormProps {
  isRequired: boolean;
}

export function ExampleStepForm({ isRequired }: ExampleStepFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSkipping, startSkipTransition] = useTransition();

  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (isPending) return;
    if (!value.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await saveExampleStep({
        value: value.trim(),
        notes: notes.trim() || undefined,
      });

      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  function handleSkip() {
    startSkipTransition(async () => {
      await skipOnboardingStep();
    });
  }

  const valueError = attempted && !value.trim() ? "El valor es requerido" : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Campo principal del ejemplo */}
      <div>
        <label htmlFor="example-value" className="block text-sm font-medium text-gray-700">
          Valor de ejemplo <span className="text-red-500">*</span>
        </label>
        <input
          id="example-value"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ingresá un valor..."
          maxLength={200}
          autoFocus
          className={cn(
            "mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
            valueError
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          )}
        />
        {valueError && <p className="mt-1 text-sm text-red-600">{valueError}</p>}
        <p className="mt-1 text-xs text-gray-400">
          Este es un campo de ejemplo. Reemplazá este paso con la lógica de tu BU.
        </p>
      </div>

      {/* Notas opcionales */}
      <div>
        <label htmlFor="example-notes" className="block text-sm font-medium text-gray-700">
          Notas <span className="text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="example-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Información adicional..."
          maxLength={500}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/onboarding/fiscal-data")}
          disabled={isPending || isSkipping}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          ← Anterior
        </button>
        <button
          type="submit"
          disabled={isPending || isSkipping}
          onClick={() => setAttempted(true)}
          className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Siguiente →"}
        </button>
        {!isRequired && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={isPending || isSkipping}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            {isSkipping ? "..." : "Omitir"}
          </button>
        )}
      </div>
    </form>
  );
}
