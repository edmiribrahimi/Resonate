"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";

/**
 * Where somebody asks to join, converted onto the shell and the form controls
 * (plan 41-06).
 *
 * ── What changed ─────────────────────────────────────────────────────────────
 *
 * The three fields drew their boundary with the legacy boundary name, an alias
 * of the decorative line token at **1.39 : 1** against WCAG 1.4.11's 3 : 1; they
 * now carry `--control` at **7.14 : 1** on the page ground (finding A1). The
 * submit filled with the accent under white ink at **2.91 : 1** and now carries
 * the page ground at **6.85 : 1** (A2). Every field killed its outline and drew
 * nothing in its place; the ring is now the system's one expression, offset so
 * it lands on the page (A3). The password checklist used a raw Tailwind palette
 * green — no token, no computed ratio — and now uses the completion semantic at
 * **5.99 : 1** on the page ground, still with the tick that already made colour
 * not the only channel.
 *
 * And the brand is spelled the way the brand is spelled: **`re:sonate`**, normal
 * `e`, lower case, colon. The reversed glyph is a drawn mark that lives inside
 * the logo artwork and is not a character anybody types
 * (`brand-visual-system.md`). This is one of the three defects §11 assigns to
 * this phase, and it is a string rather than a component: the wordmark primitive
 * ships with the surface that renders the brand as a standalone mark, which is
 * not this one.
 *
 * ── What did NOT change ──────────────────────────────────────────────────────
 *
 * **Nothing about what this form submits or about who a new account becomes.**
 * Not the sign-up call, not the confirmation destination it is given, not the
 * full name and the referral code it carries, not the four rules that decide
 * whether the submit is live. Referral and approval are the community's gate
 * (`community-membership.md`); this plan renders that form, it does not
 * re-decide it.
 */
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
      <PageShell width="focus">
        <div className="text-center">
          {/* Decoration reinforcing the title, which says the same thing in
              words. Declared decorative rather than left to the assistive
              technology to guess (the shape of 41-05 deviation 3). */}
          <div aria-hidden="true" className="mb-4 text-5xl">
            ✉️
          </div>
          {/* The page title of THIS branch. The two branches are mutually
              exclusive — this one returns early — so exactly one h1 ever
              reaches the browser, which is the invariant §7.1 states and the
              one `Typography.tsx` writes out. */}
          <PageTitle className="mb-2">Check your email</PageTitle>
          <p className="text-sm text-muted">
            We sent you a confirmation link. Click it to activate your account.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="focus">
      <PageTitle className="mb-2">Become a Member</PageTitle>
      <p className="mb-8 text-sm text-muted">Join the re:sonate community</p>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <Input
          id="register-full-name"
          type="text"
          aria-label="Full name"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          id="register-email"
          type="email"
          aria-label="Email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div>
          <Input
            id="register-password"
            type="password"
            aria-label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {password.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {passwordRules.map(({ key, label }) => (
                <p
                  key={key}
                  className={`text-xs ${
                    rules[key] ? "text-sem-done" : "text-muted"
                  }`}
                >
                  {rules[key] ? "\u2713" : "\u2022"} {label}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* A refusal is a state, and the accent is not a state signal (§5.1).
            Announced as well as coloured. */}
        {error && (
          <p role="alert" className="text-sm text-sem-crit">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          variant="primary"
          disabled={!isPasswordValid || loading}
          className="w-full disabled:cursor-not-allowed"
        >
          {loading ? "Signing up..." : "Sign Up"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        {/* Form 2 of plan 34-01 — see the twin in `login/page.tsx`. Same two
            strings as before; the ternary is what keeps each branch a
            literal instead of widening to `/login${string}`. */}
        <Link href={nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : "/login"} className={`text-accent hover:text-accent-hover ${FOCUS_RING}`}>
          Sign In
        </Link>
      </p>
    </PageShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
