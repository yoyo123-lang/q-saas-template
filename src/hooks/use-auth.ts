"use client";

import { useSession } from "next-auth/react";

/** Hook para acceder a la sesión del usuario en componentes client. */
export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
