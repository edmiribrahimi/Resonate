"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { claimGuestOrders } from "@/app/(public)/events/[slug]/menu/actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Incorrect email or password");
      setLoading(false);
      return;
    }

    // Claim any guest drink tokens before redirect
    try {
      const orderIds: string[] = [];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith("resonate_drink_tokens_")) {
          const ids = JSON.parse(localStorage.getItem(key) || "[]") as string[];
          orderIds.push(...ids);
          localStorage.removeItem(key);
        }
      }
      if (orderIds.length > 0) {
        await claimGuestOrders(orderIds);
      }
    } catch {
      // Non-blocking: tokens will be claimed on next menu visit
    }

    window.location.href = nextUrl || "/dashboard";
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Sign In</h1>
        <p className="mb-8 text-muted">
          Access your member area
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl border border-card-border bg-card px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 rounded-xl border border-card-border bg-card px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />

          {error && <p className="text-sm text-accent">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-full bg-accent font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href={`/register${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ""}`} className="text-accent hover:text-accent-hover">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
