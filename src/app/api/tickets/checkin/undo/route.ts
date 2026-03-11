import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    // Verify authenticated user with admin/organizer role
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      (profile.role !== "master" && profile.role !== "organizer")
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    let body: { ticketId?: string; guestListEntryId?: string; attendanceId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { ticketId, guestListEntryId, attendanceId } = body;

    if (!ticketId && !guestListEntryId && !attendanceId) {
      return NextResponse.json(
        { success: false, error: "ticketId, guestListEntryId, or attendanceId is required" },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    // Undo ticket check-in
    if (ticketId) {
      const { data: ticket, error: fetchError } = await serviceClient
        .from("tickets")
        .select("id, checked_in")
        .eq("id", ticketId)
        .single();

      if (fetchError || !ticket) {
        return NextResponse.json(
          { success: false, error: "Ticket not found" },
          { status: 404 }
        );
      }

      if (!ticket.checked_in) {
        return NextResponse.json(
          { success: false, error: "Ticket is not checked in" },
          { status: 400 }
        );
      }

      const { error: updateError } = await serviceClient
        .from("tickets")
        .update({
          checked_in: false,
          checked_in_at: null,
          checked_in_by: null,
        })
        .eq("id", ticketId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: "Failed to undo check-in" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Undo guest list check-in
    if (guestListEntryId) {
      const { data: entry, error: fetchError } = await serviceClient
        .from("guest_list_entries")
        .select("id, status, ticket_id")
        .eq("id", guestListEntryId)
        .single();

      if (fetchError || !entry) {
        return NextResponse.json(
          { success: false, error: "Guest list entry not found" },
          { status: 404 }
        );
      }

      if (entry.status !== "checked_in") {
        return NextResponse.json(
          { success: false, error: "Guest is not checked in" },
          { status: 400 }
        );
      }

      // Restore to previous state: ticket_issued if they have a ticket, invited otherwise
      const previousStatus = entry.ticket_id ? "ticket_issued" : "invited";

      const { error: updateError } = await serviceClient
        .from("guest_list_entries")
        .update({
          status: previousStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", guestListEntryId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: "Failed to undo guest check-in" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Undo membership attendance check-in
    if (attendanceId) {
      const { data: attendance, error: fetchError } = await serviceClient
        .from("attendances")
        .select("id")
        .eq("id", attendanceId)
        .single();

      if (fetchError || !attendance) {
        return NextResponse.json(
          { success: false, error: "Attendance record not found" },
          { status: 404 }
        );
      }

      const { error: deleteError } = await serviceClient
        .from("attendances")
        .delete()
        .eq("id", attendanceId);

      if (deleteError) {
        return NextResponse.json(
          { success: false, error: "Failed to undo membership check-in" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Undo check-in error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
