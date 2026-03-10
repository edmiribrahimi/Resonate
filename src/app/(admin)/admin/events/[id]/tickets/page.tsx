import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import MobileNav from "@/components/layout/MobileNav";
import TierCard from "@/components/tickets/TierCard";
import AddTierForm from "@/components/tickets/AddTierForm";
import RefundActions from "@/app/(organizer)/organizer/events/[id]/tickets/RefundActions";
import type { UserRole, UserStatus } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminTicketTiersPage({ params }: PageProps) {
  const { id: eventId } = await params;

  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  if (role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

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

  // Fetch sold tickets with buyer info
  const serviceClient = getServiceClient();
  const { data: soldTickets } = await serviceClient
    .from("tickets")
    .select("id, user_id, amount_paid, tier_id, created_at, profiles(full_name, email), ticket_tiers(name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  // Fetch pending refund requests
  const ticketIds = (soldTickets ?? []).map((t: { id: string }) => t.id);
  let pendingRefunds: { id: string; ticket_id: string; reason: string | null; amount: number; created_at: string }[] = [];
  if (ticketIds.length > 0) {
    const { data } = await serviceClient
      .from("ticket_refunds")
      .select("id, ticket_id, reason, amount, created_at")
      .in("ticket_id", ticketIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    pendingRefunds = data ?? [];
  }

  const ticketBuyerMap = new Map<string, string>();
  for (const t of soldTickets ?? []) {
    const rawProfile = t.profiles as unknown;
    const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as { full_name: string; email: string } | null;
    ticketBuyerMap.set(t.id, profile?.full_name || profile?.email || "Unknown");
  }

  function formatPartyDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/admin/events"
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Ticket Tiers</h1>
        <p className="text-sm text-muted mt-1">{event.title}</p>
      </header>

      <div className="px-6 space-y-8">
        {/* Event Pass Tiers -- only show when multiple parties exist */}
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
                    <p className="text-xs text-muted mb-3">&ldquo;{refund.reason}&rdquo;</p>
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

      <MobileNav role={role} status={status} />
    </div>
  );
}
