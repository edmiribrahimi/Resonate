import "server-only";

import { getCheckout } from "@/lib/sumup";
import type { getServiceClient } from "@/lib/supabase/service";

/**
 * Rigioca la consegna del webhook per un ordine d'ospite `failed`.
 *
 * ── Perche' rigiocare e non riscrivere ───────────────────────────────────────
 *
 * Il ramo `ticket_order` di `api/webhooks/sumup/route.ts` (righe 353-745) e'
 * inline: identita' → conio → mail → rivelazione tardiva. E' l'unico percorso
 * che emette biglietti a pagamento avvenuto, ed e' idempotente per costruzione
 * (`.eq("status", "pending")`). Un secondo percorso che facesse «quasi la
 * stessa cosa» e' il modo in cui due strade del denaro divergono senza che
 * nessuno se ne accorga. Quindi questa funzione **non emette niente**: rimette
 * l'ordine `pending` e consegna al webhook lo stesso corpo che SumUp gli
 * consegna, `{ id: <checkout> }`. Il webhook riverifica su SumUp e riparte.
 *
 * E' esattamente cio' che e' stato fatto a mano il 2026-09-08 (`49-ESITI.md`,
 * P-WH-3/P-WH-4): due `update` e un POST. Questo file toglie la mano.
 *
 * ── Le tre guardie, in ordine ────────────────────────────────────────────────
 *
 * 1. L'ordine deve essere `failed`. Un `pending` lo gestisce SumUp o il cron
 *    dei sospesi; un `completed` non ha nulla da rigiocare.
 * 2. Il fornitore deve dire **PAID**, letto adesso — mai dedotto dallo stato
 *    locale (`ticketing-payments.md`, *mai fidarsi dell'annuncio*). Un ordine
 *    `failed` con checkout non pagato non si rimette in attesa: emetterebbe su
 *    un incasso che non c'e'.
 * 3. Il rientro a `pending` avviene con `.eq("status", "failed")`: se nel
 *    frattempo qualcun altro l'ha gia' mosso, questa corsa non tocca nulla.
 *
 * ── Cio' che NON fa ──────────────────────────────────────────────────────────
 *
 * Non corregge la causa. Se la mail sull'ordine e' vuota (`identity_email_missing`)
 * il webhook fallira' di nuovo con la stessa causa, e l'esito lo dice. La
 * correzione della mail e' un atto dell'organizer, non di questa funzione.
 */
export type ReplayOutcome =
  | { ok: true; status: "completed"; tickets: number }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "not_failed"; status: string }
  | { ok: false; reason: "has_tickets"; tickets: number }
  | { ok: false; reason: "checkout_not_paid"; checkoutStatus: string }
  | { ok: false; reason: "provider_unreachable"; detail: string }
  | { ok: false; reason: "reset_lost" }
  | { ok: false; reason: "webhook_unreachable"; detail: string }
  | { ok: false; reason: "still_failed"; error: string | null }
  | { ok: false; reason: "still_pending" };

export async function replayPaidOrderDelivery(args: {
  orderId: string;
  serviceClient: ReturnType<typeof getServiceClient>;
}): Promise<ReplayOutcome> {
  const { orderId, serviceClient } = args;

  const { data: order, error } = await serviceClient
    .from("ticket_orders")
    .select("id, status, sumup_checkout_id, error_message")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, reason: "not_found" };
  if (order.status !== "failed") {
    return { ok: false, reason: "not_failed", status: order.status };
  }

  // Un ordine `failed` non ha biglietti, per costruzione: il webhook lo marca
  // `failed` solo PRIMA del conio. Ma `reserve_ticket_order` e' idempotente
  // solo su `completed` — su un `pending` che avesse gia' dei biglietti ne
  // conierebbe altri N. Fra «rifiutare un rigioco» e «raddoppiare i biglietti»
  // c'e' un solo verso sicuro, e la guardia sta qui, non nella speranza.
  const { count: existing } = await serviceClient
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  if ((existing ?? 0) > 0) {
    console.error(
      `[tickets.replay_refused_has_tickets] order=${orderId} tickets=${existing}: a failed order with tickets is not a failed order — look at it, do not replay it`
    );
    return { ok: false, reason: "has_tickets", tickets: existing ?? 0 };
  }

  let checkoutStatus: string;
  try {
    checkoutStatus = (await getCheckout(order.sumup_checkout_id)).status;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error(`[tickets.replay_provider_unreachable] order=${orderId}: ${detail}`);
    return { ok: false, reason: "provider_unreachable", detail };
  }
  if (checkoutStatus !== "PAID") {
    console.error(
      `[tickets.replay_refused_not_paid] order=${orderId} checkout=${checkoutStatus}: nothing to issue on an unpaid checkout`
    );
    return { ok: false, reason: "checkout_not_paid", checkoutStatus };
  }

  const { data: reset } = await serviceClient
    .from("ticket_orders")
    // La traccia resta: il webhook non legge `error_message` su un `pending`,
    // ma il suo `failOrder` la legge, per NON riavvisare l'organizzazione a
    // ogni rigioco fallito (`organizer-alert.ts`, paletto 2).
    .update({
      status: "pending",
      error_message: `retrying: ${order.error_message ?? "no cause"}`.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "failed")
    .select("id");
  if (!reset || reset.length === 0) return { ok: false, reason: "reset_lost" };

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/webhooks/sumup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: order.sumup_checkout_id,
        event_type: "CHECKOUT_STATUS_CHANGED",
        status: "PAID",
        replayed_by: "replay-order-delivery",
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[tickets.replay_webhook_http] order=${orderId} http=${res.status}`);
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error(`[tickets.replay_webhook_unreachable] order=${orderId}: ${detail}`);
    return { ok: false, reason: "webhook_unreachable", detail };
  }

  const { data: after } = await serviceClient
    .from("ticket_orders")
    .select("status, error_message")
    .eq("id", orderId)
    .maybeSingle();
  if (after?.status === "completed") {
    const { count } = await serviceClient
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId);
    console.log(`[tickets.replay_completed] order=${orderId} tickets=${count ?? 0}`);
    return { ok: true, status: "completed", tickets: count ?? 0 };
  }
  if (after?.status === "failed") {
    console.error(`[tickets.replay_still_failed] order=${orderId}: ${after.error_message ?? "no cause"}`);
    return { ok: false, reason: "still_failed", error: after.error_message ?? null };
  }
  return { ok: false, reason: "still_pending" };
}
