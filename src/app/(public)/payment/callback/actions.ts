"use server";

import { getServiceClient } from "@/lib/supabase/service";

export type PaymentCallbackStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "NOT_FOUND";

export interface PaymentCallbackResult {
  status: PaymentCallbackStatus;
  /** Where the user should land once the order/ticket is confirmed. */
  redirectTo?: string;
}

/**
 * Look up payment status from our own DB instead of round-tripping to SumUp.
 *
 * Each checkout we create uses one UUID as both `checkout_reference` and
 * the local row id, so the redirect URL ?order=<id> / ?purchase=<id> maps
 * 1:1 to drink_orders.id / pending_purchases.id.
 */
export async function checkPaymentStatus(params: {
  ctx: "drink" | "ticket";
  id: string;
  slug?: string;
  party?: string;
}): Promise<PaymentCallbackResult> {
  const supabase = getServiceClient();

  if (params.ctx === "drink") {
    const { data: order, error } = await supabase
      .from("drink_orders")
      .select("status")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !order) {
      return { status: "NOT_FOUND" };
    }

    const status = mapOrderStatus(order.status);
    if (status === "PAID" && params.slug) {
      const url = new URL(
        `/events/${params.slug}/menu`,
        process.env.NEXT_PUBLIC_APP_URL
      );
      url.searchParams.set("order", params.id);
      if (params.party) url.searchParams.set("party", params.party);
      return { status, redirectTo: url.pathname + url.search };
    }
    return { status };
  }

  // ticket
  const { data: purchase, error } = await supabase
    .from("pending_purchases")
    .select("status, ticket_id")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !purchase) {
    return { status: "NOT_FOUND" };
  }

  const status = mapOrderStatus(purchase.status);
  if (status === "PAID" && purchase.ticket_id) {
    return {
      status,
      redirectTo: `/tickets/${purchase.ticket_id}`,
    };
  }
  return { status };
}

function mapOrderStatus(s: string | null): PaymentCallbackStatus {
  switch (s) {
    case "completed":
      return "PAID";
    case "failed":
      return "FAILED";
    case "expired":
      return "EXPIRED";
    case "pending":
    default:
      return "PENDING";
  }
}
