import { partyEndInstant } from "@/utils/datetime";

/**
 * Fino a quando una serata vende — la chiusura di DEFAULT dei tier e dei codici.
 *
 * ── La regola, decisa dal proprietario il 2026-10-05 ────────────────────────
 *
 * «tiers e codici su cui non e' stata scelta una scadenza possono essere
 * acquistati/utilizzati fino a 2h prima della fine dell'evento».
 *
 * - Un **tier senza `expires_at`** chiude a **fine serata − 2 h**.
 * - Un **tier con `expires_at`** chiude quando dice lui: il valore esplicito
 *   e' rispettato come scritto, anche se cade dopo il default. Il default e'
 *   un tetto solo dove nessuno ha scelto.
 * - Un **codice sconto** non ha una colonna di scadenza: e' usabile fino a fine
 *   serata − 2 h, sempre.
 *
 * Direzione: questa regola **chiude soltanto**, non apre nulla. `starts_at`,
 * quantita', `is_active`, `max_uses` restano tutti dove erano.
 *
 * ── Il caso senza fine dichiarata ───────────────────────────────────────────
 *
 * `event_parties.end_time` e' nullable. Senza fine non c'e' un «−2 h» da
 * calcolare, e **non se ne inventa uno**: {@link defaultSalesCloseAt} risponde
 * `null` e il comportamento resta quello di prima (il tier vende finche' non
 * scade o finisce, il codice finche' e' attivo). Detto qui perche' e' una
 * serata che vende fino all'ultimo, ed e' una scelta da sapere, non un buco.
 *
 * ── Il fuso, e la mezzanotte ────────────────────────────────────────────────
 *
 * La fine si calcola con {@link partyEndInstant} di `src/utils/datetime.ts`,
 * mai con `new Date(data civile)`: `Europe/Rome`, ora legale risolta in due
 * passaggi, e la stessa regola della mezzanotte gia' usata dal menu e dalla
 * funzione SQL `public.party_end_instant` — **un'ora di fine prima di
 * mezzogiorno appartiene al giorno civile successivo**. Una notte 22:00 → 06:00
 * del sabato chiude la vendita alle 04:00 della domenica; un satellite
 * 18:00 → 22:00 alle 20:00 dello stesso giorno. Non si riscrive qui una seconda
 * variante della regola (es. «`end_time <= time`»): sarebbe la settima, e la
 * deriva che `datetime.ts` esiste per impedire.
 *
 * ── «Sold out» batte «Expired» ──────────────────────────────────────────────
 *
 * Due regole del proprietario dello stesso giorno (2026-10-05): scaduto →
 * «Expired», capienza piena → «Sold out», e in entrambi i casi la riga
 * **resta visibile e disabilitata**, non sparisce. Quando valgono insieme
 * **vince «Sold out»** — parole sue: «quando un tier e' sia sold out che
 * expired deve mostrare sold out». Per simmetria vale anche per i codici: un
 * codice con `max_uses` raggiunto, provato dopo la chiusura, dice «Sold out».
 * Applicata in `tier-status.ts` (pagina), `order-quote.ts` e `purchaseTicket`
 * (i due percorsi di prezzo), `validateDiscountCode` (anteprima del codice).
 *
 * Nessun `server-only`: lo legge anche `TierSelection.tsx`, nel browser, per
 * dire «Sales closed» con la stessa risposta del preventivo. Un orario non e'
 * un segreto, e non porta alcun luogo.
 */

/** Le ore prima della fine serata in cui la vendita si chiude da sola. */
export const DEFAULT_SALES_CLOSE_HOURS_BEFORE_END = 2;

export interface SalesWindowParty {
  date: string;
  time?: string | null;
  end_time: string | null;
}

export interface SalesWindowTier {
  starts_at?: string | null;
  expires_at?: string | null;
}

/**
 * L'istante in cui la vendita di default chiude: fine serata (Torino) − 2 h.
 * `null` se la serata non dichiara `end_time` — nessuna chiusura di default.
 */
export function defaultSalesCloseAt(party: SalesWindowParty): Date | null {
  if (!party.end_time || !party.date) return null;
  const end = partyEndInstant(party.date, party.end_time);
  return new Date(end.getTime() - DEFAULT_SALES_CLOSE_HOURS_BEFORE_END * 3_600_000);
}

/** Quando chiude QUESTO tier: la sua scadenza esplicita, altrimenti il default. */
export function tierClosesAt(tier: SalesWindowTier, party: SalesWindowParty): Date | null {
  return tier.expires_at ? new Date(tier.expires_at) : defaultSalesCloseAt(party);
}

/**
 * Il tier e' stato chiuso dalla regola di DEFAULT (nessuna scadenza esplicita,
 * e fine − 2 h e' passata). Distinto da «scaduto» perche' a chi compra si dice
 * una frase diversa, e a chi legge un log una causa diversa.
 */
export function isTierClosedByDefault(
  tier: SalesWindowTier,
  party: SalesWindowParty,
  now: Date = new Date()
): boolean {
  if (tier.expires_at) return false;
  const close = defaultSalesCloseAt(party);
  return close !== null && now >= close;
}

/** In vendita per la finestra temporale: iniziato e non ancora chiuso. */
export function isTierOnSale(
  tier: SalesWindowTier,
  party: SalesWindowParty,
  now: Date = new Date()
): boolean {
  if (tier.starts_at && now < new Date(tier.starts_at)) return false;
  const close = tierClosesAt(tier, party);
  return close === null || now < close;
}

/** Un codice sconto di questa serata e' ancora usabile (fino a fine − 2 h). */
export function isCodeUsable(party: SalesWindowParty, now: Date = new Date()): boolean {
  const close = defaultSalesCloseAt(party);
  return close === null || now < close;
}

/**
 * La risposta per chi prova un codice dopo la chiusura — una sola, ovunque.
 * «Expired», parola del proprietario (2026-10-05): la stessa etichetta dei tier
 * scaduti sulla pagina della serata.
 */
export const CODE_SALES_CLOSED_MESSAGE = "Expired";

/**
 * La risposta per un codice con `max_uses` gia' raggiunto — parola del
 * proprietario (2026-10-05), la stessa etichetta dei tier esauriti. Solo dove
 * un tetto c'e' ed e' pieno: un codice senza `max_uses` non la mostra mai.
 */
export const CODE_SOLD_OUT_MESSAGE = "Sold out";
