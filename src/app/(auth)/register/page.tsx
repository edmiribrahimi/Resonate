"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function validatePassword(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

const passwordRules = [
  { key: "minLength" as const, label: "8+ characters" },
  { key: "hasUppercase" as const, label: "One uppercase letter" },
  { key: "hasNumber" as const, label: "One number" },
  { key: "hasSpecial" as const, label: "One special character (!@#$...)" },
];

function RegisterForm() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const nextUrl = searchParams.get("next") || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const rules = validatePassword(password);
  const isPasswordValid = Object.values(rules).every(Boolean);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/api/auth/callback${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ""}`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
          referral_code: referralCode || undefined,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-5xl">✉️</div>
        <h1 className="mb-2 text-2xl font-bold">Check your email</h1>
        <p className="max-w-xs text-muted">
          We sent you a confirmation link. Click it to activate your account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Become a Member</h1>
        <p className="mb-8 text-muted">
          Join the Resonate community
        </p>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="h-12 rounded-xl border border-card-border bg-card px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl border border-card-border bg-card px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="h-12 w-full rounded-xl border border-card-border bg-card px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            {password.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {passwordRules.map(({ key, label }) => (
                  <p
                    key={key}
                    className={`text-xs ${
                      rules[key] ? "text-green-500" : "text-muted"
                    }`}
                  >
                    {rules[key] ? "\u2713" : "\u2022"} {label}
                  </p>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-accent">{error}</p>}

          <button
            type="submit"
            disabled={!isPasswordValid || loading}
            className="h-12 rounded-full bg-accent font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          {/* Form 2 of plan 34-01 — see the twin in `login/page.tsx`. Same two
              strings as before; the ternary is what keeps each branch a
              literal instead of widening to `/login${string}`. */}
          <Link href={nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : "/login"} className="text-accent hover:text-accent-hover">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
