#!/usr/bin/env node
/**
 * verify-external-tickets.mjs — una serata venduta da un terzo non puo' mai
 * arrivare alla cassa nostra (quick 2026-10-13). Tre controlli statici:
 *   A  buildOrderQuote legge `external_tickets_seller` e rifiuta con
 *      QUOTE_NIGHT_SOLD_ELSEWHERE (il confine server; la UI e' UX), e la
 *      seconda strada, `purchaseTicket`, fa lo stesso e onora `sold_out`;
 *   B  ExternalTickets.tsx non importa azioni di acquisto ne' SumUp e resta un
 *      componente server (nessun "use client");
 *   C  nella pagina della serata il controllo d'acquisto per serata e' montato
 *      solo dietro `party.externalTickets === null &&`;
 *   D  lo 0 € non va mai a SumUp e la prenotazione gratuita non va sulle
 *      serate vendute altrove (fase 52.4, MIX-03): il preventivo rifiuta un
 *      tier a 0 € su ogni strada verso SumUp con QUOTE_FREE_TIER_USE_RESERVE
 *      prima del minimo, `purchaseTicket` lo rifiuta senza guardare il tipo di
 *      serata (vale anche per l'Event Pass), e `reserveFreeTickets` legge
 *      `external_tickets_seller` e rifiuta con free_night_sold_elsewhere.
 * Exit 0 = tutti passati; 1 = almeno uno fallito; 2 = un file illeggibile.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => {
  try {
    return readFileSync(join(ROOT, rel), "utf8");
  } catch (e) {
    console.error(`verify-external-tickets: ${rel} illeggibile: ${e.message}`);
    process.exit(2);
  }
};
const failures = [];
const fail = (code, msg) => failures.push(`${code}  ${msg}`);

// A — il confine server
const quote = read("src/lib/tickets/order-quote.ts");
if (!/\.select\("[^"]*external_tickets_seller[^"]*"\)/.test(quote)) fail("A1", "order-quote.ts non seleziona external_tickets_seller sulla serata");
if (!/const QUOTE_NIGHT_SOLD_ELSEWHERE = "quote_night_sold_elsewhere"/.test(quote)) fail("A2", "order-quote.ts non dichiara QUOTE_NIGHT_SOLD_ELSEWHERE");
if (!/refuse\(\s*QUOTE_NIGHT_SOLD_ELSEWHERE/.test(quote)) fail("A3", "order-quote.ts non rifiuta con QUOTE_NIGHT_SOLD_ELSEWHERE");
if (!/external_tickets_seller !== null/.test(quote)) fail("A4", "order-quote.ts non controlla external_tickets_seller !== null");
// A' — la SECONDA strada verso SumUp: `purchaseTicket` (sessione, Event Pass,
// intento ripreso da localStorage) non passa da buildOrderQuote. Trovata
// dalla revisione del ramo il 2026-10-13: senza questo controllo chi ha una
// sessione paga noi per una serata venduta dal locale.
const adminActions = read("src/app/(admin)/admin/events/actions.ts");
const purchaseStart = adminActions.indexOf("export async function purchaseTicket(");
if (purchaseStart < 0) fail("A5", "actions.ts non esporta purchaseTicket (il gate va aggiornato, non tolto)");
else {
  const body = adminActions.slice(purchaseStart, purchaseStart + 12000);
  if (!/\.select\("[^"]*external_tickets_seller[^"]*"\)/.test(body)) fail("A6", "purchaseTicket non legge external_tickets_seller sulla serata del tier");
  if (!/refuseTicketPurchase\(\s*"night_sold_elsewhere"/.test(body)) fail("A7", "purchaseTicket non rifiuta con night_sold_elsewhere");
  if (!/\.select\("[^"]*sold_out[^"]*"\)/.test(body)) fail("A8", "purchaseTicket non legge sold_out sui tier");
  if (!/t\.sold_out/.test(body)) fail("A9", "purchaseTicket non onora sold_out nella mappa degli stati");
}

// D — lo 0 € non va mai a SumUp (fase 52.4, MIX-03)
if (!/const QUOTE_FREE_TIER_USE_RESERVE = "quote_free_tier_use_reserve"/.test(quote)) fail("D1", "order-quote.ts non dichiara QUOTE_FREE_TIER_USE_RESERVE");
if (!/tier\.price === 0 && input\.goesToPaymentProvider !== false[^\n]*\n(?:[^\n]*\n){0,6}[^\n]*refuse\(\s*QUOTE_FREE_TIER_USE_RESERVE/.test(quote)) {
  fail("D2", "order-quote.ts non rifiuta un tier a 0 € diretto a SumUp con refuse(QUOTE_FREE_TIER_USE_RESERVE)");
}
if (quote.includes("QUOTE_TIER_FREE_ON_PAID_NIGHT")) fail("D3", "order-quote.ts lega ancora lo 0 € al tipo di serata (QUOTE_TIER_FREE_ON_PAID_NIGHT)");
if (purchaseStart >= 0) {
  const body = adminActions.slice(purchaseStart, purchaseStart + 12000);
  const bodyLines = body.split("\n");
  const at = bodyLines.findIndex((l) => /refuseTicketPurchase\(\s*"tier_free_on_paid_night"/.test(l));
  let why = null;
  if (at < 0) why = "purchaseTicket non rifiuta un tier a 0 € con tier_free_on_paid_night";
  else {
    let j = at;
    while (j >= 0 && !/\bif\s*\(/.test(bodyLines[j])) j -= 1;
    const cond = j >= 0 ? bodyLines[j] : "";
    if (!/price\)?\s*===\s*0/.test(cond)) why = `purchaseTicket: l'if prima di tier_free_on_paid_night non controlla price === 0 (${cond.trim()})`;
    else if (/access_type/.test(cond)) why = `purchaseTicket: il rifiuto dello 0 € dipende dal tipo di serata (${cond.trim()}) — l'Event Pass passerebbe`;
  }
  if (why) fail("D4", why);
}
const freeOrder = read("src/app/(public)/events/[slug]/free-order-actions.ts");
if (!/\.select\("[^"]*external_tickets_seller[^"]*"\)/.test(freeOrder) || !/free_night_sold_elsewhere/.test(freeOrder)) {
  fail("D5", "free-order-actions.ts non legge external_tickets_seller o non rifiuta con free_night_sold_elsewhere");
}

// B — il componente senza cassa
const ext = read("src/app/(public)/events/[slug]/ExternalTickets.tsx");
if (/^\s*["']use client["']/m.test(ext)) fail("B1", "ExternalTickets.tsx e' un client component");
for (const bad of ["purchaseTicket", "purchaseTicketsGuest", "sumup", "SumUp", "buildOrderQuote"]) {
  if (ext.includes(bad)) fail("B2", `ExternalTickets.tsx nomina ${bad}`);
}

// C — la guardia in pagina
const page = read("src/app/(public)/events/[slug]/page.tsx");
const lines = page.split("\n");
let partyLevelMounts = 0;
lines.forEach((line, i) => {
  if (!/<TierSelection/.test(line)) return;
  const isPartyLevel = /partyId=\{party\.id\}/.test(lines.slice(i, i + 4).join("\n"));
  if (!isPartyLevel) return;
  partyLevelMounts += 1;
  // La finestra e' il blocco JSX che inizia all'ultimo `{isUpcoming` sopra il
  // mount: la condizione e il mount sono separati da commenti lunghi, e una
  // finestra a righe fisse leggerebbe o troppo o troppo poco.
  let start = i;
  while (start > 0 && !/\{isUpcoming/.test(lines[start])) start -= 1;
  const window = lines.slice(start, i).join("\n");
  if (!/party\.externalTickets === null &&/.test(window)) {
    fail("C1", `page.tsx:${i + 1} monta TierSelection della serata senza la guardia party.externalTickets === null`);
  }
});
if (partyLevelMounts === 0) fail("C2", "page.tsx non monta alcun TierSelection per serata: il gate non ha nulla da guardare");

if (failures.length) {
  console.error("verify-external-tickets: FAIL\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("verify-external-tickets: ok (A rifiuto server su entrambe le strade, B componente senza cassa, C guardia in pagina, D lo 0 € non va a SumUp ne' la prenotazione sulle serate esterne)");
