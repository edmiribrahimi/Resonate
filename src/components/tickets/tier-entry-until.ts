import { entryUntilInstant, partyStartInstant } from "@/utils/datetime";

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

/**
 * L'ora limite deve cadere DOPO l'apertura della serata — revisione 52.4,
 * WR-05, fix approvato dal proprietario il 2026-10-13.
 *
 * La regola «un orario prima delle 12:00 e' la mattina dopo» e' giusta, ma
 * lascia una zona in cui un valore in forma e' sempre nel passato alla porta:
 * su una notte delle 22:00, «20:00» (un tasto sbagliato per «02:00», o una
 * «scadenza di vendita» pensata come tale) risolve alle 20:00 dello stesso
 * giorno, e la porta rifiuterebbe **tutti** dal primo scan. Una frase sola,
 * scritta qui e importata dal server, perche' le due non divergano.
 */
export const ENTRY_UNTIL_BEFORE_START_MESSAGE =
  "Entry until must fall after the night starts (times before 12:00 mean the morning after).";

/**
 * `true` se l'ora limite cade all'apertura o prima. Stessa aritmetica della
 * porta (`entryUntilInstant`) e dell'apertura (`partyStartInstant`), entrambe
 * da `src/utils/datetime.ts`: nessuna conversione scritta a mano.
 *
 * **Senza orario d'apertura non si confronta**: `time` nullo vuol dire che la
 * serata non ha un'ora d'inizio contro cui misurare, e un confronto con una
 * mezzanotte supposta rifiuterebbe valori legittimi. Lo stesso per un istante
 * non leggibile: il controllo esiste per fermare un errore evidente, non per
 * indovinare.
 */
export function entryUntilFallsBeforeStart(
  date: string,
  time: string | null,
  entryUntil: string
): boolean {
  if (!time) return false;
  const until = entryUntilInstant(date, entryUntil.slice(0, 5)).getTime();
  const start = partyStartInstant(date, time).getTime();
  if (Number.isNaN(until) || Number.isNaN(start)) return false;
  return until <= start;
}

/**
 * La frase del rifiuto, o `null`. Il client la chiede prima dell'invio quando
 * conosce data e ora della serata (prop opzionale dei due form): in produzione
 * Next omette il messaggio del throw del server, che resta il confine.
 */
export function entryUntilBeforeStartError(
  formData: FormData,
  night: { date: string; time: string | null } | null | undefined
): string | null {
  if (!night) return null;
  const raw = String(formData.get("entry_until") ?? "").trim();
  if (raw === "" || !ENTRY_UNTIL_RE.test(raw)) return null;
  return entryUntilFallsBeforeStart(night.date, night.time, raw)
    ? ENTRY_UNTIL_BEFORE_START_MESSAGE
    : null;
}
