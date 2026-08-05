"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sumup, refundTransaction } from "@/lib/sumup";
import { getServiceClient } from "@/lib/supabase/service";
import type { UserRole } from "@/types/database";

async function requireMaster() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  if (role !== "master") {
    redirect("/dashboard");
  }
}

export async function listTransactions(params: {
  limit?: number;
  oldest_time?: string;
  newest_time?: string;
  statuses?: string[];
  newest_ref?: string;
  oldest_ref?: string;
}) {
  await requireMaster();

  const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
  const result = await sumup.transactions.list(merchantCode, {
    limit: params.limit ?? 20,
    order: "descending",
    statuses: params.statuses as
      | ("SUCCESSFUL" | "CANCELLED" | "FAILED" | "REFUNDED" | "CHARGE_BACK")[]
      | undefined,
    oldest_time: params.oldest_time,
    newest_time: params.newest_time,
    newest_ref: params.newest_ref,
    oldest_ref: params.oldest_ref,
  });

  // Extract next cursor from links array for pagination
  let nextCursor: string | undefined;
  let nextCursorParam: "oldest_ref" | "newest_ref" | undefined;
  const nextLink = result.links?.find(
    (l: { rel: string; href: string }) => l.rel === "next"
  );
  if (nextLink?.href) {
    try {
      const url = new URL(nextLink.href, "https://api.sumup.com");
      const oldestRef = url.searchParams.get("oldest_ref");
      const newestRef = url.searchParams.get("newest_ref");
      if (oldestRef) {
        nextCursor = oldestRef;
        nextCursorParam = "oldest_ref";
      } else if (newestRef) {
        nextCursor = newestRef;
        nextCursorParam = "newest_ref";
      }
    } catch {
      // Invalid URL -- no next page
    }
  }

  return {
    items: result.items ?? [],
    nextCursor,
    nextCursorParam,
    hasMore: !!nextLink,
  };
}

export async function getTransactionDetail(transactionCode: string) {
  await requireMaster();

  const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
  const detail = await sumup.transactions.get(merchantCode, {
    transaction_code: transactionCode,
  });

  return detail;
}

export async function refundTransactionAction(
  transactionCode: string,
  amount?: number
): Promise<{ success: true }> {
  await requireMaster();
  await refundTransaction(transactionCode, amount);

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  // Invalidate ticket if this transaction is a ticket purchase.
  // party_id and event_id are selected because they feed the refund's evidence:
  // after the delete below they cannot be recovered from anywhere.
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, amount_paid, user_id, party_id, event_id")
    .eq("sumup_transaction_code", transactionCode)
    .maybeSingle();

  if (ticket) {
    // The four refunded_* columns are written HERE, before the delete, because
    // after it these values are unreadable -- the ticket row is gone and the
    // ticket_id foreign key has been set to NULL by the database
    // (20260805120000_door_scan_events.sql:184-186). refunded_ticket_id is the
    // durable copy the door and the finance figures read.
    await supabase.from("ticket_refunds").insert({
      ticket_id: ticket.id,
      requested_by: ticket.user_id,
      processed_by: ticket.user_id,
      amount: ticket.amount_paid,
      status: "approved",
      sumup_status: "completed",
      type: "admin_initiated",
      processed_at: now,
      refunded_ticket_id: ticket.id,
      // NULL is legitimate for an event-level ticket. Not coerced.
      refunded_party_id: ticket.party_id,
      refunded_event_id: ticket.event_id,
      // Same instant as processed_at, from one variable, so they cannot drift.
      refunded_at: now,
    });
    await supabase.from("tickets").delete().eq("id", ticket.id);
  }

  // Invalidate drink tokens if this transaction is a drink order
  const { data: drinkOrder } = await supabase
    .from("drink_orders")
    .select("id, total_amount")
    .eq("sumup_transaction_code", transactionCode)
    .maybeSingle();

  if (drinkOrder) {
    // Mark all purchased tokens as refunded
    await supabase
      .from("drink_tokens")
      .update({ status: "refunded", refunded_at: now })
      .eq("order_id", drinkOrder.id)
      .eq("status", "purchased");

    // Full refund
    await supabase
      .from("drink_orders")
      .update({ refunded_amount: drinkOrder.total_amount })
      .eq("id", drinkOrder.id);
  }

  return { success: true };
}

/**
 * Given an array of SumUp transaction codes, look up the buyer name
 * from our tickets and drink_orders tables.
 * Returns a map: transactionCode -> buyerName
 */
export async function enrichTransactionsWithBuyers(
  transactionCodes: string[]
): Promise<Record<string, string>> {
  await requireMaster();

  if (transactionCodes.length === 0) return {};

  const supabase = getServiceClient();
  const buyerMap: Record<string, string> = {};

  // Lookup tickets
  const { data: tickets } = await supabase
    .from("tickets")
    .select("sumup_transaction_code, user_id")
    .in("sumup_transaction_code", transactionCodes);

  // Lookup drink orders
  const { data: drinkOrders } = await supabase
    .from("drink_orders")
    .select("sumup_transaction_code, user_id")
    .in("sumup_transaction_code", transactionCodes);

  // Collect all user IDs
  const userIdToTxns = new Map<string, string[]>();
  for (const t of tickets ?? []) {
    if (t.user_id && t.sumup_transaction_code) {
      const existing = userIdToTxns.get(t.user_id) ?? [];
      existing.push(t.sumup_transaction_code);
      userIdToTxns.set(t.user_id, existing);
    }
  }
  for (const d of drinkOrders ?? []) {
    if (d.user_id && d.sumup_transaction_code) {
      const existing = userIdToTxns.get(d.user_id) ?? [];
      existing.push(d.sumup_transaction_code);
      userIdToTxns.set(d.user_id, existing);
    }
  }

  const userIds = [...userIdToTxns.keys()];
  if (userIds.length === 0) return buyerMap;

  // Fetch profile names
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  for (const profile of profiles ?? []) {
    const txnCodes = userIdToTxns.get(profile.id) ?? [];
    for (const code of txnCodes) {
      buyerMap[code] = profile.full_name ?? "Unknown";
    }
  }

  return buyerMap;
}

export interface PurchaseSearchResult {
  memberName: string;
  memberEmail: string;
  eventTitle: string;
  description: string;
  amount: number;
  currency: string;
  purchaseDate: string;
  transactionCode: string | null;
  id: string;
  type: "ticket" | "drink";
  status: string;
}

export async function searchPurchasesByMember(
  query: string
): Promise<PurchaseSearchResult[]> {
  await requireMaster();

  if (!query || query.trim().length < 2) return [];

  const supabase = getServiceClient();

  // 1. Search profiles by name
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .ilike("full_name", `%${query.trim()}%`)
    .limit(10);

  if (!profiles || profiles.length === 0) return [];

  const userIds = profiles.map((p) => p.id);
  const results: PurchaseSearchResult[] = [];

  // 2. Find tickets
  const { data: tickets } = await supabase
    .from("tickets")
    .select(`
      id,
      user_id,
      amount_paid,
      sumup_transaction_code,
      created_at,
      tier:ticket_tiers(name, price),
      event:events(title)
    `)
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const ticket of tickets ?? []) {
    const profile = profiles.find((p) => p.id === ticket.user_id);
    if (!profile) continue;

    const tier = ticket.tier as unknown as { name: string; price: number } | null;
    const event = ticket.event as unknown as { title: string } | null;

    results.push({
      memberName: profile.full_name,
      memberEmail: profile.email,
      eventTitle: event?.title ?? "Unknown Event",
      description: tier?.name ?? "Ticket",
      amount: ticket.amount_paid ?? tier?.price ?? 0,
      currency: "EUR",
      purchaseDate: ticket.created_at,
      transactionCode: ticket.sumup_transaction_code,
      id: ticket.id,
      type: "ticket",
      status: ticket.sumup_transaction_code ? "SUCCESSFUL" : "COMPLETED",
    });
  }

  // 3. Find drink orders
  const { data: drinkOrders } = await supabase
    .from("drink_orders")
    .select(`
      id,
      user_id,
      total_amount,
      refunded_amount,
      sumup_transaction_code,
      status,
      items,
      created_at,
      event:events(title)
    `)
    .in("user_id", userIds)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(20);

  for (const order of drinkOrders ?? []) {
    const profile = profiles.find((p) => p.id === order.user_id);
    if (!profile) continue;

    const event = order.event as unknown as { title: string } | null;
    const items = order.items as { name: string; quantity: number }[];
    const itemsSummary = items
      .map((i) => `${i.quantity}x ${i.name}`)
      .join(", ");

    results.push({
      memberName: profile.full_name,
      memberEmail: profile.email,
      eventTitle: event?.title ?? "Unknown Event",
      description: itemsSummary || "Drinks",
      amount: order.total_amount ?? 0,
      currency: "EUR",
      purchaseDate: order.created_at,
      transactionCode: order.sumup_transaction_code,
      id: order.id,
      type: "drink",
      status: (order.refunded_amount ?? 0) >= (order.total_amount ?? 0)
        ? "REFUNDED"
        : (order.refunded_amount ?? 0) > 0
          ? "PARTIALLY REFUNDED"
          : "SUCCESSFUL",
    });
  }

  // Sort by date descending
  results.sort(
    (a, b) =>
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
  );

  return results;
}
