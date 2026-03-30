"use client";

import { signOut } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { Menu, LogOut, Search, Bell } from "lucide-react";

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
      {/* Left: menu button (mobile) + search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 transition-colors lg:hidden"
          style={{ color: "var(--q-text-muted)" }}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search input */}
        <div className="relative hidden sm:block">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--q-text-disabled)" }}
          />
          <input
            type="search"
            placeholder="Buscar..."
            className="h-9 w-56 rounded-md pl-9 pr-3 text-sm outline-none transition-all focus:w-72"
            style={{
              backgroundColor: "var(--q-input-bg)",
              border: "1px solid var(--q-input-border)",
              color: "var(--q-text-primary)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = "2px solid var(--color-q-accent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = "1px solid var(--q-input-border)";
            }}
          />
        </div>
      </div>

      {/* Right: notifications + user + logout */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className="relative rounded-md p-2 transition-colors"
          style={{ color: "var(--q-text-muted)" }}
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* Avatar + name */}
        {user && (
          <div className="flex items-center gap-2">
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

        {/* Logout */}
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
