#!/usr/bin/env node
/**
 * verify-external-tickets.mjs — una serata venduta da un terzo non puo' mai
 * arrivare alla cassa nostra (quick 2026-10-13). Tre controlli statici:
 *   A  buildOrderQuote legge `external_tickets_seller` e rifiuta con
 *      QUOTE_NIGHT_SOLD_ELSEWHERE (il confine server; la UI e' UX);
 *   B  ExternalTickets.tsx non importa azioni di acquisto ne' SumUp e resta un
 *      componente server (nessun "use client");
 *   C  nella pagina della serata il controllo d'acquisto per serata e' montato
 *      solo dietro `party.externalTickets === null &&`.
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
  const window = lines.slice(Math.max(0, i - 60), i).join("\n");
  if (!/party\.externalTickets === null &&/.test(window)) {
    fail("C1", `page.tsx:${i + 1} monta TierSelection della serata senza la guardia party.externalTickets === null`);
  }
});
if (partyLevelMounts === 0) fail("C2", "page.tsx non monta alcun TierSelection per serata: il gate non ha nulla da guardare");

if (failures.length) {
  console.error("verify-external-tickets: FAIL\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("verify-external-tickets: ok (A rifiuto server, B componente senza cassa, C guardia in pagina)");
