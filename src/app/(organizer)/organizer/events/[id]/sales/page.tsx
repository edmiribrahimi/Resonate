import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import SalesDashboard from "@/components/events/SalesDashboard";
import type { UserRole, UserStatus } from "@/types/database";

export default async function OrganizerSalesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const userId = headersList.get("x-user-id") || "";

  // Defense in depth: verify organizer or master access
  if (role !== "organizer" && role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/organizer/events");
  }

  // Verify ownership (organizer owns event OR user is master)
  if (role === "organizer" && event.created_by !== userId) {
    redirect("/organizer/events");
  }

  // Fetch tiers
  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select("id, name, price, quantity")
    .eq("event_id", eventId)
    .order("created_at");

  // Compute sold counts per tier
  const tierSalesData = await Promise.all(
    (tiers ?? []).map(async (tier) => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("tier_id", tier.id);

      const sold = count ?? 0;
      return {
        id: tier.id,
        name: tier.name,
        price: tier.price,
        quantity: tier.quantity,
        sold,
        revenue: sold * tier.price,
      };
    })
  );

  // Count guest list tickets separately
  const { count: guestListCount } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("ticket_type", "guest_list");

  // Fetch buyers with profile and tier joins
  const { data: rawBuyers } = await supabase
    .from("tickets")
    .select(
      "id, amount_paid, created_at, tier_id, ticket_type, user_id, profiles!user_id(full_name, email), ticket_tiers!tier_id(name)"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const buyers = (rawBuyers ?? []).map((b) => {
    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    const tier = Array.isArray(b.ticket_tiers)
      ? b.ticket_tiers[0]
      : b.ticket_tiers;
    const ticketType = (b as { ticket_type?: string }).ticket_type;
    return {
      id: b.id,
      memberName: (profile as { full_name?: string })?.full_name ?? "Unknown",
      memberEmail: (profile as { email?: string })?.email ?? "",
      tierName: ticketType === "guest_list"
        ? "Guest List"
        : (tier as { name?: string })?.name ?? "Unknown",
      purchaseDate: b.created_at,
    };
  });

  const totalRevenue = tierSalesData.reduce((sum, t) => sum + t.revenue, 0);
  const totalSold = tierSalesData.reduce((sum, t) => sum + t.sold, 0);
  const guestCount = guestListCount ?? 0;

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/organizer/events"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Events
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Sales</h1>
        <p className="text-sm text-muted">{event.title}</p>
      </header>

      <div className="px-6">
        {guestCount > 0 && (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-muted">Guest List</p>
            <p className="text-lg font-bold">{guestCount} free ticket{guestCount !== 1 ? "s" : ""}</p>
          </div>
        )}
        <SalesDashboard
          eventTitle={event.title}
          tiers={tierSalesData}
          buyers={buyers}
          totalRevenue={totalRevenue}
          totalSold={totalSold}
        />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
