"use server";

import { createCheckout, deactivateCheckout, getCheckout } from "@/lib/sumup";
import { CHECKOUT_TTL_MS } from "@/lib/tickets/checkout-window";
import { deliverPaidCheckoutToWebhook } from "@/lib/tickets/replay-order-delivery";
import { buildOrderQuote, type OrderQuoteRefusal } from "@/lib/tickets/order-quote";
import { getServiceClient } from "@/lib/supabase/service";
import { logMoneyPathFailure } from "@/lib/failure/money-path";
import { redactDbError } from "@/lib/errors/redact";
import { verifyTicketToken } from "@/utils/qr";

/**
 * resume-actions.ts — riprendere LO STESSO ordine dal suo link (CART-04).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * COSA FA, E COSA NON FA
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Chi ha chiuso il modulo carta ritrova il suo ordine dal link permanente (la
 * mail di ripresa porta lo stesso link). Da `pending` **e da `expired`** (Q3:
 * `expired → pending` e' lecito perche' non c'e' incasso in mezzo) si riapre il
 * pagamento sullo **stesso `ticket_orders.id`**: tier, quantita', sconto e
 * totale restano quelli scelti. Non si riscrive nulla dell'acquirente.
 *
 * ── LA CREDENZIALE E' LA FIRMA ──────────────────────────────────────────────
 *
 * Come la pagina dell'ordine: `verifyTicketToken` prima, client di servizio
 * dopo (forma di `redeemDrinkTokenGuest`, `menu/actions.ts`). Il client di
 * servizio e' giustificato perche' chi riprende non ha una sessione — ha solo il
 * link — e la firma HMAC su un uuid casuale e' la credenziale. **Firma invalida e
 * ordine assente danno la stessa risposta**: distinguerle farebbe di questa
 * azione un oracolo sugli identificativi d'ordine (T-52.2-05).
 *
 * ── IL PREVENTIVO SI RIFA' ──────────────────────────────────────────────────
 *
 * Un tier chiuso, esaurito, o un totale diverso da quello registrato → rifiuto
 * con la sua frase, **nessun checkout nuovo** (P-8, T-52.2-27). Riprendere un
 * ordine non e' una porta laterale verso un tier che non e' piu' in vendita.
 *
 * ── IL CHECKOUT NON SI RIUSA SE NON E' ANCORA PAGABILE ──────────────────────
 *
 * - Il vecchio checkout e' PAID → lo si consegna al webhook (che rilegge lo
 *   stato da SumUp: principio 4) e si manda la persona al ritorno.
 * - E' PENDING, non scaduto, senza transazioni, e l'ordine e' `pending` → si
 *   riusa: un checkout in piu' sarebbe solo rumore.
 * - Altrimenti: **prima** si disattiva il vecchio, **poi** si crea il nuovo con
 *   `checkout_reference = <orderId>-r<n>` (SumUp risponde 409
 *   `DUPLICATED_CHECKOUT` sul riferimento originale). Se la disattivazione
 *   fallisce per causa ignota ci si ferma: un vecchio checkout ancora pagabile e
 *   non piu' legato all'ordine sarebbe un incasso che il webhook non trova.
 * - L'update e' condizionato sul **vecchio** `sumup_checkout_id` e sugli stati
 *   riprendibili: zero righe = qualcun altro ha vinto, si disattiva il nuovo e
 *   si risponde `busy` (T-52.2-02; guardia di `replay-order-delivery.ts`).
 *
 * ── NESSUNA SECONDA MAIL, NESSUN LUOGO ──────────────────────────────────────
 *
 * Nessuna scrittura di `resume_email_*`: la mail di ripresa e' una per ordine
 * per costruzione (piano 52.2-05). Nessuna colonna che descriva un posto e'
 * letta: e' misurato dal controllo G di `scripts/verify-venue-surfaces.mjs`.
 */

export type ResumeRefusal =
  | "invalid"
  | "not_resumable"
  | "no_longer_on_sale"
  | "price_changed"
  | "unreadable"
  | "provider_unreachable"
  | "busy";

export type ResumeTicketOrderResult =
  | { ok: true; checkoutId: string; orderId: string }
  | { ok: true; alreadyPaid: true; redirectTo: string }
  | { ok: false; refusal: ResumeRefusal; error: string };

const RESUME_ERROR: Record<ResumeRefusal, string> = {
  invalid: "This order link is not valid.",
  not_resumable: "This order can't be resumed.",
  no_longer_on_sale:
    "Tickets for this tier are no longer on sale, so this order can't be completed. Nothing was charged.",
  price_changed:
    "This order can no longer be completed at the same price — start again from the event page. Nothing was charged.",
  unreadable:
    "We could not check this order just now. Nothing was charged — try again in a moment.",
  provider_unreachable:
    "We could not reach the payment provider just now. Nothing was charged — try again in a moment.",
  busy: "This order is being resumed elsewhere — reload the page.",
};

function refuse(refusal: ResumeRefusal): ResumeTicketOrderResult {
  return { ok: false, refusal, error: RESUME_ERROR[refusal] };
}

/**
 * Quale rifiuto del preventivo diventa quale rifiuto della ripresa.
 *
 * Tre famiglie, perche' hanno tre rimedi diversi per chi legge: il tier non e'
 * piu' acquistabile (nessun rimedio su questo ordine), il prezzo non torna
 * (ricominciare dalla serata), la lettura non ha risposto (riprovare).
 */
const QUOTE_TO_RESUME: Record<OrderQuoteRefusal, ResumeRefusal> = {
  quote_unreadable: "unreadable",
  quote_night_not_found: "not_resumable",
  quote_night_not_on_sale: "no_longer_on_sale",
  quote_tier_not_found: "no_longer_on_sale",
  quote_tier_other_night: "not_resumable",
  quote_quantity_invalid: "not_resumable",
  quote_quantity_over_cap: "not_resumable",
  quote_tier_not_on_sale: "no_longer_on_sale",
  quote_tier_sold_out: "no_longer_on_sale",
  quote_tier_not_enough_seats: "no_longer_on_sale",
  quote_discount_unknown: "price_changed",
  quote_discount_inactive: "price_changed",
  quote_discount_other_night: "price_changed",
  quote_discount_other_tier: "price_changed",
  quote_discount_exhausted: "price_changed",
  quote_below_minimum: "price_changed",
  quote_tier_free_on_paid_night: "no_longer_on_sale",
  // 2026-10-05 — chiusura di default a fine serata − 2 h (`sales-window.ts`):
  // un ordine aperto prima non si riprende dopo. Il tier chiuso non e' piu' in
  // vendita; il codice chiuso cambia il prezzo, come gli altri rifiuti di codice.
  tier_sales_closed: "no_longer_on_sale",
  quote_discount_sales_closed: "price_changed",
};

function toCents(euro: number): number {
  return Math.round(Number(euro) * 100);
}

function callbackPath(orderId: string): string {
  return `/payment/callback?order=${orderId}&ctx=ticket_order`;
}

export async function resumeTicketOrder(token: string): Promise<ResumeTicketOrderResult> {
  // 1. La firma. Segreto assente → stessa risposta di una firma sbagliata, ma
  //    con la sua riga di log: sono due guasti che si riparano in posti diversi.
  if (!(process.env.TICKET_SIGNING_SECRET ?? "").trim()) {
    console.error(
      "[tickets.resume_signing_secret_missing] TICKET_SIGNING_SECRET assente: nessuna ripresa possibile"
    );
    return refuse("invalid");
  }
  const orderId = typeof token === "string" ? verifyTicketToken(token) : null;
  if (!orderId) return refuse("invalid");

  // 2. Client di servizio: la firma e' la credenziale (vedi il docblock).
  const service = getServiceClient();

  const { data: order, error: orderError } = await service
    .from("ticket_orders")
    .select(
      "id, status, event_id, party_id, tier_id, quantity, discount_code_id, total_amount, sumup_checkout_id, checkout_attempt"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error(`[tickets.resume_order_unreadable] order=${orderId} ${redactDbError(orderError)}`);
    return refuse("unreadable");
  }
  if (!order) return refuse("invalid");

  if (order.status !== "pending" && order.status !== "expired") {
    return refuse("not_resumable");
  }
  // Un ordine gratuito non ha checkout: non c'e' niente da riprendere.
  if (!order.sumup_checkout_id || !order.party_id || !order.tier_id) {
    return refuse("not_resumable");
  }

  const oldCheckoutId: string = order.sumup_checkout_id;

  // 3. Il preventivo, rifatto con cio' che l'ordine ha registrato.
  const quoted = await buildOrderQuote(service, {
    partyId: order.party_id,
    tierId: order.tier_id,
    quantity: order.quantity,
    discountCodeId: order.discount_code_id ?? null,
  });

  if (!quoted.ok) {
    const refusal = QUOTE_TO_RESUME[quoted.refusal] ?? "not_resumable";
    console.error(
      `[tickets.resume_quote_refused] order=${orderId} quote=${quoted.refusal} resume=${refusal}`
    );
    return refuse(refusal);
  }
  const quote = quoted.quote;

  if (toCents(quote.totalAmount) !== toCents(order.total_amount)) {
    console.error(
      `[tickets.resume_price_changed] order=${orderId} stored=${order.total_amount} quoted=${quote.totalAmount}`
    );
    return refuse("price_changed");
  }

  // 4. Il vecchio checkout, letto dal fornitore.
  type Checkout = Awaited<ReturnType<typeof getCheckout>>;
  const readOld = async (): Promise<Checkout | null> => {
    try {
      return await getCheckout(oldCheckoutId);
    } catch (error) {
      logMoneyPathFailure("tickets.resume_provider_unreachable", {
        code: null,
        message: error instanceof Error ? error.message : null,
      });
      return null;
    }
  };

  const deliverPaid = async (): Promise<ResumeTicketOrderResult> => {
    // Il webhook rilegge lo stato con GET checkout: il corpo non e' creduto.
    const delivered = await deliverPaidCheckoutToWebhook(oldCheckoutId, "resume-order");
    if (!delivered.ok) {
      console.error(
        `[tickets.resume_paid_delivery_failed] order=${orderId} status=${delivered.status ?? "none"}`
      );
    }
    // Anche se la consegna non ha risposto, il ritorno dal pagamento rilegge
    // lo stato e fa da seconda rete: la persona va li', non su un errore.
    return { ok: true, alreadyPaid: true, redirectTo: callbackPath(orderId) };
  };

  const old = await readOld();
  if (!old) return refuse("provider_unreachable");

  if (old.status === "PAID") return deliverPaid();

  const validUntilMs = old.valid_until ? Date.parse(old.valid_until) : NaN;
  if (
    old.status === "PENDING" &&
    order.status === "pending" &&
    Number.isFinite(validUntilMs) &&
    validUntilMs > Date.now() &&
    (old.transactions ?? []).length === 0
  ) {
    return { ok: true, checkoutId: oldCheckoutId, orderId };
  }

  // 5. Disattivare il vecchio PRIMA di crearne uno nuovo.
  const deactivated = await deactivateCheckout(oldCheckoutId);
  if (!deactivated.ok) {
    if (deactivated.reason === "already_processed") {
      const reread = await readOld();
      if (!reread) return refuse("provider_unreachable");
      if (reread.status === "PAID") return deliverPaid();
      console.error(
        `[tickets.resume_old_checkout_processed] order=${orderId} status=${reread.status}`
      );
      return refuse("busy");
    }
    // Causa ignota: non si prosegue (vedi docblock).
    logMoneyPathFailure("tickets.resume_provider_unreachable", {
      code: String(deactivated.status ?? "none"),
      message: "deactivate old checkout failed",
    });
    return refuse("provider_unreachable");
  }

  // 6. Il checkout nuovo, con un riferimento nuovo.
  const attempt = (Number(order.checkout_attempt) || 0) + 1;
  const checkoutReference = `${orderId}-r${attempt}`; // 36 + 2 + cifre: ≤ 64

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;
  const redirectUrl = new URL("/payment/callback", process.env.NEXT_PUBLIC_APP_URL);
  redirectUrl.searchParams.set("order", orderId);
  redirectUrl.searchParams.set("ctx", "ticket_order");
  redirectUrl.searchParams.set("slug", quote.eventSlug);

  let newCheckoutId: string;
  try {
    const created = await createCheckout({
      amount: quote.totalAmount,
      currency: "EUR",
      description: quote.description,
      checkoutReference,
      returnUrl,
      redirectUrl: redirectUrl.toString(),
      validUntil: new Date(Date.now() + CHECKOUT_TTL_MS).toISOString(),
    });
    newCheckoutId = created.id;
  } catch (error) {
    logMoneyPathFailure("tickets.resume_checkout_create_failed", {
      code: null,
      message: error instanceof Error ? error.message : null,
    });
    return refuse("provider_unreachable");
  }

  // 7. L'update sul posto, condizionato sul vecchio checkout.
  const { data: updated, error: updateError } = await service
    .from("ticket_orders")
    .update({
      sumup_checkout_id: newCheckoutId,
      checkout_attempt: attempt,
      status: "pending",
      closed_reason: null,
      closed_detail: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("sumup_checkout_id", oldCheckoutId)
    .in("status", ["pending", "expired"])
    .select("id");

  if (updateError || !updated || updated.length === 0) {
    if (updateError) {
      console.error(
        `[tickets.resume_update_failed] order=${orderId} ${redactDbError(updateError)}`
      );
    } else {
      console.error(`[tickets.resume_lost_race] order=${orderId} attempt=${attempt}`);
    }
    // Il checkout nuovo non e' legato a nessuna riga: va chiuso, o sarebbe un
    // incasso che il webhook non trova.
    const closed = await deactivateCheckout(newCheckoutId);
    if (!closed.ok) {
      console.error(
        `[tickets.resume_orphan_checkout_open] order=${orderId} reason=${closed.reason}`
      );
    }
    return refuse(updateError ? "unreadable" : "busy");
  }

  console.log(`[tickets.order_resumed] order=${orderId} attempt=${attempt} from=${order.status}`);
  return { ok: true, checkoutId: newCheckoutId, orderId };
}
