"use server";

import { getServiceClient } from "@/lib/supabase/service";
import { redactDbError } from "@/lib/errors/redact";
import { verifyTicketToken } from "@/utils/qr";

/**
 * checkout-form-actions.ts — il segnale «modulo di pagamento aperto» (DBT-15, D-52.1-20).
 *
 * ── PERCHE' ESISTE ──────────────────────────────────────────────────────────
 *
 * Un carrello abbandonato si ferma in due punti diversi: chi non ha mai visto
 * il modulo carta e chi l'ha visto e se n'e' andato. **L'API di checkout di
 * SumUp non lo sa**: un checkout scaduto non dice se il modulo e' stato
 * mostrato. Il segnale viene quindi dal browser, quando il widget si carica, e
 * porta `ticket_orders.checkout_form` da `not_opened` a `opened`. «Tentato e
 * rifiutato» resta della classificazione del cron, che legge SumUp.
 *
 * ── LA CREDENZIALE E' LA FIRMA ──────────────────────────────────────────────
 *
 * Una Server Action e' un endpoint pubblico. L'unica cosa accettata e' l'order
 * token HMAC che `purchaseTicketsGuest` ha gia' restituito a chi compra (lo
 * stesso modello di `resumeTicketOrder`): **mai un id in chiaro**, quindi
 * nessuno puo' segnare l'ordine di un altro. Firma verificata prima di ogni
 * lettura.
 *
 * ── COSA TOCCA, E COSA NON TOCCA MAI ───────────────────────────────────────
 *
 * Un solo `UPDATE` di una sola colonna, condizionato a `status = 'pending'` e
 * `checkout_form = 'not_opened'`: idempotente (un secondo segnale non cambia
 * nulla), cieco a un ordine gia' pagato o scaduto, cieco agli ordini nati prima
 * della colonna (NULL). **Non tocca lo stato del pagamento, ne' importi, ne'
 * dati personali**: il denaro non si fida di chi lo annuncia, e questo segnale
 * non annuncia nulla sul denaro.
 *
 * ── LA SOTTOSTIMA, DICHIARATA ──────────────────────────────────────────────
 *
 * Il chiamante non lo attende e ne ignora il fallimento: un segnale perso (rete
 * caduta, scheda chiusa subito) lascia `not_opened` su un ordine il cui modulo
 * e' stato visto. «Opened» e' quindi un minimo, e la nota del pannello
 * dell'imbuto (piano 52.1-24) lo dice.
 */
export async function markCheckoutFormOpened(
  orderToken: string
): Promise<{ ok: true; changed: boolean } | { ok: false; reason: "invalid" | "failed" }> {
  if (!(process.env.TICKET_SIGNING_SECRET ?? "").trim()) {
    console.error(
      "[tickets.checkout_form_signing_secret_missing] TICKET_SIGNING_SECRET assente: segnale «modulo aperto» non verificabile"
    );
    return { ok: false, reason: "invalid" };
  }
  const orderId = typeof orderToken === "string" ? verifyTicketToken(orderToken) : null;
  if (!orderId) {
    console.warn("[tickets.checkout_form_invalid_token] segnale con una firma non valida");
    return { ok: false, reason: "invalid" };
  }

  const { data, error } = await getServiceClient()
    .from("ticket_orders")
    .update({ checkout_form: "opened" })
    .eq("id", orderId)
    .eq("status", "pending")
    .eq("checkout_form", "not_opened")
    .select("id");

  if (error) {
    console.error(`[tickets.checkout_form_failed] order=${orderId} ${redactDbError(error)}`);
    return { ok: false, reason: "failed" };
  }

  // Zero righe: gia' aperto, gia' pagato o scaduto, o ordine nato prima della
  // colonna. Nessuno di questi e' un errore.
  return { ok: true, changed: (data ?? []).length > 0 };
}
