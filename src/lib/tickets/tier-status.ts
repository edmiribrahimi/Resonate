/**
 * Lo stato di un tier, calcolato in un posto solo.
 *
 * Viveva dentro `TierSelection.tsx`, il controllo che vende. Dal 2026-09-21 lo
 * legge anche la barra fissa in fondo alla pagina della serata, che deve dire
 * «from €N» **con la stessa risposta** del controllo: due calcoli dello stesso
 * stato divergono al primo che qualcuno tocca, e una barra che promette un
 * prezzo che il controllo non offre e' un difetto che chi compra vede per primo.
 *
 * La regola, dal 2026-09-24: ogni tier si giudica **da solo** — inizio,
 * quantita', fine — e nessun tier aspetta un altro (vedi `tierStatus` sotto).
 * `starts_at` / `expires_at` si leggono contro `now`, che il chiamante passa
 * quando deve rendere sul client dopo il mount (evita differenze fra server e
 * browser sull'orologio).
 */
export interface PublicTier {
  id: string;
  name: string;
  /**
   * Cosa include il livello, scritto dall'organizer. `null` o assente sui
   * livelli senza descrizione: chi lo disegna lo salta, non stampa una riga
   * vuota. Non entra in nessun calcolo di stato o di prezzo.
   */
  description?: string | null;
  price: number;
  quantity: number | null;
  sold: number;
  available: number | null;
  show_remaining?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
}

export type TierStatus = "coming_soon" | "available" | "sold_out" | "expired";

export function computeTierStatuses(tiers: PublicTier[], now: Date = new Date()): TierStatus[] {
  return tiers.map((tier) => tierStatus(tier, now));
}

/**
 * Lo stato di UN tier, e di quello solo. Tre ragioni per non essere in vendita,
 * nessuna delle quali guarda un altro tier — D-2026-09-24, deciso dal
 * proprietario e verificato con quattro domande:
 *
 *   1. la data d'inizio non e' arrivata      → `coming_soon`
 *   2. la quantita' e' esaurita               → `sold_out`
 *   3. la data di fine e' passata             → `expired`
 *
 * L'ordine conta dove due ragioni valgono insieme: un tier esaurito E scaduto
 * dice «sold out», perche' e' la frase che spiega a chi compra cosa e' successo
 * mentre guardava; e un tier non ancora aperto dice «coming soon» anche se ha
 * quantita' zero, perche' la vendita non e' cominciata.
 *
 * ── La catena per prezzo NON c'e' piu', e questo paragrafo dice perche' ─────
 *
 * Fino al 2026-09-24 una quarta regola teneva un tier in `coming_soon` finche'
 * il piu' economico non era esaurito o scaduto. Nasceva per «Early Bird →
 * Regular → Last minute», e sul primo evento con tre varianti parallele
 * («GA», «GA + 1 drink», «GA + 2 drinks») ha chiuso due tier su tre per sempre:
 * GA non aveva quantita', quindi non sarebbe mai «finito». Il proprietario ha
 * deciso che anche le fasi successive dello stesso biglietto stanno in vendita
 * insieme: Early Bird con la sua quantita', Regular senza date, e quando Early
 * Bird finisce resta Regular. La sequenza si esprime con date e quantita', mai
 * con un legame fra tier.
 *
 * `src/lib/tickets/order-quote.ts` applica le STESSE tre regole lato server:
 * se cambi una qui, cambiala li' nello stesso commit, o la pagina offrira' un
 * tier che il preventivo rifiuta.
 */
export function tierStatus(
  tier: Pick<PublicTier, "available" | "starts_at" | "expires_at">,
  now: Date = new Date()
): TierStatus {
  if (tier.starts_at && now < new Date(tier.starts_at)) return "coming_soon";
  if (tier.available !== null && tier.available <= 0) return "sold_out";
  if (tier.expires_at && now >= new Date(tier.expires_at)) return "expired";
  return "available";
}

/**
 * Il prezzo che la barra mostra: il **minimo fra i tier in vendita ora**.
 *
 * Decisione del proprietario, 2026-09-21: esauriti e futuri non contano — un
 * «from 15» quando l'early bird e' finito e resta il 25 e' una promessa che il
 * controllo sotto smentisce. `several` dice se ha senso scrivere «from»: con un
 * tier solo in vendita il prezzo e' quello, non «a partire da».
 */
export function lowestOnSalePrice(
  tiers: PublicTier[],
  now: Date = new Date()
): { price: number; several: boolean } | null {
  const statuses = computeTierStatuses(tiers, now);
  const onSale = tiers.filter((_, i) => statuses[i] === "available");
  if (onSale.length === 0) return null;
  const price = Math.min(...onSale.map((t) => t.price));
  return { price, several: onSale.length > 1 };
}
