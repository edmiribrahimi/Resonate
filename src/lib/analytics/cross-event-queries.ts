import { getServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemberSpendProfile {
  userId: string;
  fullName: string;
  email: string;
  ticketSpend: number;
  drinkSpend: number;
  totalSpend: number;
  eventsAttended: number;
}

export interface RepeatAttendeeData {
  totalMembers: number;
  repeatMembers: number;
  repeatRate: number;
}

export interface ReferralChain {
  referrerId: string;
  referrerName: string;
  referredCount: number;
  referredMembers: { name: string; totalSpend: number }[];
  totalChainSpend: number;
}

export interface GuestConversionData {
  totalConversions: number;
  totalGuestOrders: number;
  convertedSpend: number;
}

// ---------------------------------------------------------------------------
// Query functions (all use service client to bypass RLS)
// ---------------------------------------------------------------------------

/**
 * Fetch top member spenders ranked by total cross-event spend (tickets + drinks).
 */
export async function fetchMemberSpendProfiles(
  limit = 20
): Promise<MemberSpendProfile[]> {
  const supabase = getServiceClient();

  const [profilesResult, ticketsResult, drinkOrdersResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("tickets").select("user_id, amount_paid, event_id"),
    supabase
      .from("drink_orders")
      .select("user_id, total_amount, refunded_amount")
      .eq("status", "completed"),
  ]);

  const profiles = profilesResult.data ?? [];
  const tickets = ticketsResult.data ?? [];
  const drinkOrders = drinkOrdersResult.data ?? [];

  // Build spend map: userId -> { tickets, drinks, events Set }
  const spendMap = new Map<
    string,
    { tickets: number; drinks: number; events: Set<string> }
  >();

  for (const t of tickets) {
    if (!t.user_id) continue;
    const entry = spendMap.get(t.user_id) ?? {
      tickets: 0,
      drinks: 0,
      events: new Set<string>(),
    };
    entry.tickets += t.amount_paid;
    entry.events.add(t.event_id);
    spendMap.set(t.user_id, entry);
  }

  for (const d of drinkOrders) {
    if (!d.user_id) continue;
    const entry = spendMap.get(d.user_id) ?? {
      tickets: 0,
      drinks: 0,
      events: new Set<string>(),
    };
    entry.drinks += d.total_amount - d.refunded_amount;
    spendMap.set(d.user_id, entry);
  }

  // Join with profiles, sort by total spend desc
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const result: MemberSpendProfile[] = [];
  for (const [userId, spend] of spendMap) {
    const profile = profileMap.get(userId);
    if (!profile) continue;
    result.push({
      userId,
      fullName: profile.full_name ?? "Unknown",
      email: profile.email ?? "",
      ticketSpend: spend.tickets,
      drinkSpend: spend.drinks,
      totalSpend: spend.tickets + spend.drinks,
      eventsAttended: spend.events.size,
    });
  }

  result.sort((a, b) => b.totalSpend - a.totalSpend);
  return result.slice(0, limit);
}

/**
 * Fetch repeat attendee rate: members attending 2+ distinct events.
 */
export async function fetchRepeatAttendeeRate(): Promise<RepeatAttendeeData> {
  const supabase = getServiceClient();

  const { data: tickets } = await supabase
    .from("tickets")
    .select("user_id, event_id");

  const allTickets = tickets ?? [];

  // Group by user_id, count distinct event_ids
  const userEvents = new Map<string, Set<string>>();
  for (const t of allTickets) {
    if (!t.user_id) continue;
    const events = userEvents.get(t.user_id) ?? new Set<string>();
    events.add(t.event_id);
    userEvents.set(t.user_id, events);
  }

  const totalMembers = userEvents.size;
  let repeatMembers = 0;
  for (const events of userEvents.values()) {
    if (events.size >= 2) repeatMembers++;
  }

  const repeatRate =
    totalMembers > 0 ? Math.round((repeatMembers / totalMembers) * 100) : 0;

  return { totalMembers, repeatMembers, repeatRate };
}

/**
 * Fetch referral chain effectiveness: referrer -> referred members -> total spend.
 */
export async function fetchReferralChains(): Promise<ReferralChain[]> {
  const supabase = getServiceClient();

  const [profilesResult, ticketsResult, drinkOrdersResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, referred_by"),
    supabase.from("tickets").select("user_id, amount_paid"),
    supabase
      .from("drink_orders")
      .select("user_id, total_amount, refunded_amount")
      .eq("status", "completed"),
  ]);

  const profiles = profilesResult.data ?? [];
  const tickets = ticketsResult.data ?? [];
  const drinkOrders = drinkOrdersResult.data ?? [];

  // Build spend per user (tickets + net drinks)
  const userSpend = new Map<string, number>();
  for (const t of tickets) {
    if (!t.user_id) continue;
    userSpend.set(t.user_id, (userSpend.get(t.user_id) ?? 0) + t.amount_paid);
  }
  for (const d of drinkOrders) {
    if (!d.user_id) continue;
    userSpend.set(
      d.user_id,
      (userSpend.get(d.user_id) ?? 0) + (d.total_amount - d.refunded_amount)
    );
  }

  // Group profiles by referred_by (skip nulls = organic signups)
  const referrerMap = new Map<
    string,
    { name: string; totalSpend: number }[]
  >();
  for (const p of profiles) {
    if (!p.referred_by) continue;
    const referred = referrerMap.get(p.referred_by) ?? [];
    referred.push({
      name: p.full_name ?? "Unknown",
      totalSpend: userSpend.get(p.id) ?? 0,
    });
    referrerMap.set(p.referred_by, referred);
  }

  // Build referral chains
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const chains: ReferralChain[] = [];

  for (const [referrerId, referredMembers] of referrerMap) {
    const referrer = profileMap.get(referrerId);
    const totalChainSpend = referredMembers.reduce(
      (sum, m) => sum + m.totalSpend,
      0
    );
    chains.push({
      referrerId,
      referrerName: referrer?.full_name ?? "Unknown",
      referredCount: referredMembers.length,
      referredMembers: referredMembers.sort(
        (a, b) => b.totalSpend - a.totalSpend
      ),
      totalChainSpend,
    });
  }

  // Sort by totalChainSpend desc, return top 20
  chains.sort((a, b) => b.totalChainSpend - a.totalChainSpend);
  return chains.slice(0, 20);
}

/**
 * Fetch guest-to-member conversion: anonymous buyers who later registered.
 * Detection: drink_orders where user_id IS NOT NULL AND profiles.created_at > drink_orders.created_at
 */
export async function fetchGuestConversion(): Promise<GuestConversionData> {
  const supabase = getServiceClient();

  const [drinkOrdersResult, profilesResult] = await Promise.all([
    supabase
      .from("drink_orders")
      .select("user_id, total_amount, created_at")
      .eq("status", "completed")
      .not("user_id", "is", null),
    supabase.from("profiles").select("id, created_at"),
  ]);

  const drinkOrders = drinkOrdersResult.data ?? [];
  const profiles = profilesResult.data ?? [];

  const profileCreatedAt = new Map(
    profiles.map((p) => [p.id, new Date(p.created_at)])
  );

  const convertedUsers = new Set<string>();
  let totalGuestOrders = 0;
  let convertedSpend = 0;

  for (const order of drinkOrders) {
    if (!order.user_id) continue;
    const profileDate = profileCreatedAt.get(order.user_id);
    if (!profileDate) continue;

    const orderDate = new Date(order.created_at);
    // Order placed before user registered = was a guest who later converted
    if (profileDate > orderDate) {
      convertedUsers.add(order.user_id);
      totalGuestOrders++;
      convertedSpend += order.total_amount;
    }
  }

  return {
    totalConversions: convertedUsers.size,
    totalGuestOrders,
    convertedSpend,
  };
}
