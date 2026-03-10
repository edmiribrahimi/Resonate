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

  // 2. Recent activity: latest 10 tickets + latest 10 drink orders (no profiles join - ambiguous FK)
  const [recentTickets, recentDrinks] = await Promise.all([
    supabase
      .from("tickets")
      .select("amount_paid, created_at, user_id, event_id")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("drink_orders")
      .select("total_amount, created_at, user_id, event_id")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Fetch profiles and events separately
  const allUserIds = [
    ...new Set([
      ...(recentTickets.data ?? []).map((t) => t.user_id),
      ...(recentDrinks.data ?? []).map((d) => d.user_id),
    ].filter(Boolean)),
  ] as string[];

  const allEventIds = [
    ...new Set([
      ...(recentTickets.data ?? []).map((t) => t.event_id),
      ...(recentDrinks.data ?? []).map((d) => d.event_id),
    ].filter(Boolean)),
  ] as string[];

  const profileMap = new Map<string, string>();
  const eventMap = new Map<string, string>();

  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", allUserIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.full_name ?? "Unknown");
    }
  }

  if (allEventIds.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .in("id", allEventIds);
    for (const e of events ?? []) {
      eventMap.set(e.id, e.title);
    }
  }

  const ticketActivities: RecentActivityItem[] = (
    recentTickets.data ?? []
  ).map((t) => ({
    type: "ticket" as const,
    userName: profileMap.get(t.user_id as string) ?? "Unknown",
    eventTitle: eventMap.get(t.event_id as string) ?? "Unknown",
    amount: t.amount_paid,
    createdAt: t.created_at,
  }));

  const drinkActivities: RecentActivityItem[] = (
    recentDrinks.data ?? []
  ).map((d) => ({
    type: "drink" as const,
    userName: profileMap.get(d.user_id as string) ?? "Unknown",
    eventTitle: eventMap.get(d.event_id as string) ?? "Unknown",
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
