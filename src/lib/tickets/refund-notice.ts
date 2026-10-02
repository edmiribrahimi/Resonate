import "server-only";

import { render } from "@react-email/render";
import { sendEmail } from "@/lib/email";
import { TicketRefundedEmail } from "@/emails/ticket-refunded";
import { formatHolderLabel } from "@/lib/tickets/holder-label";
import { formatEventDate } from "@/utils/formatTime";
import { turinWallClock } from "@/utils/datetime";
import { redactDbError } from "@/lib/errors/redact";
import type { getServiceClient } from "@/lib/supabase/service";

/**
 * refund-notice.ts — la mail di rimborso, una sola per due strade (RFD-01,
 * fase 52.2).
 *
 * Le strade sono entrambe dello staff: l'organizer che rimborsa dall'app
 * (`adminRefund`) e il cron che trova su SumUp un rimborso fatto dalla
 * dashboard (`reconcile-refunds`). Fino al 2026-09-30 ce n'era una terza, la
 * richiesta del cliente approvata dallo staff: e' uscita con D-52.2-05 (nessun
 * cliente chiede un rimborso) e D-52.2-06 (nessuno approva). Prima di questa
 * fase solo quella mandava una mail, a chi aveva **chiesto** il rimborso, con
 * un testo — «your refund request has been approved» — falso per le altre. I
 * collegamenti li scrive il piano 52.2-09.
 *
 * ── A chi ────────────────────────────────────────────────────────────────────
 *
 * Al **titolare del biglietto**: `tickets.user_id` → `profiles.email`, con
 * ripiego su `ticket_orders.buyer_email` attraverso `tickets.order_id`. Non a
 * chi ha chiesto (`requested_by`): e' la persona il cui biglietto smette di
 * aprire la porta che deve saperlo.
 *
 * **{@link readRefundNoticeRecipient} va chiamata PRIMA della `delete`** del
 * biglietto: dopo non resta niente da leggere, e `ticket_refunds` non porta ne'
 * l'ordine ne' il destinatario.
 *
 * ── Cosa non fa ──────────────────────────────────────────────────────────────
 *
 * - **Non solleva mai.** Il rimborso e' gia' avvenuto quando questa funzione
 *   gira: un errore di posta non lo annulla, si logga con la sua categoria e si
 *   restituisce (`ticketing-payments.md`, *soldi vs contenuto*).
 * - **Non e' fuoco-e-dimentica.** Il chiamante la attende: una promessa lasciata
 *   correre su Vercel puo' essere congelata a risposta inviata, ed e' un
 *   fallimento silenzioso.
 * - **Non nomina alcun luogo.** Nessuna `select` qui dentro nomina una colonna
 *   del genere; il file e' nel controllo G di `verify:venue-surfaces`.
 * - **Registro senza biglietto.** `ticketId: null`: `email_deliveries.ticket_id`
 *   e' `ON DELETE CASCADE`, e una riga attaccata al biglietto sparirebbe con la
 *   sua cancellazione (P-11).
 */

type ServiceClient = ReturnType<typeof getServiceClient>;

export interface RefundNoticeRecipient {
  /** Il titolare, quando ha un account. */
  userId: string | null;
  /** Dove spedire, gia' risolto: profilo, poi acquirente dell'ordine. `null` = nessuno. */
  email: string | null;
  /** «1 of 6», tradotta; `null` se il biglietto non ne porta una. Non e' un nome. */
  holderLabel: string | null;
  orderId: string | null;
  eventId: string;
  partyId: string | null;
  amountPaid: number;
}

export type RefundNoticeResult =
  | { sent: true; providerMessageId: string | null }
  | {
      sent: false;
      reason: "no_recipient" | "event_unreadable" | "send_failed";
      detail: string;
    };

/**
 * Legge chi deve ricevere la mail di rimborso. **Da chiamare PRIMA della
 * `delete` del biglietto.** Restituisce `null` se il biglietto non si legge.
 * Non solleva.
 */
export async function readRefundNoticeRecipient({
  serviceClient,
  ticketId,
}: {
  serviceClient: ServiceClient;
  ticketId: string;
}): Promise<RefundNoticeRecipient | null> {
  try {
    const { data: ticket, error: ticketError } = await serviceClient
      .from("tickets")
      .select("id, user_id, order_id, holder_label, event_id, party_id, amount_paid")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError || !ticket) {
      console.error(
        `[refund.notice_ticket_unreadable] ticket=${ticketId} ` +
          (ticketError ? redactDbError(ticketError) : "nessuna riga")
      );
      return null;
    }

    let email: string | null = null;

    if (ticket.user_id) {
      const { data: profile, error: profileError } = await serviceClient
        .from("profiles")
        .select("email")
        .eq("id", ticket.user_id)
        .maybeSingle();
      if (profileError) {
        // Non ferma: si prova l'ordine.
        console.error(
          `[refund.notice_profile_unreadable] ticket=${ticketId} ${redactDbError(profileError)}`
        );
      }
      email = (profile?.email ?? "").trim() || null;
    }

    if (!email && ticket.order_id) {
      const { data: order, error: orderError } = await serviceClient
        .from("ticket_orders")
        .select("buyer_email")
        .eq("id", ticket.order_id)
        .maybeSingle();
      if (orderError) {
        console.error(
          `[refund.notice_order_unreadable] ticket=${ticketId} ${redactDbError(orderError)}`
        );
      }
      email = (order?.buyer_email ?? "").trim() || null;
    }

    const rawLabel = (ticket.holder_label ?? "").trim();

    return {
      userId: ticket.user_id ?? null,
      email,
      holderLabel: rawLabel ? formatHolderLabel(rawLabel, 0, 1) : null,
      orderId: ticket.order_id ?? null,
      eventId: ticket.event_id,
      partyId: ticket.party_id ?? null,
      amountPaid: Number(ticket.amount_paid ?? 0),
    };
  } catch (unexpected) {
    console.error(
      `[refund.notice_ticket_threw] ticket=${ticketId} ` +
        (unexpected instanceof Error ? unexpected.message : "errore non-Error")
    );
    return null;
  }
}

/**
 * Manda la mail di rimborso neutra al titolare. **Non solleva mai.**
 *
 * `refundedAt` e' un istante (timestamp): la data si ricava con
 * `turinWallClock`, **mai** con `formatEventDate` direttamente — quella accetta
 * solo `YYYY-MM-DD` e su un timestamp stampa «NaN». Un istante illeggibile si
 * dice come tale nella mail, non si sostituisce con una data plausibile.
 *
 * `amount` e' l'importo rimborsato; `0` (gratuito, guest list) toglie dalla
 * mail le righe su importo e carta.
 */
export async function sendTicketRefundedEmail({
  serviceClient,
  recipient,
  amount,
  refundedAt,
}: {
  serviceClient: ServiceClient;
  recipient: RefundNoticeRecipient;
  amount: number;
  refundedAt: string;
}): Promise<RefundNoticeResult> {
  const ref = `event=${recipient.eventId} order=${recipient.orderId ?? "-"}`;

  try {
    const to = (recipient.email ?? "").trim();
    if (!to) {
      console.error(`[refund.notice_no_recipient] ${ref}`);
      return { sent: false, reason: "no_recipient", detail: "nessun destinatario risolto" };
    }

    const { data: event, error: eventError } = await serviceClient
      .from("events")
      .select("title")
      .eq("id", recipient.eventId)
      .maybeSingle();

    if (eventError || !event?.title) {
      const detail = eventError ? redactDbError(eventError) : "nessuna riga";
      console.error(`[refund.notice_event_unreadable] ${ref} ${detail}`);
      return { sent: false, reason: "event_unreadable", detail };
    }

    const wall = turinWallClock(refundedAt);
    const refundedDateLabel = wall ? formatEventDate(wall.date) : null;
    if (!wall) {
      console.error(`[refund.notice_date_unreadable] ${ref} refundedAt=${refundedAt}`);
    }

    const html = await render(
      TicketRefundedEmail({
        eventTitle: event.title,
        holderLabel: recipient.holderLabel,
        refundedDateLabel,
        amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
      })
    );

    try {
      const result = await sendEmail({
        to,
        subject: `Your ticket for ${event.title} was refunded`,
        html,
        category: "ticket_refunded",
        userId: recipient.userId,
        ticketId: null,
      });
      return { sent: true, providerMessageId: result.id };
    } catch (sendError) {
      const detail = sendError instanceof Error ? sendError.message : "errore non-Error";
      console.error(`[refund.notice_failed] ${ref} ${detail}`);
      return { sent: false, reason: "send_failed", detail };
    }
  } catch (unexpected) {
    const detail = unexpected instanceof Error ? unexpected.message : "errore non-Error";
    console.error(`[refund.notice_failed] ${ref} ${detail}`);
    return { sent: false, reason: "send_failed", detail };
  }
}
