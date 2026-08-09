import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
// Absolute, not relative, and that is the whole price of R-WORK-ROUTES.
//
// Only Next.js ROUTE files enter `(work)`; `actions.ts` and the four
// co-located client modules are not routes and stay at
// `admin/newsletter/`, one group shallower than this file. The rule exists for
// `finance/actions.ts`, which is imported from OUTSIDE its directory by
// `src/components/admin/{RefundDialog,TransactionList}.tsx` — moving it would
// have forced this plan to edit two components on the refund path that it does
// not own. The newsletter modules have no external importer today and follow
// the rule anyway: a rule with an exception is a rule the next reader has to
// re-measure. The one edit it costs is this, and it is inside a file this plan
// owns — which is the point.
import { getSubscriberStats } from "@/app/(admin)/admin/newsletter/actions";
import FailureNotice from "@/app/(admin)/admin/newsletter/FailureNotice";
import NewsletterClient from "@/app/(admin)/admin/newsletter/NewsletterClient";

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
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask is free. The page keeps its own guard (D-34-09).
  const { capabilities } = await getAccessContext();

  // The SAME question the middleware asks for `/admin/*`, of the same
  // authority, instead of a role read out of a request header. Never a role
  // list: a fourth role arrives in phase 34.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  const statsResult = await getSubscriberStats();
  const stats = statsResult.ok ? statsResult.data : null;

  return (
    <div className="min-h-dvh pb-24">
      <div className="px-6 pt-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Admin</h1>
      </div>

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
    </div>
  );
}
