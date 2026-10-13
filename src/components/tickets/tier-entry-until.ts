/**
 * L'ora limite d'ingresso di un tier (52.4, MIX-04, D-52.4-05) — la frase e la
 * regola di forma scritte una volta e montate da entrambi i form, la creazione
 * e la modifica, perche' non possano dire due cose diverse sullo stesso campo.
 *
 * La regola e' la STESSA di `normaliseEntryUntil` in
 * `src/app/(admin)/admin/events/[id]/tickets/actions.ts`, ripetuta qui per la
 * ragione registrata col codice benefit (quick 2026-10-05, punto 3): in
 * produzione Next omette il messaggio di un'eccezione lanciata da una server
 * action, e senza questo controllo il rifiuto arriverebbe generico. Il server
 * resta il confine; questa copia esiste solo per dare la frase giusta.
 *
 * Un `<input type="time">` invia `HH:MM` (o `HH:MM:SS` con lo step ai
 * secondi): i secondi, se ci sono, si accettano e si scartano — si salva
 * `HH:MM`. Qualunque altra coda e' un rifiuto, non un taglio. Vuoto = nessun
 * limite.
 */
export const ENTRY_UNTIL_HINT =
  "After this time the door refuses this ticket; staff can still admit, and it is recorded. " +
  "A time before 12:00 means the morning after the night's date.";

export const ENTRY_UNTIL_SHAPE_MESSAGE = "Entry until must be a time like 23:30.";

const ENTRY_UNTIL_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/** `null` se il campo e' vuoto o in forma; la frase del rifiuto altrimenti. */
export function entryUntilShapeError(formData: FormData): string | null {
  const raw = String(formData.get("entry_until") ?? "").trim();
  if (raw === "") return null;
  return ENTRY_UNTIL_RE.test(raw) ? null : ENTRY_UNTIL_SHAPE_MESSAGE;
}
