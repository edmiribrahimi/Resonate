import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import TierCard from "@/components/tickets/TierCard";
import AddTierForm from "@/components/tickets/AddTierForm";
import type { UserRole, UserStatus } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketTiersPage({ params }: PageProps) {
  const { id: eventId } = await params;

  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const userId = headersList.get("x-user-id") || "";

  // Defense in depth: verify organizer or master access
  if (role !== "organizer" && role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Verify event ownership (organizer can only manage own events, master can manage all)
  if (role === "organizer") {
    const { data: event, error } = await supabase
      .from("events")
      .select("created_by")
      .eq("id", eventId)
      .single();

    if (error || !event || event.created_by !== userId) {
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

  // Fetch tiers for this event
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

      <div className="px-6 space-y-6">
        {/* Add Tier Form */}
        <AddTierForm eventId={eventId} />

        {/* Existing Tiers */}
        {tiersWithSold.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-8 text-center">
            <p className="text-muted">
              No tiers yet. Add your first ticket tier above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tiersWithSold.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                eventId={eventId}
              />
            ))}
          </div>
        )}
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
