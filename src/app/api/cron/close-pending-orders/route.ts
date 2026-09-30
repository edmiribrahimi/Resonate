import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  deactivateCheckout,
  getCheckout,
  paymentMethodFromEntryMode,
} from "@/lib/sumup";
import { deliverPaidCheckoutToWebhook } from "@/lib/tickets/replay-order-delivery";
import { alertOrganizerPaidNotIssued } from "@/lib/tickets/organizer-alert";
import { CHECKOUT_TTL_MS } from "@/lib/tickets/checkout-window";

export const maxDuration = 60;

/**
 * Cron — chiude gli ordini d'ospite `pending` con la verita' di SumUp.
 *
 * ── Perche' esiste ───────────────────────────────────────────────────────────
 *
 * Fino alla fase 52.2 nulla chiudeva un `pending` (CART-03): un checkout
 * abbandonato restava «in attesa» per sempre, e la card *Orders without
 * tickets* poteva solo dire «non sappiamo se e' stato pagato». Questo cron lo
 * chiede a SumUp, ogni mattina, e scrive cio' che SumUp risponde:
 *
 * - **mai tentato** → `expired` + `closed_reason = never_attempted`;
 * - **tentativo rifiutato** → `expired` + `closed_reason = declined`, con la
 *   parola del fornitore in `closed_detail` e il metodo in `payment_method`;
 * - **PAID** → non scrive nulla: consegna il checkout al webhook
 *   (`deliverPaidCheckoutToWebhook`), che resta l'unico percorso che emette.
 *
 * ── Mai chiudere su un'incognita (P-9) ──────────────────────────────────────
 *
 * Ogni ramo parte da `getCheckout`, **mai** dallo stato locale. Un GET fallito,
 * una transazione ancora in volo o un'incoerenza del fornitore (transazione
 * `SUCCESSFUL` su un checkout non `PAID`) non chiudono niente: il cron
 * riprova la mattina dopo. Un checkout senza `valid_until` (tutti quelli nati
 * prima di questa fase, compreso l'ordine del 2026-09-28) resta pagabile per
 * sempre: si **disattiva** su SumUp prima di scrivere `expired`, cosi' lo stato
 * scritto e' vero. Ogni scrittura porta `.eq("status", "pending")`: se il
 * webhook ha vinto nel frattempo, la chiusura non tocca nulla (`closeLost`).
 *
 * ── Un PAID trovato in ritardo ───────────────────────────────────────────────
 *
 * Se la consegna al webhook fallisce, l'ordine resta `pending` e l'organizer
 * riceve `alertOrganizerPaidNotIssued`: non esiste error tracking
 * (`meta-gates.md`) e il cron gira la mattina senza nessuno a guardare, quindi
 * un log da solo non e' osservabile. L'avviso si ripete una volta al giorno
 * finche' la consegna non riesce — ed e' voluto: c'e' un incasso senza
 * biglietti.
 *
 * ── Cosa NON fa ──────────────────────────────────────────────────────────────
 *
 * - Non emette biglietti da solo, e non tocca `failed` (e' di
 *   `retry-failed-orders`) ne' gli ordini gia' emessi.
 * - Non tocca gli ordini gratuiti (`sumup_checkout_id` nullo): non hanno un
 *   fornitore a cui chiedere.
 * - Non manda mail all'acquirente. La chiusura di un ordine preesistente — come
 *   quello del 2026-09-28 in produzione — e' silenziosa per costruzione.
 * - Non tocca `pending_purchases`. **Debito dichiarato:** l'Event Pass della
 *   strada con sessione resta senza scadenza.
 *
 * ── Progresso per elemento ───────────────────────────────────────────────────
 *
 * Ogni ordine sta nel proprio `try/catch` ed e' contato nel proprio ramo
 * (`ticketing-payments.md`, *cron non atomico*).
 *
 * Gira al mattino come gli altri sette (con questo, otto): `5 7 * * *` UTC,
 * mai fra le 22:00 e le 06:00 locali, che e' una notte re:sonate.
 */

type Checkout = Awaited<ReturnType<typeof getCheckout>>;

type Verdict =
  | { kind: "paid" }
  | { kind: "inconsistent" }
  | { kind: "in_flight" }
  | { kind: "still_payable" }
  | { kind: "needs_deactivation" }
  | { kind: "never_attempted" }
  | { kind: "declined"; detail: string; entryMode: string | undefined }
  | { kind: "other"; detail: string };

/**
 * La tabella della macchina a stati (52.2-RESEARCH §2). `deactivated` dice che
 * il checkout e' stato appena disattivato su SumUp: un PENDING senza
 * transazioni, a quel punto, non e' piu' pagabile.
 */
function classify(checkout: Checkout, deactivated: boolean): Verdict {
  const status = String(checkout.status ?? "").toUpperCase();
  const txs = (checkout.transactions ?? []).map((t) => ({
    status: String(t.status ?? "").toUpperCase(),
    entryMode: t.entry_mode,
  }));

  if (status === "PAID") return { kind: "paid" };
  if (txs.some((t) => t.status === "SUCCESSFUL")) return { kind: "inconsistent" };
  if (txs.some((t) => t.status === "PENDING")) return { kind: "in_flight" };

  if (status === "PENDING" && !deactivated) {
    const validUntil = checkout.valid_until ? Date.parse(checkout.valid_until) : NaN;
    if (Number.isFinite(validUntil) && validUntil > Date.now()) {
      return { kind: "still_payable" };
    }
    return { kind: "needs_deactivation" };
  }

  if (status === "EXPIRED" || status === "FAILED" || (status === "PENDING" && deactivated)) {
    if (txs.length === 0) return { kind: "never_attempted" };
    const closedOnly = txs.every((t) => t.status === "FAILED" || t.status === "CANCELLED");
    if (closedOnly) {
      // La piu' recente: SumUp le restituisce in ordine di creazione.
      const last = txs[txs.length - 1];
      return { kind: "declined", detail: last.status, entryMode: last.entryMode };
    }
    return { kind: "other", detail: `tx_statuses=${txs.map((t) => t.status).join(",")}` };
  }

  return { kind: "other", detail: `checkout_status=${status || "none"}` };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = getServiceClient();
  // `updated_at`, non `created_at`: una ripresa dell'acquirente rinnova il
  // checkout e aggiorna `updated_at`, e l'ordine torna pagabile per 30 minuti.
  const staleBefore = new Date(Date.now() - CHECKOUT_TTL_MS).toISOString();

  const { data: candidates, error } = await serviceClient
    .from("ticket_orders")
    .select("id, sumup_checkout_id, status, event_id, quantity, total_amount")
    .eq("status", "pending")
    // Gli ordini gratuiti non hanno checkout e non si toccano mai.
    .not("sumup_checkout_id", "is", null)
    .lt("updated_at", staleBefore)
    .order("updated_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[cron.close_pending_orders.read_failed]", error.message);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  const counts = {
    considered: 0,
    neverAttempted: 0,
    declined: 0,
    paidLate: 0,
    deliveryFailed: 0,
    inFlight: 0,
    stillPayable: 0,
    deactivated: 0,
    inconsistent: 0,
    providerUnreachable: 0,
    closeLost: 0,
    other: 0,
  };

  for (const o of candidates ?? []) {
    counts.considered += 1;
    const checkoutId = o.sumup_checkout_id;
    if (!checkoutId) continue; // gia' escluso dalla query; difesa di tipo

    try {
      let checkout: Checkout;
      try {
        checkout = await getCheckout(checkoutId);
      } catch (e) {
        counts.providerUnreachable += 1;
        console.error(`[tickets.pending_close_unreachable] order=${o.id}`, e);
        continue;
      }

      let deactivated = false;
      let verdict = classify(checkout, deactivated);

      // Un checkout ancora pagabile per sempre si disattiva prima di chiudere.
      // Si rilegge una volta sola: dopo la disattivazione riuscita o dopo un
      // 409 (qualcuno ha pagato o tentato nel frattempo), e si riapplica la
      // tabella da capo — un PAID trovato qui va consegnato, non chiuso.
      if (verdict.kind === "needs_deactivation") {
        const d = await deactivateCheckout(checkoutId);
        if (!d.ok && d.reason === "provider_error") {
          // P-9: un checkout forse ancora vivo non si marca `expired`.
          counts.providerUnreachable += 1;
          console.error(
            `[tickets.pending_close_unreachable] order=${o.id} deactivate status=${d.status ?? "none"}`
          );
          continue;
        }
        if (d.ok) {
          counts.deactivated += 1;
          deactivated = true;
        }
        try {
          checkout = await getCheckout(checkoutId);
        } catch (e) {
          counts.providerUnreachable += 1;
          console.error(`[tickets.pending_close_unreachable] order=${o.id} reread`, e);
          continue;
        }
        verdict = classify(checkout, deactivated);
        if (verdict.kind === "needs_deactivation") {
          // 409 ma SumUp dice ancora PENDING senza transazioni: incoerenza
          // del fornitore, che non si risolve chiudendo.
          counts.inconsistent += 1;
          console.error(`[tickets.pending_inconsistent] order=${o.id} still_pending_after_409`);
          continue;
        }
      }

      switch (verdict.kind) {
        case "paid": {
          // Nessun update qui: il webhook rilegge PAID ed emette, un percorso solo.
          console.error(`[tickets.pending_paid_late] order=${o.id}`);
          const delivery = await deliverPaidCheckoutToWebhook(checkoutId, "close-pending-orders");
          if (delivery.ok) {
            counts.paidLate += 1;
          } else {
            counts.deliveryFailed += 1;
            console.error(
              `[tickets.pending_paid_delivery_failed] order=${o.id}: ${delivery.detail}`
            );
            // Un log non e' osservabile: l'organizer deve saperlo.
            await alertOrganizerPaidNotIssued({
              serviceClient,
              orderId: o.id,
              eventId: o.event_id,
              quantity: o.quantity,
              totalAmount: o.total_amount,
              cause: "paid_found_late_delivery_failed",
            });
          }
          break;
        }
        case "inconsistent":
          counts.inconsistent += 1;
          console.error(`[tickets.pending_inconsistent] order=${o.id}`);
          break;
        case "in_flight":
          counts.inFlight += 1;
          break;
        case "still_payable":
          counts.stillPayable += 1;
          break;
        case "never_attempted":
        case "declined": {
          const now = new Date().toISOString();
          const patch =
            verdict.kind === "never_attempted"
              ? {
                  status: "expired" as const,
                  closed_reason: "never_attempted" as const,
                  updated_at: now,
                }
              : {
                  status: "expired" as const,
                  closed_reason: "declined" as const,
                  closed_detail: verdict.detail,
                  payment_method: paymentMethodFromEntryMode(verdict.entryMode),
                  updated_at: now,
                };
          const { data: closed, error: closeError } = await serviceClient
            .from("ticket_orders")
            .update(patch)
            .eq("id", o.id)
            .eq("status", "pending")
            .select("id");
          if (closeError) {
            counts.other += 1;
            console.error(
              `[tickets.pending_close_write_failed] order=${o.id}: ${closeError.message}`
            );
          } else if (!closed || closed.length === 0) {
            // Qualcun altro ha vinto: tipicamente il webhook.
            counts.closeLost += 1;
          } else if (verdict.kind === "never_attempted") {
            counts.neverAttempted += 1;
          } else {
            counts.declined += 1;
          }
          break;
        }
        case "other":
          counts.other += 1;
          console.error(`[tickets.pending_close_unclassified] order=${o.id} ${verdict.detail}`);
          break;
        default:
          counts.other += 1;
          console.error(`[tickets.pending_close_unclassified] order=${o.id} unreachable`);
      }
    } catch (e) {
      counts.other += 1;
      console.error(`[cron.close_pending_orders.unexpected] order=${o.id}`, e);
    }
  }

  console.log("[cron.close_pending_orders]", JSON.stringify(counts));
  return NextResponse.json(counts);
}
