import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getCheckout, getTransaction, readTransactionRefunds } from "@/lib/sumup";
import {
  readRefundNoticeRecipient,
  sendTicketRefundedEmail,
  type RefundNoticeRecipient,
} from "@/lib/tickets/refund-notice";
import { alertOrganizerRefundUnattributed } from "@/lib/tickets/organizer-alert";

/**
 * Reconcile SumUp refund status with our database.
 * Catches refunds made directly on the SumUp dashboard.
 *
 * ── I rimborsi NON sono sempre totali (riscritto il 2026-09-30, fase 52.2) ──
 *
 * Questo docblock diceva il contrario, ed era falso due volte. Un ordine da N
 * biglietti e' **una** transazione SumUp, e i rimborsi dall'app sono **per
 * biglietto**: una transazione puo' essere rimborsata in parte. E il campo che
 * il ramo biglietti leggeva per accorgersene non esiste nel tipo del fornitore,
 * quindi un rimborso dalla dashboard non veniva mai visto (RFD-02).
 *
 * Correggere solo il campo letto avrebbe fatto di peggio (52.2-RESEARCH P-1):
 * la mattina dopo un rimborso di un biglietto su sei, il cron avrebbe
 * cancellato gli altri cinque. Per questo il ramo biglietti confronta **per
 * transazione, contro il registro** — cio' che `ticket_refunds` gia' spiega
 * tramite `refunded_order_id` — e, prima di cancellare, tre guardie che
 * fermano tutto se l'ordine non torna (vedi il ramo).
 *
 * ── Cosa non vede, dichiarato ────────────────────────────────────────────────
 *
 * Il cron gira alle 07:30 UTC. **Un rimborso fatto dalla dashboard SumUp il
 * giorno della serata non e' visto prima della porta**: il biglietto resta
 * valido fino al mattino dopo. I rimborsi del giorno stesso si fanno
 * dall'app, che cancella il biglietto e avvisa il titolare subito.
 *
 * Il ramo drink e' invariato e resta cieco: e' debito dichiarato, sotto.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  let drinkRefunded = 0;
  let ticketsInvalidated = 0;
  let ticketsRefunded = 0;
  let alreadyExplained = 0;
  let refundUnattributed = 0;
  let orderMismatch = 0;

  // One counter per cause, not one counter for "something went wrong". This
  // cron runs with nobody watching and the repository has no error tracking,
  // so the response body is the only place a cause can be read at all -- a
  // single `errors` number said that some items failed and nothing about
  // which, or why (meta-gates.md, zero fallimenti silenziosi).
  let drinkReconcileFailed = 0;
  let refundWriteFailed = 0;
  let ticketDeleteFailed = 0;
  let noticeFailed = 0;
  let providerUnreachable = 0;
  let ledgerUnreadable = 0;
  let unexpected = 0;

  // ── Drink orders reconciliation ──────────────────────────────────────
  //
  // DEBITO DICHIARATO (2026-09-30, fase 52.2, 52.2-RESEARCH P-2): questo ramo
  // e' INVARIATO e cieco allo stesso modo in cui lo era il ramo biglietti --
  // legge dal fornitore un campo che il suo tipo non promette, quindi un
  // rimborso dalla dashboard non viene visto. Non si corregge qui di proposito:
  // i drink rimborsano per gettone, e un predicato corretto porterebbe a
  // `refunded` TUTTI i gettoni dell'ordine al primo rimborso parziale. Serve un
  // confronto per gettone contro il registro, come quello dei biglietti sotto.
  const { data: drinkOrders } = await supabase
    .from("drink_orders")
    .select("id, sumup_checkout_id, sumup_transaction_code, total_amount, refunded_amount")
    .eq("status", "completed");

  for (const order of drinkOrders ?? []) {
    // Skip already fully refunded
    if (Number(order.refunded_amount) >= Number(order.total_amount)) continue;
    if (!order.sumup_checkout_id) continue;

    try {
      // Get transaction code if missing
      let txCode = order.sumup_transaction_code;
      if (!txCode) {
        const checkout = await getCheckout(order.sumup_checkout_id);
        txCode = checkout.transactions?.[0]?.transaction_code ?? null;
        if (txCode) {
          await supabase
            .from("drink_orders")
            .update({ sumup_transaction_code: txCode })
            .eq("id", order.id);
        }
      }

      if (!txCode) continue;

      // Check SumUp transaction status
      const tx = await getTransaction(txCode);
      const isRefunded =
        tx.status === "REFUNDED" || (tx.refunded_amount ?? 0) > 0;

      if (isRefunded) {
        // Invalidate all purchased tokens
        await supabase
          .from("drink_tokens")
          .update({ status: "refunded", refunded_at: now })
          .eq("order_id", order.id)
          .eq("status", "purchased");

        // Full refund (refunded_amount = total)
        await supabase
          .from("drink_orders")
          .update({ refunded_amount: order.total_amount })
          .eq("id", order.id);

        drinkRefunded++;
      }
    } catch (err) {
      // Its own counter and its own log category: a drink order failing to
      // reconcile is a different fact from a ticket failing to, and the two
      // used to share one number.
      drinkReconcileFailed++;
      console.error("[cron/reconcile-refunds/drinks] order failed to reconcile", {
        orderId: order.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Ticket purchases reconciliation ──────────────────────────────────
  //
  // Riscritto il 2026-09-30 (fase 52.2, RFD-02). Il confronto e' PER
  // TRANSAZIONE, contro il registro: un ordine da sei biglietti e' una
  // transazione sola, e un rimborso di un biglietto su sei non e' un rimborso
  // dell'ordine. Il predicato e le tre guardie sono la decisione 1 e 2 di
  // 52.2-09-PLAN.md; tutti gli importi in centesimi interi.
  //
  // party_id, event_id, order_id e holder_label sono selezionati perche'
  // alimentano l'evidenza e la mail: dopo la delete non si leggono piu'.
  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select(
      "id, user_id, order_id, holder_label, amount_paid, party_id, event_id, sumup_transaction_code, sumup_checkout_id"
    );

  if (ticketsError) {
    unexpected++;
    console.error("[cron/reconcile-refunds/tickets] live tickets unreadable", {
      code: ticketsError.code,
      message: ticketsError.message,
    });
  }

  type LiveTicket = {
    id: string;
    user_id: string | null;
    order_id: string | null;
    holder_label: string | null;
    amount_paid: number | string | null;
    party_id: string | null;
    event_id: string;
    sumup_transaction_code: string | null;
    sumup_checkout_id: string | null;
  };

  // 1. Il codice di transazione (risolto dal checkout se manca, come prima),
  //    poi il raggruppamento per transazione.
  const byTransaction = new Map<string, LiveTicket[]>();
  for (const ticket of (tickets ?? []) as LiveTicket[]) {
    if (!ticket.sumup_checkout_id && !ticket.sumup_transaction_code) continue;

    let txCode = ticket.sumup_transaction_code;
    if (!txCode && ticket.sumup_checkout_id) {
      try {
        const checkout = await getCheckout(ticket.sumup_checkout_id);
        txCode = checkout.transactions?.[0]?.transaction_code ?? null;
        if (txCode) {
          await supabase
            .from("tickets")
            .update({ sumup_transaction_code: txCode })
            .eq("id", ticket.id);
        }
      } catch (err) {
        providerUnreachable++;
        console.error("[cron/reconcile-refunds/tickets] checkout unreadable", {
          ticketId: ticket.id,
          message: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
    }

    if (!txCode) continue;
    const group = byTransaction.get(txCode) ?? [];
    group.push(ticket);
    byTransaction.set(txCode, group);
  }

  for (const [txCode, txTickets] of byTransaction) {
    const txShort = txCode.slice(-6);
    const eventId = txTickets[0].event_id;

    try {
      // 2. Il rimborso letto dagli events[] della transazione. Un'eccezione e'
      //    un'incognita: ne' rimborsato ne' non rimborsato, nessuna scrittura.
      let refundedTotal: number;
      try {
        ({ refundedTotal } = await readTransactionRefunds(txCode));
      } catch (err) {
        providerUnreachable++;
        console.error(`[refund.reconcile_provider_unreachable] tx=${txShort}`, {
          message: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      const refundedCents = cents(refundedTotal);
      if (refundedCents <= 0) continue;

      // 3. Biglietti che hanno gia' una riga di rimborso approvata: una notte
      //    precedente ha scritto l'evidenza ma non e' riuscita a cancellarli.
      //    La delete si ritenta (piu' sotto, dopo le guardie) e non contano
      //    fra i vivi.
      const ticketIds = txTickets.map((t) => t.id);
      const { data: recordedRows, error: recordedError } = await supabase
        .from("ticket_refunds")
        .select("id, refunded_ticket_id, notified_email_id")
        .eq("status", "approved")
        .in("refunded_ticket_id", ticketIds);

      if (recordedError) {
        ledgerUnreadable++;
        console.error(`[refund.reconcile_ledger_unreadable] tx=${txShort} step=recorded`, {
          code: recordedError.code,
          message: recordedError.message,
        });
        continue;
      }

      const recordedByTicket = new Map<
        string,
        { id: string; notified_email_id: string | null }
      >();
      for (const row of recordedRows ?? []) {
        if (row.refunded_ticket_id && !recordedByTicket.has(row.refunded_ticket_id)) {
          recordedByTicket.set(row.refunded_ticket_id, {
            id: row.id,
            notified_email_id: row.notified_email_id ?? null,
          });
        }
      }
      const pendingDelete = txTickets.filter((t) => recordedByTicket.has(t.id));
      const live = txTickets.filter((t) => !recordedByTicket.has(t.id));

      // 4. Cio' che il registro gia' spiega, per ordine e in totale.
      const orderIds = [
        ...new Set(txTickets.map((t) => t.order_id).filter((id): id is string => !!id)),
      ];

      const explainedByOrder = new Map<string, { cents: number; count: number }>();
      let orders: Array<{ id: string; quantity: number; total_amount: number | string }> = [];

      if (orderIds.length > 0) {
        const { data: attributed, error: attributedError } = await supabase
          .from("ticket_refunds")
          .select("refunded_order_id, amount")
          .eq("status", "approved")
          .in("refunded_order_id", orderIds);

        if (attributedError) {
          ledgerUnreadable++;
          console.error(`[refund.reconcile_ledger_unreadable] tx=${txShort} step=attributed`, {
            code: attributedError.code,
            message: attributedError.message,
          });
          continue;
        }

        for (const row of attributed ?? []) {
          if (!row.refunded_order_id) continue;
          const acc = explainedByOrder.get(row.refunded_order_id) ?? { cents: 0, count: 0 };
          acc.cents += cents(row.amount);
          acc.count += 1;
          explainedByOrder.set(row.refunded_order_id, acc);
        }

        const { data: orderRows, error: ordersError } = await supabase
          .from("ticket_orders")
          .select("id, quantity, total_amount")
          .in("id", orderIds);

        if (ordersError) {
          ledgerUnreadable++;
          console.error(`[refund.reconcile_ledger_unreadable] tx=${txShort} step=orders`, {
            code: ordersError.code,
            message: ordersError.message,
          });
          continue;
        }
        orders = orderRows ?? [];
      }

      const explainedCents = [...explainedByOrder.values()].reduce((s, e) => s + e.cents, 0);
      const liveCents = live.reduce((s, t) => s + cents(t.amount_paid), 0);

      // ── Le guardie A, B, C — prima di ogni ramo che cancella ─────────────
      //
      // Un rimborso storico non porta refunded_order_id, quindi `explained` e'
      // sottostimato e `unexplained` gonfiato: senza queste guardie il cron
      // cancellerebbe biglietti validi e manderebbe «refunded» a chi non e'
      // stato rimborsato (52.2-09, decisione 2, B4). Una guardia che scatta
      // non cancella NIENTE nella transazione e avvisa l'organizer: un falso
      // allarme costa un avviso, un falso positivo costa una persona valida
      // respinta alla porta.
      let guard: "A" | "B" | "C" | null = null;

      // C — un biglietto della transazione senza ordine: nulla da confrontare.
      if (txTickets.some((t) => !t.order_id)) guard = "C";

      if (!guard) {
        for (const orderId of orderIds) {
          const order = orders.find((o) => o.id === orderId);
          // Un ordine che non si legge e' un ordine contro cui non si confronta.
          if (!order) {
            guard = "C";
            break;
          }
          const liveOfOrder = live.filter((t) => t.order_id === orderId);
          const explainedOfOrder = explainedByOrder.get(orderId) ?? { cents: 0, count: 0 };

          // A — un biglietto dell'ordine se n'e' andato per un rimborso che il
          //     registro non attribuisce all'ordine.
          if (
            Number(order.quantity) > 1 &&
            liveOfOrder.length + explainedOfOrder.count < Number(order.quantity)
          ) {
            guard = "A";
            break;
          }

          // B — gli importi non tornano.
          const liveOfOrderCents = liveOfOrder.reduce((s, t) => s + cents(t.amount_paid), 0);
          if (liveOfOrderCents + explainedOfOrder.cents !== cents(order.total_amount)) {
            guard = "B";
            break;
          }
        }
      }

      if (guard) {
        orderMismatch++;
        console.error(`[refund.reconcile_order_mismatch] tx=${txShort} guard=${guard}`, {
          refunded: euros(refundedCents),
          explained: euros(explainedCents),
          live: euros(liveCents),
        });
        await alertOrganizerRefundUnattributed({
          serviceClient: supabase,
          eventId,
          transactionRef: txCode,
          refundedTotal: refundedCents / 100,
          explained: explainedCents / 100,
          liveAmount: liveCents / 100,
        });
        continue;
      }

      // Ritento della delete per i biglietti gia' registrati (idempotenza:
      // una seconda riga di rimborso non si scrive mai). Il titolare si legge
      // prima della delete; la mail parte se la riga non dice gia' che e'
      // partita.
      for (const ticket of pendingDelete) {
        const row = recordedByTicket.get(ticket.id)!;
        const recipient = row.notified_email_id
          ? null
          : await readRefundNoticeRecipient({ serviceClient: supabase, ticketId: ticket.id });

        const { error: deleteError } = await supabase
          .from("tickets")
          .delete()
          .eq("id", ticket.id);

        if (deleteError) {
          ticketDeleteFailed++;
          console.error(
            "[cron/reconcile-refunds/tickets] ticket delete retry failed -- refund recorded, ticket still valid at the door",
            { ticketId: ticket.id, code: deleteError.code, message: deleteError.message }
          );
          continue;
        }
        ticketsInvalidated++;

        if (!row.notified_email_id) {
          if (!(await notifyHolder(recipient, row.id, cents(ticket.amount_paid) / 100))) {
            noticeFailed++;
          }
        }
      }

      // 5. Il caso normale dopo un rimborso dall'app: il registro spiega tutto.
      const unexplainedCents = refundedCents - explainedCents;
      if (unexplainedCents <= 0) {
        alreadyExplained++;
        continue;
      }

      // 6. Il rimborso non spiegato copre tutti i vivi: si registrano e si
      //    cancellano tutti, e ogni titolare riceve la sua mail.
      if (live.length > 0 && unexplainedCents >= liveCents) {
        for (const ticket of live) {
          const recipient = await readRefundNoticeRecipient({
            serviceClient: supabase,
            ticketId: ticket.id,
          });

          // L'evidenza prima della delete: dopo, questi valori non si leggono
          // piu' da nessuna parte (ticket_id e' messo a NULL dal database,
          // 20260805120000_door_scan_events.sql:184-186). refunded_ticket_id e'
          // la copia durevole che leggono la porta e i conti.
          const { data: inserted, error: refundInsertError } = await supabase
            .from("ticket_refunds")
            .insert({
              ticket_id: ticket.id,
              requested_by: ticket.user_id,
              processed_by: ticket.user_id,
              amount: ticket.amount_paid,
              status: "approved",
              sumup_status: "completed",
              type: "admin_initiated",
              processed_at: now,
              refunded_ticket_id: ticket.id,
              // NULL is legitimate for an event-level ticket. Not coerced.
              refunded_party_id: ticket.party_id,
              refunded_event_id: ticket.event_id,
              refunded_at: now,
              refunded_order_id: ticket.order_id,
            })
            .select("id")
            .single();

          if (refundInsertError || !inserted) {
            refundWriteFailed++;
            console.error(
              "[cron/reconcile-refunds/tickets] refund record insert failed -- ticket deliberately left in place",
              {
                ticketId: ticket.id,
                code: refundInsertError?.code,
                message: refundInsertError?.message,
              }
            );
            continue;
          }

          const { error: deleteError } = await supabase
            .from("tickets")
            .delete()
            .eq("id", ticket.id);

          if (deleteError) {
            ticketDeleteFailed++;
            console.error(
              "[cron/reconcile-refunds/tickets] ticket delete failed -- refund recorded, ticket still valid at the door",
              { ticketId: ticket.id, code: deleteError.code, message: deleteError.message }
            );
            continue;
          }

          ticketsRefunded++;
          ticketsInvalidated++;

          if (!(await notifyHolder(recipient, inserted.id, cents(ticket.amount_paid) / 100))) {
            noticeFailed++;
          }
        }
        continue;
      }

      // 7. Un rimborso parziale che non si sa attribuire: NESSUNA
      //    cancellazione. Indovinare quale biglietto togliere significherebbe
      //    respingere alla porta una persona valida.
      refundUnattributed++;
      console.error(
        `[refund.reconcile_partial_unattributed] tx=${txShort} refunded=${euros(refundedCents)} explained=${euros(explainedCents)} live=${euros(liveCents)}`
      );
      await alertOrganizerRefundUnattributed({
        serviceClient: supabase,
        eventId,
        transactionRef: txCode,
        refundedTotal: refundedCents / 100,
        explained: explainedCents / 100,
        liveAmount: liveCents / 100,
      });
      // The per-transaction try/catch stays inside the loop on purpose: one bad
      // item must never abort the drain (ticketing-payments.md, gate cron non
      // atomico). What changes is that the cause is no longer discarded.
    } catch (err) {
      unexpected++;
      console.error(`[cron/reconcile-refunds/tickets] unexpected failure tx=${txShort}`, {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // The counters are returned per cause. Nothing else reports them: there is no
  // error tracking in this repository, so on a scheduled run these numbers only
  // reach a human if somebody reads the invocation's response -- except the
  // three that also email the organizer (orderMismatch, refundUnattributed) and
  // the holder mails themselves. That is a real limit of this fix and it is
  // stated rather than left to be assumed.
  return NextResponse.json({
    drinkOrdersRefunded: drinkRefunded,
    ticketsInvalidated,
    ticketsRefunded,
    alreadyExplained,
    refundUnattributed,
    orderMismatch,
    failures: {
      drinkReconcileFailed,
      refundWriteFailed,
      ticketDeleteFailed,
      noticeFailed,
      providerUnreachable,
      ledgerUnreadable,
      unexpected,
    },
  });

  /**
   * La mail al titolare dopo una delete riuscita. Attesa, mai fuoco-e-dimentica;
   * non solleva; un fallimento non annulla nulla (il denaro e' gia' tornato).
   * `notified_email_id` si scrive solo se la mail e' partita.
   */
  async function notifyHolder(
    recipient: RefundNoticeRecipient | null,
    refundRowId: string,
    amount: number
  ): Promise<boolean> {
    if (!recipient) {
      console.error(`[refund.notice_no_recipient] path=cron refund=${refundRowId}`);
      return false;
    }
    const notice = await sendTicketRefundedEmail({
      serviceClient: supabase,
      recipient,
      amount,
      refundedAt: now,
    });
    if (!notice.sent) {
      console.error(
        `[refund.notice_failed] path=cron refund=${refundRowId} reason=${notice.reason}`
      );
      return false;
    }
    const { error: idError } = await supabase
      .from("ticket_refunds")
      .update({ notified_email_id: notice.providerMessageId })
      .eq("id", refundRowId);
    if (idError) {
      console.error(
        `[refund.notice_id_unrecorded] path=cron refund=${refundRowId} code=${idError.code ?? "?"}`
      );
    }
    return true;
  }
}

/** Un importo in euro (numero o stringa numerica) in centesimi interi. */
function cents(x: number | string | null | undefined): number {
  const n = Number(x ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function euros(c: number): string {
  return `€${(c / 100).toFixed(2)}`;
}
