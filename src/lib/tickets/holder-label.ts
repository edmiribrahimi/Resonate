/**
 * L'etichetta del portatore, come si mostra.
 *
 * `tickets.holder_label` e' coniata in italiano — «2 di 6» — dal percorso
 * d'acquisto (fase 49), e le righe gia' emesse la portano cosi'. Dal
 * 2026-09-21 la mail e la pagina dell'ordine sono in inglese, come il resto del
 * prodotto: il valore in tabella **non si riscrive** — e' gia' su biglietti
 * emessi — e la traduzione avviene qui, nel punto in cui si mostra.
 *
 * Accetta sia «2 di 6» sia «2 of 6», e se l'etichetta manca o non si legge la
 * ricostruisce dalla posizione: un'etichetta e' cio' che permette a chi ha
 * comprato per sei di distinguere i biglietti per inoltrarli (`D-49-03`), e un
 * riquadro senza etichetta e' un biglietto che non si distingue.
 */
export function formatHolderLabel(
  label: string | null | undefined,
  index: number,
  total: number
): string {
  const m = /^\s*(\d+)\s+(?:di|of)\s+(\d+)\s*$/i.exec(label ?? "");
  if (m) return `${m[1]} of ${m[2]}`;
  const trimmed = (label ?? "").trim();
  return trimmed || `${index + 1} of ${total}`;
}
