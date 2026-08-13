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
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";

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
 *
 * ── Converted by plan 41.1-06 ────────────────────────────────────────────────
 *
 * **Whole is FIVE files**, and the walk is the import closure rather than the
 * directory: this route file, plus the four co-located client modules one group
 * shallower — `NewsletterClient`, `ComposeForm`, `BroadcastList` and
 * `FailureNotice`. `actions.ts` is in the closure too and carries **zero**
 * class attributes, so it is reached and has nothing to convert; the `@/lib/**`
 * modules are the same. There is no `loading.tsx`, `error.tsx` or
 * `not-found.tsx` beside this route, so D-41.1-21's route-adjacent set is empty
 * here.
 *
 * This page mounts neither navigation form — `(work)/layout.tsx` does — so it
 * declares no column clearance, which is the side of check E's pairing that
 * applies to it (plan 41.1-05, D-41.1-01).
 *
 * No query changed, no column added, no capability check touched, no action
 * payload altered. The diff is class strings, JSX structure and imports.
 *
 * **One string is deliberately NOT converted: the page title still reads
 * `Admin`.** It is wrong — this is the newsletter surface, and every other
 * work page names itself — but a page title is copy, §11 introduces none, and
 * a visual plan that quietly renames a surface has made a product decision in
 * a styling commit. Carried forward in the plan's summary instead.
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
    /*
      `default` and not `wide`: §4's wide list is closed and does not name this
      route. That is not a fallback — it is the answer for every surface nobody
      had to argue about, and this surface is one figure, one form and one
      short history, none of which is a dense table.

      The shell owns the maximum, the gutter, the vertical rhythm and the
      navigation clearance in both tiers, so this page writes none of them.
    */
    <PageShell width="default">
      <header className="mb-6">
        <PageTitle>Admin</PageTitle>
      </header>

      {!statsResult.ok ? (
        <FailureNotice kind={statsResult.failure} detail={statsResult.detail} />
      ) : (
        <>
          {/*
            The subscriber count. §8.11 declines to make a KPI tile a component
            and hands it the card shell plus the data role for its figure —
            which is what this is. The figure is NOT in the display face: §7.1
            excludes every figure and count from it by name, and the weight
            drops from 700 to 600 because this system has two weights.
          */}
          <Card className="mb-6">
            <p className="text-sm text-muted">Total Subscribers</p>
            <p className="text-3xl font-semibold tracking-tight text-ink">
              {stats?.total ?? 0}
            </p>
          </Card>

          <NewsletterClient />
        </>
      )}
    </PageShell>
  );
}
