import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Algo salió mal",
  message = "Hubo un error al cargar los datos. Intentá de nuevo.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <AlertTriangle className="h-12 w-12" style={{ color: "var(--color-q-error)" }} />
      <h3 className="mt-4 text-sm font-semibold" style={{ color: "var(--q-text-primary)" }}>
        {title}
      </h3>
      <p className="mt-1 text-sm" style={{ color: "var(--q-text-muted)" }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: "var(--color-q-accent)" }}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
