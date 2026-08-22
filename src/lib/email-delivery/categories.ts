/**
 * categories.ts — il vocabolario chiuso dei messaggi, e il vocabolario chiuso
 * dei loro esiti.
 *
 * ── Perche' `email-delivery/` e non `email/` ─────────────────────────────────
 *
 * Perche' `src/lib/email.ts` esiste gia' come FILE. Una cartella `src/lib/email/`
 * accanto a `src/lib/email.ts` e' un'ambiguita' di risoluzione che il bundler
 * scioglie a favore del file — quindi funziona, e proprio per questo e' una
 * trappola: `@/lib/email` continuerebbe a risolvere altrove da dove il lettore
 * pensa. Il nome diverso costa una parola e toglie la domanda.
 *
 * ── Perche' un modulo separato da `email.ts` ─────────────────────────────────
 *
 * Questo file non importa niente. Nessun SDK, nessun client di database,
 * nessuna variabile d'ambiente. E' importabile da qualunque parte — dal
 * mittente, dal cron di riconciliazione, dalla superficie admin che disegna il
 * segno — senza trascinarsi dietro una connessione.
 *
 * Se il vocabolario stesse dentro `email.ts`, la superficie admin che mostra
 * l'esito dovrebbe importare il modulo che costruisce il client del fornitore
 * per leggere una stringa.
 *
 * ── Le due unioni, e perche' sono CHIUSE ─────────────────────────────────────
 *
 * `comms-analytics.md`, gate *errori distinguibili*: il precedente registrato
 * in `.planning/codebase/CONCERNS.md` e' il form newsletter che cattura ogni
 * errore con *"Qualcosa e' andato storto"*, rendendo indistinguibili rete
 * assente, chiave mancante e indirizzo gia' iscritto. Una categoria libera e' la
 * stessa cosa scritta un livello piu' in su: due call site che scrivono
 * `"ticket"` e `"ticket_confirmation"` producono due categorie per un messaggio
 * solo, e una superficie che filtra sulla prima smette di vedere meta' dei
 * fallimenti senza che nessuno se ne accorga.
 *
 * Chiuse in DUE posti che devono concordare — qui e nel `CHECK` di
 * `supabase/migrations/20260822130000_email_delivery_ledger.sql`. La
 * duplicazione e' voluta: il compilatore difende i call site, il vincolo difende
 * la tabella dai percorsi che il compilatore non vede.
 */

/**
 * I nove messaggi che questo prodotto sa spedire, uno per template.
 *
 * Aggiungerne uno costa **due modifiche in un commit**: questa unione e il
 * `CHECK` della migration. Una sola delle due produce un invio che parte e non
 * si registra — cioe' esattamente lo stato «non si sa» che questa infrastruttura
 * esiste per eliminare.
 */
export const EMAIL_CATEGORIES = [
  /** La conferma del biglietto, con il QR allegato. **La copia di cortesia.** */
  "ticket_confirmation",
  /** L'invito da guest list, con il QR allegato. Non ha un account dietro. */
  "guest_invitation",
  /** La conferma di una prenotazione a una serata gratuita. */
  "rsvp_confirmation",
  /** L'approvazione di un membro. */
  "member_approved",
  /** La riammissione di un membro sospeso. */
  "member_reactivated",
  /** Il rifiuto di una richiesta di accesso. */
  "member_rejected",
  /** L'invito a un account creato a mano, con il link per la password. */
  "account_invitation",
  /** L'esito positivo di una richiesta di rimborso. */
  "refund_approved",
  /** L'esito negativo di una richiesta di rimborso. */
  "refund_rejected",
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

/**
 * Le due categorie il cui mancato recapito costa **alla porta**, non in casella.
 *
 * Entrambe portano un QR: il biglietto comprato e l'invito da guest list. Una
 * mail di approvazione che non arriva e' un fastidio; uno di questi due che non
 * arriva e' una persona che si presenta all'ingresso senza sapere di doversi
 * portare qualcosa.
 *
 * Nominate qui e non dedotte dal nome del template, perche' la ragione per cui
 * queste due contano di piu' e' di dominio e non lessicale.
 */
export const AT_THE_DOOR_CATEGORIES: readonly EmailCategory[] = [
  "ticket_confirmation",
  "guest_invitation",
];

/**
 * I quattro esiti, che non si collassano.
 *
 *   `unverified`   spedito, esito **non ancora chiesto** al fornitore.
 *   `delivered`    il fornitore dice consegnata.
 *   `undelivered`  il fornitore dice **non** consegnata.
 *   `unknown`      abbiamo chiesto e non abbiamo una risposta utilizzabile.
 *
 * Quattro e non tre. `unverified` e `unknown` sono due fatti diversi con due
 * destinatari diversi: il primo e' una riga che il cron non ha ancora raggiunto,
 * il secondo e' una riga su cui qualcuno deve andare a guardare. Collassarli
 * renderebbe invisibile il secondo dentro il rumore del primo.
 */
export type DeliveryOutcome =
  | "unverified"
  | "delivered"
  | "undelivered"
  | "unknown";

/**
 * Da cosa dice il fornitore a cosa diciamo noi.
 *
 * ── PERCHE' IL PARAMETRO E' UNA STRINGA E NON IL TIPO DELL'SDK ───────────────
 *
 * **Misurato sull'SDK installato, resend 6.9.2**, il 2026-08-22:
 * `GetEmailResponseSuccess.last_event` e' dichiarato come l'unione
 *
 *     'bounced' | 'canceled' | 'clicked' | 'complained' | 'delivered'
 *     | 'delivery_delayed' | 'failed' | 'opened' | 'queued' | 'scheduled' | 'sent'
 *
 * e **non contiene `suppressed`** — mentre lo stesso SDK esporta
 * `EmailSuppressedEvent` per i webhook, e il fornitore ha introdotto
 * `suppressed` come stato di primo livello l'8 gennaio 2026.
 *
 * La conseguenza e' precisa e va detta com'e': se questa funzione prendesse il
 * tipo dell'SDK, un `case "suppressed"` **non compilerebbe** — TypeScript lo
 * segnalerebbe come confronto impossibile — e il difetto per cui tutta questa
 * infrastruttura esiste sarebbe l'unico che non si potrebbe gestire. Il tipo
 * dell'SDK non descrive la sua API: descrive una versione precedente della sua
 * API. Quindi si legge la stringa grezza, si classifica qui, e la stringa si
 * conserva in tabella.
 *
 * ── LA MAPPA, con la ragione di ogni riga ────────────────────────────────────
 *
 * `opened` e `clicked` **non possono arrivare su questo prodotto**:
 * `comms-analytics.md`, gate *il tracking resta spento* — aperture e clic sono
 * disattivati di proposito, perche' con essi attivi le mail finiscono in
 * Promozioni. Sono mappati lo stesso, come consegne, perche' una mail aperta e'
 * consegnata per definizione e un ramo mancante su un fatto impossibile e' un
 * ramo che diventa un bug il giorno in cui qualcuno riaccende il tracking.
 *
 * `delivery_delayed`, `queued`, `scheduled` e `sent` **non sono un esito**: sono
 * un messaggio ancora in volo. Restano `unverified`, cioe' *richiedi ancora*.
 *
 * Tutto il resto — inclusa qualunque parola futura che questo codice non conosce
 * — e' `unknown`, mai `delivered`. La direzione dell'errore e' scelta: una
 * parola nuova che venisse classificata come consegnata renderebbe invisibile
 * esattamente il caso che conta.
 */
export function classifyProviderEvent(lastEvent: string | null | undefined): {
  outcome: DeliveryOutcome;
  /** Come si dice a un essere umano, in una riga, senza gergo del fornitore. */
  reason: string;
} {
  switch (lastEvent) {
    case "delivered":
    case "opened":
    case "clicked":
      return { outcome: "delivered", reason: "Delivered" };

    case "suppressed":
      return {
        outcome: "undelivered",
        reason:
          "The provider is suppressing this address after an earlier hard bounce or spam report. Nothing will reach it until it is removed from the suppression list.",
      };

    case "bounced":
      return {
        outcome: "undelivered",
        reason: "The address rejected the message — it may be mistyped or closed.",
      };

    case "complained":
      return {
        outcome: "undelivered",
        reason:
          "The recipient marked a previous message as spam, so this one was not put in front of them.",
      };

    case "failed":
      return {
        outcome: "undelivered",
        reason: "The provider could not send it at all.",
      };

    case "canceled":
      return {
        outcome: "undelivered",
        reason: "The send was cancelled before it left.",
      };

    case "sent":
    case "queued":
    case "scheduled":
    case "delivery_delayed":
      return {
        outcome: "unverified",
        reason: "Still in flight — the provider has not settled it yet.",
      };

    default:
      return {
        outcome: "unknown",
        reason: lastEvent
          ? `The provider reported "${lastEvent}", which this build does not recognise.`
          : "The provider reported no outcome at all.",
      };
  }
}
