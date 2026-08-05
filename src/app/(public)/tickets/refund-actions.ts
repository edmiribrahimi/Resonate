"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { refundTransaction } from "@/lib/sumup";
import { sendEmail } from "@/lib/email";
import { RefundApprovedEmail } from "@/emails/refund-approved";
import { RefundRejectedEmail } from "@/emails/refund-rejected";
import { render } from "@react-email/render";

/**
 * User requests a refund for their ticket.
 */
export async function requestRefund(ticketId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify ticket ownership
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, user_id, amount_paid, sumup_transaction_code")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .single();

  if (ticketError || !ticket) {
    throw new Error("Ticket not found");
  }

  // Check no existing pending refund
  const serviceClient = getServiceClient();
  const { data: existingRefund } = await serviceClient
    .from("ticket_refunds")
    .select("id")
    .eq("ticket_id", ticketId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingRefund) {
    throw new Error("A refund request is already pending for this ticket");
  }

  // Create refund request
  const { error: insertError } = await serviceClient
    .from("ticket_refunds")
    .insert({
      ticket_id: ticketId,
      requested_by: user.id,
      reason: reason.trim() || null,
      amount: ticket.amount_paid,
      status: "pending",
      type: "user_request",
    });

  if (insertError) {
    throw new Error(`Failed to create refund request: ${insertError.message}`);
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}

/**
 * Admin/organizer approves a refund request.
 * Processes refund via SumUp and deletes the ticket.
 */
export async function approveRefund(refundId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify admin/organizer role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "master" && profile.role !== "organizer")) {
    throw new Error("Forbidden");
  }

  const serviceClient = getServiceClient();

  // Fetch refund with ticket data
  const { data: refund, error: refundError } = await serviceClient
    .from("ticket_refunds")
    .select("id, ticket_id, amount, status, requested_by")
    .eq("id", refundId)
    .single();

  if (refundError || !refund) {
    throw new Error("Refund request not found");
  }

  if (refund.status !== "pending") {
    throw new Error("This refund has already been processed");
  }

  // Fetch ticket for SumUp transaction code.
  // party_id and event_id are selected because the refund's evidence is written
  // from them: after the delete below they cannot be recovered from anywhere.
  const { data: ticket } = await serviceClient
    .from("tickets")
    .select("id, sumup_transaction_code, event_id, party_id, amount_paid, ticket_type")
    .eq("id", refund.ticket_id)
    .single();

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // Guard: skip SumUp refund for free/guest list tickets
  if (ticket.amount_paid === 0 || ticket.ticket_type === "guest_list") {
    // No payment to refund -- just update records and delete ticket
    const freeProcessedAt = new Date().toISOString();

    // The four refunded_* columns are the refund's evidence, and they are
    // written HERE, before the delete below, because after it these values are
    // unreadable: the ticket row is gone and there is nowhere left to read them
    // from. That ordering is the whole reason the columns exist.
    //
    // ticket_id and refunded_ticket_id are not a duplication to tidy up. The
    // first is the live foreign key and the database sets it to NULL on the
    // delete (20260805120000_door_scan_events.sql:184-186); the second is not a
    // foreign key at all and is the durable copy the door reads to admit a
    // refunded holder, and the finance figures read to count the refund.
    const { error: evidenceError } = await serviceClient
      .from("ticket_refunds")
      .update({
        status: "approved",
        processed_by: user.id,
        sumup_status: null,
        processed_at: freeProcessedAt,
        refunded_ticket_id: ticket.id,
        // NULL is a legitimate value here: an event-level ticket belongs to no
        // party. It is not coerced.
        refunded_party_id: ticket.party_id,
        refunded_event_id: ticket.event_id,
        // Same instant as processed_at, taken from one variable so the two
        // cannot drift.
        refunded_at: freeProcessedAt,
      })
      .eq("id", refundId);

    // If the evidence did not land, the ticket must not be deleted: deleting it
    // now would destroy the only place those values could still be read from.
    // No money moved on this branch, so retrying is safe.
    if (evidenceError) {
      console.error(
        "[refund/approve/free] refund evidence write failed -- ticket deliberately left in place",
        {
          refundId,
          ticketId: ticket.id,
          code: evidenceError.code,
          message: evidenceError.message,
        }
      );
      throw new Error(
        "The refund could not be recorded, so the ticket was left valid on purpose. Nothing changed -- you can retry."
      );
    }

    const { error: deleteError } = await serviceClient
      .from("tickets")
      .delete()
      .eq("id", ticket.id);

    // A blocked delete used to be invisible: the Supabase client returns the
    // error rather than throwing, this branch discarded it, and the action
    // returned success while the ticket still admitted its holder at the door.
    // Money and access disagreeing is the failure this check exists to stop.
    if (deleteError) {
      console.error(
        "[refund/approve/free] ticket delete failed -- refund is approved but the ticket is still valid",
        {
          refundId,
          ticketId: ticket.id,
          code: deleteError.code,
          message: deleteError.message,
        }
      );
      throw new Error(
        `The refund was recorded but the ticket could NOT be removed (${deleteError.code ?? "unknown error"}): it is still valid at the door. Do not retry -- remove the ticket manually and tell the door.`
      );
    }

    revalidatePath("/events");
    revalidatePath("/organizer/events");
    return { success: true };
  }

  // Process SumUp refund
  let sumupStatus: "completed" | "failed" = "completed";
  if (ticket.sumup_transaction_code) {
    try {
      await refundTransaction(ticket.sumup_transaction_code, refund.amount);
    } catch {
      sumupStatus = "failed";
      // Update refund record with failure
      await serviceClient
        .from("ticket_refunds")
        .update({
          processed_by: user.id,
          sumup_status: "failed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", refundId);
      throw new Error("SumUp refund failed. Please try again or process manually.");
    }
  }

  // Update refund record, evidence included -- written before the delete below,
  // because after it these values are unreadable. See the note in the free
  // branch above for why refunded_ticket_id is not a duplicate of ticket_id.
  const processedAt = new Date().toISOString();
  const { error: evidenceError } = await serviceClient
    .from("ticket_refunds")
    .update({
      status: "approved",
      processed_by: user.id,
      sumup_status: sumupStatus,
      processed_at: processedAt,
      refunded_ticket_id: ticket.id,
      // May legitimately be NULL for an event-level ticket. Not coerced.
      refunded_party_id: ticket.party_id,
      refunded_event_id: ticket.event_id,
      refunded_at: processedAt,
    })
    .eq("id", refundId);

  // The money already left through SumUp above, and that is not reversed here:
  // a payment state moves forward only (meta-gates.md, monotone guards). What
  // must not happen is deleting the ticket on top of a lost record -- that
  // would leave a refund with no evidence and no ticket.
  if (evidenceError) {
    console.error(
      "[refund/approve/paid] refund evidence write failed AFTER the SumUp refund -- ticket deliberately left in place",
      {
        refundId,
        ticketId: ticket.id,
        code: evidenceError.code,
        message: evidenceError.message,
      }
    );
    throw new Error(
      "The money was returned through SumUp but the refund record could not be updated. Do not retry -- the refund would be attempted a second time. Fix the refund record and remove the ticket manually."
    );
  }

  // Delete the ticket
  const { error: deleteError } = await serviceClient
    .from("tickets")
    .delete()
    .eq("id", ticket.id);

  // Same silent failure as the free branch, with money already moved: without
  // this check the organizer saw a successful refund while the holder kept a
  // ticket that still scans.
  if (deleteError) {
    console.error(
      "[refund/approve/paid] ticket delete failed -- money returned, ticket still valid",
      {
        refundId,
        ticketId: ticket.id,
        code: deleteError.code,
        message: deleteError.message,
      }
    );
    throw new Error(
      `The money was returned and the refund recorded, but the ticket could NOT be removed (${deleteError.code ?? "unknown error"}): it is still valid at the door. Do not retry -- remove the ticket manually and tell the door.`
    );
  }

  // Fire-and-forget: send refund approved email
  (async () => {
    try {
      const { data: requesterProfile } = await serviceClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", refund.requested_by)
        .single();

      const { data: eventData } = await serviceClient
        .from("events")
        .select("title")
        .eq("id", ticket.event_id)
        .single();

      if (requesterProfile && eventData) {
        const html = await render(
          RefundApprovedEmail({
            memberName: requesterProfile.full_name || "Member",
            eventTitle: eventData.title,
            amount: refund.amount,
          })
        );
        await sendEmail({
          to: requesterProfile.email,
          subject: `Refund approved for ${eventData.title}`,
          html,
        });
      }
    } catch (emailError) {
      console.error("Refund approved email failed (non-blocking)", emailError);
    }
  })();

  revalidatePath("/events");
  revalidatePath("/organizer/events");
  return { success: true };
}

/**
 * Admin/organizer rejects a refund request.
 */
export async function rejectRefund(refundId: string, adminNote?: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify admin/organizer role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "master" && profile.role !== "organizer")) {
    throw new Error("Forbidden");
  }

  const serviceClient = getServiceClient();

  // Verify refund exists and is pending
  const { data: refund } = await serviceClient
    .from("ticket_refunds")
    .select("id, status, requested_by, ticket_id")
    .eq("id", refundId)
    .single();

  if (!refund || refund.status !== "pending") {
    throw new Error("Refund request not found or already processed");
  }

  await serviceClient
    .from("ticket_refunds")
    .update({
      status: "rejected",
      processed_by: user.id,
      admin_note: adminNote?.trim() || null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", refundId);

  // Fire-and-forget: send refund rejected email
  (async () => {
    try {
      const { data: ticket } = await serviceClient
        .from("tickets")
        .select("event_id")
        .eq("id", refund.ticket_id)
        .single();

      const { data: requesterProfile } = await serviceClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", refund.requested_by)
        .single();

      if (ticket && requesterProfile) {
        const { data: eventData } = await serviceClient
          .from("events")
          .select("title")
          .eq("id", ticket.event_id)
          .single();

        if (eventData) {
          const html = await render(
            RefundRejectedEmail({
              memberName: requesterProfile.full_name || "Member",
              eventTitle: eventData.title,
              adminNote: adminNote?.trim() || undefined,
            })
          );
          await sendEmail({
            to: requesterProfile.email,
            subject: `Refund update for ${eventData.title}`,
            html,
          });
        }
      }
    } catch (emailError) {
      console.error("Refund rejected email failed (non-blocking)", emailError);
    }
  })();

  revalidatePath("/events");
  revalidatePath("/organizer/events");
  return { success: true };
}

/**
 * Admin/organizer initiates a direct refund (no user request needed).
 */
export async function adminRefund(ticketId: string, reason?: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify admin/organizer role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "master" && profile.role !== "organizer")) {
    throw new Error("Forbidden");
  }

  const serviceClient = getServiceClient();

  // Fetch ticket. party_id and event_id feed the refund's evidence and cannot
  // be recovered after the delete at the end of this function.
  const { data: ticket } = await serviceClient
    .from("tickets")
    .select("id, user_id, amount_paid, sumup_transaction_code, event_id, party_id, ticket_type")
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

  // Create refund record, evidence included -- written before the delete below,
  // because after it these values are unreadable. See the note in approveRefund
  // for why refunded_ticket_id is not a duplicate of ticket_id.
  const processedAt = new Date().toISOString();
  const { error: evidenceError } = await serviceClient
    .from("ticket_refunds")
    .insert({
      ticket_id: ticketId,
      requested_by: user.id,
      processed_by: user.id,
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
    });

  // The SumUp refund above already moved the money, and this path has no
  // pending-status guard to stop a second attempt -- so the message says not to
  // retry rather than inviting one.
  if (evidenceError) {
    console.error(
      "[refund/admin] refund record insert failed AFTER the SumUp refund -- ticket deliberately left in place",
      {
        ticketId,
        code: evidenceError.code,
        message: evidenceError.message,
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

  revalidatePath("/events");
  revalidatePath("/organizer/events");
  return { success: true };
}
