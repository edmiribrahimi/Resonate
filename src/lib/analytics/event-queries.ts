import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventRevenue {
  grossTickets: number;
  grossDrinks: number;
  netTickets: number;
  netDrinks: number;
  totalGross: number;
  totalNet: number;
}

export interface DailyVelocity {
  date: string;
  count: number;
}

export interface DrinkSalesItem {
  drinkName: string;
  quantity: number;
  revenue: number;
  redeemed: number;
  refunded: number;
}

export interface AttendanceRate {
  sold: number;
  checkedIn: number;
  rate: number;
}

export interface TokenLifecycle {
  total: number;
  redeemed: number;
  refunded: number;
  purchased: number;
  redeemedRate: number;
  wastedRate: number;
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Fetch gross and net revenue for tickets and drinks for a given event.
 * Net = gross minus approved refunds.
 */
export async function fetchEventRevenue(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventRevenue> {
  // Fetch ticket amounts, completed drink orders, and drink-token refunds in
  // parallel. Ticket refunds require a two-step lookup because the
  // ticket_refunds table references ticket_id, not event_id directly.
  const [ticketsResult, drinkOrdersResult, drinkRefundsResult] =
    await Promise.all([
      supabase.from("tickets").select("id, amount_paid").eq("event_id", eventId),
      supabase
        .from("drink_orders")
        .select("total_amount")
        .eq("event_id", eventId)
        .eq("status", "completed"),
      supabase
        .from("drink_tokens")
        .select("price")
        .eq("event_id", eventId)
        .eq("status", "refunded"),
    ]);

  const grossTickets = (ticketsResult.data ?? []).reduce(
    (s, t) => s + t.amount_paid,
    0
  );
  const grossDrinks = (drinkOrdersResult.data ?? []).reduce(
    (s, d) => s + d.total_amount,
    0
  );
  const drinkRefunds = (drinkRefundsResult.data ?? []).reduce(
    (s, t) => s + t.price,
    0
  );

  // Two-step ticket refunds: get ticket IDs for event, then get approved refunds
  const ticketIds = (ticketsResult.data ?? []).map((t) => t.id);
  let ticketRefundsTotal = 0;
  if (ticketIds.length > 0) {
    const { data: refunds } = await supabase
      .from("ticket_refunds")
      .select("amount")
      .in("ticket_id", ticketIds)
      .eq("status", "approved");
    ticketRefundsTotal = (refunds ?? []).reduce((s, r) => s + r.amount, 0);
  }

  const netTickets = grossTickets - ticketRefundsTotal;
  const netDrinks = grossDrinks - drinkRefunds;

  return {
    grossTickets,
    grossDrinks,
    netTickets,
    netDrinks,
    totalGross: grossTickets + grossDrinks,
    totalNet: netTickets + netDrinks,
  };
}

/**
 * Fetch daily ticket-sales counts for the velocity chart.
 */
export async function fetchDailyVelocity(
  supabase: SupabaseClient,
  eventId: string
): Promise<DailyVelocity[]> {
  const { data } = await supabase
    .from("tickets")
    .select("created_at")
    .eq("event_id", eventId)
    .order("created_at");

  const dailyCounts = new Map<string, number>();
  for (const ticket of data ?? []) {
    const day = ticket.created_at.split("T")[0];
    dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);
  }

  return Array.from(dailyCounts.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}

/**
 * Fetch per-drink breakdown: quantity, revenue, redeemed, refunded.
 */
export async function fetchDrinkSales(
  supabase: SupabaseClient,
  eventId: string
): Promise<DrinkSalesItem[]> {
  const { data: tokens } = await supabase
    .from("drink_tokens")
    .select("drink_name, price, status")
    .eq("event_id", eventId);

  const map = new Map<
    string,
    { quantity: number; revenue: number; redeemed: number; refunded: number }
  >();

  for (const t of tokens ?? []) {
    const entry = map.get(t.drink_name) ?? {
      quantity: 0,
      revenue: 0,
      redeemed: 0,
      refunded: 0,
    };
    entry.quantity += 1;
    entry.revenue += t.price;
    if (t.status === "redeemed") entry.redeemed += 1;
    if (t.status === "refunded") entry.refunded += 1;
    map.set(t.drink_name, entry);
  }

  return Array.from(map.entries())
    .map(([drinkName, stats]) => ({ drinkName, ...stats }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Fetch attendance rate: tickets sold vs checked-in.
 */
export async function fetchAttendanceRate(
  supabase: SupabaseClient,
  eventId: string
): Promise<AttendanceRate> {
  const [soldResult, checkedInResult] = await Promise.all([
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("checked_in", true),
  ]);

  const sold = soldResult.count ?? 0;
  const checkedIn = checkedInResult.count ?? 0;
  const rate = sold > 0 ? Math.round((checkedIn / sold) * 100) : 0;

  return { sold, checkedIn, rate };
}

/**
 * Fetch token lifecycle: purchased / redeemed / refunded counts and rates.
 */
export async function fetchTokenLifecycle(
  supabase: SupabaseClient,
  eventId: string
): Promise<TokenLifecycle> {
  const { data: tokens } = await supabase
    .from("drink_tokens")
    .select("status")
    .eq("event_id", eventId);

  const all = tokens ?? [];
  const total = all.length;
  const redeemed = all.filter((t) => t.status === "redeemed").length;
  const refunded = all.filter((t) => t.status === "refunded").length;
  const purchased = all.filter((t) => t.status === "purchased").length;

  return {
    total,
    redeemed,
    refunded,
    purchased,
    redeemedRate: total > 0 ? Math.round((redeemed / total) * 100) : 0,
    wastedRate: total > 0 ? Math.round((refunded / total) * 100) : 0,
  };
}
