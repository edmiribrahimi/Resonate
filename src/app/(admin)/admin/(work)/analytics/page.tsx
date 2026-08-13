import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import AnimatedSection from "@/components/motion/AnimatedSection";
import KPIDashboard from "@/components/analytics/KPIDashboard";
import RecentActivityFeed from "@/components/analytics/RecentActivityFeed";
import { fetchKPIDashboard } from "@/lib/analytics/dashboard-queries";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * The two sub-surfaces this overview leads to.
 *
 * Written once and rendered twice, for the reason `EventList.tsx` states about
 * its own row of controls: a class string repeated per element is a string that
 * diverges per element, and the second copy is the one nobody re-reads.
 *
 * They are `<Link>` and not the button ladder's `href` branch. That branch
 * renders a bare anchor typed `string`, so an internal address reached through
 * it gets neither client navigation nor a build-time check that it exists —
 * D-41.1-26, named in `Chip.tsx`'s closing note. They are not chips either: a
 * chip is a pill among siblings, and these are cards.
 */
const SUB_SURFACES: readonly { href: Route; label: string; blurb: string }[] = [
  {
    href: "/admin/analytics/members",
    label: "Member Insights",
    blurb: "Growth trends and demographics",
  },
  {
    href: "/admin/analytics/compare",
    label: "Event Comparison",
    blurb: "Compare metrics across events",
  },
];

/**
 * The card contract, on an element the card primitive cannot be: a link.
 *
 * The three values are the primitive's own — the container radius, a line token
 * on the edge, the surface ground — and the padding is the 24px step, so this
 * box and `Card`'s box are the same box. The edge stays a **line** token rather
 * than a control boundary: the card's content already says where the card is,
 * and §5.2's control-boundary list names inputs, selects, checkboxes, switch
 * tracks and the secondary and ghost buttons, not a whole card that navigates.
 *
 * The hover cue used to be the accent. It is a line weight now: §5.1's
 * reserved-for list is a positive enumeration — the primary button fill, the
 * active navigation entry, a link inside prose, the lineup pills on an event
 * card — and a card edge on hover is not on it.
 *
 * The focus expression is imported, never re-spelled (§3.4). It was absent from
 * both of these links entirely, which on a keyboard is a card you can reach and
 * cannot see you have reached.
 *
 * **The 44px floor is NOT in this constant, and that is a measurement.** It is
 * written on the element below instead. Two lines of text at the 24px padding
 * cannot come out under 44px, so the minimum is inert today — §6.3 nonetheless
 * says every target is 44px *unconditionally*, and a height that is a
 * consequence of the current copy is one blurb-shortening away from not being
 * one.
 *
 * Where it is written matters. `verify-touch-targets.mjs` reads the element's
 * own class attribute and **cannot resolve an interpolated module constant** —
 * its own closing note says so in as many words, about a navigation entry it
 * still forgives. Measured here rather than assumed: with the floor inside this
 * string the gate reported this exact element as declaring no minimum, and it
 * was right to, because a reader of the element cannot see the floor either.
 * The gate was not widened to accept the constant; the element was fixed.
 */
const SUB_SURFACE_CARD =
  "group flex items-center justify-between gap-3 rounded-2xl " +
  "border border-line bg-surface p-6 transition-colors hover:border-line-strong";

export default async function AdminAnalyticsOverviewPage() {
  // `(work)/layout.tsx` already resolved this for the whole tree, and
  // `getAccessContext` is `cache()`-scoped per request: asking again costs no
  // second round trip. The page keeps its OWN guard (D-34-09) — the layout
  // resolves and draws, it does not admit.
  const { capabilities } = await getAccessContext();

  // Defense in depth behind the middleware — and now the SAME question the
  // middleware asks for `/admin/*`, of the same authority, instead of a role
  // read out of a request header. Never a role list: a fourth role arrives in
  // phase 34 and a capability question is fourth-role-safe by construction.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  const dashboard = await fetchKPIDashboard();

  // `wide` — `/admin/analytics` is named on §4's CLOSED wide list, and the
  // reason the list names it is the KPI grid: a multi-column grid is the one
  // genuinely three-tier axis in this product (§2.2) and the axis a wide screen
  // actually rewards. The shell owns the maximum, the gutter, the vertical
  // rhythm and the navigation clearance in both tiers; this page writes none of
  // them, and writes no maximum of its own.
  return (
    <PageShell width="wide">
      <AnimatedSection>
        <header className="mb-6">
          <PageTitle>Analytics</PageTitle>
          <p className="text-sm text-muted">Overview</p>
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <div className="space-y-6">
          <KPIDashboard
            totalRevenue={dashboard.totalRevenue}
            totalMembers={dashboard.totalMembers}
            upcomingEvents={dashboard.upcomingEvents}
          />

          {/* The way into the two sub-surfaces.
              The grid is a two-column axis, so it opens at the tablet boundary
              and stops there — §2.3's map sends a two-column rule to `md` and
              nowhere else. Three columns would be the axis that gains a middle
              step; two columns is already the middle step. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUB_SURFACES.map(({ href, label, blurb }) => (
              <Link
                key={label}
                href={href}
                className={`min-h-11 ${SUB_SURFACE_CARD} ${FOCUS_RING}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-2 group-hover:text-ink">
                    {label}
                  </p>
                  <p className="text-xs text-muted">{blurb}</p>
                </div>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-muted transition-colors group-hover:text-ink"
                >
                  &rarr;
                </span>
              </Link>
            ))}
          </div>

          <RecentActivityFeed activities={dashboard.recentActivity} />
        </div>
      </AnimatedSection>
    </PageShell>
  );
}
