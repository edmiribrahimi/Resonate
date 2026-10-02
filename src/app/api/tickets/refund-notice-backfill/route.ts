import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { EMAIL_MAX_LENGTH, EMAIL_SHAPE, normalizeBuyerEmail } from "@/lib/tickets/buyer-input";
import {
  sendTicketRefundedEmail,
  type RefundNoticeRecipient,
} from "@/lib/tickets/refund-notice";
import { redactDbError } from "@/lib/errors/redact";

/**
 * Rotta una-tantum — la mail di rimborso per un rimborso STORICO (fase 52.2,
 * Q2 di 52.2-CONTEXT.md; decisione 4 di 52.2-09-PLAN.md).
 *
 * ── Perche' esiste ───────────────────────────────────────────────────────────
 *
 * Dalla fase 52.2 ogni rimborso avvisa il titolare e scrive
 * `ticket_refunds.notified_email_id`. I rimborsi fatti **prima** non hanno
 * avvisato nessuno, e la porta (RFD-03) rifiuta con «refunded» solo chi e'
 * stato avvisato. Questa rotta manda quella mail a posteriori, **una riga di
 * rimborso alla volta**, quando il proprietario lo decide. La usa il piano
 * 52.2-15.
 *
 * ── Perche' una rotta e non uno script ───────────────────────────────────────
 *
 * `src/lib/tickets/refund-notice.ts` e' `server-only`: non si importa da uno
 * script fuori da Next. Riscriverne l'invio in uno script significherebbe due
 * testi e due registri per la stessa mail.
 *
 * ── Perche' NON sta sotto `api/cron/` ────────────────────────────────────────
 *
 * Non e' un cron: non gira da sola, non e' in `vercel.json` e non conta fra gli
 * otto (`meta-gates.md`). La chiama un operatore, a mano, con `CRON_SECRET`.
 *
 * ── A chi, e perche' mai dal biglietto ───────────────────────────────────────
 *
 * Il biglietto di un rimborso e' **cancellato**: non c'e' niente da leggere, e
 * ricostruire un destinatario da cio' che resta sarebbe indovinare. Il
 * destinatario viene da `ticket_orders.buyer_email` via `refunded_order_id`
 * quando la riga ce l'ha, **altrimenti dall'indirizzo che il proprietario
 * scrive nel corpo**. Nessuno dei due → 409 `no_recipient`. Questo file non
 * legge la tabella dei biglietti, per costruzione.
 *
 * ── A secco per default ──────────────────────────────────────────────────────
 *
 * Senza `"dryRun": false` **esplicito** non parte nessuna mail e non si scrive
 * niente: la risposta dice solo il dominio dell'indirizzo e l'importo. Una sola
 * mail per rimborso: una riga con `notified_email_id` gia' valorizzato e'
 * `already_notified`, e l'update dell'id e' condizionato a `null`.
 *
 * Mai l'indirizzo completo nei log o nella risposta.
 */
export const dynamic = "force-dynamic";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Solo il dominio: la parte che serve a riconoscere un errore di battitura. */
const domainOf = (email: string) => email.slice(email.lastIndexOf("@") + 1);

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request", reason: "body_not_json" }, { status: 400 });
  }

  const input = (body ?? {}) as { refundId?: unknown; email?: unknown; dryRun?: unknown };
  const refundId = typeof input.refundId === "string" ? input.refundId.trim() : "";
  if (!UUID_SHAPE.test(refundId)) {
    return NextResponse.json({ error: "bad_request", reason: "refund_id_invalid" }, { status: 400 });
  }

  let providedEmail: string | null = null;
  if (input.email !== undefined && input.email !== null) {
    const normalized = normalizeBuyerEmail(input.email);
    if (!normalized || normalized.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE.test(normalized)) {
      return NextResponse.json({ error: "bad_request", reason: "email_invalid" }, { status: 400 });
    }
    providedEmail = normalized;
  }

  // A secco salvo `false` esplicito: un booleano mancante, `"false"` in
  // stringa o qualunque altro valore lasciano la rotta a secco.
  const dryRun = input.dryRun !== false;

  const supabase = getServiceClient();

  const { data: refund, error: refundError } = await supabase
    .from("ticket_refunds")
    .select(
      "id, status, amount, refunded_at, processed_at, refunded_event_id, refunded_party_id, refunded_order_id, notified_email_id"
    )
    .eq("id", refundId)
    .maybeSingle();

  if (refundError) {
    console.error(`[refund.backfill_refund_unreadable] refund=${refundId} ${redactDbError(refundError)}`);
    return NextResponse.json({ error: "refund_unreadable" }, { status: 500 });
  }
  if (!refund) {
    return NextResponse.json({ error: "conflict", reason: "not_found" }, { status: 409 });
  }
  if (refund.status !== "approved") {
    return NextResponse.json({ error: "conflict", reason: "not_approved" }, { status: 409 });
  }
  if (refund.notified_email_id) {
    return NextResponse.json({ error: "conflict", reason: "already_notified" }, { status: 409 });
  }
  if (!refund.refunded_event_id) {
    // Una riga scritta prima del 2026-08-05 non porta la serata: la mail non
    // saprebbe di quale serata parlare, e non la si indovina.
    return NextResponse.json({ error: "conflict", reason: "event_unknown" }, { status: 409 });
  }

  // Il destinatario: l'ordine, poi l'indirizzo del proprietario. Mai il biglietto.
  let email: string | null = null;
  if (refund.refunded_order_id) {
    const { data: order, error: orderError } = await supabase
      .from("ticket_orders")
      .select("buyer_email")
      .eq("id", refund.refunded_order_id)
      .maybeSingle();
    if (orderError) {
      console.error(
        `[refund.backfill_order_unreadable] refund=${refundId} ${redactDbError(orderError)}`
      );
      return NextResponse.json({ error: "order_unreadable" }, { status: 500 });
    }
    email = normalizeBuyerEmail(order?.buyer_email) || null;
  }
  if (!email) email = providedEmail;
  if (!email) {
    return NextResponse.json({ error: "conflict", reason: "no_recipient" }, { status: 409 });
  }

  const amount = Number(refund.amount ?? 0);

  if (dryRun) {
    return NextResponse.json({ dryRun: true, wouldSendTo: domainOf(email), amount });
  }

  const recipient: RefundNoticeRecipient = {
    userId: null,
    email,
    holderLabel: null,
    orderId: refund.refunded_order_id ?? null,
    eventId: refund.refunded_event_id,
    partyId: refund.refunded_party_id ?? null,
    amountPaid: amount,
  };

  const notice = await sendTicketRefundedEmail({
    serviceClient: supabase,
    recipient,
    amount,
    // Un istante mancante diventa «we could not read the refund date» nella
    // mail: non si sostituisce con una data plausibile.
    refundedAt: refund.refunded_at ?? refund.processed_at ?? "",
  });

  if (!notice.sent) {
    console.error(`[refund.backfill_failed] refund=${refundId} reason=${notice.reason}`);
    return NextResponse.json(
      { dryRun: false, sent: false, reason: notice.reason },
      { status: 502 }
    );
  }

  const { data: marked, error: markError } = await supabase
    .from("ticket_refunds")
    .update({ notified_email_id: notice.providerMessageId })
    .eq("id", refundId)
    .is("notified_email_id", null)
    .select("id");

  if (markError || !marked || marked.length === 0) {
    // La mail e' partita: lo si dice, e si dice che il registro non lo sa.
    console.error(
      `[refund.backfill_id_unrecorded] refund=${refundId} ` +
        (markError ? redactDbError(markError) : "nessuna riga aggiornata (gia' valorizzata?)")
    );
    return NextResponse.json({
      dryRun: false,
      sent: true,
      recorded: false,
      sentToDomain: domainOf(email),
    });
  }

  console.log(`[refund.backfill_sent] refund=${refundId} domain=${domainOf(email)}`);
  return NextResponse.json({
    dryRun: false,
    sent: true,
    recorded: true,
    sentToDomain: domainOf(email),
  });
}
