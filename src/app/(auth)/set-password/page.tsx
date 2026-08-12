import SetPasswordForm from "./SetPasswordForm";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";

/**
 * Where a recovery link lands, and the only place in this product where a
 * password is chosen.
 *
 * Until this page existed the link had nowhere to go: `updateUser({ password })`
 * appeared nowhere in `src/`, the recovery link deposited an authenticated
 * person on `/dashboard` — which has no password field — and Reset Password
 * sent the same kind of link back to the same place. A loop (D-23).
 *
 * ── No capability gate here, deliberately ────────────────────────────────────
 *
 * Every other protected surface in this tree asks the capability model. This one
 * must not. The visitor is whoever the recovery link authenticated, and the
 * question this page answers — *may this session change its own password* — is
 * answered by Supabase Auth on the `updateUser` call itself, not by a role or a
 * status. A `pending` member locked out of their account has exactly as much
 * right to set a password as a master does.
 *
 * The corollary matters more than the rule: **the security boundary here is
 * Supabase Auth, not the middleware** (`access-gating.md`: the middleware is UX,
 * the boundary is elsewhere). `/set-password` is not in the middleware's
 * `protectedPrefixes`, and that is correct rather than an omission — a visitor
 * with no session reaches this page and is told so, instead of being bounced to
 * a login form that explains nothing. Nothing on this page reads or writes data;
 * the write goes straight to Auth with the caller's own token.
 *
 * `force-dynamic` for the reason `review/page.tsx` gives: the opt-out of caching
 * is otherwise implicit via cookies and easy to lose. A cached copy of this
 * page would be a cached copy of somebody's session state.
 *
 * ── Converted by plan 41-06, and only in appearance ──────────────────────────
 *
 * The shell, the page title and the type roles. **Nothing above this line moved**
 * — not the caching opt-out, not the absence of a capability gate, and not the
 * reasoning that says the boundary here is Supabase Auth. A visual conversion
 * does not get a vote on any of the three.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set your password",
};

export default function SetPasswordPage() {
  return (
    <PageShell width="focus">
      <PageTitle className="mb-2">Set your password</PageTitle>
      <p className="mb-8 text-sm text-muted">
        Choose a password for your re:sonate account. Only you will ever know it
        — nothing here is sent to us by email.
      </p>

      <SetPasswordForm />
    </PageShell>
  );
}
