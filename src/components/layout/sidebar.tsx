"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-config";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { X } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar — always dark navy, independent of light/dark mode */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "#0F172A" }}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/dashboard" className="text-lg font-bold text-white">
            Q SaaS
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white/40 transition-colors hover:text-white/80 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-l-2 bg-white/5 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
                style={
                  isActive
                    ? { borderLeftColor: "var(--color-q-accent)" }
                    : { borderLeft: "2px solid transparent" }
                }
              >
                <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer — user info + theme toggle */}
        <div
          className="flex items-center gap-3 px-4 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>

          {/* Name + role */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.name ?? user?.email ?? "Usuario"}
            </p>
            <p className="truncate text-xs text-white/40">
              {user?.email ?? ""}
            </p>
          </div>

          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
