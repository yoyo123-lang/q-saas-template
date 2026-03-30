"use client";

import { useState, useTransition } from "react";
import { SectorSelector } from "@/components/onboarding/sector-selector";
import { saveOrganizationStep } from "@/lib/actions/onboarding";
import { slugify } from "@/lib/utils/slugify";
import { cn } from "@/lib/utils";
import type { OrganizationSector } from "@prisma/client";

interface OrganizationFormProps {
  defaultSector?: OrganizationSector;
  defaultName?: string;
  defaultSlug?: string;
}

export function OrganizationForm({
  defaultSector = "OTHER",
  defaultName = "",
  defaultSlug = "",
}: OrganizationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [sector, setSector] = useState<OrganizationSector>(defaultSector);
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(defaultSlug);
  const [slugEdited, setSlugEdited] = useState(!!defaultSlug);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      const result = await saveOrganizationStep({ sector, name, slug });
      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  const nameError = attempted && !name.trim() ? "El nombre es requerido" : null;
  const slugError =
    attempted && !slug.trim()
      ? "El identificador es requerido"
      : attempted && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)
      ? "Solo letras minúsculas, números y guiones"
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">¿A qué se dedica tu organización?</p>
        <SectorSelector value={sector} onChange={setSector} />
      </div>

      <div>
        <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">
          Nombre de la empresa
        </label>
        <input
          id="org-name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Nombre de tu negocio"
          required
          maxLength={100}
          autoFocus
          autoComplete="organization"
          className={cn(
            "mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
            nameError
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          )}
        />
        {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="org-slug" className="block text-sm font-medium text-gray-700">
          Identificador (URL)
        </label>
        <input
          id="org-slug"
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="mi-empresa"
          required
          maxLength={60}
          className={cn(
            "mt-1 block w-full rounded-md border px-3 py-2 text-sm font-mono shadow-sm focus:outline-none focus:ring-1",
            slugError
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          )}
        />
        {slugError ? (
          <p className="mt-1 text-sm text-red-600">{slugError}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">
            Solo letras minúsculas, números y guiones. Se usa en la URL de tu espacio.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          onClick={() => setAttempted(true)}
          className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Siguiente →"}
        </button>
      </div>
    </form>
  );
}
