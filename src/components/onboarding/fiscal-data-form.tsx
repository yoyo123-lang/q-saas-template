"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFiscalDataStep } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";

const IVA_CONDITIONS = [
  { value: "RESPONSABLE_INSCRIPTO", label: "Responsable Inscripto" },
  { value: "MONOTRIBUTISTA", label: "Monotributista" },
  { value: "EXENTO", label: "Exento" },
  { value: "CONSUMIDOR_FINAL", label: "Consumidor Final" },
  { value: "NO_CATEGORIZADO", label: "No Categorizado" },
] as const;

function formatCuit(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function FiscalDataForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [ivaCondition, setIvaCondition] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [puntoDeVenta, setPuntoDeVenta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      const result = await saveFiscalDataStep({
        razonSocial,
        cuit: cuit || undefined,
        ivaCondition: ivaCondition as
          | "RESPONSABLE_INSCRIPTO"
          | "MONOTRIBUTISTA"
          | "EXENTO"
          | "CONSUMIDOR_FINAL"
          | "NO_CATEGORIZADO",
        address:
          street || city || province
            ? {
                street: street || undefined,
                number: streetNumber || undefined,
                city: city || undefined,
                province: province || undefined,
                postalCode: postalCode || undefined,
              }
            : undefined,
        puntoDeVenta: puntoDeVenta ? parseInt(puntoDeVenta, 10) : undefined,
      });

      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  const razonSocialError = attempted && !razonSocial.trim() ? "La razón social es requerida" : null;
  const ivaError = attempted && !ivaCondition ? "Seleccioná una condición de IVA" : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Razón social */}
      <div>
        <label htmlFor="razonSocial" className="block text-sm font-medium text-gray-700">
          Razón social
        </label>
        <input
          id="razonSocial"
          type="text"
          value={razonSocial}
          onChange={(e) => setRazonSocial(e.target.value)}
          placeholder="Mi Empresa S.A."
          maxLength={200}
          autoFocus
          className={cn(
            "mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
            razonSocialError
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          )}
        />
        {razonSocialError && <p className="mt-1 text-sm text-red-600">{razonSocialError}</p>}
      </div>

      {/* CUIT */}
      <div>
        <label htmlFor="cuit" className="block text-sm font-medium text-gray-700">
          CUIT <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          id="cuit"
          type="text"
          value={cuit}
          onChange={(e) => setCuit(formatCuit(e.target.value))}
          placeholder="20-12345678-9"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-400">Formato: XX-XXXXXXXX-X</p>
      </div>

      {/* Condición IVA */}
      <div>
        <label htmlFor="ivaCondition" className="block text-sm font-medium text-gray-700">
          Condición frente al IVA
        </label>
        <select
          id="ivaCondition"
          value={ivaCondition}
          onChange={(e) => setIvaCondition(e.target.value)}
          className={cn(
            "mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
            ivaError
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          )}
        >
          <option value="">Seleccioná una opción</option>
          {IVA_CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {ivaError && <p className="mt-1 text-sm text-red-600">{ivaError}</p>}
      </div>

      {/* Dirección */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700">
          Dirección <span className="text-gray-400">(opcional)</span>
        </legend>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Calle"
              maxLength={200}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <input
              type="text"
              value={streetNumber}
              onChange={(e) => setStreetNumber(e.target.value)}
              placeholder="Número"
              maxLength={20}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ciudad"
            maxLength={100}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="Provincia"
            maxLength={100}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <input
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Código postal"
          maxLength={10}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </fieldset>

      {/* Punto de venta */}
      <div>
        <label htmlFor="puntoDeVenta" className="block text-sm font-medium text-gray-700">
          Punto de venta <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          id="puntoDeVenta"
          type="number"
          min={1}
          max={99999}
          value={puntoDeVenta}
          onChange={(e) => setPuntoDeVenta(e.target.value)}
          placeholder="1"
          className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/onboarding/organization")}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          ← Anterior
        </button>
        <button
          type="submit"
          disabled={isPending}
          onClick={() => setAttempted(true)}
          className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Siguiente →"}
        </button>
      </div>
    </form>
  );
}
