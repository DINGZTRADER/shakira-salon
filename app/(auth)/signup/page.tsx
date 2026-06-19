"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SALON } from "@/lib/constants";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, loading, error, setError } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const validatePhone = (value: string) => /^\+?[0-9]{9,15}$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validatePhone(phone)) {
      setError("Enter a valid phone number (e.g. +256700123456)");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const ok = await signUp({ fullName, email, phone, password });
    if (ok) {
      setSuccess(true);
      // If email confirmation is disabled, session is active → go home.
      setTimeout(() => router.push("/"), 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-700">{SALON.name}</h1>
          <p className="mt-2 text-ink-light">Create your account to book appointments</p>
        </div>

        {success ? (
          <div
            role="status"
            className="bg-white rounded-2xl shadow-sm border border-brand-100 p-6 text-center"
          >
            <p className="text-brand-700 font-medium">Account created! 🎉</p>
            <p className="mt-2 text-sm text-ink-light">Redirecting you now…</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-brand-100 p-6 space-y-4"
          >
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />

            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+256700123456"
            />

            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />

            <Button type="submit" fullWidth loading={loading} size="lg">
              Create Account
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-light">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
