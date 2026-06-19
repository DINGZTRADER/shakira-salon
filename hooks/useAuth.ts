"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SignUpParams {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

interface SignInParams {
  email: string;
  password: string;
}

export function useAuth() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signUp = useCallback(
    async ({ fullName, email, phone, password }: SignUpParams) => {
      setLoading(true);
      setError(null);
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign up failed");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const signIn = useCallback(
    async ({ email, password }: SignInParams, redirectTo = "/") => {
      setLoading(true);
      setError(null);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Invalid email or password"
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase, router]
  );

  return { signUp, signIn, loading, error, setError };
}
