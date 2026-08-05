import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { refundTransaction, getCheckout } from "@/lib/sumup";
import { menuCloseInstant } from "@/utils/datetime";

/**
 * Daily cron: refund expired unclaimed drink tokens and clean up old ones.
 *
 * 1. Find all purchased tokens whose party grace period has ended (menu close + 1h).
 * 2. Group by order_id, do partial SumUp refunds, mark tokens as 'refunded'.
 * 3. Delete redeemed/refunded tokens 24h after menu close.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date();

  // ── Step 1: Find expired unclaimed tokens ──────────────────────────────
  const { data: purchasedTokens } = await supabase
    .from("drink_tokens")
    .select(
      "id, order_id, price, party_id, event_parties(date, end_time, menu_closes_at)"
    )
    .eq("status", "purchased");

  const tokensToRefund = (purchasedTokens ?? []).filter((token) => {
    const party = token.event_parties as unknown as {
      date: string;
      end_time: string | null;
      menu_closes_at: string | null;
    } | null;
    if (!party) return false;

    const closeTimeStr = party.menu_closes_at ?? party.end_time;
    if (!closeTimeStr || !party.date) return false;

    const closeDt = menuCloseInstant(party.date, closeTimeStr);
    const graceEnd = new Date(closeDt.getTime() + 60 * 60 * 1000);

    return now > graceEnd;
  });

  // ── Step 2: Group by order_id and refund ───────────────────────────────
  const orderGroups = new Map<
    string,
    { id: string; price: number }[]
  >();
  for (const token of tokensToRefund) {
    const list = orderGroups.get(token.order_id) ?? [];
    list.push({ id: token.id, price: Number(token.price) });
    orderGroups.set(token.order_id, list);
  }

  let refundedCount = 0;
  let refundErrors = 0;

  for (const [orderId, tokens] of orderGroups) {
    try {
      // Get order's transaction code
      const { data: order } = await supabase
        .from("drink_orders")
        .select("sumup_checkout_id, sumup_transaction_code")
        .eq("id", orderId)
        .single();

      if (!order) continue;

      let txCode = order.sumup_transaction_code;

      // Fallback: fetch transaction code from SumUp checkout API
      if (!txCode && order.sumup_checkout_id) {
        try {
          const checkout = await getCheckout(order.sumup_checkout_id);
          txCode = checkout.transactions?.[0]?.transaction_code ?? null;
          if (txCode) {
            await supabase
              .from("drink_orders")
              .update({ sumup_transaction_code: txCode })
              .eq("id", orderId);
          }
        } catch {
          // checkout retrieval failed
        }
      }

      if (!txCode) {
        console.error(`No transaction code for order ${orderId}, skipping refund`);
        refundErrors++;
        continue;
      }

      const refundAmount = tokens.reduce((sum, t) => sum + t.price, 0);

      // Round to 2 decimal places for SumUp
      const roundedAmount = Math.round(refundAmount * 100) / 100;

      await refundTransaction(txCode, roundedAmount);

      // Mark tokens as refunded
      const tokenIds = tokens.map((t) => t.id);
      await supabase
        .from("drink_tokens")
        .update({
          status: "refunded",
          refunded_at: now.toISOString(),
        })
        .in("id", tokenIds);

      // Track refunded amount on the order (survives token cleanup)
      const { data: existingOrder } = await supabase
        .from("drink_orders")
        .select("refunded_amount")
        .eq("id", orderId)
        .single();
      const prevRefunded = Number(existingOrder?.refunded_amount ?? 0);
      await supabase
        .from("drink_orders")
        .update({ refunded_amount: prevRefunded + roundedAmount })
        .eq("id", orderId);

      refundedCount += tokens.length;
    } catch (err) {
      console.error(`Refund failed for order ${orderId}:`, err);
      refundErrors++;
    }
  }

  // ── Step 3: Cleanup old tokens (24h after menu close) ──────────────────
  const { data: oldTokens } = await supabase
    .from("drink_tokens")
    .select(
      "id, party_id, event_parties(date, end_time, menu_closes_at)"
    )
    .in("status", ["redeemed", "refunded"]);

  const tokenIdsToDelete = (oldTokens ?? [])
    .filter((token) => {
      const party = token.event_parties as unknown as {
        date: string;
        end_time: string | null;
        menu_closes_at: string | null;
      } | null;
      if (!party) return false;

      const closeTimeStr = party.menu_closes_at ?? party.end_time;
      if (!closeTimeStr || !party.date) return false;

      const closeDt = menuCloseInstant(party.date, closeTimeStr);
      const cleanupTime = new Date(
        closeDt.getTime() + 24 * 60 * 60 * 1000
      );

      return now > cleanupTime;
    })
    .map((t) => t.id);

  let deletedCount = 0;
  if (tokenIdsToDelete.length > 0) {
    const { count } = await supabase
      .from("drink_tokens")
      .delete()
      .in("id", tokenIdsToDelete);
    deletedCount = count ?? tokenIdsToDelete.length;
  }

  return NextResponse.json({
    refunded: refundedCount,
    refundErrors,
    deleted: deletedCount,
  });
}
