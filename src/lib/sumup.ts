import SumUp, { APIError } from "@sumup/sdk";

// SDK singleton -- reused across all calls, do NOT instantiate per-request
const sumup = new SumUp({
  apiKey: process.env.SUMUP_API_KEY!,
});

// Export singleton for direct SDK access
export { sumup };

export async function createCheckout(params: {
  amount: number;
  currency: string;
  description: string;
  checkoutReference: string;
  returnUrl: string;
  redirectUrl?: string;
  /**
   * Scadenza ISO del checkout (`valid_until` di SumUp). **Opzionale e senza
   * default**: per SumUp un checkout senza valore «does not have an expiration
   * time». Solo i biglietti d'ospite la passano (CART-02, con
   * `CHECKOUT_TTL_MS`); Event Pass e drink non passano nulla e restano identici
   * — un default qui cambierebbe in silenzio anche loro.
   */
  validUntil?: string;
}) {
  try {
    const checkout = await sumup.checkouts.create({
      amount: params.amount,
      currency: params.currency as "EUR",
      merchant_code: process.env.SUMUP_MERCHANT_CODE!,
      checkout_reference: params.checkoutReference,
      description: params.description,
      return_url: params.returnUrl,
      redirect_url: params.redirectUrl,
      valid_until: params.validUntil,
    });

    return checkout as { id: string; status: string; checkout_reference: string };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(
        `SumUp checkout creation failed: ${JSON.stringify(error.error)}`
      );
    }
    throw error;
  }
}

export async function getCheckout(checkoutId: string) {
  try {
    const checkout = await sumup.checkouts.get(checkoutId);

    return checkout as {
      id: string;
      status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
      checkout_reference: string;
      amount: number;
      currency: string;
      /** Scadenza del checkout; assente o `null` = il checkout non scade. */
      valid_until?: string | null;
      transactions: Array<{
        id: string;
        transaction_code: string;
        status: string;
        amount?: number;
        /**
         * Enum SDK minuscolo con spazi (`"apple pay"`, `"customer entry"`),
         * ma maiuscolo con trattino basso negli esempi dei documenti: si
         * interpreta solo attraverso `paymentMethodFromEntryMode`.
         */
        entry_mode?: string;
      }>;
    };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(`SumUp checkout retrieval failed: ${error.status}`);
    }
    throw error;
  }
}

/**
 * Disattiva un checkout ancora aperto (`sumup.checkouts.deactivate`).
 *
 * **Non solleva**, e distingue le due cause che il chiamante tratta in modo
 * opposto:
 *
 * - `already_processed` — SumUp risponde 409: il checkout e' gia' stato
 *   processato e non si puo' disattivare. **Non e' un fallimento**: vuol dire
 *   che qualcuno ha pagato (o tentato) nel frattempo. Il chiamante rilegge il
 *   checkout con `getCheckout` e riapplica la sua tabella di stati — un PAID
 *   trovato qui va consegnato, non chiuso.
 * - `provider_error` — ogni altro errore (rete, 5xx, 401…): lo stato e'
 *   **ignoto**, e il chiamante non chiude l'ordine su un'incognita.
 */
export async function deactivateCheckout(
  checkoutId: string
): Promise<
  | { ok: true }
  | { ok: false; reason: "already_processed" }
  | { ok: false; reason: "provider_error"; status: number | null }
> {
  try {
    await sumup.checkouts.deactivate(checkoutId);
    return { ok: true };
  } catch (error) {
    if (error instanceof APIError && error.status === 409) {
      return { ok: false, reason: "already_processed" };
    }
    const status = error instanceof APIError ? error.status : null;
    console.error(
      `[sumup.checkout_deactivate_failed] status=${status ?? "none"}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { ok: false, reason: "provider_error", status };
  }
}

/**
 * Lettura storica, usata dal ramo **drink** di `reconcile-refunds`.
 *
 * **Non va corretta e non va riusata per i biglietti** (52.2-RESEARCH P-2):
 * `refunded_amount` non esiste nel tipo `TransactionFull` dell'SDK, quindi il
 * cast qui sotto legge un campo che il fornitore non promette. Il ramo drink
 * resta cieco come oggi — dichiarato come debito — perche' i drink rimborsano
 * per gettone e un predicato corretto porterebbe a `refunded` tutti i gettoni
 * dell'ordine al primo rimborso parziale. I biglietti leggono
 * `readTransactionRefunds`.
 */
export async function getTransaction(transactionCode: string) {
  const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
  const detail = await sumup.transactions.get(merchantCode, {
    transaction_code: transactionCode,
  });

  return detail as {
    transaction_code: string;
    amount: number;
    currency: string;
    status: string;
    refunded_amount?: number;
  };
}

/**
 * Quanto di una transazione e' stato rimborsato, letto **dal fornitore** e dal
 * campo giusto (RFD-02).
 *
 * ── Perche' non `refunded_amount`, e perche' non `status` ─────────────────────
 *
 * - `refunded_amount` **non esiste** nel tipo `TransactionFull` dell'SDK
 *   (`@sumup/sdk`, `transaction-full.d.ts`): leggerlo da' sempre `undefined`,
 *   cioe' «nessun rimborso», su qualunque transazione.
 * - `status` puo' dire `SUCCESSFUL` su una transazione **rimborsata per
 *   intero** — misurato il 2026-09-30. Non e' un segnale su cui cancellare o
 *   non cancellare un biglietto.
 *
 * La fonte e' `events[]`: ogni evento `type === "REFUND"` con `status` diverso
 * da `FAILED` conta, e la somma e' `refundedTotal`, arrotondata al centesimo
 * perche' le somme di decimali in virgola mobile non tornano mai esatte.
 * `simple_status` si restituisce accanto come secondo indizio, non come verdetto.
 *
 * ── Assunzioni aperte (52.2-RESEARCH A4, A5 — le accerta la procedura E) ────
 *
 * - A4: un `REFUND` completato porta uno `status` diverso da `FAILED`. Se un
 *   rimborso ancora in volo (`PENDING`) si rivelasse revocabile, contarlo come
 *   fatto anticiperebbe una cancellazione.
 * - A5: `events[]` e `simple_status` sono presenti nella risposta di
 *   `transactions.get` v2.1 per il nostro merchant. Se mancassero, `refundEvents`
 *   sarebbe vuoto e `refundedTotal` zero: il chiamante vedrebbe «nessun
 *   rimborso», che e' il verso che non cancella nulla.
 *
 * **Solleva** su errore del fornitore, con la stessa forma normalizzata di
 * `getCheckout`: il chiamante tratta l'eccezione come **incognita** — ne'
 * rimborsato ne' non rimborsato. `getTransaction` resta invariata accanto a
 * questa, per il ramo drink.
 */
export async function readTransactionRefunds(transactionCode: string): Promise<{
  amount: number;
  refundedTotal: number;
  simpleStatus: string | null;
  refundEvents: Array<{
    amount: number;
    timestamp: string | null;
    status: string | null;
  }>;
}> {
  let detail: Awaited<ReturnType<typeof sumup.transactions.get>>;
  try {
    detail = await sumup.transactions.get(process.env.SUMUP_MERCHANT_CODE!, {
      transaction_code: transactionCode,
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(`SumUp transaction retrieval failed: ${error.status}`);
    }
    throw error;
  }

  const refundEvents = (detail.events ?? [])
    .filter((e) => e.type === "REFUND" && e.status !== "FAILED")
    .map((e) => ({
      amount: typeof e.amount === "number" ? e.amount : 0,
      timestamp: e.timestamp ?? null,
      status: e.status ?? null,
    }));

  const refundedTotal =
    Math.round(refundEvents.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;

  return {
    amount: typeof detail.amount === "number" ? detail.amount : 0,
    refundedTotal,
    simpleStatus: detail.simple_status ?? null,
    refundEvents,
  };
}

/**
 * Il metodo di pagamento, dall'`entry_mode` di una transazione del checkout
 * (CART-01, proprieta' `method` di `ticket_checkout_paid`).
 *
 * L'enum dell'SDK e' minuscolo con spazi (`"apple pay"`, `"google pay"`,
 * `"customer entry"`, `entry-mode.d.ts`); gli esempi dei documenti lo scrivono
 * maiuscolo con trattino basso (`CUSTOMER_ENTRY`). Si normalizzano entrambi
 * togliendo spazi e trattini bassi. Tutto cio' che non e' uno dei tre — o che
 * manca — e' `"other"`: meglio un «altro» dichiarato che una carta inventata.
 */
export function paymentMethodFromEntryMode(
  entryMode: string | null | undefined
): "apple_pay" | "google_pay" | "card" | "other" {
  if (!entryMode) return "other";
  switch (entryMode.toLowerCase().replace(/[\s_]/g, "")) {
    case "applepay":
      return "apple_pay";
    case "googlepay":
      return "google_pay";
    case "customerentry":
      return "card";
    default:
      return "other";
  }
}

export async function refundTransaction(transactionCode: string, amount?: number) {
  try {
    await sumup.transactions.refund(
      transactionCode,
      amount !== undefined ? { amount } : undefined
    );

    // Server returns 204 No Content -- return same shape as before
    return { success: true as const };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(`SumUp refund failed: ${JSON.stringify(error.error)}`);
    }
    throw error;
  }
}
