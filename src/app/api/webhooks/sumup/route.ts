import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getCheckout } from "@/lib/sumup";
import { sendEmail } from "@/lib/email";
import { TicketConfirmationEmail } from "@/emails/ticket-confirmation";
import { MemberApprovedEmail } from "@/emails/member-approved";
import { render } from "@react-email/render";
import QRCode from "qrcode";
import { formatTime, formatEventDate } from "@/utils/formatTime";
import { generateTicketToken } from "@/utils/qr";
import { resolveGuestIdentity } from "@/lib/tickets/guest-identity";
import { sendOrderConfirmation } from "@/lib/tickets/order-confirmation";
import { redactDbError } from "@/lib/errors/redact";
import {
  revealPartyVenueForOrder,
  type VenueRevealFailureKind,
} from "@/lib/venue-reveal/reveal-party-venue";
import { hasRevealFired, isNightSecret } from "@/lib/venue-reveal/venue-disclosure";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Quali esiti della rivelazione tardiva lasciano **chi ha pagato senza
 * l'indirizzo**.
 *
 * Un `Record` **totale** e non una lista di tre nomi, per la stessa ragione per
 * cui `REPORTABLE_FAILURE` nel cron lo e': una lista risponde alla domanda di
 * oggi e tace su un esito futuro, che sarebbe semplicemente assente — e assente
 * qui significa **nessuna traccia**, cioe' una persona che ha pagato, non ha
 * ricevuto l'indirizzo, e di cui nessuno sa niente. Totale, un esito nuovo e' un
 * errore di compilazione finche' qualcuno non dichiara da che parte sta.
 *
 * Due esiti valgono `false` e i due `false` non hanno la stessa ragione:
 *
 *   `none`           — almeno una mail e' partita. Su questa strada il
 *                      destinatario e' uno, quindi «almeno una» e' «la sua».
 *   `reveal_not_due` — non era dovuto niente. Il cron ci arrivera'.
 *
 * `no_recipients` vale **`true` qui e `false` nel cron**, e la divergenza e'
 * deliberata. Nel cron significa *«questa serata e' gia' stata servita»*, che e'
 * lo stato di regime. Qui non puo' significare quello: i biglietti sono nati in
 * questa stessa consegna con `venue_reveal_sent = false`, e il ramo si
 * raggiunge una volta sola per ordine (la seconda consegna esce su
 * `status = 'completed'`). Zero destinatari vuol dire quindi che **chi ha appena
 * pagato non e' stato visto da chi spedisce** — un'assenza da dire, non uno
 * stato di regime.
 */
const SENZA_INDIRIZZO: Record<VenueRevealFailureKind, boolean> = {
  none: false,
  reveal_not_due: false,
  no_recipients: true,
  send_failed: true,
  recipients_unavailable: true,
  party_not_found: true,
};

/**
 * La faccia del fallimento della rivelazione tardiva, su una superficie che
 * qualcuno guarda.
 *
 * ── Perche' non `email_deliveries`, che sarebbe stato il posto ovvio ─────────
 *
 * Quel registro **non puo' contenere un invio mai partito**, misurato due volte
 * — dalla migration (`20260822130000_email_delivery_ledger.sql:64`,
 * `provider_message_id text NOT NULL UNIQUE`) e dal catalogo vivo, dove le
 * colonne obbligatorie sono sei e quella e' fra loro. E i quattro valori di
 * `outcome` presuppongono tutti che un invio sia partito: nessuno puo' dire
 * *«non e' mai stata tentata»*. Servirebbero due modifiche di schema.
 *
 * ── Lo strappo semantico, dichiarato invece che nascosto ────────────────────
 *
 * **`error_message` ha sempre voluto dire «perche' l'ordine e' fallito», e qui
 * la si scrive su una riga che NON e' fallita.** `status` resta `completed` e
 * non e' un dettaglio: i biglietti esistono, il denaro e' buono, il codice QR
 * apre la porta. Portare l'ordine a `failed` sarebbe falso su entrambe le
 * superfici che lo leggono, e direbbe a chi lavora la serata di richiamare una
 * persona per un biglietto che invece ha.
 *
 * E' anche il motivo per cui la superficie disegna questi ordini in un insieme
 * **separato** dai falliti — vedi
 * `src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx`. Fusi, chi legge
 * non saprebbe piu' se «errore» voglia dire *nessun biglietto* o *nessun
 * indirizzo*: sono due telefonate diverse a due persone diverse.
 *
 * Scriverlo nel `COMMENT` della colonna richiederebbe una migration. Si scrive
 * quindi **nel codice che la scrive e in quello che la legge**, in entrambi.
 */
async function segnaAssenza(
  supabase: SupabaseClient,
  orderId: string,
  cause: string,
  detail: string
): Promise<void> {
  console.error(`[tickets.order_${cause}] order=${orderId} ${detail}`);

  const { error } = await supabase
    .from("ticket_orders")
    .update({
      // `status` NON compare in questo aggiornamento, ed e' l'intero punto.
      error_message: `${cause}: ${detail}`.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    // Il fallimento del fallimento. Non c'e' un terzo posto dove scriverlo, e
    // va detto invece che nascosto: se questa riga compare, esiste una persona
    // che ha pagato, non sa dove andare, e **nessuna superficie lo mostra**.
    console.error(
      `[tickets.order_reveal_gap_unrecordable] order=${orderId} ${redactDbError(error)}`
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Only process checkout status changes
    if (body.event_type !== "CHECKOUT_STATUS_CHANGED") {
      return NextResponse.json({ received: true });
    }

    // ALWAYS verify via GET checkout API (never trust webhook body for status)
    const checkout = await getCheckout(body.id);

    if (checkout.status !== "PAID") {
      return NextResponse.json({ received: true });
    }

    const supabase = getServiceClient();

    // Look up pending purchase by checkout ID
    const { data: purchase } = await supabase
      .from("pending_purchases")
      .select("*")
      .eq("sumup_checkout_id", checkout.id)
      .single();

    if (purchase) {
      // Idempotency: skip if already completed
      if (purchase.status === "completed") {
        return NextResponse.json({ received: true });
      }

      // Get transaction code from checkout data
      const transactionCode =
        checkout.transactions?.[0]?.transaction_code || null;

      // Atomic ticket reservation via RPC
      const { data: ticketId, error: rpcError } = await supabase.rpc(
        "reserve_ticket",
        {
          p_tier_id: purchase.tier_id,
          p_user_id: purchase.user_id,
          p_event_id: purchase.event_id,
          p_party_id: purchase.party_id,
          p_sumup_checkout_id: checkout.id,
          p_sumup_transaction_code: transactionCode,
          p_amount_paid: checkout.amount,
          p_discount_code_id: purchase.discount_code_id ?? null,
        }
      );

      if (rpcError) {
        // Update pending purchase as failed
        await supabase
          .from("pending_purchases")
          .update({
            status: "failed",
            error_message: rpcError.message,
          })
          .eq("id", purchase.id);

        console.error("Webhook: reserve_ticket RPC failed", rpcError.message);
        return NextResponse.json({ received: true });
      }

      // Update pending purchase as completed
      await supabase
        .from("pending_purchases")
        .update({
          status: "completed",
          ticket_id: ticketId,
        })
        .eq("id", purchase.id);

      // Auto-approve pending members on successful ticket purchase
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", purchase.user_id)
        .eq("status", "pending")
        .select("email, full_name")
        .single();

      if (updatedProfile) {
        // Fire-and-forget: send approval email
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://resonate.app"}/login`;
        render(MemberApprovedEmail({ memberName: updatedProfile.full_name || "Member", loginUrl }))
          .then((html) => sendEmail({ to: updatedProfile.email, subject: "Welcome to Resonate - You're Approved!", html, category: "member_approved", userId: purchase.user_id }))
          .catch((err) => console.error("Webhook: approval email failed (non-blocking)", err));
      }

      // Fire-and-forget: send confirmation email with QR code
      try {
        // Fetch user info
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", purchase.user_id)
          .single();

        // Fetch event details
        const { data: event } = await supabase
          .from("events")
          .select("title, date, slug")
          .eq("id", purchase.event_id)
          .single();

        // Fetch party details (may be null for master ticket)
        let party: { title: string; time: string } | null = null;
        if (purchase.party_id) {
          const { data: partyData } = await supabase
            .from("event_parties")
            .select("title, time")
            .eq("id", purchase.party_id)
            .single();
          party = partyData;
        }

        // Fetch tier name
        const { data: tier } = await supabase
          .from("ticket_tiers")
          .select("name")
          .eq("id", purchase.tier_id)
          .single();

        if (profile && event && tier) {
          const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticketId}`;

          // Generate QR code buffer
          const qrBuffer = await QRCode.toBuffer(generateTicketToken(ticketId), {
            width: 280,
            margin: 2,
            errorCorrectionLevel: "H",
          });

          // Format date for email
          const formattedDate = formatEventDate(event.date);

          const eventTime = party ? formatTime(party.time) : "";

          // Render email HTML
          const html = await render(
            TicketConfirmationEmail({
              memberName: profile.full_name || "Member",
              eventTitle: event.title,
              eventDate: formattedDate,
              eventTime,
              tierName: tier.name,
              partyTitle: party?.title ?? (purchase.party_id ? undefined : "Event Pass"),
              ticketUrl,
            })
          );

          // Send email with inline QR code attachment
          // ── L'INVIO PIU' IMPORTANTE DEL PRODOTTO, E ORA E' VERIFICABILE ─────
          //
          // Fino al 2026-08-22 questa chiamata poteva tornare «riuscita» per un
          // messaggio che il fornitore non avrebbe mai consegnato: la sua lista
          // di soppressione accetta la chiamata, restituisce `error` nullo e un
          // identificativo regolare, e salta la consegna. Il percorso completo,
          // con le fonti, e' in `src/lib/email.ts`.
          //
          // `ticketId` e' cio' che rende il fatto OSSERVABILE: la superficie
          // admin dei venduti lo usa per attaccare l'esito alla riga del
          // biglietto, e chi lavora la serata vede «email not delivered» prima
          // che la persona si presenti all'ingresso senza sapere di avere un
          // biglietto.
          //
          // NIENTE ALTRO IN QUESTO BLOCCO E' CAMBIATO. Nessuna transizione di
          // stato, nessun importo, nessuna chiave di idempotenza, nessun ordine
          // di chiamata: le tre proprieta' aggiunte all'oggetto sono l'intera
          // modifica, e l'invio resta dentro il `try` che gia' garantisce che un
          // fallimento della posta non faccia fallire il webhook.
          await sendEmail({
            to: profile.email,
            subject: `Your ticket for ${event.title}`,
            html,
            category: "ticket_confirmation",
            userId: purchase.user_id,
            ticketId,
            attachments: [
              {
                content: qrBuffer.toString("base64"),
                filename: "ticket-qr.png",
                content_type: "image/png",
              },
            ],
          });
        }
      } catch (emailError) {
        // Email failure should NOT cause webhook to fail
        console.error("Webhook: email send failed (non-blocking)", emailError);
      }

      return NextResponse.json({ received: true });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // === Ticket order handling — l'acquisto SENZA ACCOUNT (fase 49) ===
    // ═══════════════════════════════════════════════════════════════════════
    //
    // Il terzo ramo, e **i due sopra e sotto non sono stati toccati**: un
    // percorso nuovo su un file che muove denaro si aggiunge, non si intreccia.
    //
    // ── E' QUI CHE UN INCASSO DIVENTA UN'IDENTITA' ─────────────────────────
    //
    // `49-CONTEXT.md`: l'account leggero nasce **al webhook**, non all'avvio del
    // checkout. Nessun conto senza un pagamento verificato dietro — cioe'
    // nessun account fantasma per ogni carrello abbandonato, e nessuna
    // credenziale della porta in piu' al mondo per qualcuno che non ha comprato.
    //
    // ── DOVE STA L'IDEMPOTENZA, CHE E' LA PROPRIETA' CHE CONTA ─────────────
    //
    // La consegna at-least-once e' il disegno, non l'eccezione: SumUp ritenta.
    // Questo ramo regge una seconda consegna in **quattro** punti indipendenti,
    // e nessuno dei quattro e' scritto qui dentro per intero — e' voluto, perche'
    // una guardia che vive solo nel codice del chiamante e' una guardia che si
    // dimentica:
    //
    //   1. **Nello schema** — `ticket_orders.sumup_checkout_id` e' UNIQUE, e
    //      `tickets.sumup_checkout_id` **non lo e' piu'**: il vincolo si e'
    //      spostato apposta, cosi' una seconda consegna collide sull'ordine e
    //      non su un biglietto. Letto dal catalogo il 2026-09-06.
    //   2. **Qui sotto** — l'uscita su `status = 'completed'`, prima di tutto.
    //   3. **Dentro la RPC** — che blocca la riga dell'ordine `FOR UPDATE` e, se
    //      la trova gia' chiusa, **restituisce gli stessi id senza inserire**.
    //      E' il punto che regge due consegne SIMULTANEE, che l'uscita al punto
    //      2 non vedrebbe perche' nessuna delle due ha ancora chiuso l'ordine.
    //   4. **Nell'identita' e nella posta** — `resolveGuestIdentity` cerca prima
    //      di coniare e rilegge se la creazione fallisce; `sendOrderConfirmation`
    //      guarda il registro delle consegne prima di spedire.
    //
    // ── E LO STATO `failed` NON E' UN VICOLO CIECO ─────────────────────────
    //
    // Un ordine portato a `failed` da un intoppo passeggero viene **ritentato**
    // dalla consegna successiva: il ramo qui sotto esce solo su `completed`, e la
    // RPC dichiara esplicitamente che `failed` non la blocca. E' la direzione
    // giusta — chi ha pagato deve poter ricevere il biglietto al secondo giro —
    // e resta dentro il gate *stato terminale monotono*, perche' la correzione
    // va in avanti.
    const { data: ticketOrder } = await supabase
      .from("ticket_orders")
      .select(
        // `party_id` e' aggiunto dal passo 7: la rivelazione e' **per serata**,
        // e senza questa colonna il ramo tardivo non saprebbe quale stato
        // temporale interrogare. Nullabile nello schema — un ordine di evento —
        // e il passo 7 dichiara cosa fa in quel caso invece di presumerlo.
        "id, status, buyer_email, user_id, total_amount, quantity, event_id, party_id"
      )
      .eq("sumup_checkout_id", checkout.id)
      .single();

    if (ticketOrder) {
      // 1. L'USCITA IDEMPOTENTE, PRIMA DI TUTTO — stessa forma del ramo sopra.
      if (ticketOrder.status === "completed") {
        return NextResponse.json({ received: true });
      }

      // Un ordine che va a `failed` porta la causa **scritta sulla riga**, non
      // solo in un log: questo progetto non ha error tracking, quindi un
      // `console.error` non raggiunge nessun essere umano da solo. La riga e'
      // cio' che la superficie dei venduti disegna (task 3), ed e' li' che un
      // pagamento senza biglietti trova una faccia prima della serata.
      const failOrder = async (cause: string, detail: string) => {
        console.error(
          `[tickets.order_${cause}] order=${ticketOrder.id} ${detail}`
        );
        const { error: markError } = await supabase
          .from("ticket_orders")
          .update({
            status: "failed",
            // Troncato: `error_message` finisce su uno schermo, e un messaggio
            // di mezzo chilometro nasconde gli altri ordini invece di spiegare
            // questo.
            error_message: `${cause}: ${detail}`.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticketOrder.id);

        if (markError) {
          // Il fallimento del fallimento. Non c'e' un terzo posto dove
          // scriverlo, e va detto invece che nascosto: se questa riga compare,
          // esiste un incasso senza biglietti E senza una faccia.
          console.error(
            `[tickets.order_failure_unrecordable] order=${ticketOrder.id} ${redactDbError(markError)}`
          );
        }
      };

      // L'importo, confrontato con quello che il FORNITORE dice di aver preso.
      //
      // Non blocca, e la scelta e' deliberata: rifiutare i biglietti a chi ha
      // pagato per una differenza di arrotondamento sarebbe il danno peggiore
      // dei due (`checkin-offline.md`, l'asimmetria della porta). E' una spia,
      // e come ogni riga di log **non e' un effetto osservabile** in un progetto
      // senza error tracking — detto qui invece di lasciar credere il contrario.
      if (
        typeof checkout.amount === "number" &&
        Math.round(checkout.amount * 100) !==
          Math.round(Number(ticketOrder.total_amount) * 100)
      ) {
        console.error(
          `[tickets.order_amount_mismatch] order=${ticketOrder.id} ` +
            `checkout=${checkout.amount} ordine=${ticketOrder.total_amount}`
        );
      }

      const orderTransactionCode =
        checkout.transactions?.[0]?.transaction_code || null;

      // 2. L'IDENTITA'.
      //
      // Se l'ordine ha gia' un portatore non se ne cerca un altro: e' il caso di
      // una seconda consegna arrivata dopo che la prima aveva attaccato
      // l'identita' ma prima che chiudesse l'ordine. Ririsolvere l'indirizzo
      // sarebbe innocuo nel caso normale e sbagliato in quello in cui l'ordine
      // e' gia' legato a qualcuno.
      let buyerId = ticketOrder.user_id ?? null;
      if (!buyerId) {
        const identity = await resolveGuestIdentity(
          supabase,
          ticketOrder.buyer_email
        );

        if (!identity.ok) {
          // E' UN PAGAMENTO INCASSATO SENZA BIGLIETTI. La causa distinta entra
          // nella riga; si risponde `200` perche' ritentare all'infinito una
          // cosa che non migliorera' da sola non aiuta nessuno.
          await failOrder(`identity_${identity.reason}`, identity.detail);
          return NextResponse.json({ received: true });
        }

        buyerId = identity.userId;
      }

      // 3. IL PORTATORE E IL CODICE DI TRANSAZIONE, UNA VOLTA SOLA SULL'ORDINE.
      //
      // Il codice sta **sull'ordine** e non sulle N righe perche' e' l'ordine ad
      // aver mosso il denaro, ed e' da li' che un rimborso SumUp lo legge. La
      // RPC lo copia poi su ogni biglietto insieme al resto.
      const { error: attachError } = await supabase
        .from("ticket_orders")
        .update({
          user_id: buyerId,
          sumup_transaction_code: orderTransactionCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketOrder.id);

      if (attachError) {
        // Senza questo controllo il fallimento arriverebbe comunque, un passo
        // piu' in la', come «ordine senza portatore» — cioe' con il nome di
        // un'altra causa addosso, che manda chi indaga nel posto sbagliato.
        await failOrder("attach_failed", redactDbError(attachError));
        return NextResponse.json({ received: true });
      }

      // 4. I BIGLIETTI: N righe in UNA transazione.
      //
      // `p_issued_via` e' l'attribuzione, e sta sul **biglietto** — non su
      // `approved_via`, che le fasi 50/51 stanno smontando. La forma e' quella
      // di `src/lib/guest-list/process-entry.ts:176`, spostata sull'oggetto che
      // sopravvive alla milestone.
      // `data` e' l'insieme degli id emessi — la RPC e' `RETURNS SETOF uuid`.
      // Serve al passo 7, ed e' l'unica lista che restringe la mail
      // dell'indirizzo ai biglietti di QUESTO ordine: leggerli con una seconda
      // query per `order_id` darebbe lo stesso insieme oggi e un insieme diverso
      // il giorno in cui qualcosa scrivesse `order_id` altrove.
      const { data: idsEmessi, error: orderRpcError } = await supabase.rpc(
        "reserve_ticket_order",
        {
          p_order_id: ticketOrder.id,
          p_issued_via: "guest_checkout",
        }
      );

      if (orderRpcError) {
        // Il messaggio della RPC porta gia' la causa vera — tetto per ordine,
        // capienza del tier, usi del codice sconto esauriti — e va conservato
        // com'e': riassumerlo qui significherebbe buttare via la sola diagnosi
        // che esistera'.
        await failOrder("reservation_failed", orderRpcError.message);
        return NextResponse.json({ received: true });
      }

      // 5. SOLO ORA L'AMMISSIONE.
      //
      // *Il pagamento decide l'ammissione* e' la decisione del proprietario, e
      // questa riga e' dove avviene — **dopo** che i biglietti esistono, mai
      // prima: una persona ammessa da un ordine che poi non ha prodotto niente
      // sarebbe un accesso concesso senza pagamento evaso.
      //
      // La guardia `.eq("status", "pending")` la rende idempotente ed e' la
      // stessa gia' in uso nel ramo sopra: la seconda consegna non trova piu'
      // niente da aggiornare.
      //
      // **Nessuna mail di benvenuto**, e non e' una dimenticanza. Il ramo sopra
      // ne manda una che dice *«You're Approved»*: e' il registro «diventa
      // membro» che `49-CONTEXT.md` vieta esplicitamente su questo percorso
      // (punto 5 delle decisioni del proprietario). Chi ha comprato riceve UNA
      // mail — biglietti piu' *«Completa il tuo account»* — e due messaggi che
      // raccontano la stessa cosa in due modi diversi sono il modo in cui il
      // prodotto si contraddice davanti a chi lo usa.
      const { error: admitError } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", buyerId)
        .eq("status", "pending");

      if (admitError) {
        // NON si porta l'ordine a `failed`: i biglietti esistono e sono validi.
        // Il gate *soldi vs contenuto* al contrario — qui il denaro e' andato a
        // buon fine e cio' che manca e' uno stato che alla porta non si legge
        // (`attendance/route.ts:145`). Si scrive e si prosegue.
        console.error(
          `[tickets.order_admission_failed] order=${ticketOrder.id} ${redactDbError(admitError)}`
        );
      }

      // 6. LA MAIL, dentro un `try` che non puo' far fallire l'incasso.
      //
      // `sendOrderConfirmation` non solleva verso chi chiama, ma `await` su una
      // promessa e' comunque un punto in cui qualcosa di inatteso passerebbe: il
      // `try` e' la rete, non la fiducia.
      try {
        const mail = await sendOrderConfirmation({
          orderId: ticketOrder.id,
          serviceClient: supabase,
        });

        if (!mail.sent) {
          console.error(
            `[tickets.order_email_not_sent] order=${ticketOrder.id} reason=${mail.reason}`
          );
        } else if (!mail.recorded) {
          // Partita ma non registrata: il suo esito non sara' **mai**
          // verificato, ed e' uno stato distinto sia da consegnata sia da non
          // consegnata. Sulla superficie dei venduti si legge «no send
          // recorded».
          console.error(
            `[tickets.order_email_unrecorded] order=${ticketOrder.id} tickets=${mail.ticketCount}`
          );
        }
      } catch (orderEmailError) {
        console.error(
          "Webhook: order confirmation email failed (non-blocking)",
          orderEmailError
        );
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 7. L'INDIRIZZO, SOLO SE LA RIVELAZIONE E' GIA' SCATTATA
      // ═══════════════════════════════════════════════════════════════════════
      //
      // ── Il buco che questa fase apre, e che si chiude qui ──────────────────
      //
      // `api/cron/venue-reveal/route.ts` dichiara la regola: chi compra DOPO la
      // rivelazione legge l'indirizzo sulla pagina del proprio biglietto e non
      // riceve nessuna mail. Quella pagina fa `auth.getUser()` e rimbalza a
      // `/login`: **per un ospite che non ha mai scelto una password non
      // esiste, quindi non esiste nessun indirizzo. Ha pagato e non sa dove
      // andare.**
      //
      // `D-49-04`: l'indirizzo gli arriva **per mail**, invece di costruire una
      // superficie che lo mostri. Il segreto resta largo esattamente com'e'
      // oggi — la credenziale del biglietto non diventa una chiave verso
      // l'indirizzo.
      //
      // ── Il caso ORDINARIO qui e' non fare niente ───────────────────────────
      //
      // Quasi tutti comprano PRIMA della finestra. Per loro questo blocco esce
      // senza spedire e senza marcare, e non e' un errore: la rivelazione
      // arrivera' dal cron, per tutti insieme, come e' sempre stato.
      //
      // ── Cosa questo blocco NON tocca ───────────────────────────────────────
      //
      // La guardia **per serata** — quella che il cron alza quando almeno una
      // mail e' partita — non compare in questo file in nessun ramo. E' per
      // serata e non per acquirente: alzata da qui direbbe al cron che una
      // serata e' fatta mentre quasi tutti non hanno ricevuto niente.
      //
      // ── E il denaro non dipende da questo ──────────────────────────────────
      //
      // `ticketing-payments.md`, gate *soldi vs contenuto*: una scrittura di
      // contenuto che fallisce non aborta il percorso del pagamento. Ma qui il
      // fallimento e' **una persona che ha pagato e non sa dove andare**, ed e'
      // il verso in cui `venue-secrecy.md` dice che *arrivare tardi e' grave
      // quanto arrivare in anticipo*. Percio' non basta loggarlo: lascia una
      // traccia su una superficie che qualcuno guarda — vedi `segnaAssenza`.
      try {
        const ticketIdsOrdine = Array.isArray(idsEmessi)
          ? (idsEmessi as unknown[]).filter(
              (v): v is string => typeof v === "string"
            )
          : [];

        if (!ticketOrder.party_id) {
          // Un ordine di EVENTO, senza serata nominata. La rivelazione e' per
          // serata: da qui non si sceglie a quale delle N serate spedire, e
          // sceglierne una sarebbe inventare. Non e' coperto, ed e' scritto nel
          // referto come tale invece di sembrarlo. Oggi la strada d'acquisto
          // ospite pretende una serata (`purchaseTicketsGuest`, `partyId:
          // string`), quindi questo ramo non e' raggiungibile da li'.
          console.error(
            `[tickets.order_reveal_no_party] order=${ticketOrder.id} ordine di evento: la rivelazione tardiva non e' coperta`
          );
        } else if (ticketIdsOrdine.length === 0) {
          // I biglietti esistono — la RPC non ha dato errore — ma i loro id non
          // sono arrivati. Senza la lista non si spedisce **niente**: una
          // chiamata senza restrizione raggiungerebbe tutta la serata, e questa
          // e' esattamente la differenza fra tacere e pubblicare un indirizzo.
          await segnaAssenza(
            supabase,
            ticketOrder.id,
            "reveal_ids_missing",
            "la riserva non ha restituito gli id dei biglietti"
          );
        } else {
          // La serata, con i cinque campi che il predicato pretende piu' quelli
          // che compongono il messaggio. Gli stessi che legge il cron.
          const { data: serata, error: serataError } = await supabase
            .from("event_parties")
            .select(
              "id, title, date, time, venue_secret, venue_reveal_hours, venue_revealed_at, venue_text, event_id, events(title, slug), venues(name, address)"
            )
            .eq("id", ticketOrder.party_id)
            .single();

          if (serataError || !serata) {
            // *Default chiuso*: uno stato non determinabile non e' uno stato
            // vuoto. Non si spedisce, e si lascia la traccia — perche' se la
            // rivelazione era gia' scattata questa persona resta senza
            // indirizzo e nessun'altra strada la raggiunge.
            await segnaAssenza(
              supabase,
              ticketOrder.id,
              "reveal_night_unreadable",
              serataError ? redactDbError(serataError) : "nessuna riga"
            );
          } else {
            const night = {
              venueSecret: serata.venue_secret,
              partyDate: serata.date,
              partyTime: serata.time,
              venueRevealHours: serata.venue_reveal_hours,
              venueRevealedAt: serata.venue_revealed_at,
            };

            // ── LA DECISIONE, IMPORTATA E MAI RISCRITTA ───────────────────
            //
            // `venue-disclosure.ts` e' l'unica casa di questa decisione. Due
            // espressioni per una decisione divergono, e qui divergere pubblica
            // un indirizzo (`venue-secrecy.md`). Non c'e' nessun confronto su
            // `venue_secret` ne' su `venue_revealed_at` in questo file.
            //
            // La segretezza e' il primo termine perche' su una serata non
            // segreta **nessuna mail d'indirizzo e' mai stata dovuta**: il
            // luogo sta gia' sulla pagina pubblica, e spedirla sarebbe un
            // percorso di posta nuovo per serate che non ne hanno mai avuto
            // uno. E' lo stesso insieme che il cron seleziona.
            if (!isNightSecret(night.venueSecret)) {
              // Non dovuto. Nessun log: e' il funzionamento normale della
              // stragrande maggioranza delle serate.
            } else if (!hasRevealFired(night)) {
              // Non dovuto, e **non e' un fallimento**: e' il caso ordinario.
              // La rivelazione arrivera' dal cron, per tutti insieme.
            } else {
              const evento = serata.events as unknown as {
                title: string;
                slug: string;
              };
              const luogo = serata.venues as unknown as {
                name: string;
                address: string | null;
              } | null;

              // UNA chiamata per ORDINE, non una per biglietto: tutti i
              // biglietti di un ordine hanno lo stesso acquirente e lo stesso
              // indirizzo di posta, e il modulo deduplica per indirizzo — sei
              // biglietti sono un destinatario e una mail.
              //
              // La restrizione ai biglietti di quest'ordine non e' una
              // cortesia del chiamante: e' un campo obbligatorio di un
              // argomento obbligatorio, e senza di esso questa chiamata **non
              // compila**. Lo stesso vale per lo stato della serata, che e'
              // cio' che impedisce di spedire in anticipo.
              const esito = await revealPartyVenueForOrder(
                supabase,
                {
                  id: serata.id,
                  event_id: serata.event_id,
                  title: serata.title,
                  date: serata.date,
                  time: serata.time,
                  venue_text: serata.venue_text,
                  event: evento,
                  venue: luogo,
                },
                { night, onlyTicketIds: ticketIdsOrdine }
              );

              if (SENZA_INDIRIZZO[esito.failureKind]) {
                await segnaAssenza(
                  supabase,
                  ticketOrder.id,
                  `reveal_${esito.failureKind}`,
                  `serata ${serata.id}, destinatari ${esito.recipientsTotal}, ` +
                    `spediti ${esito.recipientsSent}, ritentabile ${esito.retryOutlook}`
                );
              }
            }
          }
        }
      } catch (revealError) {
        // ── IL RAMO CHE IL PIANO CHIAMA [BLOCKING] ────────────────────────
        //
        // Un'eccezione **prima** che esista una riga nel registro delle
        // consegne: errore di rete, campo della serata illeggibile, template
        // che solleva. In quel ramo non esiste nessun'altra superficie umana, e
        // questo progetto non ha error tracking — un `console.error` non
        // raggiunge nessuno da solo.
        await segnaAssenza(
          supabase,
          ticketOrder.id,
          "reveal_threw",
          revealError instanceof Error
            ? revealError.message
            : String(revealError)
        );
      }

      return NextResponse.json({ received: true });
    }

    // === Drink order handling ===
    const { data: drinkOrder } = await supabase
      .from("drink_orders")
      .select("*")
      .eq("sumup_checkout_id", checkout.id)
      .single();

    if (drinkOrder) {
      // Idempotency: skip if already completed
      if (drinkOrder.status === "completed") {
        return NextResponse.json({ received: true });
      }

      // Get transaction code for potential future refunds
      const drinkTransactionCode =
        checkout.transactions?.[0]?.transaction_code || null;

      const { error: drinkRpcError } = await supabase.rpc("fulfill_drink_order", {
        p_order_id: drinkOrder.id,
      });

      if (drinkRpcError) {
        await supabase
          .from("drink_orders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", drinkOrder.id);

        console.error("Webhook: fulfill_drink_order RPC failed", drinkRpcError.message);
        return NextResponse.json({ received: true });
      }

      // Store transaction code on the order for refund processing
      if (drinkTransactionCode) {
        await supabase
          .from("drink_orders")
          .update({ sumup_transaction_code: drinkTransactionCode })
          .eq("id", drinkOrder.id);
      }

      // Sign drink tokens with HMAC (same pattern as ticket QR codes)
      const { data: newTokens } = await supabase
        .from("drink_tokens")
        .select("id")
        .eq("order_id", drinkOrder.id);

      if (newTokens) {
        for (const t of newTokens) {
          const signedToken = generateTicketToken(t.id);
          await supabase
            .from("drink_tokens")
            .update({ token: signedToken })
            .eq("id", t.id);
        }
      }

      return NextResponse.json({ received: true });
    }

    // No matching pending_purchase or drink_order found -- nothing to do
    console.log("Webhook: checkout completed, no matching record", checkout.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook: unexpected error", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
