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

  // One counter per cause, not one counter for "something went wrong". This
  // cron runs at night with nobody watching and the repository has no error
  // tracking, so the response body is the only place a cause can be read at
  // all -- a single `errors` number said that some items failed and nothing
  // about which, or why (meta-gates.md, zero fallimenti silenziosi).
  let drinkReconcileFailed = 0;
  let refundWriteFailed = 0;
  let ticketDeleteFailed = 0;
  let unexpected = 0;

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
    } catch (err) {
      // Its own counter and its own log category: a drink order failing to
      // reconcile is a different fact from a ticket failing to, and the two
      // used to share one number.
      drinkReconcileFailed++;
      console.error("[cron/reconcile-refunds/drinks] order failed to reconcile", {
        orderId: order.id,
        message: err instanceof Error ? err.message : String(err),
      });
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
        // Idempotency (ticketing-payments.md, gate idempotenza): a refund
        // handler must survive being run twice. If a previous night wrote the
        // refund row but could not delete the ticket, the ticket is still here
        // and would collect a second approved refund row every night -- and
        // fetchEventRevenue would then over-count refunds exactly as it
        // currently under-counts them. The delete is still retried below.
        const { data: alreadyRecorded, error: lookupError } = await supabase
          .from("ticket_refunds")
          .select("id")
          .eq("refunded_ticket_id", ticket.id)
          .limit(1)
          .maybeSingle();

        if (lookupError) {
          refundWriteFailed++;
          console.error(
            "[cron/reconcile-refunds/tickets] could not check for an existing refund row",
            {
              ticketId: ticket.id,
              code: lookupError.code,
              message: lookupError.message,
            }
          );
          continue;
        }

        // Create refund record for audit trail.
        // The four refunded_* columns are written HERE, before the delete
        // below, because after it these values are unreadable -- the ticket row
        // is gone and the ticket_id foreign key has been set to NULL by the
        // database (20260805120000_door_scan_events.sql:184-186).
        // refunded_ticket_id is the durable copy the door and the finance
        // figures read.
        if (!alreadyRecorded) {
          const { error: refundInsertError } = await supabase
            .from("ticket_refunds")
            .insert({
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

          // The evidence did not land, so the ticket is deliberately left
          // alone: deleting it now would destroy the only place those values
          // could still be read from. The next run retries this item.
          if (refundInsertError) {
            refundWriteFailed++;
            console.error(
              "[cron/reconcile-refunds/tickets] refund record insert failed -- ticket deliberately left in place",
              {
                ticketId: ticket.id,
                code: refundInsertError.code,
                message: refundInsertError.message,
              }
            );
            continue;
          }
        }

        // Delete the ticket
        const { error: deleteError } = await supabase
          .from("tickets")
          .delete()
          .eq("id", ticket.id);

        // ticketsInvalidated used to be incremented whether or not the ticket
        // was actually removed, so the cron reported work it had not done.
        if (deleteError) {
          ticketDeleteFailed++;
          console.error(
            "[cron/reconcile-refunds/tickets] ticket delete failed -- refund recorded, ticket still valid at the door",
            {
              ticketId: ticket.id,
              code: deleteError.code,
              message: deleteError.message,
            }
          );
          continue;
        }

        ticketsInvalidated++;
      }
      // The per-item try/catch stays inside the loop on purpose: one bad item
      // must never abort the drain (ticketing-payments.md, gate cron non
      // atomico). What changes is that the cause is no longer discarded.
    } catch (err) {
      unexpected++;
      console.error("[cron/reconcile-refunds/tickets] unexpected failure", {
        ticketId: ticket.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // The counters are returned per cause. Nothing else reports them: there is no
  // error tracking in this repository, so on a scheduled run these numbers only
  // reach a human if somebody reads the invocation's response. That is a real
  // limit of this fix and it is stated rather than left to be assumed.
  return NextResponse.json({
    drinkOrdersRefunded: drinkRefunded,
    ticketsInvalidated,
    failures: {
      drinkReconcileFailed,
      refundWriteFailed,
      ticketDeleteFailed,
      unexpected,
    },
  });
}
