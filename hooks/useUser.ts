"use client";

// Convenience re-export hook for accessing the authenticated profile
import { useAuthContext } from "@/context/AuthContext";

export function useUser() {
  const { authUser, profile, loading, isAdmin } = useAuthContext();
  return {
    user: authUser,
    profile,
    loading,
    isAdmin,
    isAuthenticated: !!authUser,
  };
}
