import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <Icon className="h-12 w-12" style={{ color: "var(--q-text-disabled)" }} />
      <h3 className="mt-4 text-sm font-semibold" style={{ color: "var(--q-text-primary)" }}>
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm" style={{ color: "var(--q-text-muted)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
