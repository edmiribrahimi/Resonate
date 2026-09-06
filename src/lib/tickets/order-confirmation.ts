import "server-only";

import QRCode from "qrcode";
import { render } from "@react-email/render";
import { sendEmail } from "@/lib/email";
import type { EmailCategory } from "@/lib/email-delivery/categories";
import { buildPasswordSetLink } from "@/lib/auth/password-set-link";
import { TicketOrderEmail, type TicketOrderTicket } from "@/emails/ticket-order";
import { generateTicketToken } from "@/utils/qr";
import { formatEventDate, formatTime } from "@/utils/formatTime";
import { redactDbError } from "@/lib/errors/redact";
import type { getServiceClient } from "@/lib/supabase/service";

/**
 * order-confirmation.ts — la mail di un ordine comprato senza account: i
 * biglietti e la via di rientro, in un messaggio solo.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * PERCHE' QUESTO INVIO PESA PIU' DELLA CONFERMA CHE ESISTE GIA'
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Per un membro una mancata consegna e' un fastidio: ha un account e rientra da
 * `/login` quando vuole. Per chi ha comprato senza account **e' niente biglietto
 * e niente accesso**, e lo scopre alla porta — dove `checkin-offline.md` dice che
 * rifiutare qualcuno che ha pagato e' l'errore che costa di piu', perche' avviene
 * davanti a una fila.
 *
 * Da qui le tre proprieta' di questo modulo, che non sono stilistiche:
 *
 *   1. **Passa dal registro delle consegne** con una categoria propria, invece di
 *      aprirsi una strada che nessuno guarda. Il registro e il cron di
 *      riconciliazione esistono dal 2026-08-22: cio' che mancava era che il
 *      percorso nuovo ci passasse dentro. Una mail nuova che non si registra e'
 *      il buco vecchio riaperto in un posto nuovo.
 *   2. **Non solleva mai verso chi chiama.** `ticketing-payments.md`, gate *soldi
 *      vs contenuto*: se una scrittura di contenuto fallisce, l'incasso resta
 *      valido e il percorso non si aborta — si logga, si conta, si prosegue. Ogni
 *      uscita porta una causa **distinta**, perche' questo progetto non ha error
 *      tracking e una causa collassata su un'altra e' un fallimento invisibile.
 *   3. **Non nomina nessun luogo, e non puo'.** `D-49-04`: il posto dove si suona
 *      raggiunge solo chi ha comprato, per la strada del countdown, e questa non
 *      e' quella strada. Nessuna colonna del genere compare nelle sue `select`, e
 *      il template non ha una prop in cui possa entrare.
 *
 * ── Perche' nessun incorporamento di `profiles` dentro una select su `tickets` ─
 *
 * *(Scritto senza la forma letterale dell'incorporamento, e non per eleganza: il
 * criterio che sorveglia questo file la cerca con un grep, e un modulo che la
 * nomina per spiegare di non usarla fa fallire il proprio guardiano per sempre.
 * Un gate che diventa rosso su un commento e' un gate che qualcuno spegnera'.)*
 *
 * `tickets.user_id` referenzia `auth.users`, **non** `public.profiles`: PostgREST
 * non trova la relazione e risponde `PGRST200`. La trappola e' gia' costata ogni
 * scansione della porta e una rivelazione che non partiva. Qui non serve
 * comunque: l'indirizzo di chi compra sta **sull'ordine** (`buyer_email`), che e'
 * il solo posto in cui esiste prima che nasca un account.
 */

/** La categoria, scritta una volta sola e usata due. */
const CATEGORY = "ticket_order_confirmation" satisfies EmailCategory;

/**
 * Le cause per cui la mail non e' partita, una per riga di log.
 *
 * Nessuna di queste e' un errore del chiamante: sono stati del mondo che chi
 * chiama deve poter **registrare** e distinguere. `comms-analytics.md`, gate
 * *errori distinguibili* — il precedente da non ripetere e' il form newsletter,
 * che dice *"Qualcosa e' andato storto"* per la rete assente, la chiave mancante
 * e l'indirizzo gia' iscritto.
 */
export type OrderConfirmationFailure =
  /** L'ordine non si e' potuto leggere, o non esiste. */
  | "order_unreadable"
  /** L'ordine non porta un indirizzo di posta: non c'e' a chi spedire. */
  | "order_without_buyer"
  /** Nessun biglietto e' nato da quest'ordine: non c'e' cosa spedire. */
  | "order_without_tickets"
  /** La serata o il tier non si sono potuti leggere. */
  | "event_unreadable"
  /** `NEXT_PUBLIC_APP_URL` assente: ogni link della mail sarebbe rotto. */
  | "app_url_missing"
  /** I codici non si sono potuti disegnare. */
  | "qr_failed"
  /** Il messaggio esiste gia' nel registro: non se ne manda un secondo. */
  | "already_sent"
  /** Il fornitore ha rifiutato l'invio. */
  | "send_failed";

export type OrderConfirmationResult =
  | {
      sent: true;
      /** La ricevuta di presa in carico del fornitore. **Non** una consegna. */
      providerMessageId: string | null;
      /**
       * Se l'invio e' entrato nel registro. `false` significa che il suo esito
       * non sara' **mai** verificato: e' uno stato distinto sia da consegnata
       * sia da non consegnata, e chi chiama deve poterlo dire.
       */
      recorded: boolean;
      ticketCount: number;
      /** Se il blocco «Completa il tuo account» era nella mail. */
      completeAccountOffered: boolean;
    }
  | { sent: false; reason: OrderConfirmationFailure; detail: string };

/**
 * L'ordinale dentro l'ordine, letto da `holder_label` («2 di 6»).
 *
 * Serve a ordinare i riquadri, e l'ordine conta: chi inoltra «il terzo» deve
 * trovare il terzo dove se lo aspetta. Un'etichetta che non cominci con un
 * numero finisce in coda invece di far fallire l'invio — un biglietto in
 * disordine e' un fastidio, un biglietto non spedito e' una persona alla porta.
 */
function ordinalOf(label: string | null): number {
  const n = Number.parseInt((label ?? "").trim().split(" ")[0] ?? "", 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/**
 * Compone e spedisce la mail di un ordine. **Non solleva mai.**
 *
 * ── Su cosa questa funzione NON garantisce da sola ──────────────────────────
 *
 * **Non e' idempotente per costruzione: lo diventa guardando il registro.**
 * `comms-analytics.md` chiede che ogni percorso d'invio sia idempotente e marcato
 * per destinatario, e una mail partita non si richiama. La guardia sta **qui** e
 * non nei chiamanti perche' i chiamanti sono due — il webhook del pagamento e la
 * pagina di conferma — e due guardie scritte in due posti sono una guardia
 * dimenticata in uno dei due.
 *
 * La guardia legge se esiste gia' una riga di registro per il **primo biglietto**
 * dell'ordine in questa categoria. Se la riga non c'e' perche' la registrazione
 * era fallita, la mail **riparte**: fra un duplicato e un silenzio, su un
 * messaggio che porta l'unica copia di un biglietto, la direzione giusta e' il
 * duplicato.
 */
export async function sendOrderConfirmation({
  orderId,
  serviceClient,
}: {
  orderId: string;
  serviceClient: ReturnType<typeof getServiceClient>;
}): Promise<OrderConfirmationResult> {
  const fail = (
    reason: OrderConfirmationFailure,
    detail: string
  ): OrderConfirmationResult => {
    console.error(`[tickets.order_email_${reason}] order=${orderId} ${detail}`);
    return { sent: false, reason, detail };
  };

  try {
    // ── L'indirizzo di questo prodotto, letto con un controllo ────────────────
    //
    // Mai un'asserzione non-null: `comms-analytics.md`, gate *variabili
    // d'ambiente verificate*. Un a-capo in coda a questa variabile ha gia' rotto
    // il webhook dei pagamenti una volta, quindi si legge, si taglia, e si
    // verifica che sia rimasto qualcosa.
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "")
      .trim()
      .replace(/\/+$/, "");
    if (!appUrl) {
      // Non si prosegue con un dominio inventato. Il ripiego `https://resonate.app`
      // che vive altrove in questo codice manda i link a un posto che non e'
      // questo prodotto: una mail con dentro i link sbagliati e' peggio di una
      // mail non partita, perche' sembra funzionare.
      return fail("app_url_missing", "NEXT_PUBLIC_APP_URL assente o vuota");
    }

    // ── L'ordine. Colonne nominate una per una, mai `*` ───────────────────────
    const { data: order, error: orderError } = await serviceClient
      .from("ticket_orders")
      .select("id, event_id, party_id, tier_id, user_id, buyer_email, quantity")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return fail(
        "order_unreadable",
        orderError ? redactDbError(orderError) : "nessuna riga"
      );
    }

    const buyerEmail = (order.buyer_email ?? "").trim();
    if (!buyerEmail) {
      return fail("order_without_buyer", "buyer_email vuoto");
    }

    // ── I biglietti dell'ordine ───────────────────────────────────────────────
    //
    // Nessun incorporamento: si chiedono due colonne e basta. L'ordinamento
    // definitivo lo fa `ordinalOf` qui sotto, perche' `holder_label` e' testo e
    // un ordinamento lessicale metterebbe «10 di 12» prima di «2 di 12».
    const { data: ticketRows, error: ticketsError } = await serviceClient
      .from("tickets")
      .select("id, holder_label")
      .eq("order_id", orderId);

    if (ticketsError) {
      return fail("order_unreadable", redactDbError(ticketsError));
    }

    const tickets = [...(ticketRows ?? [])].sort(
      (a, b) => ordinalOf(a.holder_label) - ordinalOf(b.holder_label)
    );

    if (tickets.length === 0) {
      // Non e' una svista da ignorare: e' un pagamento incassato senza biglietti,
      // e mandare una mail vuota lo nasconderebbe dietro una conferma.
      return fail("order_without_tickets", "zero biglietti per quest'ordine");
    }

    // ── La guardia contro il secondo invio ────────────────────────────────────
    const { data: alreadyRecorded, error: ledgerError } = await serviceClient
      .from("email_deliveries")
      .select("id")
      .eq("category", CATEGORY)
      .eq("ticket_id", tickets[0].id)
      .limit(1);

    if (ledgerError) {
      // Una lettura fallita NON e' «non e' mai partita». Ma fermarsi qui
      // significherebbe che un registro illeggibile impedisce a qualcuno di
      // ricevere il proprio biglietto, e fra i due modi di sbagliare questo e'
      // il peggiore. Si prosegue, e la causa resta scritta con un nome suo.
      console.error(
        `[tickets.order_email_ledger_unreadable] order=${orderId} ${redactDbError(ledgerError)}`
      );
    } else if ((alreadyRecorded?.length ?? 0) > 0) {
      return fail("already_sent", "riga di registro gia' presente");
    }

    // ── La serata, il tier, la sua data ───────────────────────────────────────
    const { data: event, error: eventError } = await serviceClient
      .from("events")
      .select("title, date")
      .eq("id", order.event_id)
      .single();

    const { data: tier, error: tierError } = await serviceClient
      .from("ticket_tiers")
      .select("name")
      .eq("id", order.tier_id)
      .single();

    if (eventError || !event || tierError || !tier) {
      return fail(
        "event_unreadable",
        `event=${eventError ? redactDbError(eventError) : event ? "ok" : "nessuna riga"} ` +
          `tier=${tierError ? redactDbError(tierError) : tier ? "ok" : "nessuna riga"}`
      );
    }

    let party: { title: string; time: string } | null = null;
    if (order.party_id) {
      // Due colonne, e nessuna che descriva un posto. Un fallimento qui non
      // ferma la mail: senza il titolo della serata il biglietto resta valido,
      // e il codice e' cio' che apre la porta.
      const { data: partyRow, error: partyError } = await serviceClient
        .from("event_parties")
        .select("title, time")
        .eq("id", order.party_id)
        .single();
      if (partyError) {
        console.error(
          `[tickets.order_email_party_unreadable] order=${orderId} ${redactDbError(partyError)}`
        );
      }
      party = partyRow ?? null;
    }

    // ── Un codice per biglietto ───────────────────────────────────────────────
    //
    // `errorCorrectionLevel: "H"` come l'invio che esiste gia': la porta legge
    // dallo schermo di qualcun altro, di notte, spesso con un telefono che non
    // e' il proprio, e il livello alto e' cio' che rende leggibile un codice
    // ritagliato o inoltrato come screenshot.
    //
    // Il nome dell'allegato E' il riferimento che il template scrive: e' cosi'
    // che si lega un'immagine in linea al suo riquadro. I due valori nascono qui
    // e viaggiano insieme dentro `qrCid`, invece di essere ricalcolati di la'
    // dalla posizione — con sei biglietti uno sfasamento non e' un'immagine
    // rotta, e' il codice sbagliato sotto l'etichetta giusta.
    const attachments: Array<{
      content: string;
      filename: string;
      content_type: string;
    }> = [];
    const emailTickets: TicketOrderTicket[] = [];

    try {
      for (let i = 0; i < tickets.length; i += 1) {
        const ticket = tickets[i];
        const cid = `ticket-qr-${i + 1}`;
        const buffer = await QRCode.toBuffer(generateTicketToken(ticket.id), {
          width: 280,
          margin: 2,
          errorCorrectionLevel: "H",
        });
        attachments.push({
          content: buffer.toString("base64"),
          filename: `${cid}.png`,
          content_type: "image/png",
        });
        emailTickets.push({
          label: ticket.holder_label ?? `${i + 1} di ${tickets.length}`,
          url: `${appUrl}/tickets/${ticket.id}`,
          qrCid: cid,
        });
      }
    } catch (qrError) {
      return fail(
        "qr_failed",
        qrError instanceof Error ? qrError.message : "errore non-Error"
      );
    }

    // ── La via di rientro, quando si costruisce ───────────────────────────────
    //
    // Se `buildPasswordSetLink` fallisce **la mail parte comunque**, senza il
    // blocco. Un biglietto che non arriva perche' non si e' potuto costruire un
    // link e' un fallimento che questo dominio non accetta: il biglietto e' la
    // cosa per cui la persona ha pagato, la password e' una comodita' in piu'.
    //
    // Il fallimento ha la sua categoria e non sparisce — senza error tracking, un
    // messaggio generico qui sarebbe indistinguibile da tutto il resto.
    let completeAccountUrl: string | null = null;
    const link = await buildPasswordSetLink(
      serviceClient.auth.admin,
      buyerEmail,
      appUrl
    );
    if (link.ok) {
      completeAccountUrl = link.url;
    } else {
      console.error(
        `[tickets.password_link_failed] order=${orderId} reason=${link.reason} detail=${link.detail}`
      );
    }

    const html = await render(
      TicketOrderEmail({
        // Nessun nome viene chiesto all'acquisto (`D-49-03`, il biglietto e' al
        // portatore), quindi cio' che si conosce di chi compra e' il suo
        // indirizzo di posta. La parte prima della chiocciola e' un saluto
        // ragionevole; il resto sarebbe ripetergli cio' che ha appena scritto.
        buyerLabel: buyerEmail.split("@")[0] || "ciao",
        eventTitle: event.title,
        eventDate: formatEventDate(event.date),
        eventTime: party ? formatTime(party.time) : "",
        partyTitle: party?.title ?? (order.party_id ? undefined : "Event Pass"),
        tierName: tier.name,
        tickets: emailTickets,
        completeAccountUrl,
      })
    );

    const subject =
      emailTickets.length > 1
        ? `I tuoi ${emailTickets.length} biglietti per ${event.title}`
        : `Il tuo biglietto per ${event.title}`;

    // ── L'invio ───────────────────────────────────────────────────────────────
    //
    // `userId` viene dall'ordine, ed e' `null` finche' l'identita' non e' nata:
    // il registro **non conserva l'indirizzo** per decisione e lo risolve da li'
    // quando serve. Regge perche' l'identita' e' vera — un ordine gia' evaso ce
    // l'ha sempre — e non reggerebbe su un ordine ancora senza proprietario, che
    // pero' non ha nemmeno biglietti e si e' gia' fermato sopra.
    //
    // `ticketId` e' il **primo** biglietto dell'ordine, ed e' cio' che rende
    // l'invio osservabile: la superficie dei venduti attacca il segno a quella
    // riga. Gli altri N-1 risulteranno «nessun invio registrato», che e' vero —
    // l'invio e' **uno**, non sei — ma si legge come *nessuno ha guardato*.
    // Registrato come debito: la superficie dovra' imparare a leggere l'ordine.
    const result = await sendEmail({
      to: buyerEmail,
      subject,
      html,
      category: CATEGORY,
      userId: order.user_id ?? null,
      ticketId: tickets[0].id,
      attachments,
    });

    return {
      sent: true,
      providerMessageId: result.id,
      recorded: result.recorded,
      ticketCount: emailTickets.length,
      completeAccountOffered: completeAccountUrl !== null,
    };
  } catch (unexpected) {
    // L'ultima rete. `sendEmail` solleva quando il fornitore restituisce un
    // errore, e quel percorso **non deve** risalire fino a chi ha incassato:
    // gate *soldi vs contenuto*. Qui si ferma, con la sua causa scritta.
    const detail =
      unexpected instanceof Error ? unexpected.message : "errore non-Error";
    console.error(`[tickets.order_email_send_failed] order=${orderId} ${detail}`);
    return { sent: false, reason: "send_failed", detail };
  }
}
