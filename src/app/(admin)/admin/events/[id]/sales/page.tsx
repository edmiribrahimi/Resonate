import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import MobileNav from "@/components/layout/MobileNav";
import SalesDashboard from "@/components/events/SalesDashboard";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminSalesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  // Defense in depth: verify master access
  if (role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch event (no ownership check -- master sees all)
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/admin/events");
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

  const serviceClient = getServiceClient();

  // Fetch buyers with profile and tier joins (using service client to avoid RLS/FK issues)
  const { data: rawBuyers } = await serviceClient
    .from("tickets")
    .select(
      "id, amount_paid, created_at, tier_id, ticket_type, user_id, discount_code_id, profiles(full_name, email), ticket_tiers(name)"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  // Fetch discount codes used in this event
  const discountCodeIds = [
    ...new Set(
      (rawBuyers ?? [])
        .map((b) => (b as { discount_code_id?: string }).discount_code_id)
        .filter(Boolean)
    ),
  ] as string[];

  let discountCodeMap = new Map<string, string>();
  let discountSummaryData: {
    code: string;
    uses: number;
    discount_type: "percentage" | "fixed";
    discount_amount: number;
  }[] = [];

  if (discountCodeIds.length > 0) {
    const { data: codes } = await supabase
      .from("discount_codes")
      .select("id, code, discount_type, discount_amount")
      .in("id", discountCodeIds);

    for (const c of codes ?? []) {
      discountCodeMap.set(c.id, c.code);
    }

    // Build discount summary
    const useCounts = new Map<string, number>();
    for (const b of rawBuyers ?? []) {
      const dcId = (b as { discount_code_id?: string }).discount_code_id;
      if (dcId) {
        useCounts.set(dcId, (useCounts.get(dcId) ?? 0) + 1);
      }
    }

    discountSummaryData = (codes ?? []).map((c) => ({
      code: c.code,
      uses: useCounts.get(c.id) ?? 0,
      discount_type: c.discount_type as "percentage" | "fixed",
      discount_amount: c.discount_amount,
    }));
  }

  const buyers = (rawBuyers ?? []).map((b) => {
    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    const tier = Array.isArray(b.ticket_tiers)
      ? b.ticket_tiers[0]
      : b.ticket_tiers;
    const ticketType = (b as { ticket_type?: string }).ticket_type;
    const dcId = (b as { discount_code_id?: string }).discount_code_id;
    return {
      id: b.id,
      memberName: (profile as { full_name?: string })?.full_name ?? "Unknown",
      memberEmail: (profile as { email?: string })?.email ?? "",
      tierName:
        ticketType === "guest_list"
          ? "Guest List"
          : (tier as { name?: string })?.name ?? "Unknown",
      purchaseDate: b.created_at,
      discountCode: dcId ? discountCodeMap.get(dcId) ?? null : null,
    };
  });

  const totalRevenue = tierSalesData.reduce((sum, t) => sum + t.revenue, 0);
  const totalSold = tierSalesData.reduce((sum, t) => sum + t.sold, 0);

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/admin/events"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Events
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Sales</h1>
        <p className="text-sm text-muted">{event.title}</p>
      </header>

      <div className="px-6">
        <SalesDashboard
          eventTitle={event.title}
          tiers={tierSalesData}
          buyers={buyers}
          totalRevenue={totalRevenue}
          totalSold={totalSold}
          discountSummary={discountSummaryData}
        />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
