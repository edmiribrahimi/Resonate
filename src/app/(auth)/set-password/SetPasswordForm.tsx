"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * The repository's first and only `supabase.auth.updateUser({ password })`.
 *
 * ── The password never leaves the browser ────────────────────────────────────
 *
 * The write goes from this component straight to Supabase Auth with the
 * session's own token. It does not pass through a Server Action, a route
 * handler, or any log line of ours (D-10). Nothing below renders a password
 * back, puts one in a URL, or hands one to `console`. That is an invariant of
 * this file, not a coincidence of how it happens to be written today.
 *
 * ── Why the outcomes are values and not message text ─────────────────────────
 *
 * Each branch below reads a tagged value. None compares an error message
 * string. Two reasons, and only the first is style:
 *
 *   1. `src/lib/capabilities/server.ts:59-63` records that Next **redacts** the
 *      message of an error thrown out of a Server Action in a production build.
 *      This surface is a client component and therefore sees the real message —
 *      but a branch that reads message text is a pattern that gets copied into
 *      a place where it silently stops working.
 *   2. Message text is provider copy. It changes when Supabase changes it, in a
 *      release nobody here reads.
 *
 * The session branch reads `error.name`, which is a class name set in the
 * installed package (`@supabase/auth-js/dist/module/lib/errors.js:92-99`,
 * `AuthSessionMissingError`), not a sentence. `isAuthSessionMissingError` does
 * exactly this comparison; it is not imported because `@supabase/auth-js` is a
 * transitive dependency and this phase installs nothing.
 *
 * ── One notice per cause, never a shared fallback ────────────────────────────
 *
 * The shape is `src/app/(admin)/admin/newsletter/FailureNotice.tsx`, for the
 * reason written there: this project has **no error tracking**
 * (`meta-gates.md`, verified 2026-08-05), so a `console.error` reaches nobody
 * and the rendered notice is the only observable effect there is. A person who
 * followed a link out of their inbox and cannot set a password must be told
 * *which* thing failed — an expired link, a refused password and a dead network
 * want three different next actions. Collapsing them into "Something went
 * wrong" is the recorded newsletter anti-pattern
 * (`.planning/codebase/CONCERNS.md`); do not re-create it here.
 */

/** What the attempt can end as. Values, never parsed prose. */
type Outcome =
  | "ok"
  | "no_session"
  | "rejected_by_provider"
  | "transport_unavailable";

/** What the initial session probe can end as, before anything is typed. */
type SessionGate = "checking" | "present" | "absent" | "unverifiable";

type NoticeKind =
  | "no_session"
  | "rejected_by_provider"
  | "transport_unavailable"
  | "session_unverifiable";

const NOTICES: Record<NoticeKind, { title: string; body: string }> = {
  no_session: {
    title: "This link has expired, or it has already been used",
    body:
      "A password-reset link signs you in for a short while and works once. " +
      "There is no session behind this page, so nothing can be changed from " +
      "here — and nothing has been. Ask for a new link and open it from the " +
      "same device, as soon as it arrives.",
  },
  rejected_by_provider: {
    title: "The password was refused",
    body:
      "The request reached the authentication service and it declined this " +
      "password — usually because it is too short, too common, or the same as " +
      "the one already on the account. Your account is unchanged. Choose a " +
      "different password and try again.",
  },
  transport_unavailable: {
    title: "The request did not complete",
    body:
      "Nothing answered, so nothing was changed. This is a network or " +
      "transport failure and says nothing about your link or your password. " +
      "Retrying is reasonable.",
  },
  session_unverifiable: {
    title: "We could not check whether you are signed in",
    body:
      "The session lookup itself failed, which is not the same as being " +
      "signed out — so this page will not claim your link is dead. Reload the " +
      "page. If it keeps happening, ask for a new link.",
  },
};

function Notice({ kind, detail }: { kind: NoticeKind; detail?: string }) {
  const notice = NOTICES[kind];

  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5"
    >
      <p className="text-sm font-medium text-red-300">{notice.title}</p>
      <p className="mt-1 text-xs text-muted">{notice.body}</p>
      {detail ? (
        <p className="mt-2 break-words font-mono text-[11px] text-muted">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The rules, and where their authority actually lives.
 *
 * Measured 2026-08-08, read-only through the Supabase Management API: the
 * project enforces `password_min_length: 6` and
 * `password_required_characters: null`. **That setting is the authority on what
 * is refused**, and this file cannot change it.
 *
 * These rules are deliberately *stricter* than the project setting, and they
 * are the same four `src/app/(auth)/register/page.tsx:8-22` applies at sign-up.
 * Stricter is the safe direction: the provider will never refuse something this
 * form accepted on length, so the copy below cannot promise something Supabase
 * then declines. Looser would produce exactly that — a `rejected_by_provider`
 * with no explanation the person could have acted on.
 *
 * They are a second copy of the register rules, and that is a known cost: the
 * shared home for them would be a new module, and this plan's file list is
 * four files in a phase whose later waves touch two of them. If a third caller
 * appears, extract all three at once rather than adding a fourth copy.
 */
function validatePassword(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
}

const passwordRules = [
  { key: "minLength" as const, label: "8+ characters" },
  { key: "hasUppercase" as const, label: "One uppercase letter" },
  { key: "hasNumber" as const, label: "One number" },
  { key: "hasSpecial" as const, label: "One special character (!@#$...)" },
];

export default function SetPasswordForm() {
  const [gate, setGate] = useState<SessionGate>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [providerCode, setProviderCode] = useState<string | null>(null);

  // The session probe. `getSession()` and not `getUser()`: the authoritative
  // answer to "may this session set a password" is given by Supabase Auth on
  // the write itself, so this probe is UX — it decides what the person is told
  // before they type, never what they are allowed to do. A probe that failed to
  // reach the network must therefore NOT be drawn as "your link is dead": that
  // is a different sentence with a different next action, so it gets its own
  // state rather than collapsing into `absent`.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error) {
          console.error(
            `[set-password.session_probe_failed] code=${error.code ?? "none"} ` +
              `message=${error.message}`
          );
          setGate("unverifiable");
          return;
        }

        setGate(data.session ? "present" : "absent");
      } catch (err) {
        if (cancelled) return;
        console.error(
          "[set-password.session_probe_threw] the session lookup threw before " +
            "answering: " +
            (err instanceof Error ? err.message : "unknown")
        );
        setGate("unverifiable");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const rules = validatePassword(password);
  const isPasswordValid = Object.values(rules).every(Boolean);
  const matches = password.length > 0 && password === confirmation;
  const canSubmit = isPasswordValid && matches && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setOutcome(null);
    setProviderCode(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (!error) {
        setOutcome("ok");
        // The fields are cleared on success so no password value survives in
        // component state a moment longer than the request that used it.
        setPassword("");
        setConfirmation("");
        return;
      }

      // `AuthSessionMissingError` carries no `code`; it is identified by its
      // class name, which is what the package's own predicate compares. Never
      // the message.
      const missingSession = error.name === "AuthSessionMissingError";

      // Only `code` and `message` are logged, never the error object. The
      // habit is worth keeping even here, where the object is an auth error
      // with no `details`: phase 43's measurement of 2026-08-08 found that a
      // refused write on `public.profiles` returns the ENTIRE failing row in
      // `error.details` — membership code and address included — so
      // `console.error("...", error)` is a shape this codebase does not use.
      console.error(
        `[set-password.${missingSession ? "no_session" : "rejected_by_provider"}] ` +
          `code=${error.code ?? "none"} status=${error.status ?? "none"} ` +
          `message=${error.message}`
      );

      setProviderCode(error.code ?? null);
      setOutcome(missingSession ? "no_session" : "rejected_by_provider");
    } catch (err) {
      // The call never returned, so there is no tag to read — the third case
      // `FailureNotice.tsx` names.
      console.error(
        "[set-password.transport_unavailable] updateUser did not return: " +
          (err instanceof Error ? err.message : "unknown")
      );
      setOutcome("transport_unavailable");
    } finally {
      setSubmitting(false);
    }
  }

  if (outcome === "ok") {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
        <p className="text-sm font-medium text-green-400">
          Your password is set.
        </p>
        <p className="mt-1 text-xs text-muted">
          You are signed in on this device. Use this password the next time you
          sign in — it is not stored anywhere you can read it back, so if you
          forget it you will need a new link.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 active:opacity-80"
        >
          Go to your dashboard
        </Link>
      </div>
    );
  }

  if (gate === "checking") {
    return (
      <p className="text-sm text-muted" aria-live="polite">
        Checking your link…
      </p>
    );
  }

  // A person who followed a link out of their inbox and lands on a bare login
  // form has been told nothing. They get the reason and a way back instead.
  if (gate === "absent") {
    return (
      <div className="space-y-4">
        <Notice kind="no_session" />
        <p className="text-sm text-muted">
          Sign in and use{" "}
          <span className="text-foreground">Reset Password</span> on your
          dashboard to send yourself a fresh link.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-full border border-card-border px-5 py-2 text-sm font-medium text-muted transition-all hover:text-foreground active:scale-95 active:opacity-80"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (gate === "unverifiable") {
    return (
      <div className="space-y-4">
        <Notice kind="session_unverifiable" />
        <Link
          href="/login"
          className="inline-block rounded-full border border-card-border px-5 py-2 text-sm font-medium text-muted transition-all hover:text-foreground active:scale-95 active:opacity-80"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          aria-label="New password"
          className="h-12 w-full rounded-xl border border-card-border bg-card px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        {password.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {passwordRules.map(({ key, label }) => (
              <p
                key={key}
                className={`text-xs ${rules[key] ? "text-green-500" : "text-muted"}`}
              >
                {rules[key] ? "\u2713" : "\u2022"} {label}
              </p>
            ))}
          </div>
        )}
      </div>

      <div>
        <input
          type="password"
          placeholder="Repeat the password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          aria-label="Repeat the password"
          className="h-12 w-full rounded-xl border border-card-border bg-card px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        {confirmation.length > 0 && !matches && (
          <p className="mt-2 text-xs text-accent">
            The two entries do not match yet.
          </p>
        )}
      </div>

      {/* `outcome` is already narrowed to the three failures here: the `"ok"`
          branch returned above. */}
      {outcome && (
        <Notice
          kind={outcome}
          detail={
            outcome === "rejected_by_provider" && providerCode
              ? `provider code: ${providerCode}`
              : undefined
          }
        />
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="h-12 rounded-full bg-accent font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Setting your password…" : "Set password"}
      </button>
    </form>
  );
}
