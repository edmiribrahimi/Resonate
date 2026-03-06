"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sumup, refundTransaction, getCheckout } from "@/lib/sumup";
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
    payment_types: ["ECOM"],
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
  return { success: true };
}

export interface TicketSearchResult {
  memberName: string;
  memberEmail: string;
  eventTitle: string;
  tierLabel: string;
  amount: number;
  currency: string;
  purchaseDate: string;
  transactionCode: string | null;
  checkoutId: string;
  status: string;
}

export async function searchTicketsByMember(
  query: string
): Promise<TicketSearchResult[]> {
  await requireMaster();

  if (!query || query.trim().length < 2) return [];

  const supabase = getServiceClient();

  // 1. Search profiles by name (ILIKE for case-insensitive partial match)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .ilike("full_name", `%${query.trim()}%`)
    .limit(10);

  if (!profiles || profiles.length === 0) return [];

  const userIds = profiles.map((p) => p.id);

  // 2. Find completed ticket purchases for these users
  const { data: purchases } = await supabase
    .from("pending_purchases")
    .select(`
      id,
      user_id,
      sumup_checkout_id,
      status,
      created_at,
      tier:ticket_tiers(label, price),
      event:events(title)
    `)
    .in("user_id", userIds)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!purchases || purchases.length === 0) return [];

  // 3. For each purchase, get the SumUp transaction code via checkout
  const results: TicketSearchResult[] = [];

  for (const purchase of purchases) {
    const profile = profiles.find((p) => p.id === purchase.user_id);
    if (!profile) continue;

    // Type-safe access to joined data
    const tier = purchase.tier as unknown as { label: string; price: number } | null;
    const event = purchase.event as unknown as { title: string } | null;

    let transactionCode: string | null = null;
    let amount = tier?.price ?? 0;
    let currency = "EUR";
    let purchaseStatus = "COMPLETED";

    try {
      const checkout = await getCheckout(purchase.sumup_checkout_id);
      if (checkout.transactions && checkout.transactions.length > 0) {
        transactionCode = checkout.transactions[0].transaction_code;
        purchaseStatus = checkout.transactions[0].status;
      }
      amount = checkout.amount ?? amount;
      currency = checkout.currency ?? currency;
    } catch {
      // SumUp error -- still show the result but without transaction code (no refund possible)
    }

    results.push({
      memberName: profile.full_name,
      memberEmail: profile.email,
      eventTitle: event?.title ?? "Unknown Event",
      tierLabel: tier?.label ?? "Ticket",
      amount,
      currency,
      purchaseDate: purchase.created_at,
      transactionCode,
      checkoutId: purchase.sumup_checkout_id,
      status: purchaseStatus,
    });
  }

  return results;
}
