import { getServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecentActivityItem {
  type: "ticket" | "drink";
  userName: string;
  eventTitle: string;
  amount: number;
  createdAt: string;
}

export interface KPIDashboard {
  totalRevenue: number;
  totalMembers: number;
  upcomingEvents: number;
  recentActivity: RecentActivityItem[];
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Fetch top-level KPI dashboard data across all events.
 * Uses the service client to bypass RLS for cross-user aggregation.
 */
export async function fetchKPIDashboard(): Promise<KPIDashboard> {
  const supabase = getServiceClient();

  const todayISO = new Date().toISOString().split("T")[0];

  // 1. Aggregate KPI counts + revenue in parallel
  const [profilesResult, eventsResult, ticketsResult, drinkOrdersResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("date", todayISO)
        .eq("is_published", true),
      supabase.from("tickets").select("amount_paid"),
      supabase
        .from("drink_orders")
        .select("total_amount")
        .eq("status", "completed"),
    ]);

  const totalMembers = profilesResult.count ?? 0;
  const upcomingEvents = eventsResult.count ?? 0;

  const ticketRevenue = (ticketsResult.data ?? []).reduce(
    (sum, t) => sum + t.amount_paid,
    0
  );
  const drinkRevenue = (drinkOrdersResult.data ?? []).reduce(
    (sum, d) => sum + d.total_amount,
    0
  );
  const totalRevenue = ticketRevenue + drinkRevenue;

  // 2. Recent activity: latest 10 tickets + latest 10 drink orders, merge & take top 10
  const [recentTickets, recentDrinks] = await Promise.all([
    supabase
      .from("tickets")
      .select("amount_paid, created_at, profiles(full_name), events(title)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("drink_orders")
      .select("total_amount, created_at, profiles(full_name), events(title)")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const ticketActivities: RecentActivityItem[] = (
    recentTickets.data ?? []
  ).map((t) => ({
    type: "ticket" as const,
    userName:
      (t.profiles as unknown as { full_name: string } | null)?.full_name ??
      "Unknown",
    eventTitle:
      (t.events as unknown as { title: string } | null)?.title ?? "Unknown",
    amount: t.amount_paid,
    createdAt: t.created_at,
  }));

  const drinkActivities: RecentActivityItem[] = (
    recentDrinks.data ?? []
  ).map((d) => ({
    type: "drink" as const,
    userName:
      (d.profiles as unknown as { full_name: string } | null)?.full_name ??
      "Unknown",
    eventTitle:
      (d.events as unknown as { title: string } | null)?.title ?? "Unknown",
    amount: d.total_amount,
    createdAt: d.created_at,
  }));

  const recentActivity = [...ticketActivities, ...drinkActivities]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 10);

  return {
    totalRevenue,
    totalMembers,
    upcomingEvents,
    recentActivity,
  };
}
