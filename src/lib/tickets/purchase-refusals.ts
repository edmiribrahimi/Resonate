/**
 * I rifiuti ATTESI dell'acquisto con sessione (`purchaseTicket`, oggi solo
 * l'Event Pass), con la loro frase — in un posto solo.
 *
 * ── PERCHE' ESISTE (2026-10-05, quarto intervento del quick «codice benefit») ─
 *
 * In un build di produzione Next **redige il messaggio** di un errore sollevato
 * da una Server Action: chi compra legge «An error occurred in the Server
 * Components render…» al posto di «Sold out». Quindi un rifiuto atteso non si
 * solleva: **si restituisce** come `{ ok: false, reason, message }` e la pagina
 * lo mostra cosi' com'e'. Si solleva solo il guasto vero, dopo un
 * `console.error` categorizzato (`[ticket.purchase_failed] stage=… code=…`).
 *
 * Le frasi sono **quelle che i `throw` portavano gia'**: non ne nasce nessuna
 * nuova. Il percorso della serata (`purchaseTicketsGuest`) ha le sue cause in
 * `order-quote.ts` e restituiva gia' valori — non passa di qui.
 *
 * Questo modulo non e' una Server Action (niente `"use server"`): e' importato
 * dall'azione e non espone nulla al browser.
 */
import { CODE_SALES_CLOSED_MESSAGE, CODE_SOLD_OUT_MESSAGE } from "./sales-window";

export const TICKET_PURCHASE_MESSAGE = {
  not_authenticated: "Not authenticated",
  tier_not_found: "Ticket tier not found",
  // Lo stato del tier si compone nella frase, come faceva il `throw`.
  tier_not_available: "This ticket tier is not available",
  night_not_found: "Sub-event not found",
  tier_other_night: "Tier does not belong to this sub-event's event",
  tier_sales_closed:
    "Sales for this ticket type have closed for this night (tier_sales_closed). Nothing was charged.",
  tier_free_on_paid_night:
    "This ticket type is not on sale for this night (tier_free_on_paid_night). Nothing was charged.",
  already_has_night_ticket: "You already have a ticket for this sub-event",
  already_has_event_pass: "You already have an Event Pass for this event",
  event_not_found: "Event not found",
  discount_unknown: "Invalid discount code",
  discount_inactive: "Discount code is no longer active",
  discount_other_night: "Code not valid for this event",
  discount_other_tier: "Code not valid for this tier",
  discount_exhausted: CODE_SOLD_OUT_MESSAGE,
  discount_sales_closed: CODE_SALES_CLOSED_MESSAGE,
  discount_below_minimum: "Discount would bring price below minimum (€1.00)",
  below_minimum:
    "This order is below the minimum a card payment can take (€1.00). Nothing was charged.",
} as const;

export type TicketPurchaseRefusalReason = keyof typeof TICKET_PURCHASE_MESSAGE;

export type TicketPurchaseRefusal = {
  ok: false;
  success: false;
  reason: TicketPurchaseRefusalReason;
  message: string;
};

/** Il rifiuto, con la sua frase. `detail` specializza la frase base. */
export function refuseTicketPurchase(
  reason: TicketPurchaseRefusalReason,
  detail?: string
): TicketPurchaseRefusal {
  const base = TICKET_PURCHASE_MESSAGE[reason];
  return { ok: false, success: false, reason, message: detail ? `${base} ${detail}` : base };
}

/**
 * Il guasto vero: si logga con la sua fase e il suo codice, poi chi chiama
 * solleva. La frase per chi compra la mette la pagina («Something went wrong.
 * Try again.»), perche' in produzione il messaggio non arriverebbe comunque.
 */
export function logTicketPurchaseFailure(stage: string, code: string | null | undefined): void {
  console.error(`[ticket.purchase_failed] stage=${stage} code=${code ?? "none"}`);
}

/** PostgREST: `.single()` senza righe. E' un «non c'e'», non un guasto. */
export const POSTGREST_NO_ROWS = "PGRST116";
