"use client";

import { cn } from "@/lib/utils";
import type { OnboardingStep } from "@/config/onboarding.config";

interface ProgressBarProps {
  steps: OnboardingStep[];
  currentStep: number; // 1-indexed
}

export function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-2xl px-4">
        {/* Mobile: "Paso X de N" */}
        <div className="flex items-center justify-between py-3 sm:hidden">
          <span className="text-sm font-medium text-gray-900">
            {steps[currentStep - 1]?.label ?? ""}
          </span>
          <span className="text-sm text-gray-500">
            Paso {currentStep} de {steps.length}
          </span>
        </div>

        {/* Desktop: pasos numerados */}
        <nav className="hidden sm:flex">
          {steps.map((step, i) => {
            const stepNumber = i + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;

            return (
              <div
                key={step.id}
                className="flex flex-1 items-center justify-center py-3 text-xs font-medium"
              >
                <span
                  className={cn(
                    "flex items-center gap-2",
                    isCurrent ? "text-indigo-600" : isCompleted ? "text-gray-600" : "text-gray-400"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border text-xs",
                      isCurrent
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : isCompleted
                        ? "border-gray-400 bg-gray-100 text-gray-600"
                        : "border-gray-300 text-gray-400"
                    )}
                  >
                    {isCompleted ? "✓" : stepNumber}
                  </span>
                  <span>{step.label}</span>
                </span>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
