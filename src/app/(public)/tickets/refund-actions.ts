"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { refundTransaction } from "@/lib/sumup";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    .select("id, ticket_id, amount, status")
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
    .select("id, sumup_transaction_code, event_id")
    .eq("id", refund.ticket_id)
    .single();

  if (!ticket) {
    throw new Error("Ticket not found");
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
    .select("status")
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
    .select("id, user_id, amount_paid, sumup_transaction_code, event_id")
    .eq("id", ticketId)
    .single();

  if (!ticket) {
    throw new Error("Ticket not found");
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
