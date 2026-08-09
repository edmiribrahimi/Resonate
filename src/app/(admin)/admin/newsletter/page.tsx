import { redirect } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import StaffNav from "@/components/staff/StaffNav";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import type { UserRole, UserStatus } from "@/types/database";
import { getSubscriberStats } from "./actions";
import FailureNotice from "./FailureNotice";
import NewsletterClient from "./NewsletterClient";

/**
 * CR-01, fourth call site — the one the review credited with reaching the error
 * boundary, and which in fact did something worse.
 *
 * `getSubscriberStats()` was wrapped in a `try/catch` that rendered every cause
 * as *"Newsletter not configured — set RESEND_API_KEY and RESEND_AUDIENCE_ID"*.
 * A `capabilities.resolve_failed` — the database unable to answer who is asking
 * — therefore sent the operator to check two environment variables that were
 * never the problem. That is the recorded newsletter anti-pattern exactly
 * (`.planning/codebase/CONCERNS.md`): one message for unrelated causes.
 *
 * The two causes are now told apart before anything is drawn.
 *
 * ── The gate below is deliberately NOT wrapped ───────────────────────────────
 *
 * `getAccessContext()` throws on a resolve failure and nothing here catches it,
 * so the failure reaches Next's error boundary and the `console.error` line
 * beginning `[capabilities.resolve_failed]` is the diagnosis. Wrapping it would
 * refuse a master exactly the way it refuses a pending member — the defect this
 * page's own history is the recorded example of.
 *
 * One consequence, stated rather than discovered later: a resolve failure on
 * THIS page now stops at the gate, so `FailureNotice` no longer draws the
 * `resolve_failed` kind here. That kind is still reachable from the client
 * actions, which run after the gate has already passed.
 */
export default async function AdminNewsletterPage() {
  const { capabilities, role, status } = await getAccessContext();

  // The SAME question the middleware asks for `/admin/*`, of the same
  // authority, instead of a role read out of a request header. Never a role
  // list: a fourth role arrives in phase 34.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // The nav components are typed to the `UserRole` / `UserStatus` unions; the
  // resolver answers `string | null`. Same cast the header read already made,
  // from a better source. Phase 34 (STAFF-03) owns these props.
  const navRole = role as UserRole | null;
  const navStatus = status as UserStatus | null;

  const statsResult = await getSubscriberStats();
  const stats = statsResult.ok ? statsResult.data : null;

  return (
    <div className="min-h-dvh pb-24">
      <div className="px-6 pt-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Admin</h1>
      </div>
      <StaffNav capabilities={[...capabilities]} />

      <div className="px-6">
        {!statsResult.ok ? (
          <div className="mb-6">
            <FailureNotice
              kind={statsResult.failure}
              detail={statsResult.detail}
            />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-6 rounded-2xl border border-card-border bg-card p-6">
              <p className="text-sm text-muted">Total Subscribers</p>
              <p className="text-3xl font-bold tracking-tight">
                {stats?.total ?? 0}
              </p>
            </div>

            <NewsletterClient />
          </>
        )}
      </div>

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
