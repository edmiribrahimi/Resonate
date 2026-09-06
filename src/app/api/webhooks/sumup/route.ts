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
        "id, status, buyer_email, user_id, total_amount, quantity, event_id"
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
      const { error: orderRpcError } = await supabase.rpc(
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
