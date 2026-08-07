import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import TierCard from "@/components/tickets/TierCard";
import AddTierForm from "@/components/tickets/AddTierForm";
import AddDiscountCodeForm from "@/components/tickets/AddDiscountCodeForm";
import DiscountCodeCard from "@/components/tickets/DiscountCodeCard";
import RefundActions from "./RefundActions";
import type { UserRole, UserStatus } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketTiersPage({ params }: PageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  // `MobileNav` is a `"use client"` component that still takes role and status as
  // props; phase 34 (STAFF-03) converts it. No decision on this page reads them.
  const navRole = ctx.role as UserRole | null;
  const navStatus = ctx.status as UserStatus | null;

  // Defense in depth: may this person reach the organizer area at all.
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Verify event ownership. This page differs from its six siblings: the
  // ownership row is fetched **only** when it is needed, so a master pays no
  // round trip. That is preserved deliberately — asking `ownsOrIsMaster`
  // unconditionally would be correct and would add a Supabase read for every
  // master on every visit, changing no verdict. The whole reason the guard's
  // first line is the master branch is so a caller can skip the read.
  //
  // `MASTER_MANAGE` and not `ADMIN_ACCESS`: the question is "may this person
  // manage an event they do not own" — the reserved-operation question
  // (`keys.ts:55`). This is not the admin area.
  if (!ctx.capabilities.has(CAP.MASTER_MANAGE)) {
    const { data: event, error } = await supabase
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
      redirect("/organizer/events");
    }

    // "There is no such row" — distinct from both of the others.
    if (!event) {
      redirect("/organizer/events");
    }

    // "You may not" — the one call, never a re-inlined comparison. Inside this
    // branch the master line can only be false, so what it decides here is the
    // identity refusal, the unowned-row refusal, and then the comparison.
    if (!ownsOrIsMaster(ctx, event.created_by)) {
      redirect("/organizer/events");
    }
  }

  // Fetch event for title display
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (!event) {
    redirect("/organizer/events");
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

  // Fetch all tiers for this event
  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  // For each tier, fetch sold count
  const tiersWithSold = await Promise.all(
    (tiers ?? []).map(async (tier) => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("tier_id", tier.id);

      return { ...tier, sold: count ?? 0 };
    })
  );

  // Separate event-level tiers (party_id IS NULL) and party-specific tiers
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

  // Compute usage counts for each discount code
  const discountCodesWithUsage = await Promise.all(
    (discountCodes ?? []).map(async (dc) => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("discount_code_id", dc.id);

      // Get tier names for restricted codes
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

  // Group discount codes by party
  const discountsByParty = new Map<string, typeof discountCodesWithUsage>();
  for (const dc of discountCodesWithUsage) {
    if (!discountsByParty.has(dc.party_id)) {
      discountsByParty.set(dc.party_id, []);
    }
    discountsByParty.get(dc.party_id)!.push(dc);
  }

  // Fetch sold tickets for this event
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: soldTickets } = await serviceClient
    .from("tickets")
    .select("id, user_id, amount_paid, tier_id, party_id, created_at, profiles(full_name, email), ticket_tiers(name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  // Fetch pending refund requests for this event's tickets
  const ticketIds = (soldTickets ?? []).map((t: { id: string }) => t.id);
  let pendingRefunds: { id: string; ticket_id: string; reason: string | null; amount: number; created_at: string; status: string; requested_by: string }[] = [];
  if (ticketIds.length > 0) {
    const { data } = await serviceClient
      .from("ticket_refunds")
      .select("id, ticket_id, reason, amount, created_at, status, requested_by")
      .in("ticket_id", ticketIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    pendingRefunds = data ?? [];
  }

  // Map ticket id to buyer name for refund display
  const ticketBuyerMap = new Map<string, string>();
  for (const t of soldTickets ?? []) {
    const rawProfile = t.profiles as unknown;
    const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as { full_name: string; email: string } | null;
    ticketBuyerMap.set(t.id, profile?.full_name || profile?.email || "Unknown");
  }

  function formatPartyDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${WD[d.getDay()]} ${d.getDate()} ${M[d.getMonth()]}`;
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/organizer/events"
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">
          Ticket Tiers
        </h1>
        <p className="text-sm text-muted mt-1">{event.title}</p>
      </header>

      <div className="px-6 space-y-8">
        {/* Event Pass Tiers (event-level) -- only show when multiple parties exist */}
        {showEventPass && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Event Pass Tiers
            </h2>

            <AddTierForm eventId={eventId} partyId={null} />

            {eventLevelTiers.length === 0 ? (
              <div className="rounded-2xl border border-card-border bg-card p-6 text-center">
                <p className="text-muted text-sm">No event-level tiers yet. Add one to offer an all-access pass.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {eventLevelTiers.map((tier) => (
                  <TierCard key={tier.id} tier={tier} eventId={eventId} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Party-specific tiers */}
        {(parties ?? []).length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-8 text-center">
            <p className="text-muted">No paid sub-events for this event. Change a sub-event&apos;s access type to &quot;Paid&quot; to add ticket tiers.</p>
          </div>
        ) : (
          (parties ?? []).map((party: { id: string; title: string; date: string }) => {
            const partyTiers = tiersByParty.get(party.id) ?? [];

            return (
              <div key={party.id} className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {party.title} &middot; {formatPartyDate(party.date)}
                </h2>

                <AddTierForm eventId={eventId} partyId={party.id} />

                {partyTiers.length === 0 ? (
                  <div className="rounded-2xl border border-card-border bg-card p-6 text-center">
                    <p className="text-muted text-sm">No tiers yet for this sub-event.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {partyTiers.map((tier) => (
                      <TierCard key={tier.id} tier={tier} eventId={eventId} />
                    ))}
                  </div>
                )}

                {/* Discount Codes for this party */}
                <div className="mt-6 space-y-4">
                  <h3 className="text-base font-semibold text-foreground">
                    Discount Codes
                  </h3>
                  <AddDiscountCodeForm
                    eventId={eventId}
                    partyId={party.id}
                    tiers={(tiersByParty.get(party.id) ?? []).map((t) => ({
                      id: t.id,
                      name: t.name,
                    }))}
                  />
                  {(discountsByParty.get(party.id) ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-card-border bg-card p-6 text-center">
                      <p className="text-muted text-sm">
                        Nessun codice sconto per questo sub-event.
                      </p>
                    </div>
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
        {/* Pending Refund Requests */}
        {pendingRefunds.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Pending Refund Requests
            </h2>
            <div className="space-y-3">
              {pendingRefunds.map((refund) => (
                <div
                  key={refund.id}
                  className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">
                      {ticketBuyerMap.get(refund.ticket_id) || "Unknown"}
                    </p>
                    <p className="text-sm font-bold text-accent">
                      {formatPrice(refund.amount)}
                    </p>
                  </div>
                  {refund.reason && (
                    <p className="text-xs text-muted mb-3">
                      &ldquo;{refund.reason}&rdquo;
                    </p>
                  )}
                  <RefundActions refundId={refund.id} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sold Tickets */}
        {(soldTickets ?? []).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Sold Tickets ({(soldTickets ?? []).length})
            </h2>
            <div className="space-y-2">
              {(soldTickets ?? []).map((ticket: { id: string; amount_paid: number; created_at: string; profiles: unknown; ticket_tiers: unknown }) => {
                const rawProfile = ticket.profiles as unknown;
                const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as { full_name: string; email: string } | null;
                const rawTier = ticket.ticket_tiers as unknown;
                const tier = (Array.isArray(rawTier) ? rawTier[0] : rawTier) as { name: string } | null;
                return (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between rounded-xl border border-card-border bg-card p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {profile?.full_name || profile?.email || "Unknown"}
                      </p>
                      <p className="text-xs text-muted">
                        {tier?.name} &middot; {formatPrice(ticket.amount_paid)}
                      </p>
                    </div>
                    <RefundActions ticketId={ticket.id} isDirectRefund />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
