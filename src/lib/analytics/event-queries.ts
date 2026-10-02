import type { SupabaseClient } from "@supabase/supabase-js";
import { redactDbError } from "@/lib/errors/redact";

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
  discountedTickets: number;
  totalDiscount: number;
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
  // Fetch ticket amounts and completed drink orders in parallel.
  // Ticket refunds require a two-step lookup because ticket_refunds
  // references ticket_id, not event_id directly.
  const [ticketsResult, drinkOrdersResult] =
    await Promise.all([
      supabase.from("tickets").select("id, amount_paid, discount_code_id, tier_id").eq("event_id", eventId),
      supabase
        .from("drink_orders")
        .select("total_amount, refunded_amount")
        .eq("event_id", eventId)
        .eq("status", "completed"),
    ]);

  const grossTickets = (ticketsResult.data ?? []).reduce(
    (s, t) => s + t.amount_paid,
    0
  );
  const grossDrinks = (drinkOrdersResult.data ?? []).reduce(
    (s, d) => s + d.total_amount,
    0
  );
  const drinkRefunds = (drinkOrdersResult.data ?? []).reduce(
    (s, d) => s + d.refunded_amount,
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

  // Discount impact: for tickets with discount_code_id, look up original tier price
  const discountedTicketRows = (ticketsResult.data ?? []).filter(
    (t) => t.discount_code_id && t.tier_id
  );
  let totalDiscount = 0;
  if (discountedTicketRows.length > 0) {
    const tierIds = [...new Set(discountedTicketRows.map((t) => t.tier_id as string))];
    const { data: tiers } = await supabase
      .from("ticket_tiers")
      .select("id, price")
      .in("id", tierIds);
    const tierMap = new Map((tiers ?? []).map((t) => [t.id, t.price]));
    for (const ticket of discountedTicketRows) {
      const originalPrice = tierMap.get(ticket.tier_id as string) ?? ticket.amount_paid;
      totalDiscount += originalPrice - ticket.amount_paid;
    }
  }

  return {
    grossTickets,
    grossDrinks,
    netTickets,
    netDrinks,
    totalGross: grossTickets + grossDrinks,
    totalNet: netTickets + netDrinks,
    discountedTickets: discountedTicketRows.length,
    totalDiscount,
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

// ---------------------------------------------------------------------------
// Market insights
// ---------------------------------------------------------------------------

export interface MarketInsights {
  avgSpendPerAttendee: number;
  peakPurchaseHours: { hour: number; count: number }[];
}

/**
 * Fetch market insights: average spend per checked-in attendee and top 5 peak
 * purchase hours (combined ticket + drink order timestamps).
 */
export async function fetchMarketInsights(
  supabase: SupabaseClient,
  eventId: string
): Promise<MarketInsights> {
  const [ticketsResult, drinkOrdersResult, attendanceResult] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("amount_paid, created_at")
        .eq("event_id", eventId),
      supabase
        .from("drink_orders")
        .select("total_amount, refunded_amount, created_at")
        .eq("event_id", eventId)
        .eq("status", "completed"),
      supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("checked_in", true),
    ]);

  const tickets = ticketsResult.data ?? [];
  const drinkOrders = drinkOrdersResult.data ?? [];
  const checkedIn = attendanceResult.count ?? 0;

  const totalTicketRevenue = tickets.reduce((s, t) => s + t.amount_paid, 0);
  const totalDrinkRevenue = drinkOrders.reduce(
    (s, d) => s + (d.total_amount - d.refunded_amount),
    0
  );
  const avgSpendPerAttendee =
    checkedIn > 0
      ? Math.round(((totalTicketRevenue + totalDrinkRevenue) / checkedIn) * 100) / 100
      : 0;

  // Combine timestamps and count by hour
  const hourCounts = new Map<number, number>();
  for (const t of tickets) {
    const hour = new Date(t.created_at).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  for (const d of drinkOrders) {
    const hour = new Date(d.created_at).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  const peakPurchaseHours = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { avgSpendPerAttendee, peakPurchaseHours };
}

// ---------------------------------------------------------------------------
// Purchase funnel
// ---------------------------------------------------------------------------

export interface FunnelStep {
  name: string;
  value: number;
  fill: string;
}

/**
 * Fetch drink purchase funnel: checkouts -> payments -> tokens -> redeemed.
 * All data from Supabase (no PostHog dependency).
 */
export async function fetchPurchaseFunnel(
  supabase: SupabaseClient,
  eventId: string
): Promise<FunnelStep[]> {
  const [checkoutsResult, paymentsResult, tokensResult, redeemedResult] =
    await Promise.all([
      supabase
        .from("drink_orders")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId),
      supabase
        .from("drink_orders")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "completed"),
      supabase
        .from("drink_tokens")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId),
      supabase
        .from("drink_tokens")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "redeemed"),
    ]);

  const colors = [
    "var(--color-accent)",
    "#6366f1",
    "#8b5cf6",
    "#c084fc",
  ];

  return [
    { name: "Checkouts", value: checkoutsResult.count ?? 0, fill: colors[0] },
    { name: "Payments", value: paymentsResult.count ?? 0, fill: colors[1] },
    { name: "Tokens", value: tokensResult.count ?? 0, fill: colors[2] },
    { name: "Redeemed", value: redeemedResult.count ?? 0, fill: colors[3] },
  ];
}

// ---------------------------------------------------------------------------
// Ticket checkout funnel (CART-01)
// ---------------------------------------------------------------------------

type TicketFunnelDevice = "mobile" | "desktop" | "unknown" | "unrecorded";
type TicketFunnelMethod = "apple_pay" | "google_pay" | "card" | "other" | "unrecorded";

export interface TicketFunnel {
  steps: FunnelStep[];
  /** (opened − paid − paidNotIssued) / opened, intero; null sotto 10 checkout. */
  abandonmentPct: number | null;
  opened: number;
  /** `failed`: incassato e non emesso. Denaro da emettere, non un abbandono. */
  paidNotIssued: number;
  byDevice: Record<TicketFunnelDevice, { opened: number; paid: number }>;
  byMethod: Record<TicketFunnelMethod, number>;
}

/** Sotto questa base una percentuale e' un aneddoto: si mostrano solo i conteggi. */
const TICKET_FUNNEL_MIN_BASE = 10;
/** Limite di righe per richiesta di PostgREST. */
const TICKET_FUNNEL_PAGE = 1000;
/** Tetto di sicurezza: 50 pagine = 50.000 checkout per una serata. */
const TICKET_FUNNEL_MAX_PAGES = 50;

type TicketFunnelRow = {
  status: string;
  closed_reason: string | null;
  device: string | null;
  payment_method: string | null;
};

/**
 * L'imbuto del checkout dei biglietti, contato dal database.
 *
 * **Perche' dal database e non da PostHog (decisione Q1, 2026-09-30).** La
 * chiave PostHog non esiste in produzione, e aprire un progetto di analisi e'
 * una decisione di prodotto con un'informativa da cambiare. Le colonne
 * `closed_reason`, `device`, `payment_method` di `ticket_orders` bastano, e non
 * portano ne' mail ne' nome: la `select` qui sotto nomina quattro colonne e
 * nessun dato personale entra nell'imbuto.
 *
 * **Il chiamante DEVE passare il client di servizio, e SOLO dopo
 * `mayManageEvent`.** `ticket_orders` ha una sola policy,
 * `ticket_orders_select_own`: con il client di sessione un organizer conterebbe
 * i propri ordini — zero — e l'imbuto vuoto sembrerebbe vero. Il client di
 * servizio salta la RLS, quindi la guardia e' a monte, nella pagina.
 *
 * **Paginata a 1000 righe.** PostgREST restituisce al massimo 1000 righe per
 * richiesta: una serata oltre quella soglia conterebbe in silenzio solo la
 * prima pagina — lo stesso zero finto della RLS, in un'altra forma.
 *
 * Gli ordini gratuiti (senza `sumup_checkout_id`) non sono un checkout e non
 * entrano. Un errore di lettura si logga e si rilancia: il pannello lo mostra,
 * mai uno zero.
 */
export async function fetchTicketFunnel(
  service: SupabaseClient,
  eventId: string
): Promise<TicketFunnel> {
  const rows: TicketFunnelRow[] = [];
  let truncated = true;
  for (let page = 0; page < TICKET_FUNNEL_MAX_PAGES; page++) {
    const from = page * TICKET_FUNNEL_PAGE;
    const { data, error } = await service
      .from("ticket_orders")
      .select("status, closed_reason, device, payment_method")
      .eq("event_id", eventId)
      .not("sumup_checkout_id", "is", null)
      .order("id")
      .range(from, from + TICKET_FUNNEL_PAGE - 1);
    if (error) {
      console.error(
        `[analytics.ticket_funnel_unreadable] event=${eventId} page=${page} ${redactDbError(error)}`
      );
      throw new Error(`ticket_funnel_unreadable: ${error.code ?? "unknown"}`);
    }
    const batch = (data ?? []) as TicketFunnelRow[];
    rows.push(...batch);
    if (batch.length < TICKET_FUNNEL_PAGE) {
      truncated = false;
      break;
    }
  }
  if (truncated) {
    console.error(
      `[analytics.ticket_funnel_truncated] event=${eventId} rows=${rows.length} max_pages=${TICKET_FUNNEL_MAX_PAGES}`
    );
  }

  let paid = 0;
  let neverAttempted = 0;
  let declined = 0;
  let closedUnrecorded = 0;
  let stillOpen = 0;
  let failedPaid = 0;

  const byDevice: TicketFunnel["byDevice"] = {
    mobile: { opened: 0, paid: 0 },
    desktop: { opened: 0, paid: 0 },
    unknown: { opened: 0, paid: 0 },
    unrecorded: { opened: 0, paid: 0 },
  };
  const byMethod: TicketFunnel["byMethod"] = {
    apple_pay: 0,
    google_pay: 0,
    card: 0,
    other: 0,
    unrecorded: 0,
  };

  for (const row of rows) {
    // NULL = ordine nato prima della colonna: mai sommato a unknown/other.
    const device: TicketFunnelDevice =
      row.device === "mobile" || row.device === "desktop" || row.device === "unknown"
        ? row.device
        : "unrecorded";
    byDevice[device].opened++;

    if (row.status === "completed") {
      paid++;
      byDevice[device].paid++;
      const method: TicketFunnelMethod =
        row.payment_method === "apple_pay" ||
        row.payment_method === "google_pay" ||
        row.payment_method === "card" ||
        row.payment_method === "other"
          ? row.payment_method
          : "unrecorded";
      byMethod[method]++;
    } else if (row.status === "failed") {
      failedPaid++;
    } else if (row.status === "pending") {
      stillOpen++;
    } else if (row.status === "expired") {
      if (row.closed_reason === "never_attempted") neverAttempted++;
      else if (row.closed_reason === "declined") declined++;
      else closedUnrecorded++; // chiuso prima che la causa si registrasse
    }
  }

  const opened = rows.length;
  // Un `failed` e' un incasso senza biglietti, non un carrello lasciato:
  // al numeratore gonfierebbe il tasso proprio quando c'e' denaro da emettere.
  const abandonmentPct =
    opened < TICKET_FUNNEL_MIN_BASE
      ? null
      : Math.round(((opened - paid - failedPaid) / opened) * 100);

  const steps: FunnelStep[] = [
    { name: "Checkouts opened", value: opened, fill: "var(--color-accent)" },
    { name: "Paid", value: paid, fill: "#6366f1" },
    { name: "Never attempted", value: neverAttempted, fill: "#8b5cf6" },
    { name: "Card declined", value: declined, fill: "#c084fc" },
    {
      name: "Still open (not yet closed by the daily check)",
      value: stillOpen,
      fill: "#a1a1aa",
    },
  ];
  if (closedUnrecorded > 0) {
    steps.push({
      name: "Closed before tracking (cause not recorded)",
      value: closedUnrecorded,
      fill: "#71717a",
    });
  }

  return {
    steps,
    abandonmentPct,
    opened,
    paidNotIssued: failedPaid,
    byDevice,
    byMethod,
  };
}

// ---------------------------------------------------------------------------
// Where the carts stop, where they come from, what the resume mail earns
// (DBT-15, plan 52.1-24 — the READING half only)
// ---------------------------------------------------------------------------
//
// **The PII-clearing half of plan 52.1-24 is not here, by decision.** D-52.1-31
// (owner, 2026-10-02, «deve rimanere cosi' com'e' oggi»): the data of never-paid
// orders is never cleared. No switch, no retention constant, no scrub step, no
// `pii_cleared_at` — the column was withdrawn by
// `20261001120400_order_pii_clearing_withdrawn.sql`.
//
// **Why a second read and not three more columns on `fetchTicketFunnel`.**
// `entry_source` and `checkout_form` (`20261001120300_order_entry_source.sql`)
// exist on the laboratory today and reach production only in act 4 (plan
// 52.1-27). A `select` naming an absent column fails as a whole: folded into the
// existing read, it would take down the numbers that already work. Kept apart,
// an absent column is ONE state of its own — «not available yet» — and the
// funnel above it keeps counting.

export type CartEntrySource =
  | "instagram"
  | "newsletter"
  | "flyer"
  | "direct"
  | "other"
  | "unrecorded";

export const CART_ENTRY_SOURCES: readonly CartEntrySource[] = [
  "instagram",
  "newsletter",
  "flyer",
  "direct",
  "other",
  "unrecorded",
];

export interface CartReading {
  /** Every order that opened a SumUp checkout: the base of every line below. */
  opened: number;
  paid: number;
  /** `expired` + `never_attempted` + `checkout_form = 'not_opened'`. */
  formNeverOpened: number;
  /** `expired` + `never_attempted` + `checkout_form = 'opened'`. */
  openedNotAttempted: number;
  /** `expired` + `declined`, whatever the form column says. */
  attemptedDeclined: number;
  /** `checkout_form` NULL: the order was born before the column, never «unknown». */
  beforeTracking: number;
  /**
   * `completed` AND `resume_email_state = 'sent'`, no join: `sent` is written
   * only when a payment finds the resume mail already gone (`order-resume.ts`).
   */
  paidAfterResume: number;
  /**
   * Resume mails that LEFT: the ledger's `provider_last_event` is one of the
   * «already sent» events, or the order itself says `sent`. `null` = the mail
   * register could not be read — a state of its own, never a zero.
   */
  resumeEmailsSent: number | null;
  /** Opened / paid per entry source. `unrecorded` = before the column. */
  bySource: Record<CartEntrySource, { opened: number; paid: number }>;
}

export interface CartReadingNight extends CartReading {
  eventId: string;
  title: string;
  /** `events.date`. `null` when the night row could not be matched. */
  date: string | null;
}

/**
 * The three outcomes of a cart read, never collapsed: a column production does
 * not have yet is not the same fact as a read that failed.
 */
export type CartReadingResult<T> =
  | { state: "ok"; data: T }
  | { state: "not_available" }
  | { state: "error" };

/** The provider's words for «this mail has already left» — `order-resume.ts`, P-4. */
const RESUME_ALREADY_SENT_EVENTS = new Set([
  "sent",
  "delivered",
  "delivery_delayed",
  "opened",
  "clicked",
  "bounced",
  "complained",
]);

/** PostgREST puts an `in` list in the URL: 100 ids keep it well under any limit. */
const CART_IN_CHUNK = 100;

type CartRow = {
  event_id: string;
  status: string;
  closed_reason: string | null;
  entry_source: string | null;
  checkout_form: string | null;
  resume_email_id: string | null;
  resume_email_state: string | null;
};

class CartColumnsAbsent extends Error {}
class CartReadLogged extends Error {}

/** Postgres `undefined_column`, and PostgREST's «column not in the schema cache». */
function isAbsentColumn(error: { code?: string | null }): boolean {
  return error.code === "42703" || error.code === "PGRST204";
}

/**
 * The order rows a cart reading is built from. NO person column: the `select`
 * names seven columns and none is an email or a name (`comms-analytics.md`).
 */
async function readCartRows(
  service: SupabaseClient,
  eventId: string | null
): Promise<CartRow[]> {
  const scope = eventId ?? "all";
  const rows: CartRow[] = [];
  let truncated = true;
  for (let page = 0; page < TICKET_FUNNEL_MAX_PAGES; page++) {
    const from = page * TICKET_FUNNEL_PAGE;
    let query = service
      .from("ticket_orders")
      .select(
        "event_id, status, closed_reason, entry_source, checkout_form, resume_email_id, resume_email_state"
      )
      .not("sumup_checkout_id", "is", null);
    if (eventId) query = query.eq("event_id", eventId);
    const { data, error } = await query
      .order("id")
      .range(from, from + TICKET_FUNNEL_PAGE - 1);
    if (error) {
      if (isAbsentColumn(error)) {
        // Production before act 4: expected, said as such, not as a fault.
        console.warn(
          `[analytics.cart_reading_columns_absent] scope=${scope} ${redactDbError(error)}`
        );
        throw new CartColumnsAbsent();
      }
      console.error(
        `[analytics.cart_reading_unreadable] scope=${scope} page=${page} ${redactDbError(error)}`
      );
      throw new CartReadLogged();
    }
    const batch = (data ?? []) as CartRow[];
    rows.push(...batch);
    if (batch.length < TICKET_FUNNEL_PAGE) {
      truncated = false;
      break;
    }
  }
  if (truncated) {
    console.error(
      `[analytics.cart_reading_truncated] scope=${scope} rows=${rows.length} max_pages=${TICKET_FUNNEL_MAX_PAGES}`
    );
  }
  return rows;
}

/**
 * Which resume mails have left, by provider id, from `email_deliveries`
 * (`category = 'order_resume'`) — an order never paid stays `scheduled` even
 * after its mail went out, so the order row cannot say it. `null` = the
 * register could not be read.
 */
async function readResumeMailsSent(
  service: SupabaseClient,
  providerIds: string[]
): Promise<Set<string> | null> {
  const sent = new Set<string>();
  for (let i = 0; i < providerIds.length; i += CART_IN_CHUNK) {
    const { data, error } = await service
      .from("email_deliveries")
      .select("provider_message_id, provider_last_event")
      .eq("category", "order_resume")
      .in("provider_message_id", providerIds.slice(i, i + CART_IN_CHUNK));
    if (error) {
      console.error(
        `[analytics.cart_resume_ledger_unreadable] ids=${providerIds.length} ${redactDbError(error)}`
      );
      return null;
    }
    for (const row of (data ?? []) as {
      provider_message_id: string;
      provider_last_event: string | null;
    }[]) {
      if (row.provider_last_event && RESUME_ALREADY_SENT_EVENTS.has(row.provider_last_event)) {
        sent.add(row.provider_message_id);
      }
    }
  }
  return sent;
}

function emptyCartReading(): CartReading {
  const bySource = {} as CartReading["bySource"];
  for (const s of CART_ENTRY_SOURCES) bySource[s] = { opened: 0, paid: 0 };
  return {
    opened: 0,
    paid: 0,
    formNeverOpened: 0,
    openedNotAttempted: 0,
    attemptedDeclined: 0,
    beforeTracking: 0,
    paidAfterResume: 0,
    resumeEmailsSent: 0,
    bySource,
  };
}

function addCartRow(reading: CartReading, row: CartRow, sent: Set<string>) {
  // NULL = before the column: never summed into `direct` or `other`.
  const source: CartEntrySource =
    row.entry_source === "instagram" ||
    row.entry_source === "newsletter" ||
    row.entry_source === "flyer" ||
    row.entry_source === "direct" ||
    row.entry_source === "other"
      ? row.entry_source
      : "unrecorded";
  reading.opened++;
  reading.bySource[source].opened++;
  if (row.checkout_form === null) reading.beforeTracking++;

  if (row.status === "completed") {
    reading.paid++;
    reading.bySource[source].paid++;
    if (row.resume_email_state === "sent") reading.paidAfterResume++;
  } else if (row.status === "expired") {
    if (row.closed_reason === "declined") {
      reading.attemptedDeclined++;
    } else if (row.closed_reason === "never_attempted") {
      if (row.checkout_form === "not_opened") reading.formNeverOpened++;
      else if (row.checkout_form === "opened") reading.openedNotAttempted++;
    }
  }

  if (
    reading.resumeEmailsSent !== null &&
    row.resume_email_id &&
    (row.resume_email_state === "sent" || sent.has(row.resume_email_id))
  ) {
    reading.resumeEmailsSent++;
  }
}

async function buildCartReadings(
  service: SupabaseClient,
  eventId: string | null
): Promise<Map<string, CartReading>> {
  const rows = await readCartRows(service, eventId);
  const providerIds = Array.from(
    new Set(rows.map((r) => r.resume_email_id).filter((id): id is string => !!id))
  );
  const sent =
    providerIds.length > 0
      ? await readResumeMailsSent(service, providerIds)
      : new Set<string>();
  const byEvent = new Map<string, CartReading>();
  for (const row of rows) {
    let reading = byEvent.get(row.event_id);
    if (!reading) {
      reading = emptyCartReading();
      byEvent.set(row.event_id, reading);
    }
    addCartRow(reading, row, sent ?? new Set<string>());
  }
  if (sent === null) for (const r of byEvent.values()) r.resumeEmailsSent = null;
  return byEvent;
}

function toCartResult<T>(
  scope: string,
  run: () => Promise<T>
): Promise<CartReadingResult<T>> {
  return Promise.resolve()
    .then(run)
    .then(
      (data): CartReadingResult<T> => ({ state: "ok", data }),
      (e: unknown): CartReadingResult<T> => {
        if (e instanceof CartColumnsAbsent) return { state: "not_available" };
        if (!(e instanceof CartReadLogged)) {
          // Categorised reads logged where they failed; this catches the rest
          // (a service client that could not be built).
          console.error(
            `[analytics.cart_reading_failed] scope=${scope} ${e instanceof Error ? e.message : "unknown"}`
          );
        }
        return { state: "error" };
      }
    );
}

/**
 * One night's cart reading. **The caller passes the service client factory,
 * and only after `mayManageEvent` and behind `admin.access`** — same guard,
 * same reason as `fetchTicketFunnel`. Never throws: the three outcomes are the
 * result.
 */
export function fetchCartReading(
  getService: () => SupabaseClient,
  eventId: string
): Promise<CartReadingResult<CartReading>> {
  return toCartResult(eventId, async () => {
    const byEvent = await buildCartReadings(getService(), eventId);
    return byEvent.get(eventId) ?? emptyCartReading();
  });
}

/**
 * «All nights»: the same reading with no night filter, one row per night, most
 * recent night first. It reads every night's orders through the service
 * client, so its only caller is the Analytics page behind the SAME
 * `admin.access` guard as the funnel panel — no route, no capability of its own.
 */
export function fetchTicketFunnelAcrossNights(
  getService: () => SupabaseClient
): Promise<CartReadingResult<CartReadingNight[]>> {
  return toCartResult("all", async () => {
    const service = getService();
    const byEvent = await buildCartReadings(service, null);
    const ids = Array.from(byEvent.keys());
    const meta = new Map<string, { title: string; date: string }>();
    for (let i = 0; i < ids.length; i += CART_IN_CHUNK) {
      const { data, error } = await service
        .from("events")
        .select("id, title, date")
        .in("id", ids.slice(i, i + CART_IN_CHUNK));
      if (error) {
        console.error(
          `[analytics.cart_nights_unreadable] nights=${ids.length} ${redactDbError(error)}`
        );
        throw new CartReadLogged();
      }
      for (const e of (data ?? []) as { id: string; title: string; date: string }[]) {
        meta.set(e.id, { title: e.title, date: e.date });
      }
    }
    return ids
      .map(
        (eventId): CartReadingNight => ({
          ...(byEvent.get(eventId) as CartReading),
          eventId,
          title: meta.get(eventId)?.title ?? "Night not found",
          date: meta.get(eventId)?.date ?? null,
        })
      )
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  });
}
