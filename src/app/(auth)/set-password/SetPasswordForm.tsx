"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
 *
 * ── Converted by plan 41-06, and the conversion is colour, size and structure ─
 *
 * The five raw Tailwind palette colours became the declared semantics for their
 * meaning — a refusal is `--sem-crit`, a completion is `--sem-done` — and the
 * eleven legacy token names became the names they alias, which changes no pixel.
 * The two fields moved onto the control boundary and gained the focus ring they
 * did not have. The three pills that navigate became the button ladder's rung.
 *
 * **Not one of the four outcomes was merged, renamed or re-worded.** The four
 * notices above are the reason this file exists: they are the difference between
 * an expired link, a refused password, a dead network and an unverifiable
 * session, and each of them wants a different next action from the person
 * reading it. A visual phase that collapsed two of them because they now render
 * the same component would have undone the whole file while making it look
 * tidier — which is precisely the temptation a component extraction creates on a
 * surface whose branches *are* its property.
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
      className="rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-5"
    >
      <p className="text-sm font-semibold text-sem-crit">{notice.title}</p>
      <p className="mt-1 text-xs text-muted">{notice.body}</p>
      {detail ? (
        <p className="mt-2 break-words font-mono text-xs text-muted">
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

        // ── Il token dell'invito si spende QUI, non una tappa prima ──────────
        //
        // Un link d'invito arriva come `?token_hash=…&type=recovery`, e questa
        // e' la pagina che ha il campo della password. Prima il link passava da
        // `/auth/v1/verify` e depositava la sessione **nel frammento**, che non
        // viaggia verso il server: il callback non trovava `?code`, rimandava a
        // `/login?error=auth`, **e il token era gia' bruciato**. Chi riceveva un
        // invito non entrava, e il secondo clic non poteva funzionare.
        // Vedi `src/lib/auth/password-set-link.ts`.
        //
        // `verifyOtp` scambia il token per una sessione sul posto. Se fallisce
        // NON si finge che vada bene: il probe sotto direbbe `absent`, cioe'
        // «il tuo link e' morto», che e' la frase giusta solo per un token
        // scaduto o gia' speso — e infatti e' quella che si mostra.
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get("token_hash");
        const otpType = params.get("type");

        if (tokenHash && otpType === "recovery") {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });

          if (cancelled) return;

          if (verifyError) {
            // Categoria propria: un token speso o scaduto non e' la stessa cosa
            // di una rete che non risponde, e le due hanno azioni successive
            // diverse. Il token NON viene mai registrato.
            console.error(
              `[set-password.verify_otp_failed] code=${verifyError.code ?? "none"} ` +
                `message=${verifyError.message}`
            );
            setGate(verifyError.status && verifyError.status >= 500 ? "unverifiable" : "absent");
            return;
          }

          // L'indirizzo si ripulisce del token: resta nella cronologia del
          // browser, negli screenshot e in cio' che si incolla a qualcuno.
          window.history.replaceState({}, "", window.location.pathname);
        }

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

  // The form this replaces is gone from the page, so the outcome has to
  // announce itself: without a live region a screen-reader user submits and is
  // told nothing at all. `status` and not `alert` — this is the good ending,
  // and it does not interrupt.
  if (outcome === "ok") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-sem-done/30 bg-sem-done/10 p-5"
      >
        <p className="text-sm font-semibold text-sem-done">
          Your password is set.
        </p>
        <p className="mt-1 text-xs text-muted">
          You are signed in on this device. Use this password the next time you
          sign in — it is not stored anywhere you can read it back, so if you
          forget it you will need a new link.
        </p>
        <Button href="/dashboard" size="lg" variant="primary" className="mt-4">
          Go to your dashboard
        </Button>
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
          Sign in and use <span className="text-ink">Reset Password</span> on
          your dashboard to send yourself a fresh link.
        </p>
        <Button href="/login" size="lg" variant="secondary">
          Go to sign in
        </Button>
      </div>
    );
  }

  if (gate === "unverifiable") {
    return (
      <div className="space-y-4">
        <Notice kind="session_unverifiable" />
        <Button href="/login" size="lg" variant="secondary">
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Input
          id="set-password-new"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          aria-label="New password"
        />
        {/* A rule that is met is a state signal, and a state signal is text plus
            a semantic ink — never the accent, which is reserved for the primary
            fill, the active navigation entry, a link in prose and the lineup
            pills. The tick and the bullet stay: colour is not the only channel. */}
        {password.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {passwordRules.map(({ key, label }) => (
              <p
                key={key}
                className={`text-xs ${rules[key] ? "text-sem-done" : "text-muted"}`}
              >
                {rules[key] ? "\u2713" : "\u2022"} {label}
              </p>
            ))}
          </div>
        )}
      </div>

      <div>
        <Input
          id="set-password-confirmation"
          type="password"
          placeholder="Repeat the password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          aria-label="Repeat the password"
        />
        {confirmation.length > 0 && !matches && (
          <p className="mt-2 text-xs text-sem-crit">
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

      <Button
        type="submit"
        size="lg"
        variant="primary"
        disabled={!canSubmit}
        className="w-full disabled:cursor-not-allowed"
      >
        {submitting ? "Setting your password…" : "Set password"}
      </Button>
    </form>
  );
}
