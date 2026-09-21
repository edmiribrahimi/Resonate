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

/*
 * `ReferralChain` e `fetchReferralChains` stavano qui, e leggevano la colonna
 * del referral su `profiles` per costruire referente -> invitati -> spesa.
 *
 * Il referral e' uscito dal prodotto (D-50-08/REG-03) e la colonna dallo schema
 * (`20260921120000_drop_status_and_referral.sql`). **Questo modulo non e'
 * importato da nessuna superficie** — le pagine di analytics sono state tolte
 * dal proprietario il 2026-08-14 — quindi la lettura non si sarebbe rotta
 * davanti a nessuno: si sarebbe rotta in silenzio, con un `42703`, il giorno in
 * cui qualcuno avesse riaperto il modulo credendolo buono.
 *
 * Tolta qui e non differita perche' e' la sola parte di questo file che nomina
 * una colonna che non esiste: il resto legge `tickets`, `drink_orders` e
 * `attendances`, e resta.
 */

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
