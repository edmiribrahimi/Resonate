import "server-only";

import { getResend } from "./provider";
import { getServiceClient } from "@/lib/supabase/service";
import { redactDbError } from "@/lib/errors/redact";
import {
  classifyProviderEvent,
  type DeliveryOutcome,
  type EmailCategory,
} from "./categories";

/**
 * ledger.ts — l'invio si registra, e l'esito si CHIEDE.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * IL DIFETTO, ALLA LETTERA
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * `sendEmail` lanciava soltanto quando il fornitore restituiva un `error`. La
 * lista di soppressione del fornitore **accetta la chiamata e non consegna**: la
 * risposta d'invio ha `error` nullo e un identificativo regolare, e il messaggio
 * viene marcato `suppressed` senza raggiungere nessuno. Fra le cause per cui un
 * indirizzo ci finisce, dalla documentazione del fornitore letta il 2026-08-22:
 * un rimbalzo duro, una segnalazione di spam, un indirizzo che non esiste, e
 * **un refuso scritto dalla persona stessa**.
 *
 * Un refuso una volta sola, e da li' in poi ogni biglietto sparisce in silenzio.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * LA DISCIPLINA CHE QUESTO FILE APPLICA, E DA DOVE VIENE
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * `ticketing-payments.md` la impone gia' al denaro, e il webhook dei pagamenti
 * la esegue: *verifica SEMPRE con una GET, mai fidarsi del corpo del webhook*.
 * Qui e' la stessa regola spostata sulla posta — **la risposta d'invio non e' un
 * esito, e' una ricevuta di presa in carico**. L'esito si va a chiedere.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * COSA QUESTO FILE NON PROMETTE
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * **Non impedisce a una mail di non essere consegnata.** Nessun codice puo'.
 * Rende il fatto *leggibile da un essere umano* su una superficie che qualcuno
 * guarda — e l'altra meta' della riparazione, quella che conta davvero, e' che
 * il biglietto non dipenda piu' da quella mail.
 *
 * **Non lancia mai verso il chiamante.** Una registrazione fallita non deve
 * trasformare un invio riuscito in un errore: il messaggio E' partito, e dire il
 * contrario sarebbe un secondo fallimento silenzioso al contrario. Il costo di
 * un fallimento della registrazione e' dichiarato e osservabile: il biglietto
 * risulta **«nessun invio registrato»** sulla superficie admin, che e' uno stato
 * distinto sia da «consegnata» sia da «non consegnata» e si legge come *nessuno
 * ha guardato*.
 */

/** Quanto e' vecchia una riga prima che valga la pena chiedere l'esito. */
const MIN_AGE_BEFORE_ASKING_MS = 90_000;

/**
 * Dopo quanti tentativi falliti una riga smette di essere «non ancora chiesta» e
 * diventa `unknown`.
 *
 * Tre e non uno: una chiamata puo' fallire per la rete, e trattare un timeout
 * come un verdetto sarebbe inventare un fatto. Tre e non dieci: una riga che
 * resta `unverified` per sempre e' una riga che nessuno guarda mai, cioe' il
 * silenzio che questo file esiste per rompere.
 */
const MAX_CHECK_ATTEMPTS = 3;

/**
 * Oltre questa eta', una riga ancora senza esito e' `unknown` comunque.
 *
 * Un messaggio che il fornitore tiene «in volo» per piu' di un giorno non e' in
 * volo: e' un messaggio di cui non sapremo mai niente, e chiamarlo `unverified`
 * per sempre lo nasconde nella coda del cron invece di metterlo davanti a
 * qualcuno.
 */
const STALE_AFTER_MS = 26 * 60 * 60 * 1000;

export interface DeliveryRecordInput {
  category: EmailCategory;
  /** Il destinatario, quando ha un account. Mai l'indirizzo — vedi la migration. */
  userId?: string | null;
  /** Il biglietto di cui questo messaggio e' la copia di cortesia, se c'e'. */
  ticketId?: string | null;
}

/**
 * Registra un invio riuscito. **Non lancia.** Restituisce se la riga c'e'.
 *
 * Il valore di ritorno non e' decorativo: `sendEmail` lo propaga al chiamante,
 * cosi' un percorso critico puo' sapere di essere partito senza registro invece
 * di scoprirlo mesi dopo da una superficie vuota.
 */
export async function recordSend(
  providerMessageId: string,
  input: DeliveryRecordInput
): Promise<boolean> {
  try {
    const { error } = await getServiceClient()
      .from("email_deliveries")
      .insert({
        provider_message_id: providerMessageId,
        category: input.category,
        user_id: input.userId ?? null,
        ticket_id: input.ticketId ?? null,
        outcome: "unverified" satisfies DeliveryOutcome,
      });

    if (error) {
      // Categoria propria, distinta dalle altre due di questo file. Un log non
      // e' un effetto osservabile in un progetto senza error tracking — quello
      // e' lo stato «nessun invio registrato» sulla superficie admin — ma
      // quando qualcuno andra' a leggere i log deve poter distinguere «non ho
      // potuto scrivere la riga» da «non ho potuto verificarla».
      console.error(
        `[email.ledger.record_failed] category=${input.category} ${redactDbError(error)}`
      );
      return false;
    }
    return true;
  } catch (unexpected) {
    console.error(
      `[email.ledger.record_threw] category=${input.category} ${
        unexpected instanceof Error ? unexpected.message : "non-Error thrown"
      }`
    );
    return false;
  }
}

/** Cosa ha fatto una passata di riconciliazione, causa per causa. */
export interface ReconcileReport {
  examined: number;
  delivered: number;
  undelivered: number;
  stillInFlight: number;
  unknown: number;
  /** La lettura verso il fornitore e' fallita — non un verdetto, un'assenza. */
  providerUnreachable: number;
  /** Il verdetto c'era e non si e' potuto scrivere. */
  writeFailed: number;
  /** Non si e' potuto nemmeno leggere l'elenco delle righe da verificare. */
  queueUnreadable: boolean;
}

const EMPTY_REPORT = (): ReconcileReport => ({
  examined: 0,
  delivered: 0,
  undelivered: 0,
  stillInFlight: 0,
  unknown: 0,
  providerUnreachable: 0,
  writeFailed: 0,
  queueUnreadable: false,
});

/**
 * Chiede al fornitore l'esito delle righe che non ne hanno ancora uno, e lo
 * scrive.
 *
 * ── Perche' UNA funzione con due chiamanti ───────────────────────────────────
 *
 * La chiamano il cron notturno — la spazzata — e la superficie admin dei
 * venduti, appena prima di disegnare. La seconda e' la ragione per cui il cron
 * da solo non basterebbe: un biglietto comprato alle 19:00 per una serata che
 * apre alle 22:00 non ha una notte davanti, e un verdetto che arriva domani
 * mattina arriva dopo la fila.
 *
 * Due chiamanti e una funzione, perche' due copie divergerebbero e la copia che
 * diverge e' sempre quella che non gira mai.
 *
 * ── Il limite, detto ─────────────────────────────────────────────────────────
 *
 * Il fornitore non risponde istantaneamente: fra l'invio e il verdetto passa del
 * tempo, e in quella finestra l'esito onesto e' `unverified`. Questa funzione
 * non lo accorcia. Quello che garantisce e' che la finestra **finisca** invece
 * di durare per sempre.
 *
 * @param scope `all` per la spazzata; una lista di `ticket_id` per la lettura a
 *              richiesta, che non deve pagare la coda di tutto il prodotto.
 */
export async function reconcileDeliveries(
  scope: { kind: "all"; limit: number } | { kind: "tickets"; ticketIds: string[] }
): Promise<ReconcileReport> {
  const report = EMPTY_REPORT();

  if (scope.kind === "tickets" && scope.ticketIds.length === 0) return report;

  const supabase = getServiceClient();
  const askableBefore = new Date(Date.now() - MIN_AGE_BEFORE_ASKING_MS).toISOString();

  const baseQuery = () =>
    supabase
      .from("email_deliveries")
      .select("id, provider_message_id, category, check_attempts, created_at")
      .eq("outcome", "unverified")
      .lte("created_at", askableBefore)
      .order("created_at", { ascending: true });

  // ── I biglietti si chiedono A BLOCCHI DI 100, come la lettura accanto ───────
  //
  // Una serata in target sta fra 150 e 300 persone, e 300 uuid dentro un `in()`
  // sono circa 11 KB di stringa di query. La superficie admin dei venduti
  // spezza gia' a 100 la lettura dei nomi dei compratori per questa ragione
  // esatta, e una lettura accanto che non lo facesse fallirebbe **proprio sulla
  // serata piena** — cioe' l'unica in cui questo verdetto serve davvero.
  const rows: Array<{
    id: string;
    provider_message_id: string;
    category: string;
    check_attempts: number | null;
    created_at: string;
  }> = [];

  if (scope.kind === "all") {
    const { data, error } = await baseQuery().limit(scope.limit);
    if (error) {
      // NON e' «zero righe da verificare». La coda non si e' potuta leggere, e le
      // due cose si somigliano solo nel conteggio: una dice che va tutto bene,
      // l'altra che non lo sappiamo. Il campo esiste perche' chi legge il referto
      // del cron possa distinguerle.
      console.error(`[email.ledger.queue_unreadable] ${redactDbError(error)}`);
      report.queueUnreadable = true;
      return report;
    }
    rows.push(...(data ?? []));
  } else {
    for (let i = 0; i < scope.ticketIds.length; i += 100) {
      const { data, error } = await baseQuery().in(
        "ticket_id",
        scope.ticketIds.slice(i, i + 100)
      );
      if (error) {
        // Si ferma invece di proseguire con gli altri blocchi: un referto che
        // mescolasse blocchi letti e blocchi falliti direbbe un numero senza
        // dire su quante righe. Il flag alza la mano e i blocchi gia' raccolti
        // vengono comunque verificati — meno righe, tutte vere.
        console.error(`[email.ledger.queue_unreadable] ${redactDbError(error)}`);
        report.queueUnreadable = true;
        break;
      }
      rows.push(...(data ?? []));
    }
  }

  const resend = getResend();
  const now = Date.now();

  for (const row of rows) {
    report.examined += 1;

    let lastEvent: string | null = null;
    let providerFailure: string | null = null;

    try {
      const { data, error } = await resend.emails.get(row.provider_message_id);
      if (error) {
        providerFailure = `provider_error: ${error.message}`;
      } else {
        // Letto come STRINGA e non come l'unione dell'SDK. L'unione della
        // versione 6.9.2 non contiene `suppressed`, che e' la causa per cui
        // tutto questo esiste — vedi `classifyProviderEvent`.
        lastEvent = (data?.last_event as string | undefined) ?? null;
      }
    } catch (transport) {
      providerFailure = `transport: ${
        transport instanceof Error ? transport.message : "non-Error thrown"
      }`;
    }

    const attempts = (row.check_attempts ?? 0) + 1;
    const ageMs = now - new Date(row.created_at).getTime();

    let outcome: DeliveryOutcome;
    let providerLastEvent: string | null;
    let checkFailure: string | null;

    if (providerFailure !== null) {
      report.providerUnreachable += 1;
      // Una lettura fallita NON e' un verdetto. Resta `unverified` finche' i
      // tentativi bastano; quando non bastano piu' diventa `unknown`, che vuol
      // dire *qualcuno deve guardare*, e mai `delivered`.
      outcome =
        attempts >= MAX_CHECK_ATTEMPTS || ageMs > STALE_AFTER_MS
          ? "unknown"
          : "unverified";
      providerLastEvent = null;
      checkFailure = providerFailure;
    } else {
      const verdict = classifyProviderEvent(lastEvent);
      providerLastEvent = lastEvent;
      checkFailure = null;
      outcome = verdict.outcome;

      if (outcome === "unverified" && ageMs > STALE_AFTER_MS) {
        // Il fornitore lo tiene «in volo» da oltre un giorno. Non e' in volo.
        outcome = "unknown";
        checkFailure = `stale_in_flight: ${lastEvent ?? "no event"}`;
      }
    }

    if (outcome === "delivered") report.delivered += 1;
    else if (outcome === "undelivered") report.undelivered += 1;
    else if (outcome === "unknown") report.unknown += 1;
    else report.stillInFlight += 1;

    const { error: writeError } = await supabase
      .from("email_deliveries")
      .update({
        outcome,
        provider_last_event: providerLastEvent,
        check_attempts: attempts,
        checked_at: new Date().toISOString(),
        check_failure: checkFailure,
      })
      .eq("id", row.id);

    if (writeError) {
      report.writeFailed += 1;
      console.error(
        `[email.ledger.verdict_unwritable] category=${row.category} ${redactDbError(writeError)}`
      );
    }
  }

  return report;
}

/** Quello che una superficie ha bisogno di sapere su un singolo biglietto. */
export interface TicketDeliveryMark {
  outcome: DeliveryOutcome;
  /** La frase da mostrare, senza gergo del fornitore. */
  reason: string;
  /** La parola grezza del fornitore, per chi deve andare a fondo. */
  providerLastEvent: string | null;
}

/**
 * L'esito della conferma di ciascun biglietto, per la superficie admin.
 *
 * **Un biglietto assente dalla mappa restituita non e' «consegnato».** E'
 * «nessun invio registrato», e il chiamante deve disegnarlo come tale: e' lo
 * stato in cui finisce un biglietto la cui registrazione e' fallita, o che e'
 * stato creato prima che questo registro esistesse. Restituire `delivered` per
 * assenza sarebbe la bugia esatta che questo file esiste per togliere.
 */
export async function readTicketDeliveryMarks(
  ticketIds: string[]
): Promise<Map<string, TicketDeliveryMark>> {
  const marks = new Map<string, TicketDeliveryMark>();
  if (ticketIds.length === 0) return marks;

  const supabase = getServiceClient();

  // A blocchi di 100, come la lettura dei nomi dei compratori accanto: una
  // serata in target sta fra 150 e 300 persone e 300 uuid in un `in()` sono
  // ~11 KB di URL.
  for (let i = 0; i < ticketIds.length; i += 100) {
    const { data, error } = await supabase
      .from("email_deliveries")
      .select("ticket_id, outcome, provider_last_event, check_failure, created_at")
      .eq("category", "ticket_confirmation")
      .in("ticket_id", ticketIds.slice(i, i + 100))
      .order("created_at", { ascending: false });

    if (error) {
      // Si interrompe invece di continuare: una lettura parziale che il
      // chiamante non puo' distinguere da un insieme completo farebbe apparire
      // «nessun invio registrato» su biglietti che ce l'hanno. Meglio meno
      // righe, tutte vere, e una riga di log con la sua causa.
      console.error(`[email.ledger.marks_unreadable] ${redactDbError(error)}`);
      break;
    }

    for (const row of data ?? []) {
      if (!row.ticket_id || marks.has(row.ticket_id)) continue;
      const verdict = classifyProviderEvent(row.provider_last_event);
      marks.set(row.ticket_id, {
        outcome: row.outcome as DeliveryOutcome,
        reason:
          row.outcome === "unverified"
            ? "Sent — the provider has not settled the outcome yet."
            : row.outcome === "unknown"
              ? row.check_failure
                ? "Asked the provider and got no usable answer."
                : verdict.reason
              : verdict.reason,
        providerLastEvent: row.provider_last_event ?? null,
      });
    }
  }

  return marks;
}
