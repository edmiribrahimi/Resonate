"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase/service";
import { refundTransaction } from "@/lib/sumup";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import {
  readRefundNoticeRecipient,
  sendTicketRefundedEmail,
  type RefundNoticeResult,
} from "@/lib/tickets/refund-notice";

/**
 * L'esito della mail di rimborso al titolare, mandata dopo una `delete`
 * riuscita (RFD-01, fase 52.2). La chiama l'unica strada di questo file che
 * cancella un biglietto, `adminRefund`, dopo `sendTicketRefundedEmail`. (Fino
 * al 2026-09-30 erano tre: approvazione e rifiuto di una richiesta sono usciti
 * con D-52.2-06. L'altra strada viva e' il cron `reconcile-refunds`.)
 *
 * - **Attesa, non fuoco-e-dimentica**: una promessa lasciata correre in una
 *   Server Action su Vercel puo' essere congelata a risposta inviata.
 * - **Non solleva mai** e **non annulla nulla**: il denaro e' gia' tornato e il
 *   biglietto e' gia' sparito. Un fallimento si logga con la sua categoria
 *   (`[refund.notice_failed]`, `[refund.notice_no_recipient]`) e torna al
 *   chiamante come `false`, che l'interfaccia mostra all'organizer: non esiste
 *   error tracking, quindi e' l'unico modo in cui qualcuno lo sapra'.
 * - **`notified_email_id`** si scrive solo se la mail e' partita: e' cio' che
 *   la porta leggera' per dire «rimborsato e avvisato» (RFD-03).
 */
async function recordRefundNotice({
  serviceClient,
  notice,
  refundRowId,
  path,
}: {
  serviceClient: ReturnType<typeof getServiceClient>;
  /** `null` = no recipient could be read before the delete. */
  notice: RefundNoticeResult | null;
  refundRowId: string;
  path: "admin";
}): Promise<boolean> {
  if (!notice) {
    console.error(`[refund.notice_no_recipient] path=${path} refund=${refundRowId}`);
    return false;
  }

  if (!notice.sent) {
    console.error(
      `[refund.notice_failed] path=${path} refund=${refundRowId} reason=${notice.reason}`
    );
    return false;
  }

  // La mail e' partita. Se l'id non si registra la persona e' comunque stata
  // avvisata: lo si dice nel log, e si risponde `true` perche' e' vero.
  const { error: idError } = await serviceClient
    .from("ticket_refunds")
    .update({ notified_email_id: notice.providerMessageId })
    .eq("id", refundRowId);
  if (idError) {
    console.error(
      `[refund.notice_id_unrecorded] path=${path} refund=${refundRowId} code=${idError.code ?? "?"}`
    );
  }
  return true;
}

/**
 * The staff gate on this file's refund action, stated once.
 *
 * `adminRefund` — and, until 2026-09-30, the approval and rejection of a
 * client's refund request, removed with D-52.2-06 — opened with an
 * `auth.getUser()` followed by a read of the caller's own role column out of
 * `public.profiles`, and refused anyone who was neither master nor organizer.
 * Three copies of one rule, each costing two round trips. The one that remains
 * resolves the access context once and asks one capability.
 *
 * The predicate and the column read are deliberately NOT spelled as literals
 * anywhere in this file: the phase gate counts them with `grep`, and a doc
 * comment that quotes them keeps this file inside a count that exists to
 * measure how many files still *perform* them. That has already happened once
 * in this project — `src/types/database.ts` took the header census from 46 to
 * 47 by mentioning the header in a comment (33-01-SUMMARY.md).
 *
 * ── The question, and why `staff.manage` answers it ──────────────────────────
 *
 * The question is *"may this person operate the staff surfaces, of which
 * tickets and refunds are one"*. That is `staff.manage`, whose own description
 * names tickets, and whose predicate is role ∈ {master, organizer} with status
 * ignored (`requires_approved = false`,
 * `20260807000000_capability_model.sql:392-393`) — **byte-equal to the
 * predicate it replaces**. No role's reach moves.
 *
 * Two keys were rejected, and the reason is the verdict each would change:
 *
 *   - `admin.access` is granted to `master` alone, so it would **narrow** the
 *     gate and lock an organizer out of a refund they can perform today;
 *   - `catalogue.manage` requires an approved status, so it would lock out a
 *     `pending` organizer — the other axis, and the same kind of silent scope
 *     change (`access-gating.md`, gate *due assi*).
 *
 * Both would be scope changes disguised as a refactor.
 *
 * ── The product question this deliberately does NOT answer ───────────────────
 *
 * Whether moving money should be reserved to `master` is a defensible product
 * position, and it is not this phase's to take: this conversion is required to
 * leave every role reaching exactly the surfaces it reached before. It is
 * raised for the owner in `33-03-SUMMARY.md`, not implemented here.
 *
 * ── Resolve ONCE, and why that is a rule rather than a preference ────────────
 *
 * `cache()` does **not** memoise inside a Server Action body — measured, three
 * calls ran the body three times, identically in `next dev` and in a production
 * build (`src/lib/capabilities/server.ts`, *Memoisation, and its limit*). So
 * each action destructures `getAccessContext()` once into a local and reuses
 * it. A second awaited capability call in the same invocation would be a second
 * round trip, invisible to `npm run build`.
 *
 * ── `userId` carries attribution, and the refusal is what makes it non-null ──
 *
 * `requested_by` and `processed_by` used to receive `user.id` from
 * `supabase.auth.getUser()`. They now receive `userId` from the resolved
 * context: the same subject, derived from the same JWT, verified by Postgres
 * instead of by a second round trip to the Auth server. `userId` is
 * `string | null` and never `""`, so the `if (!userId) throw` below is not
 * ceremony — it is what makes every attribution write downstream non-null
 * (`ACCESS-MODEL-DECISIONS.md` §5).
 *
 * ── The failure shape is preserved exactly ───────────────────────────────────
 *
 * The action threw before and throws after, with the same two messages. It is
 * not converted to a tagged result: that pattern is for a category a client
 * must branch on, and its client does not. A resolve failure throws
 * its own distinct `capabilities.resolve_failed:` category and is never
 * collapsed into "Forbidden".
 *
 * ── No client asks for a refund (D-52.2-05, owner decision of 2026-09-30) ────
 *
 * The client-side request action and its button were removed on 2026-09-30:
 * a refund exists only as the policy says — the night is cancelled and we
 * issue it. No page mounted them, and migration
 * `20260930120300_refunds_no_client_insert.sql` removed the INSERT policy that
 * let any signed-in account write a `ticket_refunds` row: rows are written by
 * the service role alone, and since phase 52.2 the door reads them.
 *
 * ── No staff approves one either (D-52.2-06, owner decision of 2026-09-30) ───
 *
 * With no client able to ask, the approve and reject actions had nothing left
 * to act on — production held zero `pending` rows when they were removed — and
 * the owner removed them, with the request list and its buttons in admin. Two
 * refund paths remain, both the staff's: `adminRefund` below (the Refund
 * button) and the `reconcile-refunds` cron, which records a refund issued from
 * the SumUp dashboard. Both notify the holder. `requested_by` and
 * `status = 'pending'` stay in the schema for historical rows: no migration.
 */

/**
 * Admin/organizer initiates a direct refund (no user request needed).
 */
export async function adminRefund(ticketId: string, reason?: string) {
  // One resolve for this invocation. See the block comment above (the staff
  // gate, stated once) for the key choice and for why it is resolved once.
  const { capabilities, userId } = await getAccessContext();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  if (!capabilities.has(CAP.STAFF_MANAGE)) {
    throw new Error("Forbidden");
  }

  const serviceClient = getServiceClient();

  // Fetch ticket. party_id and event_id feed the refund's evidence and cannot
  // be recovered after the delete at the end of this function.
  const { data: ticket } = await serviceClient
    .from("tickets")
    .select("id, user_id, order_id, holder_label, amount_paid, sumup_transaction_code, event_id, party_id, ticket_type")
    .eq("id", ticketId)
    .single();

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // Guard: prevent refund attempts on free/guest list tickets
  if (ticket.amount_paid === 0 || ticket.ticket_type === "guest_list") {
    throw new Error("This is a complimentary ticket -- no refund needed");
  }

  // Process SumUp refund
  let sumupStatus: "completed" | "failed" | null = null;
  if (ticket.sumup_transaction_code) {
    try {
      await refundTransaction(ticket.sumup_transaction_code, ticket.amount_paid);
      sumupStatus = "completed";
    } catch {
      throw new Error("SumUp refund failed. Please try again or process manually.");
    }
  }

  // The holder and the order are read before the delete below: after it there
  // is nothing left to read them from.
  const recipient = await readRefundNoticeRecipient({ serviceClient, ticketId });

  // Create refund record, evidence included -- written before the delete below,
  // because after it these values are unreadable.
  //
  // ticket_id and refunded_ticket_id are not a duplication to tidy up. The
  // first is the live foreign key and the database sets it to NULL on the
  // delete (20260805120000_door_scan_events.sql:184-186); the second is not a
  // foreign key at all and is the durable copy the door reads to refuse a
  // refunded holder, and the finance figures read to count the refund.
  const processedAt = new Date().toISOString();
  const { data: refundRow, error: evidenceError } = await serviceClient
    .from("ticket_refunds")
    .insert({
      ticket_id: ticketId,
      // Both attribution columns take the resolved subject. `userId` is
      // non-null here because of the refusal at the head of this action.
      requested_by: userId,
      processed_by: userId,
      reason: reason?.trim() || null,
      amount: ticket.amount_paid,
      status: "approved",
      sumup_status: sumupStatus,
      type: "admin_initiated",
      processed_at: processedAt,
      refunded_ticket_id: ticket.id,
      // May legitimately be NULL for an event-level ticket. Not coerced.
      refunded_party_id: ticket.party_id,
      refunded_event_id: ticket.event_id,
      refunded_at: processedAt,
      refunded_order_id: ticket.order_id ?? null,
    })
    .select("id")
    .single();

  // The SumUp refund above already moved the money, and this path has no
  // pending-status guard to stop a second attempt -- so the message says not to
  // retry rather than inviting one.
  if (evidenceError || !refundRow) {
    console.error(
      "[refund/admin] refund record insert failed AFTER the SumUp refund -- ticket deliberately left in place",
      {
        ticketId,
        code: evidenceError?.code,
        message: evidenceError?.message,
      }
    );
    throw new Error(
      "The money was returned through SumUp but the refund could not be recorded. Do not retry -- the refund would be attempted a second time. Record it manually and remove the ticket."
    );
  }

  // Delete the ticket
  const { error: deleteError } = await serviceClient
    .from("tickets")
    .delete()
    .eq("id", ticketId);

  if (deleteError) {
    console.error(
      "[refund/admin] ticket delete failed -- money returned, ticket still valid",
      {
        ticketId,
        code: deleteError.code,
        message: deleteError.message,
      }
    );
    throw new Error(
      `The money was returned and the refund recorded, but the ticket could NOT be removed (${deleteError.code ?? "unknown error"}): it is still valid at the door. Do not retry -- remove the ticket manually and tell the door.`
    );
  }

  const notice = recipient
    ? await sendTicketRefundedEmail({
        serviceClient,
        recipient,
        amount: Number(ticket.amount_paid),
        refundedAt: processedAt,
      })
    : null;
  const notified = await recordRefundNotice({
    serviceClient,
    notice,
    refundRowId: refundRow.id,
    path: "admin",
  });

  revalidatePath("/events");
  revalidatePath("/admin/events");
  return { success: true, notified };
}
