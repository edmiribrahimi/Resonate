import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getCheckout, getTransaction } from "@/lib/sumup";

/**
 * Reconcile SumUp refund status with our database.
 * Catches refunds made directly on SumUp dashboard.
 *
 * Refunds are always total (no partial refunds).
 * If a SumUp transaction shows REFUNDED status, we invalidate
 * all corresponding tokens/tickets in the database.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  let drinkRefunded = 0;
  let ticketsInvalidated = 0;
  let errors = 0;

  // ── Drink orders reconciliation ──────────────────────────────────────
  const { data: drinkOrders } = await supabase
    .from("drink_orders")
    .select("id, sumup_checkout_id, sumup_transaction_code, total_amount, refunded_amount")
    .eq("status", "completed");

  for (const order of drinkOrders ?? []) {
    // Skip already fully refunded
    if (Number(order.refunded_amount) >= Number(order.total_amount)) continue;
    if (!order.sumup_checkout_id) continue;

    try {
      // Get transaction code if missing
      let txCode = order.sumup_transaction_code;
      if (!txCode) {
        const checkout = await getCheckout(order.sumup_checkout_id);
        txCode = checkout.transactions?.[0]?.transaction_code ?? null;
        if (txCode) {
          await supabase
            .from("drink_orders")
            .update({ sumup_transaction_code: txCode })
            .eq("id", order.id);
        }
      }

      if (!txCode) continue;

      // Check SumUp transaction status
      const tx = await getTransaction(txCode);

      if (tx.status === "REFUNDED") {
        // Invalidate all tokens (purchased ones become refunded)
        await supabase
          .from("drink_tokens")
          .update({ status: "refunded", refunded_at: now })
          .eq("order_id", order.id)
          .eq("status", "purchased");

        // Set refunded_amount = total (always full refund)
        await supabase
          .from("drink_orders")
          .update({ refunded_amount: order.total_amount })
          .eq("id", order.id);

        drinkRefunded++;
      }
    } catch {
      errors++;
    }
  }

  // ── Ticket purchases reconciliation ──────────────────────────────────
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, user_id, amount_paid, sumup_transaction_code, sumup_checkout_id");

  for (const ticket of tickets ?? []) {
    if (!ticket.sumup_checkout_id && !ticket.sumup_transaction_code) continue;

    try {
      // Get transaction code if missing
      let txCode = ticket.sumup_transaction_code;
      if (!txCode && ticket.sumup_checkout_id) {
        const checkout = await getCheckout(ticket.sumup_checkout_id);
        txCode = checkout.transactions?.[0]?.transaction_code ?? null;
        if (txCode) {
          await supabase
            .from("tickets")
            .update({ sumup_transaction_code: txCode })
            .eq("id", ticket.id);
        }
      }

      if (!txCode) continue;

      const tx = await getTransaction(txCode);

      if (tx.status === "REFUNDED") {
        // Create refund record for audit trail
        await supabase.from("ticket_refunds").insert({
          ticket_id: ticket.id,
          requested_by: ticket.user_id,
          processed_by: ticket.user_id,
          amount: ticket.amount_paid,
          status: "approved",
          sumup_status: "completed",
          type: "admin_initiated",
          processed_at: now,
        });

        // Delete the ticket
        await supabase.from("tickets").delete().eq("id", ticket.id);
        ticketsInvalidated++;
      }
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    drinkOrdersRefunded: drinkRefunded,
    ticketsInvalidated,
    errors,
  });
}
