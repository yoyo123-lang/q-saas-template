"use client";

import { useTransition } from "react";
import { Building2, User } from "lucide-react";
import { startOnboarding } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";
import type { OnboardingType } from "@prisma/client";

interface TypeCard {
  type: OnboardingType;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  features: string[];
}

const TYPE_CARDS: TypeCard[] = [
  {
    type: "BUSINESS",
    icon: Building2,
    title: "Empresa",
    subtitle: "Para negocios, comercios, organizaciones",
    features: ["Datos fiscales y organización", "Onboarding guiado", "Multi-usuario"],
  },
  {
    type: "PERSONAL",
    icon: User,
    title: "Personal",
    subtitle: "Para uso individual",
    features: ["Sin datos fiscales", "Espacio de trabajo propio", "Configuración simplificada"],
  },
];

export function TypeSelector() {
  const [isPending, startTransition] = useTransition();

  function handleSelect(type: OnboardingType) {
    startTransition(async () => {
      await startOnboarding(type);
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {TYPE_CARDS.map(({ type, icon: Icon, title, subtitle, features }) => (
        <button
          key={type}
          type="button"
          disabled={isPending}
          onClick={() => handleSelect(type)}
          className={cn(
            "flex flex-col items-start gap-4 rounded-xl border-2 p-6 text-left transition-all",
            "border-gray-200 bg-white hover:border-indigo-400 hover:shadow-md",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50">
            <Icon className="h-6 w-6 text-indigo-600" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>

          <ul className="space-y-1">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-indigo-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </button>
      ))}
    </div>
  );
}
