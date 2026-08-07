import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import SalesDashboard from "@/components/events/SalesDashboard";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminSalesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  const {
    capabilities,
    role: rawRole,
    status: rawStatus,
  } = await getAccessContext();

  // Reachability, decided from the session rather than from a request header.
  //
  // This page reads every ticket for the event and then the `profiles` rows of
  // its buyers — names and email addresses — through `getServiceClient()`
  // (below), which bypasses every row-level policy. On that path THE CODE IS
  // THE ONLY BOUNDARY: there is no RLS behind a service-role read, so this line
  // is not defence in depth, it is the defence. It does NOT substitute for RLS
  // anywhere else; here there is no RLS to substitute for.
  //
  // What changed: the branch leading to that read used to be selected by a
  // value the client puts in a header. It is now selected by an answer Postgres
  // computed from the caller's own verified JWT. The service client itself is
  // unchanged — the `eventId` in these queries comes from the route segment and
  // reaches the service client exactly as it did before.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // role/status still flow to <MobileNav> as props: the source changed, the
  // consumer did not. Nothing here branches on them. Phase 34 (STAFF-03) owns
  // converting the nav to capabilities.
  const role = rawRole as UserRole | null;
  const status = rawStatus as UserStatus | null;

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

  // Fetch tickets (no profiles join - ambiguous FK through auth.users)
  const { data: rawBuyers } = await serviceClient
    .from("tickets")
    .select("id, amount_paid, created_at, tier_id, ticket_type, user_id, discount_code_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  // Fetch profiles separately
  const buyerUserIds = [...new Set((rawBuyers ?? []).map((b) => b.user_id).filter(Boolean))] as string[];
  const profileMap = new Map<string, { full_name: string; email: string }>();
  if (buyerUserIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", buyerUserIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name ?? "Unknown", email: p.email ?? "" });
    }
  }

  const tierMap = new Map<string, string>();
  for (const t of tiers ?? []) {
    tierMap.set(t.id, t.name);
  }

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
    const ticketType = (b as { ticket_type?: string }).ticket_type;
    const dcId = (b as { discount_code_id?: string }).discount_code_id;
    const profile = profileMap.get(b.user_id as string);
    return {
      id: b.id,
      memberName: profile?.full_name ?? "Unknown",
      memberEmail: profile?.email ?? "",
      tierName:
        ticketType === "guest_list"
          ? "Guest List"
          : tierMap.get(b.tier_id as string) ?? "Unknown",
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
