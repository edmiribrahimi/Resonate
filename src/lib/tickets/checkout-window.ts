/**
 * Quanto vive un checkout d'ospite, e quanto puo' restare `pending` un ordine
 * prima di meritare attenzione.
 *
 * Trenta minuti, e la finestra e' **dichiarata** invece che scelta di volta in
 * volta: un checkout si paga in pochi minuti, quindi mezz'ora e' abbastanza
 * lunga da non toccare chi sta ancora digitando la carta e abbastanza corta da
 * far comparire prima della serata un ordine comprato lo stesso pomeriggio.
 * (Il ragionamento e' quello del docblock di `FINESTRA_PENDING_MS` nella card
 * *Orders without tickets*, `admin/(work)/events/[id]/tickets/page.tsx`.)
 *
 * **Una costante sola**, non quattro numeri uguali per caso. La leggono:
 *
 * - `purchaseTicketsGuest` — come `validUntil` del checkout SumUp
 *   (`createCheckout`), perche' un checkout senza `valid_until` non scade mai;
 * - `resumeTicketOrder` — per decidere se il checkout di un ordine e' ancora
 *   riprendibile;
 * - il cron `close-pending-orders` — per decidere quando un `pending` e' da
 *   chiudere;
 * - la card admin *Orders without tickets* (la importa il piano 52.2-06, al
 *   posto del suo `FINESTRA_PENDING_MS` locale).
 *
 * Nessun `server-only`: la card admin e il cron la leggono entrambi, e un numero
 * non e' un segreto.
 */
export const CHECKOUT_TTL_MS = 30 * 60 * 1000;
