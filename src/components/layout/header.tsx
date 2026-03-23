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
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Menu button (mobile) */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-gray-400 hover:text-gray-600 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="hidden lg:block" />

      {/* User info + logout */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            {user.image && (
              <img
                src={user.image}
                alt={user.name ?? "Avatar"}
                className="h-8 w-8 rounded-full"
              />
            )}
            <span className="hidden text-sm font-medium text-gray-700 sm:block">
              {user.name ?? user.email}
            </span>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
