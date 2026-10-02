import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { mayManageEvent } from "@/lib/capabilities/guards";
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
  fetchTicketFunnel,
  fetchCartReading,
  fetchTicketFunnelAcrossNights,
  CART_ENTRY_SOURCES,
  type TicketFunnel,
  type CartReading,
  type CartReadingNight,
  type CartReadingResult,
  type CartEntrySource,
} from "@/lib/analytics/event-queries";
import { getServiceClient } from "@/lib/supabase/service";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";

const SOURCE_LABELS: Record<CartEntrySource, string> = {
  instagram: "Instagram",
  newsletter: "newsletter",
  flyer: "flyer",
  direct: "direct",
  other: "other",
  unrecorded: "before tracking",
};

/**
 * The two underestimates, written next to the numbers they bend (plan 52.1-24):
 * a buyer whose browser refuses `sessionStorage` lands as `direct` even when a
 * marked link brought them, and a lost «opened» beacon leaves a cart in «form
 * never opened». And the third, of the mail: the morning check reads the
 * provider, so the newest mails count only after it has run.
 */
const CART_NOTES = [
  "Sources are underestimated: when the browser cannot keep the link's source for the session, the order counts as direct.",
  "«Opened» is underestimated: when the form's opened signal is lost on the way, the cart counts as form never opened.",
  "A resume mail counts as sent once the morning delivery check has read it from the provider.",
] as const;

/** A read that failed is a state of its own, never a panel of zeros. */
type TicketFunnelResult = { ok: true; funnel: TicketFunnel } | { ok: false };

const DEVICE_LABELS: Record<keyof TicketFunnel["byDevice"], string> = {
  mobile: "mobile",
  desktop: "desktop",
  unknown: "unknown",
  unrecorded: "before tracking",
};

const METHOD_LABELS: Record<keyof TicketFunnel["byMethod"], string> = {
  card: "card",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  other: "other",
  unrecorded: "before tracking",
};

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
    redirect("/account");
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

  // Verify ownership — one call, never a re-inlined comparison. `mayManageEvent`
  // answers master first (without reading the row), then refuses a null identity
  // and a row owned by nobody, and only then compares. Writing the inequality out
  // here would compare `null` against `null` on an unowned row and ADMIT — which
  // is why the expression is not spelled out even in this comment.
  //
  // Kept from the organizer twin as the more restrictive of the two behaviours
  // (D-34-06); the `/admin` twin had none. A master still passes through the
  // `master.manage` branch, so no verdict moved.
  if (!mayManageEvent(ctx, event.created_by)) {
    redirect("/admin/events");
  }

  // Fetch all analytics data in parallel
  //
  // The ticket checkout funnel (CART-01) is the ONE read on this page that uses
  // the service client, and the reason is RLS: `ticket_orders` has a single
  // policy, `ticket_orders_select_own`, so through the session client an
  // organizer would count their own orders — zero — and an empty funnel would
  // look true. The service client skips RLS, so the guard is the one above:
  // this line is reached only after `mayManageEvent(ctx, event.created_by)`
  // returned true, and only behind `seesMasterOnlyPanels`, like its drinks twin.
  // The read names four columns and no email or name (see `fetchTicketFunnel`).
  const [
    revenue,
    velocity,
    drinkSales,
    attendance,
    lifecycle,
    marketInsights,
    purchaseFunnel,
    ticketFunnel,
    cartReading,
    cartNights,
  ] = await Promise.all([
    fetchEventRevenue(supabase, eventId),
    fetchDailyVelocity(supabase, eventId),
    fetchDrinkSales(supabase, eventId),
    fetchAttendanceRate(supabase, eventId),
    fetchTokenLifecycle(supabase, eventId),
    fetchMarketInsights(supabase, eventId),
    seesMasterOnlyPanels
      ? fetchPurchaseFunnel(supabase, eventId)
      : Promise.resolve(null),
    seesMasterOnlyPanels
      ? // Inside `.then` so a missing service key surfaces as the panel's
        // error state too, not as a synchronous throw that takes the page down.
        Promise.resolve()
          .then(() => fetchTicketFunnel(getServiceClient(), eventId))
          .then(
          (funnel): TicketFunnelResult => ({ ok: true, funnel }),
          // A read error is already logged inside the query
          // (`[analytics.ticket_funnel_unreadable]`); this line also catches a
          // service client that could not be built. Either way it becomes a
          // visible state instead of taking the whole page down.
          (e: unknown): TicketFunnelResult => {
            console.error(
              `[analytics.ticket_funnel_panel_failed] event=${eventId} ${
                e instanceof Error ? e.message : "unknown"
              }`
            );
            return { ok: false };
          }
        )
      : Promise.resolve(null),
    // Where the carts stop and where they come from (DBT-15). Same guard as the
    // funnel above: reached only after `mayManageEvent` and behind
    // `admin.access`. A separate read so that a column production does not have
    // yet (before act 4) is «not available yet», never the funnel's failure.
    // Never rejects: its three outcomes are its result.
    seesMasterOnlyPanels
      ? fetchCartReading(getServiceClient, eventId)
      : Promise.resolve(null),
    seesMasterOnlyPanels
      ? fetchTicketFunnelAcrossNights(getServiceClient)
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

          {/* Ticket checkout funnel — `admin.access` only, counted from the
              database with the service client after `mayManageEvent` */}
          {seesMasterOnlyPanels && ticketFunnel && (
            <Card>
              <SectionHeading>Ticket checkout</SectionHeading>
              {ticketFunnel.ok ? (
                <TicketFunnelPanel funnel={ticketFunnel.funnel} />
              ) : (
                <p className="text-sm text-muted" role="status">
                  Could not read ticket checkouts
                </p>
              )}
              {cartReading && <CartReadingPanel result={cartReading} />}
            </Card>
          )}

          {/* All nights — the same cart reading for every night, behind the
              same `admin.access` guard; a section of this page, not a route. */}
          {seesMasterOnlyPanels && cartNights && (
            <Card>
              <SectionHeading>All nights</SectionHeading>
              <CartNightsSection result={cartNights} />
            </Card>
          )}
        </div>
      </AnimatedSection>
    </PageShell>
  );
}

/**
 * The ticket checkout numbers under the funnel. The abandonment rate carries
 * its base, and below ten checkouts it is not shown at all — a percentage on
 * nine orders is an anecdote. A paid-but-not-issued order is money, not an
 * abandoned cart, so it gets its own line and is never counted as abandonment.
 */
function TicketFunnelPanel({ funnel }: { funnel: TicketFunnel }) {
  const devices = (Object.keys(DEVICE_LABELS) as (keyof TicketFunnel["byDevice"])[])
    .filter((k) => funnel.byDevice[k].opened > 0)
    .map(
      (k) =>
        `${DEVICE_LABELS[k]} ${funnel.byDevice[k].opened}/${funnel.byDevice[k].paid}`
    );
  const methods = (Object.keys(METHOD_LABELS) as (keyof TicketFunnel["byMethod"])[])
    .filter((k) => funnel.byMethod[k] > 0)
    .map((k) => `${METHOD_LABELS[k]} ${funnel.byMethod[k]}`);

  return (
    <div className="space-y-3">
      <PurchaseFunnelChart data={funnel.steps} />
      <div className="space-y-1 text-sm text-muted">
        <p>
          {funnel.abandonmentPct === null
            ? `Abandonment: not shown below 10 checkouts — ${funnel.opened} so far`
            : `Abandonment: ${funnel.abandonmentPct}% of ${funnel.opened} checkouts`}
        </p>
        {funnel.paidNotIssued > 0 && (
          <p>
            {funnel.paidNotIssued} paid but not issued — see Orders without tickets
          </p>
        )}
        {devices.length > 0 && (
          <p>By device (opened/paid): {devices.join(" · ")}</p>
        )}
        {methods.length > 0 && <p>Paid with: {methods.join(" · ")}</p>}
      </div>
    </div>
  );
}

/** The two states that are not numbers, worded apart (meta-gates: no generic error). */
function CartUnavailable({ state }: { state: "not_available" | "error" }) {
  return (
    <p className="text-sm text-muted" role="status">
      {state === "not_available"
        ? "Entry source and stopping step: not available yet — this database does not record them yet"
        : "Could not read where carts stop"}
    </p>
  );
}

function mainSource(reading: CartReading): string {
  let best: CartEntrySource | null = null;
  for (const s of CART_ENTRY_SOURCES) {
    if (reading.bySource[s].opened === 0) continue;
    if (best === null || reading.bySource[s].opened > reading.bySource[best].opened) best = s;
  }
  return best === null ? "—" : SOURCE_LABELS[best];
}

function resumeSentLabel(reading: CartReading): string {
  return reading.resumeEmailsSent === null
    ? "could not read the mail register"
    : String(reading.resumeEmailsSent);
}

/**
 * Where this night's carts stop, where they come from, and what the resume mail
 * earned. No email, no name: every figure is a count. The notes on the two
 * underestimates sit under the numbers, not in a tooltip.
 */
function CartReadingPanel({ result }: { result: CartReadingResult<CartReading> }) {
  if (result.state !== "ok") {
    return (
      <div className="mt-4 border-t border-line pt-4">
        <CartUnavailable state={result.state} />
      </div>
    );
  }
  const r = result.data;
  const sources = CART_ENTRY_SOURCES.filter((s) => r.bySource[s].opened > 0).map(
    (s) => `${SOURCE_LABELS[s]} ${r.bySource[s].opened}/${r.bySource[s].paid}`
  );
  const lines: [string, string][] = [
    ["Form never opened", String(r.formNeverOpened)],
    ["Opened, not attempted", String(r.openedNotAttempted)],
    ["Attempted and declined", String(r.attemptedDeclined)],
    ["Before tracking (step not recorded)", String(r.beforeTracking)],
    ["Resume emails sent", resumeSentLabel(r)],
    ["Paid after the resume email", String(r.paidAfterResume)],
  ];
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm md:grid-cols-2">
        {lines.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted">{label}</dt>
            <dd className="font-mono text-ink-2">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-1 text-sm text-muted">
        <p>
          Of {r.opened} checkouts.
          {sources.length > 0 && ` By source (opened/paid): ${sources.join(" · ")}`}
        </p>
        {CART_NOTES.map((note) => (
          <p key={note} className="text-xs">
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}

const NIGHT_COLUMNS: readonly DataColumn<CartReadingNight>[] = [
  { key: "night", header: "Night", card: "title", cell: (n) => n.title },
  { key: "date", header: "Date", card: "subtitle", cell: (n) => n.date ?? "—" },
  { key: "opened", header: "Opened", figure: true, align: "end", cell: (n) => n.opened },
  { key: "paid", header: "Paid", figure: true, align: "end", cell: (n) => n.paid },
  {
    key: "never",
    header: "Form never opened",
    figure: true,
    align: "end",
    cell: (n) => n.formNeverOpened,
  },
  {
    key: "notAttempted",
    header: "Opened, not attempted",
    figure: true,
    align: "end",
    cell: (n) => n.openedNotAttempted,
  },
  {
    key: "declined",
    header: "Declined",
    figure: true,
    align: "end",
    cell: (n) => n.attemptedDeclined,
  },
  {
    key: "afterMail",
    header: "Paid after the resume email",
    figure: true,
    align: "end",
    cell: (n) => n.paidAfterResume,
  },
  { key: "source", header: "Main source", cell: (n) => mainSource(n) },
];

/** One row per night with checkouts, most recent first. Empty and error apart. */
function CartNightsSection({
  result,
}: {
  result: CartReadingResult<CartReadingNight[]>;
}) {
  if (result.state !== "ok") return <CartUnavailable state={result.state} />;
  return (
    <div className="space-y-3">
      <DataTable
        rows={result.data}
        columns={NIGHT_COLUMNS}
        rowKey={(n) => n.eventId}
        caption="Ticket checkouts per night: where carts stop and what the resume email earned"
        empty="No ticket checkouts on any night yet"
      />
      <div className="space-y-1 text-xs text-muted">
        {CART_NOTES.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
    </div>
  );
}
