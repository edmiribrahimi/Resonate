import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { mayManageEvent } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import TierCard from "@/components/tickets/TierCard";
import TierReorderList from "@/components/tickets/TierReorderList";
import AddTierForm from "@/components/tickets/AddTierForm";
import AddDiscountCodeForm from "@/components/tickets/AddDiscountCodeForm";
import DiscountCodeCard from "@/components/tickets/DiscountCodeCard";
import { FOCUS_RING } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";

/**
 * Manage tickets — the ticket tiers (per night and Event Pass) and the
 * discount codes of one event. It configures; it does not tell what was sold.
 *
 * ── DBT-17, 2026-10-01: «Manage tickets configura, Sales racconta» ───────────
 *
 * Until this date the page also carried three sections that report rather than
 * configure — the sold-ticket list (with a Refund button per ticket), the card
 * of orders that produced no tickets (with Retry issuing) and the card of paid
 * orders whose venue address never went out. They moved to
 * Sales (`(work)/events/[id]/sales/page.tsx`, rendered by
 * `src/app/(admin)/admin/events/[id]/sales/SalesSections.tsx`, read by
 * `sales-sections-data.ts` beside it), on the owner's decision D-52.1-22. The
 * Refund lived in two places — here and in `SalesDashboard`'s buyer table — and
 * two controls on the same charge drift; it now lives once, on Sales.
 *
 * **Nothing about the data changed in the move**: the same readers, the same
 * clients (the service role stayed the service role), the same
 * `mayManageEvent` guard on both pages. What this page no longer does is read
 * with the service role at all — buyer names, emails and orders were its only
 * service-role reads, and they left with the sections. Every read below is the
 * cookie client, under RLS, after the guard.
 *
 * The tier counts stay here: `TierCard` shows how many of a tier are sold,
 * which is configuration (is it sold out? raise the quantity?), not reporting.
 *
 * ── DBT-18, 2026-10-01: the order of the tiers is the managers' choice ───────
 *
 * Each list — one per night, and the Event Pass list apart — is wrapped in
 * `TierReorderList`, which adds a «Reorder» mode (D-52.1-23 D1–D7). The order
 * it saves is the one the reader above already applies (`sort_order, price,
 * created_at`, plan 52.1-08), and the public page reads the same chain. A
 * reorder sends positions only: no price, quantity or sale window moves.
 * `AddTierForm` stays outside the wrapper and a new tier lands at the tail.
 *
 * ── Which of the two versions decided each difference (D-34-05) ──────────────
 *
 * This page is the collapse of two former twins, `/admin` and `/organizer`.
 *
 *  - **The guard is `organizer.access`**, because that is the key
 *    `/admin/events/[id]/tickets` is bound to in
 *    `src/lib/routes/capability-routes.ts` — the same entry the middleware reads
 *    (D-34-09). Granted to `master` and `organizer`
 *    (`20260807000000_capability_model.sql:411-412`). An organizer holding
 *    `organizer.access` already opened this exact surface at
 *    `/organizer/events/[id]/tickets`, which now answers with a redirect here.
 *    The address collapsed; the entitlement did not move.
 *
 *  - **The ownership branch below came from the `/organizer` twin and is kept**,
 *    because it is the more restrictive of the two behaviours and D-34-06 forbids
 *    resolving a divergence towards *more* without a grant that already says so.
 *
 *  - **There is no master-only control on this surface**, and none was invented.
 *    `master.manage` appears exactly once, as the short-circuit that lets a
 *    master skip the ownership read — asked as `capabilities.has(CAP.MASTER_MANAGE)`
 *    and never as a role string.
 *
 * `actions.ts` (tiers, discount codes, Retry issuing) and the refund control
 * stay at `src/app/(admin)/admin/events/[id]/tickets/`, outside `(work)` —
 * R-WORK-ROUTES. Neither has a hunk in DBT-17's move beyond `retryFailedOrder`'s
 * revalidation, which now names Sales.
 *
 * ── Both navs are gone from this file ────────────────────────────────────────
 *
 * `admin/(work)/layout.tsx` resolves the access context once for the whole tree
 * and mounts `StaffNav` and `AppNav` (D-34-07). `getAccessContext` is
 * `cache()`-scoped per request, so the guard below costs no second round trip.
 * It **throws** `capabilities.resolve_failed` and is deliberately not wrapped:
 * an infrastructure fault dressed as a permission denial is a silent failure
 * with an alibi (D-34-08, state 3).
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketTiersPage({ params }: PageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  // Reachability. The middleware and this page give the same verdict because
  // they read the same entry — `/admin/events/[id]/tickets` is bound to
  // `organizer.access` in `src/lib/routes/capability-routes.ts` (D-34-09). A
  // page that stops asking is a page protected by a redirect alone, and
  // `access-gating.md` is explicit that a redirect is not a boundary.
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/account");
  }

  const supabase = await createClient();

  // Verify event ownership. Carried across from the `/organizer` twin unchanged
  // in structure, with only its two redirect destinations moved to the collapsed
  // address — the destination is the same page, one hop shorter.
  //
  // This page differs from its six siblings: the ownership row is fetched
  // **only** when it is needed, so a master pays no round trip. That is
  // preserved deliberately — asking `mayManageEvent` unconditionally would be
  // correct and would add a Supabase read for every master on every visit,
  // changing no verdict. The whole reason the guard's first line is the master
  // branch is so a caller can skip the read.
  //
  // `MASTER_MANAGE` and not `ADMIN_ACCESS`: the question is "may this person
  // manage an event they do not own" — the reserved-operation question
  // (`keys.ts:55`).
  if (!ctx.capabilities.has(CAP.MASTER_MANAGE)) {
    const { data: ownerRow, error } = await supabase
      .from("events")
      .select("created_by")
      .eq("id", eventId)
      .single();

    // "I could not find out" — kept as its own arm, on its own line. It shares a
    // destination with the refusal below today, and that is the point: separate
    // conditions can be given different destinations later, a collapsed one
    // cannot. The two causes are indistinguishable to the person redirected, and
    // this project has no error tracking, so the log line below is a diagnosis
    // aid and NOT an observable effect — saying otherwise would be the recorded
    // newsletter defect with a category attached (`meta-gates.md`).
    if (error) {
      console.error("tickets:ownership_lookup_failed", {
        eventId,
        code: error.code,
      });
      redirect("/admin/events");
    }

    // "There is no such row" — distinct from both of the others.
    if (!ownerRow) {
      redirect("/admin/events");
    }

    // "You may not" — the one call, never a re-inlined comparison. Inside this
    // branch the master line can only be false, so what it decides here is the
    // identity refusal, the unowned-row refusal, and then the comparison.
    if (!mayManageEvent(ctx, ownerRow.created_by)) {
      redirect("/admin/events");
    }
  }

  // Fetch event for title display
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (!event) {
    redirect("/admin/events");
  }

  // Count ALL parties for this event (to decide if event pass section is relevant)
  const { count: totalPartyCount } = await supabase
    .from("event_parties")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const showEventPass = (totalPartyCount ?? 0) > 1;

  // Fetch paid parties for this event
  const { data: parties } = await supabase
    .from("event_parties")
    .select("id, title, date, access_type")
    .eq("event_id", eventId)
    .eq("access_type", "paid")
    .order("sort_order", { ascending: true });

  // Fetch all tiers and group by party
  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select("*")
    .eq("event_id", eventId)
    // 2026-10-01 — DBT-18, D-52.1-23 D4 — un solo ordinamento in tutti i lettori:
    // la posizione decisa in admin, poi il prezzo, poi l'anzianita'.
    .order("sort_order", { ascending: true })
    .order("price", { ascending: true })
    .order("created_at", { ascending: true });

  const tiersWithSold = await Promise.all(
    (tiers ?? []).map(async (tier) => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("tier_id", tier.id);
      return { ...tier, sold: count ?? 0 };
    })
  );

  // Separate event-level tiers and party-specific tiers
  const eventLevelTiers = tiersWithSold.filter((t) => !t.party_id);
  const tiersByParty = new Map<string, typeof tiersWithSold>();
  for (const tier of tiersWithSold) {
    if (tier.party_id) {
      const partyId = tier.party_id as string;
      if (!tiersByParty.has(partyId)) {
        tiersByParty.set(partyId, []);
      }
      tiersByParty.get(partyId)!.push(tier);
    }
  }

  // Fetch discount codes for this event's paid parties
  const { data: discountCodes } = await supabase
    .from("discount_codes")
    .select("*, discount_code_tiers(tier_id)")
    .in("party_id", (parties ?? []).map((p) => p.id))
    .order("created_at", { ascending: true });

  const discountCodesWithUsage = await Promise.all(
    (discountCodes ?? []).map(async (dc) => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("discount_code_id", dc.id);

      const restrictedTierIds = (
        dc.discount_code_tiers ?? []
      ).map((t: { tier_id: string }) => t.tier_id);
      const tierNames = restrictedTierIds
        .map(
          (tid: string) => tiersWithSold.find((t) => t.id === tid)?.name
        )
        .filter(Boolean) as string[];

      return {
        id: dc.id,
        party_id: dc.party_id,
        code: dc.code,
        discount_type: dc.discount_type as "percentage" | "fixed",
        discount_amount: dc.discount_amount,
        max_uses: dc.max_uses,
        is_active: dc.is_active,
        used: count ?? 0,
        tier_names: tierNames,
      };
    })
  );

  const discountsByParty = new Map<string, typeof discountCodesWithUsage>();
  for (const dc of discountCodesWithUsage) {
    if (!discountsByParty.has(dc.party_id)) {
      discountsByParty.set(dc.party_id, []);
    }
    discountsByParty.get(dc.party_id)!.push(dc);
  }

  function formatPartyDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${WD[d.getDay()]} ${d.getDate()} ${M[d.getMonth()]}`;
  }

  return (
    <PageShell width="wide">
      <header className="mb-6">
        <Link
          href="/admin/events"
          className={`inline-flex min-h-11 items-center gap-1 text-xs text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
        >
          &larr; Back to Events
        </Link>
        <PageTitle className="mt-2">Ticket Tiers</PageTitle>
        <p className="text-sm text-muted mt-1">{event.title}</p>
      </header>

      <div className="space-y-8">
        {/* Event Pass Tiers -- only show when multiple parties exist */}
        {showEventPass && (
          <div className="space-y-4">
            <SectionHeading>Event Pass Tiers</SectionHeading>

            <AddTierForm eventId={eventId} partyId={null} />

            {eventLevelTiers.length === 0 ? (
              <Card className="text-center">
                <p className="text-muted text-sm">No event-level tiers yet. Add one to offer an all-access pass.</p>
              </Card>
            ) : (
              // DBT-18, D-52.1-23 D5 — the Event Pass list reorders on its own
              // (`partyId={null}`), never mixed with a night's tiers.
              <TierReorderList
                eventId={eventId}
                partyId={null}
                tiers={eventLevelTiers.map((t) => ({ id: t.id, name: t.name, price: t.price }))}
              >
                {eventLevelTiers.map((tier) => (
                  <TierCard key={tier.id} tier={tier} eventId={eventId} />
                ))}
              </TierReorderList>
            )}
          </div>
        )}

        {/* Party-specific tiers */}
        {(parties ?? []).length === 0 ? (
          <Card className="text-center">
            <p className="text-muted">No paid sub-events for this event. Change a sub-event&apos;s access type to &quot;Paid&quot; to add ticket tiers.</p>
          </Card>
        ) : (
          (parties ?? []).map((party: { id: string; title: string; date: string }) => {
            const partyTiers = tiersByParty.get(party.id) ?? [];

            return (
              <div key={party.id} className="space-y-4">
                <SectionHeading>
                  {party.title} &middot; {formatPartyDate(party.date)}
                </SectionHeading>

                <AddTierForm eventId={eventId} partyId={party.id} />

                {partyTiers.length === 0 ? (
                  <Card className="text-center">
                    <p className="text-muted text-sm">No tiers yet for this sub-event.</p>
                  </Card>
                ) : (
                  // DBT-18, D-52.1-23 D5 — one reorderable list per night; the
                  // add form above stays outside it and never hides.
                  <TierReorderList
                    eventId={eventId}
                    partyId={party.id}
                    tiers={partyTiers.map((t) => ({ id: t.id, name: t.name, price: t.price }))}
                  >
                    {partyTiers.map((tier) => (
                      <TierCard key={tier.id} tier={tier} eventId={eventId} />
                    ))}
                  </TierReorderList>
                )}

                {/* Discount Codes for this party */}
                <div className="mt-6 space-y-4">
                  <SectionHeading as="h3">Discount Codes</SectionHeading>
                  <AddDiscountCodeForm
                    eventId={eventId}
                    partyId={party.id}
                    tiers={(tiersByParty.get(party.id) ?? []).map((t) => ({
                      id: t.id,
                      name: t.name,
                    }))}
                  />
                  {(discountsByParty.get(party.id) ?? []).length === 0 ? (
                    <Card className="text-center">
                      <p className="text-muted text-sm">No discount codes for this sub-event.</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {(discountsByParty.get(party.id) ?? []).map((dc) => (
                        <DiscountCodeCard
                          key={dc.id}
                          discountCode={dc}
                          eventId={eventId}
                          tiers={(tiersByParty.get(party.id) ?? []).map((t) => ({
                            id: t.id,
                            name: t.name,
                          }))}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
