import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import type { DoorScanEvent } from "@/types/database";

/**
 * Reversing an admission.
 *
 * An undo is not a scan verdict, so it is **not** a fourth member of the
 * `DoorOutcome` union. It is a further `door_scan_events` row, marked `is_undo`,
 * with its own operator — because `checkin-offline.md` says so in as many words:
 * *«Ogni undo va registrato con chi lo ha fatto e quando: e' il percorso piu'
 * semplice per far rientrare qualcuno»*.
 *
 * The split this file records, so a later reader does not look for the other
 * half here: **who may** undo is Phase 35's question (ASSIGN-05); **who did**
 * belongs here, because the night's review list is unreadable without it.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ScanEventInsert = Omit<DoorScanEvent, "id">;

/**
 * Role **and** status, the same guard the check-in route applies.
 *
 * Deliberately identical: an operator who may not admit someone must not be able
 * to reverse an admission either, and the two routes diverging on that is a hole
 * that would only be found by someone looking for it.
 */
async function verifyOrganizerRole() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "master" && profile.role !== "organizer")) {
    return { error: "Forbidden", status: 403 };
  }

  // Role decides the door; status does not. Identical to `checkin/route.ts`,
  // deliberately — see the reasoning there. Staff always get in (owner decision,
  // 2026-08-06), and the promotion path now approves the account when it grants
  // the role. These four door routes must never diverge on this.
  return { user, profile };
}

export async function POST(request: Request) {
  try {
    const auth = await verifyOrganizerRole();
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    let body: {
      ticketId?: string;
      guestListEntryId?: string;
      attendanceId?: string;
      partyId?: string;
      deviceId?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { ticketId, guestListEntryId, attendanceId, partyId } = body;

    if (!ticketId && !guestListEntryId && !attendanceId) {
      return NextResponse.json(
        { success: false, error: "ticketId, guestListEntryId, or attendanceId is required" },
        { status: 400 }
      );
    }

    const deviceId =
      typeof body.deviceId === "string" && body.deviceId.trim() !== ""
        ? body.deviceId.trim()
        : "unknown";

    const serviceClient = getServiceClient();

    // Undo ticket check-in
    if (ticketId) {
      const { data: ticket, error: fetchError } = await serviceClient
        .from("tickets")
        .select("id, checked_in, checked_in_at, checked_in_by, event_id, party_id, user_id")
        .eq("id", ticketId)
        .single();

      // PGRST116 means the ticket does not exist; anything else is an
      // infrastructure failure and must not be reported as "not found".
      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("undo:ticket_lookup", {
          ticketId,
          code: fetchError.code,
          message: fetchError.message,
        });
        return NextResponse.json(
          { success: false, error: "Ticket lookup failed" },
          { status: 500 }
        );
      }

      if (!ticket) {
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

      // Which night the reversal belongs to. `door_scan_events.party_id` is NOT
      // NULL, and an event-level ticket (`party_id IS NULL`, a real product per
      // multi_sub_events.sql:66-68) does not carry one — so for those the caller
      // must say which door this happened at. Attributing a reversal to a guessed
      // night is the same defect as recording a presence against the wrong one.
      let recordPartyId = ticket.party_id as string | null;

      if (!recordPartyId) {
        if (typeof partyId !== "string" || !UUID_PATTERN.test(partyId)) {
          return NextResponse.json(
            {
              success: false,
              error:
                "partyId is required to reverse an event-level ticket: the reversal must name the night it happened at",
            },
            { status: 400 }
          );
        }

        const { data: party, error: partyError } = await serviceClient
          .from("event_parties")
          .select("id, event_id")
          .eq("id", partyId)
          .single();

        if (partyError && partyError.code !== "PGRST116") {
          console.error("undo:party_lookup", {
            partyId,
            code: partyError.code,
            message: partyError.message,
          });
          return NextResponse.json(
            { success: false, error: "Party lookup failed" },
            { status: 500 }
          );
        }

        if (!party || party.event_id !== ticket.event_id) {
          return NextResponse.json(
            { success: false, error: "partyId does not belong to this ticket's event" },
            { status: 400 }
          );
        }

        recordPartyId = party.id as string;
      }

      const now = new Date().toISOString();

      // `outcome: "recorded"` because the row records that a state change
      // happened; `is_undo` is what says in which direction. A reader expecting
      // a fourth outcome will not find one — there are three, and a reversal is
      // a flagged record (src/lib/door/outcome.ts:87-113).
      const undoEvent: ScanEventInsert = {
        party_id: recordPartyId,
        event_id: ticket.event_id,
        subject_type: "ticket",
        ticket_id: ticket.id,
        guest_entry_id: null,
        subject_user_id: ticket.user_id ?? null,
        outcome: "recorded",
        // Classification is never done at the moment of the action (FIX-04a).
        cause: null,
        scanned_at: now,
        recorded_at: now,
        // The operator who performed the **undo**, not the one who admitted.
        // Who admitted survives on the ticket, below.
        operator_id: auth.user.id,
        device_id: deviceId,
        source: "online",
        // No code was read: an undo is pressed, not scanned.
        token_fingerprint: null,
        is_undo: true,
      };

      const { error: eventError } = await serviceClient
        .from("door_scan_events")
        .insert(undoEvent);

      // The record comes first and the reversal second. An undo with no record
      // is the single easiest way to let someone back in unobserved, so a failed
      // insert aborts the undo rather than proceeding quietly: the check-in
      // stays in place and the operator is told, which is the only observable
      // effect available in a repository with no error tracking.
      if (eventError) {
        console.error("undo:event_insert", {
          ticketId: ticket.id,
          partyId: recordPartyId,
          code: eventError.code,
          message: eventError.message,
        });
        return NextResponse.json(
          {
            success: false,
            error: "Undo not recorded — the check-in was left in place",
          },
          { status: 503 }
        );
      }

      // `checked_in_by` is deliberately **not** cleared. It is the record of who
      // admitted the person, and the undo row above now carries who reversed it.
      // A later re-admission overwrites it with the new operator, which is
      // correct. The previous version set it to null and so destroyed the only
      // evidence of the admission while recording nothing about the reversal.
      const { error: updateError } = await serviceClient
        .from("tickets")
        .update({
          checked_in: false,
          checked_in_at: null,
        })
        .eq("id", ticketId);

      if (updateError) {
        console.error("undo:ticket_update", {
          ticketId: ticket.id,
          code: updateError.code,
          message: updateError.message,
        });
        return NextResponse.json(
          { success: false, error: "Failed to undo check-in" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Undo guest list check-in
    //
    // Deferred, and named rather than left silent: this branch and the
    // membership one below still reverse without writing a `door_scan_events`
    // row. Neither can, from the body they receive today — a guest entry and an
    // attendance carry a nullable `party_id`, and the caller sends only an id.
    // Recording them needs the scanner to pass the selected party, which is
    // ScannerClient's change (plan 31-11), not this file's.
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
    console.error("undo:unexpected", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
