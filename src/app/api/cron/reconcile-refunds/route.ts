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
      const isRefunded =
        tx.status === "REFUNDED" || (tx.refunded_amount ?? 0) > 0;

      if (isRefunded) {
        // Invalidate all purchased tokens
        await supabase
          .from("drink_tokens")
          .update({ status: "refunded", refunded_at: now })
          .eq("order_id", order.id)
          .eq("status", "purchased");

        // Full refund (refunded_amount = total)
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
  // party_id and event_id are selected because they feed the refund's evidence:
  // after the delete further down they cannot be recovered from anywhere.
  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "id, user_id, amount_paid, party_id, event_id, sumup_transaction_code, sumup_checkout_id"
    );

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
      const isRefunded =
        tx.status === "REFUNDED" || (tx.refunded_amount ?? 0) > 0;

      if (isRefunded) {
        // Create refund record for audit trail.
        // The four refunded_* columns are written HERE, before the delete
        // below, because after it these values are unreadable -- the ticket row
        // is gone and the ticket_id foreign key has been set to NULL by the
        // database (20260805120000_door_scan_events.sql:184-186).
        // refunded_ticket_id is the durable copy the door and the finance
        // figures read.
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
          // Same instant as processed_at, from one variable, so they cannot
          // drift.
          refunded_at: now,
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
