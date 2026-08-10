"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { claimGuestOrders } from "@/app/(public)/events/[slug]/menu/actions";
import { resolveNext } from "@/lib/routes/next-redirect";

function LoginForm() {
  const searchParams = useSearchParams();

  // ── The value from the URL, and the value the browser is allowed to follow ──
  //
  // These are two different things now, and they were one thing until plan
  // 37-12. `rawNext` is written by whoever built the link; `nextPath` is what
  // survives the allow-list in `src/lib/routes/next-redirect.ts` — the SAME list
  // `src/app/api/auth/callback/route.ts` has always used, shared rather than
  // copied, so a path added to one is added to both.
  //
  // **What this closes, measured rather than reasoned.** Before this line,
  // `/login?next=https://example.org` followed by a successful sign-in put the
  // browser on `https://example.org/` — observed with a real request against a
  // local auth backend, which is what the todo asked whoever closed it to do.
  // `//example.org` did the same. That is an open redirect one keystroke after
  // the password, which is the worst moment for it: the person has just proved
  // who they are and expects to be somewhere trusted.
  //
  // `searchParams.get` is passed through UNMODIFIED — no `|| ""` before the
  // call. `resolveNext(null)` means "no destination was asked for" and is not a
  // refusal; `resolveNext("")` would be one. The two land in the same place,
  // but only one of them is a substitution, and the flag below is read.
  const rawNext = searchParams.get("next");
  const { path: nextPath, refused: nextRefused } = resolveNext(rawNext);

  // ── D7 IS STILL OPEN, AND THIS IS THE HALF THAT MAKES IT SAFE TO CLOSE ──────
  //
  // `src/lib/supabase/middleware.ts:466` writes `?redirect=`; this file reads
  // `?next=`. The names do not match, so anyone bounced off a gated address
  // loses their destination and lands on `/dashboard` — blocker **D7**, a
  // product defect, and NOT fixed here.
  //
  // It is not fixed here on purpose, and the order is a constraint rather than
  // a preference: **aligning the names without this guard would ACTIVATE the
  // hole.** Today nothing in the product populates `?next=`, so the unvalidated
  // line was reachable only from a hand-made link. A `?next=` suddenly written
  // by the middleware makes that path ordinary, expected and busy — and the
  // line executing it unvalidated becomes an open redirect on a flow everybody
  // uses.
  //
  // The guard is here first, so whoever closes D7 finds the ground prepared
  // instead of opening a hole while fixing a defect. What that work still owes:
  // a census of every path that builds a login URL, and a decision on which of
  // the two names to keep — the todo records that census as NOT DONE.
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

    // `nextPath` is already `/dashboard` when the value was absent or refused —
    // the fallback lives in ONE place (`DEFAULT_NEXT`), so there is no second
    // `|| "/dashboard"` here to drift away from it.
    //
    // The substitution is not silent, in the same shape the callback uses
    // (`route.ts`, `?link=refused`). Its honest limit, said rather than implied:
    // nothing renders `?link=refused` today, and this repository has no error
    // tracking (`meta-gates.md`), so a log line would reach nobody. The URL is
    // the observable effect — somebody holding a broken link can see they did
    // not arrive where the link said. They are not told why.
    window.location.href = nextRefused
      ? `${nextPath}?link=refused`
      : nextPath;
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
          {/* Form 2 of plan 34-01: passed straight to `<Link>`, unannotated, so
              `RouteType` is inferred per branch. The ternary replaces a single
              template whose type widened to `/register${string}` — a shape
              `RouteImpl` cannot accept, because it would also admit
              `/registerXYZ`. Same two strings as before.

              What plan 37-12 changed is WHICH value goes in. It was `nextUrl`,
              the raw parameter, so `/login?next=https://example.org` produced
              `/register?next=https%3A%2F%2Fexample.org` — observed in the
              rendered page — and carried the same unvalidated string one hop
              further, into a form that mails it back as the callback's
              `redirectTo`. The callback allow-lists it on arrival, so this hop
              was never the last line of defence; forwarding a value this page
              has already refused would still be handing on something it just
              declined to follow itself.

              A refused value therefore does not travel: the link falls back to
              a plain `/register`. Only a value that was BOTH supplied and
              accepted is forwarded — an absent one is not turned into an
              explicit `?next=/dashboard`, which would invent a destination
              nobody asked for. */}
          <Link href={rawNext !== null && !nextRefused ? `/register?next=${encodeURIComponent(nextPath)}` : "/register"} className="text-accent hover:text-accent-hover">
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
