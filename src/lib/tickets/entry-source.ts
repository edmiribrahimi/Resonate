/**
 * entry-source.ts — da dove arriva chi compra, in cinque parole (DBT-15, D-52.1-20).
 *
 * Il link d'ingresso alla pagina di una serata puo' portare `utm_source`
 * (il nome che scrivono gli strumenti di inserzione e i generatori di link).
 * Questo modulo lo **riduce** al vocabolario chiuso di
 * `ticket_orders_entry_source_check` (migration `20261001120300_order_entry_source.sql`):
 *
 *   instagram   `ig`, `instagram`, `instagram.com`, `l.instagram.com`
 *   newsletter  `newsletter`, `email`
 *   flyer       `flyer`, `volantino`, `qr`
 *   direct      parametro assente o vuoto
 *   other       un parametro c'era, ma non e' fra quelli riconosciuti
 *
 * Confronto senza maiuscole e dopo `trim`.
 *
 * ── PERCHE' IL GREZZO NON SI SALVA ─────────────────────────────────────────
 *
 * Gate PII di `comms-analytics.md`: un testo libero preso da un URL e' un
 * vettore di dati personali (un indirizzo, un nome, un identificativo di
 * campagna cucito su una persona). L'imbuto ha bisogno di una parola su cinque,
 * non di cio' che c'era scritto: la riduzione avviene **sul server, prima
 * dell'insert**, e il grezzo non arriva mai al database ne' ai log. Lo stesso
 * modello del ramo `device` di `purchaseTicketsGuest`: un bit, il resto si
 * butta.
 *
 * ── VINCOLI DI FORMA ───────────────────────────────────────────────────────
 *
 * Puro, senza import e senza direttiva server: lo importano sia la Server
 * Action sia `scripts/check-entry-source.mjs`, che lo carica con il type
 * stripping di Node — quindi solo sintassi cancellabile (niente `enum`, niente
 * `namespace`).
 */

export const ENTRY_SOURCES = [
  "instagram",
  "newsletter",
  "flyer",
  "direct",
  "other",
] as const;

export type EntrySource = (typeof ENTRY_SOURCES)[number];

const INSTAGRAM = new Set(["ig", "instagram", "instagram.com", "l.instagram.com"]);
const NEWSLETTER = new Set(["newsletter", "email"]);
const FLYER = new Set(["flyer", "volantino", "qr"]);

/**
 * Riduce un `utm_source` grezzo (o la sua assenza) a uno dei cinque valori.
 * Il valore arriva da un browser: un non-stringa e' possibile e vale `other`.
 */
export function reduceEntrySource(raw: string | null | undefined): EntrySource {
  if (raw === null || raw === undefined) return "direct";
  if (typeof raw !== "string") return "other";
  const value = raw.trim().toLowerCase();
  if (value === "") return "direct";
  if (INSTAGRAM.has(value)) return "instagram";
  if (NEWSLETTER.has(value)) return "newsletter";
  if (FLYER.has(value)) return "flyer";
  return "other";
}
