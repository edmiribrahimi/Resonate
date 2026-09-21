/**
 * Lo stato di un tier, calcolato in un posto solo.
 *
 * Viveva dentro `TierSelection.tsx`, il controllo che vende. Dal 2026-09-21 lo
 * legge anche la barra fissa in fondo alla pagina della serata, che deve dire
 * «from €N» **con la stessa risposta** del controllo: due calcoli dello stesso
 * stato divergono al primo che qualcuno tocca, e una barra che promette un
 * prezzo che il controllo non offre e' un difetto che chi compra vede per primo.
 *
 * La regola e' quella di sempre: i tier si attivano **in catena per prezzo** —
 * il piu' caro parte solo quando i piu' economici sono esauriti o scaduti — e
 * `starts_at` / `expires_at` si leggono contro `now`, che il chiamante passa
 * quando deve rendere sul client dopo il mount (evita differenze fra server e
 * browser sull'orologio).
 */
export interface PublicTier {
  id: string;
  name: string;
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
  const sorted = [...tiers].sort((a, b) => a.price - b.price);
  const statusMap = new Map<string, TierStatus>();

  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];

    // 1. Explicit starts_at not yet reached
    if (tier.starts_at && now < new Date(tier.starts_at)) {
      statusMap.set(tier.id, "coming_soon");
      continue;
    }

    // 2. Sold out (only if quantity is set)
    if (tier.available !== null && tier.available <= 0) {
      statusMap.set(tier.id, "sold_out");
      continue;
    }

    // 3. Expired
    if (tier.expires_at && now >= new Date(tier.expires_at)) {
      statusMap.set(tier.id, "expired");
      continue;
    }

    // 4. Previous tier (by price) still active → this one waits
    const prevTier = i > 0 ? sorted[i - 1] : null;
    if (prevTier) {
      const prevStatus = statusMap.get(prevTier.id)!;
      if (prevStatus !== "sold_out" && prevStatus !== "expired") {
        statusMap.set(tier.id, "coming_soon");
        continue;
      }
    }

    // 5. Available
    statusMap.set(tier.id, "available");
  }

  return tiers.map((t) => statusMap.get(t.id)!);
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
