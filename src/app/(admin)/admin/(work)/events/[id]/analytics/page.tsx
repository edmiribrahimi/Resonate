import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import { FOCUS_RING } from "@/components/ui/Button";
import RevenueCard from "@/components/analytics/RevenueCard";
import AttendanceCard from "@/components/analytics/AttendanceCard";
import TokenLifecycleCard from "@/components/analytics/TokenLifecycleCard";
import TicketVelocityChart from "@/components/analytics/TicketVelocityChart";
import DrinkSalesBreakdown from "@/components/analytics/DrinkSalesBreakdown";
import DrinkPopularityChart from "@/components/analytics/DrinkPopularityChart";
import MarketInsightsCard from "@/components/analytics/MarketInsightsCard";
import PurchaseFunnelChart from "@/components/analytics/PurchaseFunnelChart";
import {
  fetchEventRevenue,
  fetchDailyVelocity,
  fetchDrinkSales,
  fetchAttendanceRate,
  fetchTokenLifecycle,
  fetchMarketInsights,
  fetchPurchaseFunnel,
} from "@/lib/analytics/event-queries";

/**
 * The analytics of one event — the collapsed surface.
 *
 * ── The one drift that could not be merged flat ──────────────────────────────
 *
 * The `/admin` version drew **two panels the organizer version did not**: Drink
 * Popularity and Purchase Funnel. Merging them in unconditionally would show
 * both to an organizer, who has never been able to open this address —
 * `/admin/*` was judged by `admin.access`, granted to the master alone
 * (`20260807000000_capability_model.sql:405`) — and no grant row says an
 * organizer may see them. That is a widening, and **D-34-06 forbids widening a
 * behaviour to make a collapse pass**.
 *
 * Deleting them instead would take a working view away from a master for no
 * reason. So they are drawn **behind the grant that already decided them**:
 * `admin.access`, which is the exact key the `/admin` page asked before the
 * collapse. Verdict-identical for every role — a master saw them and still sees
 * them; an organizer did not and still does not — and no capability is granted,
 * revoked or re-scoped to achieve it.
 *
 * The funnel query is skipped, not just its panel hidden: an organizer pays no
 * round trip for a figure they will not be shown. `drinkSales` is fetched for
 * everyone because the Drink **Sales** breakdown, which both versions drew, uses
 * the same rows.
 */
export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header. `my_access_context()`
  // answers about `auth.uid()` inside the JWT, so nothing a client can send
  // reaches the ownership decision below.
  const ctx = await getAccessContext();

  // Defense in depth, and it stays (D-34-09): `/admin/events/[id]/analytics` is
  // bound to `organizer.access` in `src/lib/routes/capability-routes.ts`, and
  // the middleware reads that same entry. Role only, status ignored.
  //
  // The nav mount and the two role/status narrowings are gone —
  // `admin/(work)/layout.tsx` resolves once and draws both navs (D-34-07).
  // Neither is named in prose, so the sweep grep stays runnable (plan 34-03).
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  // The master-only half of this surface, decided by an existing grant and
  // nothing else. See the file docblock.
  const seesMasterOnlyPanels = ctx.capabilities.has(CAP.ADMIN_ACCESS);

  const supabase = await createClient();

  // `created_by` is selected because the ownership check below needs it.
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/admin/events");
  }

  // Verify ownership — one call, never a re-inlined comparison. `ownsOrIsMaster`
  // answers master first (without reading the row), then refuses a null identity
  // and a row owned by nobody, and only then compares. Writing the inequality out
  // here would compare `null` against `null` on an unowned row and ADMIT — which
  // is why the expression is not spelled out even in this comment.
  //
  // Kept from the organizer twin as the more restrictive of the two behaviours
  // (D-34-06); the `/admin` twin had none. A master still passes through the
  // `master.manage` branch, so no verdict moved.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/admin/events");
  }

  // Fetch all analytics data in parallel
  const [revenue, velocity, drinkSales, attendance, lifecycle, marketInsights, purchaseFunnel] =
    await Promise.all([
      fetchEventRevenue(supabase, eventId),
      fetchDailyVelocity(supabase, eventId),
      fetchDrinkSales(supabase, eventId),
      fetchAttendanceRate(supabase, eventId),
      fetchTokenLifecycle(supabase, eventId),
      fetchMarketInsights(supabase, eventId),
      seesMasterOnlyPanels
        ? fetchPurchaseFunnel(supabase, eventId)
        : Promise.resolve(null),
    ]);

  return (
    // `wide`, and it is named on §4's CLOSED wide list rather than judged here:
    // the primary object of this surface is a table beside a multi-column grid.
    // Its placeholder next door declares the same width, because a placeholder
    // at a different maximum makes the content jump sideways the moment the data
    // lands — the defect a skeleton exists to prevent.
    <PageShell width="wide">
      <AnimatedSection>
        <header className="mb-6">
          {/* A label and a target both. It declares the 44px floor and carries
              the one focus expression — imported, never re-spelled. */}
          <Link
            href="/admin/events"
            className={`inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
          >
            &larr; Back to Events
          </Link>
          <PageTitle className="mt-2">Analytics</PageTitle>
          <p className="text-sm text-muted">{event.title}</p>
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <div className="space-y-6">
          {/* Revenue summary -- full width */}
          <RevenueCard revenue={revenue} />

          {/* Attendance + Token lifecycle.
              The breakpoint is MAPPED, not renamed (§2.3): the pair used to
              split at 640px, which puts the tablet layout on a phone held
              sideways and the phone layout on a portrait tablet. It splits at
              the portrait-tablet edge now. Two panels are a two-tier axis, so
              there is no middle step to gain — that belongs to the three-column
              grids, and inventing one here would be a tier this contract does
              not have. */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <AttendanceCard attendance={attendance} />
            <TokenLifecycleCard lifecycle={lifecycle} />
          </div>

          {/* Ticket velocity chart */}
          <Card>
            <SectionHeading>Ticket Sales</SectionHeading>
            <TicketVelocityChart data={velocity} />
          </Card>

          {/* Drink sales breakdown */}
          <Card>
            <SectionHeading>Drink Sales</SectionHeading>
            <DrinkSalesBreakdown drinks={drinkSales} />
          </Card>

          {/* Drink popularity ranking — `admin.access` only, see the docblock */}
          {seesMasterOnlyPanels && (
            <Card>
              <SectionHeading>Drink Popularity</SectionHeading>
              <DrinkPopularityChart drinks={drinkSales} />
            </Card>
          )}

          {/* Market insights */}
          <MarketInsightsCard insights={marketInsights} />

          {/* Purchase funnel — `admin.access` only, see the docblock */}
          {seesMasterOnlyPanels && purchaseFunnel && (
            <Card>
              <SectionHeading>Purchase Funnel</SectionHeading>
              <PurchaseFunnelChart data={purchaseFunnel} />
            </Card>
          )}
        </div>
      </AnimatedSection>
    </PageShell>
  );
}
