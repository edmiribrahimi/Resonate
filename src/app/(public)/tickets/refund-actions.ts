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

  // Fetch ticket for SumUp transaction code
  const { data: ticket } = await serviceClient
    .from("tickets")
    .select("id, sumup_transaction_code, event_id, amount_paid, ticket_type")
    .eq("id", refund.ticket_id)
    .single();

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // Guard: skip SumUp refund for free/guest list tickets
  if (ticket.amount_paid === 0 || ticket.ticket_type === "guest_list") {
    // No payment to refund -- just update records and delete ticket
    await serviceClient
      .from("ticket_refunds")
      .update({
        status: "approved",
        processed_by: user.id,
        sumup_status: null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", refundId);

    await serviceClient
      .from("tickets")
      .delete()
      .eq("id", ticket.id);

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

  // Update refund record
  await serviceClient
    .from("ticket_refunds")
    .update({
      status: "approved",
      processed_by: user.id,
      sumup_status: sumupStatus,
      processed_at: new Date().toISOString(),
    })
    .eq("id", refundId);

  // Delete the ticket
  await serviceClient
    .from("tickets")
    .delete()
    .eq("id", ticket.id);

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

  // Fetch ticket
  const { data: ticket } = await serviceClient
    .from("tickets")
    .select("id, user_id, amount_paid, sumup_transaction_code, event_id, ticket_type")
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

  // Create refund record
  await serviceClient
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
      processed_at: new Date().toISOString(),
    });

  // Delete the ticket
  await serviceClient
    .from("tickets")
    .delete()
    .eq("id", ticketId);

  revalidatePath("/events");
  revalidatePath("/organizer/events");
  return { success: true };
}
