"use client";

import { signOut } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { Menu, LogOut } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header
      className="flex h-16 items-center justify-between px-4 lg:px-6"
      style={{
        backgroundColor: "var(--q-surface)",
        borderBottom: "1px solid var(--q-border-light)",
      }}
    >
      {/* Menu button (mobile) */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 transition-colors lg:hidden"
        style={{ color: "var(--q-text-muted)" }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="hidden lg:block" />

      {/* User info + logout */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name ?? "Avatar"}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: "var(--color-q-accent)" }}
              >
                {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <span
              className="hidden text-sm font-medium sm:block"
              style={{ color: "var(--q-text-primary)" }}
            >
              {user.name ?? user.email}
            </span>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors"
          style={{ color: "var(--q-text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--q-surface-hover)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--q-text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "transparent";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--q-text-muted)";
          }}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
