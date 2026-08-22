import { redactDbError } from "@/lib/errors/redact";
import type { EmailCategory } from "@/lib/email-delivery/categories";
import { recordSend } from "@/lib/email-delivery/ledger";
import { getResend } from "@/lib/email-delivery/provider";

/**
 * email.ts — il mittente, e la ragione per cui non basta piu' che non lanci.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * IL DIFETTO CHIUSO QUI, VERIFICATO ALLA FONTE IL 2026-08-22
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Questa funzione lanciava **soltanto** quando il fornitore restituiva un
 * `error`. La lista di soppressione del fornitore fa un'altra cosa: **accetta la
 * chiamata e non consegna**. Dalla sua documentazione:
 *
 *   «Quando un invio verso un indirizzo produce un rimbalzo duro o una
 *   segnalazione di spam, l'indirizzo finisce nella Suppression List. I
 *   messaggi futuri verso quell'indirizzo saranno marcati `suppressed` e **non
 *   verranno consegnati** finche' l'indirizzo non viene rimosso dalla lista.»
 *
 * Fra le cause elencate: l'indirizzo **contiene un refuso**, non esiste, e'
 * bloccato in permanenza, oppure il destinatario ha segnalato come spam un
 * messaggio precedente.
 *
 * **Il percorso raggiungibile:** una persona sbaglia a scrivere il proprio
 * indirizzo **una volta sola** -> rimbalzo duro -> l'indirizzo entra in lista ->
 * da li' in poi **ogni biglietto viene saltato in silenzio**, con `error` nullo
 * e un identificativo di ritorno regolare.
 *
 * Il costo si paga alla porta. `checkin-offline.md` dice qual e': rifiutare un
 * ospite valido e' peggio che ammetterne uno doppio, perche' il primo errore
 * avviene davanti a una fila.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * COSA CAMBIA, E COSA DELIBERATAMENTE NO
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * **`category` e' OBBLIGATORIA.** Non e' burocrazia: e' l'unico modo, in un
 * repository senza test runner, di far garantire dal compilatore che ogni invio
 * sia registrabile e distinguibile. `comms-analytics.md`, gate *errori
 * distinguibili*, applicato all'invio invece che al fallimento. Un parametro
 * opzionale sarebbe stato dimenticato al quarto call site, che e' il modo in cui
 * una superficie smette di mostrare meta' dei fallimenti senza che nessuno lo
 * decida.
 *
 * **Il ramo che lancia resta identico.** Un `error` del fornitore era gia'
 * gestito e continua a esserlo, con la stessa categoria di log e lo stesso
 * messaggio. Questa modifica aggiunge un percorso, non ne riscrive uno.
 *
 * **Il mittente, il corpo e gli allegati non si toccano.** `RESEND_FROM_EMAIL`
 * resta la sorgente del mittente (`comms-analytics.md`, gate *due mittenti, due
 * funzioni*), nessun template e' stato riscritto, e nessun contenuto cambia.
 *
 * **La registrazione non puo' far fallire un invio.** `recordSend` non lancia
 * mai; il suo esito torna al chiamante come `recorded`. Un messaggio partito e'
 * partito, e trasformarlo in un errore perche' non si e' potuta scrivere una
 * riga sarebbe un secondo fallimento, nella direzione opposta.
 */

/**
 * Il client del fornitore vive ora in `@/lib/email-delivery/provider`, per
 * rompere il ciclo `email.ts` <-> `ledger.ts` — la ragione per esteso e' nel
 * docblock di quel file. **Ri-esportato qui**, cosi' i tre moduli che lo
 * importano da `@/lib/email` — il cron dei promemoria, le azioni newsletter e
 * la rivelazione del venue — restano invariati.
 */
export { getResend };

/**
 * Cosa si sa di un invio nell'istante in cui torna.
 *
 * `id` e' l'identificativo del fornitore: **una ricevuta di presa in carico, non
 * una consegna.** Chi legge questo tipo deve vedere la differenza scritta, non
 * dedurla dal nome del campo.
 *
 * `recorded` dice se l'invio e' entrato nel registro. `false` significa che
 * quell'invio **non sara' mai verificato** e che il suo esito restera' ignoto:
 * sulla superficie admin il biglietto risultera' «nessun invio registrato», che
 * e' uno stato distinto sia da consegnata sia da non consegnata.
 */
export interface SendEmailResult {
  id: string | null;
  recorded: boolean;
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  category,
  userId,
  ticketId,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    content: string;
    filename: string;
    content_type: string;
  }>;
  /** Quale dei nove messaggi e' questo. Obbligatoria — vedi il docblock. */
  category: EmailCategory;
  /** Il destinatario, quando ha un account. L'indirizzo non si conserva. */
  userId?: string | null;
  /** Il biglietto di cui questo messaggio e' la copia di cortesia, se c'e'. */
  ticketId?: string | null;
}): Promise<SendEmailResult> {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>";
  const { data, error } = await getResend().emails.send({
    from: fromAddress,
    to: [to],
    subject,
    html,
    ...(attachments ? { attachments } : {}),
  });

  if (error) {
    console.error(
      `[email.send_failed] category=${category} ${redactDbError(error)}`
    );
    throw new Error(`Failed to send email: ${error.message}`);
  }

  const providerMessageId = data?.id ?? null;

  if (!providerMessageId) {
    // ── Il fornitore ha detto di si' senza dire a cosa ────────────────────────
    //
    // Nessun `error` e nessun identificativo. Non lanciamo — il messaggio
    // potrebbe benissimo essere partito, e rifiutare qui trasformerebbe un
    // dubbio in un fallimento certo su un percorso che vende biglietti.
    //
    // Ma non e' nemmeno un successo, e questa e' la differenza con il codice
    // che c'era prima: senza identificativo **non esiste modo di chiedere
    // l'esito**, quindi la riga non si puo' scrivere e `recorded` e' `false`.
    // Chi legge la superficie admin vedra' «nessun invio registrato», che e' il
    // vero stato delle cose.
    console.error(`[email.send_id_missing] category=${category}`);
    return { id: null, recorded: false };
  }

  const recorded = await recordSend(providerMessageId, {
    category,
    userId,
    ticketId,
  });

  return { id: providerMessageId, recorded };
}
