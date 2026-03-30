import { cn } from "@/lib/utils";

type StatusVariant = "active" | "paused" | "completed" | "archived" | "error" | "rejected" | "default";

const variantStyles: Record<StatusVariant, React.CSSProperties> = {
  active: {
    backgroundColor: "var(--color-q-success-bg)",
    color: "var(--color-q-success-text)",
  },
  paused: {
    backgroundColor: "var(--color-q-warning-bg)",
    color: "var(--color-q-warning-text)",
  },
  completed: {
    backgroundColor: "var(--color-q-info-bg)",
    color: "var(--color-q-info-text)",
  },
  archived: {
    backgroundColor: "var(--color-q-neutral-bg)",
    color: "var(--color-q-neutral-text)",
  },
  error: {
    backgroundColor: "var(--color-q-error-bg)",
    color: "var(--color-q-error-text)",
  },
  rejected: {
    backgroundColor: "var(--color-q-error-bg)",
    color: "var(--color-q-error-text)",
  },
  default: {
    backgroundColor: "var(--color-q-neutral-bg)",
    color: "var(--color-q-neutral-text)",
  },
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  COMPLETED: "Completado",
  ARCHIVED: "Archivado",
  ERROR: "Error",
  REJECTED: "Rechazado",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = (status.toLowerCase() as StatusVariant) || "default";
  const label = statusLabels[status] ?? status;
  const styles = variantStyles[variant] ?? variantStyles.default;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        className
      )}
      style={styles}
    >
      {label}
    </span>
  );
}
