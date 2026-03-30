"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl p-6 shadow-xl"
        style={{ backgroundColor: "var(--q-surface)" }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 transition-colors"
          style={{ color: "var(--q-text-muted)" }}
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-semibold" style={{ color: "var(--q-text-primary)" }}>
          {title}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--q-text-muted)" }}>
          {description}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              borderColor: "var(--q-border)",
              color: "var(--q-text-secondary)",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{
              backgroundColor:
                variant === "danger"
                  ? "var(--color-q-error)"
                  : "var(--color-q-accent)",
            }}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
