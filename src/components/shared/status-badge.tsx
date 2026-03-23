import { cn } from "@/lib/utils";

type StatusVariant = "active" | "paused" | "completed" | "archived" | "default";

const variantStyles: Record<StatusVariant, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-800",
  default: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  COMPLETED: "Completado",
  ARCHIVED: "Archivado",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = (status.toLowerCase() as StatusVariant) || "default";
  const label = statusLabels[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant] ?? variantStyles.default,
        className
      )}
    >
      {label}
    </span>
  );
}
