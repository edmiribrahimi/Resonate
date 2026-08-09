import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  DOOR_SUPERVISION_REQUIRED,
  DOOR_SUPERVISION_REQUIRED_ERROR,
  DOOR_UNRESOLVED_STATUS,
  requireDoorOperator,
} from "@/lib/door/require-operator";
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
 * Who may reverse an admission is a NARROWER question than who may make one.
 *
 * The local `verifyOrganizerRole()` that used to sit here was replaced by
 * `requireDoorOperator()` — the same function `checkin/route.ts` calls. That
 * identity used to be a promise kept by two copies of one predicate; it is now
 * a fact, because there is one predicate. An operator who may not admit someone
 * must not be able to reverse an admission either, and two routes drifting
 * apart on that is a hole only someone looking for it would find.
 *
 * **ASSIGN-05 adds the second half, and it is a REFUSAL where there was none.**
 * `door.operate` answers *may this person work the door*; reversing a check-in
 * asks `door.supervise`, which somebody assigned only to work the door for one
 * night does not hold and an organizer does. That this route now refuses a
 * request it used to serve is the point of the requirement, not an oversight:
 * `checkin-offline.md` calls the undo *«il percorso piu' semplice per far
 * rientrare qualcuno»*, so it is the one action at the door that must belong to
 * a supervisor. The asymmetry that governs a SCAN — a false refusal in front of
 * a queue is worse than a duplicate admission — does not reach here, because
 * nobody is standing in a queue while an undo is refused; the way out is one
 * sentence long and it is in `DOOR_SUPERVISION_REQUIRED_ERROR`.
 *
 * ── The night is named, and the named night is BOUND ────────────────────────
 *
 * `door.supervise` is per-night assignable (`20260809001000_assignment_resolver
 * .sql:121-134`), so the verdict depends on WHICH night was named — and the
 * night arrives in the request body, from the caller. Feeding a caller-chosen
 * night into an authorisation without binding it to the subject would hand
 * somebody assigned to night X the supervision of night Y: they would name X
 * and reverse anything. So every branch below, **before it writes anything**,
 * requires the named night to be the subject's own night — or, for a subject
 * that has none (an event-level ticket, an event-level guest entry), a night of
 * the subject's event. `bindNightToSubject` is that rule, in one place, because
 * three copies of it would be three answers waiting to disagree.
 *
 * Omitting `partyId` is safe and stays legal: with no night named the verdict
 * is what the ROLE confers and nothing more (`require-operator.ts:142-151`),
 * which is a strict subset of what a named night can add. The only cost is that
 * an assignee who omits it is refused as `Forbidden` rather than as a
 * supervision refusal — a stricter answer, never a laxer one.
 *
 * ── One resolution, and why the body is now parsed first ────────────────────
 *
 * `cache()` does not memoise inside a Route Handler, so a second call to the
 * door guard here would be a second round trip and, worse, a second chance for
 * two verdicts to disagree in one request. **`grep -c` for the awaited call in
 * this file must read exactly 1**, which is why this paragraph names the guard
 * in prose instead of quoting the call: a check that its own documentation
 * breaks is a check somebody edits away. There is exactly one call, it needs
 * the night, and the night is in the body — so the body is parsed before the
 * guard runs. The visible consequence, stated rather than
 * discovered: an unauthenticated caller sending malformed JSON now sees 400
 * where it used to see 401. That leaks nothing (the body is the caller's own)
 * and it is the price of the single resolution.
 *
 * `checkin-offline.md`, gate *annullamento limitato*: the undo stays recorded
 * with who did it and when — see `operator_id` below, now taken from the JWT
 * subject rather than from a second call to the Auth server.
 */

/**
 * Is the night the caller named the night this reversal actually happens at?
 *
 * Three answers, not two, and the third is the reason this returns a tagged
 * value instead of a boolean: a lookup that did not answer must never arrive as
 * `false`. A `false` there would be a refusal wearing the costume of an answer
 * — the same defect `require-operator.ts` returns its fourth outcome to avoid.
 *
 * The subject's own night wins when it has one. When it has none — an
 * event-level ticket (`party_id IS NULL`, a real sold product per
 * `multi_sub_events.sql:66-68`) or an event-level guest entry — the named night
 * must at least belong to the subject's event, which is the rule this file
 * already applied to event-level tickets and which is now applied to all three
 * branches from one place.
 */
type NightBinding =
  | { bound: true }
  | { bound: false; kind: "mismatch" }
  | { bound: false; kind: "unreadable" };

async function bindNightToSubject(
  serviceClient: ReturnType<typeof getServiceClient>,
  namedNight: string,
  subjectPartyId: string | null,
  subjectEventId: string
): Promise<NightBinding> {
  if (subjectPartyId) {
    return subjectPartyId === namedNight
      ? { bound: true }
      : { bound: false, kind: "mismatch" };
  }

  const { data, error } = await serviceClient
    .from("event_parties")
    .select("id, event_id")
    .eq("id", namedNight)
    .maybeSingle();

  if (error) {
    // Its own category. Distinct from a mismatch on purpose: one is the caller
    // naming the wrong night, the other is this server failing to find out.
    console.error("undo:party_lookup", {
      partyId: namedNight,
      code: error.code,
      message: error.message,
    });
    return { bound: false, kind: "unreadable" };
  }

  const party = data as { id: string; event_id: string } | null;

  // No such night, or a night of a different event. Both are the caller naming
  // a night this subject was never at.
  if (!party || party.event_id !== subjectEventId) {
    return { bound: false, kind: "mismatch" };
  }

  return { bound: true };
}

/** The refusal a failed binding produces, so the three branches answer alike. */
function refuseUnboundNight(binding: {
  bound: false;
  kind: "mismatch" | "unreadable";
}) {
  if (binding.kind === "unreadable") {
    // 500, not 503. In this file 503 means *the reversal was not recorded and
    // the check-in was left in place* — a decision about a write. This is a
    // read that did not answer, and calling it 503 would blur the two.
    return NextResponse.json(
      { success: false, error: "Party lookup failed" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error:
        "partyId names a different night from the one this check-in belongs to",
    },
    { status: 400 }
  );
}

export async function POST(request: Request) {
  try {
    // The body comes first because the ONE authorisation below needs the night
    // that is in it. See the file comment for what that costs.
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

    // Shape-checked HERE, before the guard, because `requireDoorOperator`
    // **throws** `door.invalid_party_id` on a malformed one rather than
    // returning an outcome: validating its own body is this route's job, and a
    // caller bug must answer 400 and not be laundered into a refusal or into
    // the retryable arm (`require-operator.ts:288-294`).
    if (
      partyId !== undefined &&
      (typeof partyId !== "string" || !UUID_PATTERN.test(partyId))
    ) {
      return NextResponse.json(
        { success: false, error: "partyId is not a valid identifier" },
        { status: 400 }
      );
    }

    const namedNight = typeof partyId === "string" ? partyId : undefined;

    // THE one resolution — once per handler, `cache()` does not memoise in a
    // Route Handler. It carries both verdicts: `ok` is `door.operate`,
    // `maySupervise` is `door.supervise`, from the same lookup.
    const auth = await requireDoorOperator(
      namedNight ? { partyId: namedNight } : undefined
    );
    if (!auth.ok) {
      // 401 and 403 keep their existing body and code; `unresolved` adds a
      // third, distinct answer at 503 (retryable per `sync-manager.ts:141`).
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
          ...(auth.kind === "unresolved"
            ? { status: DOOR_UNRESOLVED_STATUS }
            : {}),
        },
        { status: auth.status }
      );
    }

    // ── ASSIGN-05. Before the service client exists, so a refused undo has
    // touched nothing on any of the three branches ─────────────────────────
    //
    // `403`, and the code was CHOSEN by reading `sync-manager.ts:102-175`
    // rather than inherited from the refusal above it. In that table `403`
    // lands in **`blocked`**, which holds an entry until the operator signs in
    // again — and for a queued SCAN refused over an assignment that would be a
    // defect, because signing in again does not restore a revoked assignment.
    // It is correct HERE for one measured reason: **an undo never passes
    // through the drain.** The queue holds scans; `ScannerClient.tsx:917` posts
    // an undo directly and reads the response on the spot. Nothing classifies
    // this response, so `blocked` is unreachable from it.
    //
    // The distinction is written out because the neighbouring case is the trap:
    // a scan refused for want of an assignment must NOT copy this 403, and that
    // is plan 35-12's subject, not this file's.
    //
    // The category travels as a VALUE in the body, decided by position. Next
    // redacts a thrown message in a production build, so a category that has to
    // reach a phone cannot travel in prose (CR-01, `guards.ts:73-79`).
    if (!auth.maySupervise) {
      return NextResponse.json(
        {
          success: false,
          error: DOOR_SUPERVISION_REQUIRED_ERROR,
          status: DOOR_SUPERVISION_REQUIRED,
        },
        { status: 403 }
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
      //
      // And the binding runs even when the ticket HAS its own night, which it
      // did not before: the named night decided the authorisation a few lines
      // above, so a request that names one night and reverses another is an
      // authorisation for work that is not being done.
      if (namedNight) {
        const binding = await bindNightToSubject(
          serviceClient,
          namedNight,
          ticket.party_id as string | null,
          ticket.event_id as string
        );
        if (!binding.bound) return refuseUnboundNight(binding);
      }

      const recordPartyId = (ticket.party_id as string | null) ?? namedNight;

      if (!recordPartyId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "partyId is required to reverse an event-level ticket: the reversal must name the night it happened at",
          },
          { status: 400 }
        );
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
        operator_id: auth.userId,
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
        .select("id, status, ticket_id, party_id, event_id")
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

      // Same binding as the ticket branch, before the update: this branch
      // writes no register row, so the named night leaves no trace here — which
      // is exactly why it must be checked rather than trusted.
      if (namedNight) {
        const binding = await bindNightToSubject(
          serviceClient,
          namedNight,
          entry.party_id as string | null,
          entry.event_id as string
        );
        if (!binding.bound) return refuseUnboundNight(binding);
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
        .select("id, party_id, event_id")
        .eq("id", attendanceId)
        .single();

      if (fetchError || !attendance) {
        return NextResponse.json(
          { success: false, error: "Attendance record not found" },
          { status: 404 }
        );
      }

      // Before the DELETE, and this is the branch where that matters most: the
      // row is destroyed rather than flagged, so an unbound night here would be
      // an authorisation for one night deleting the evidence of another.
      if (namedNight) {
        const binding = await bindNightToSubject(
          serviceClient,
          namedNight,
          attendance.party_id as string | null,
          attendance.event_id as string
        );
        if (!binding.bound) return refuseUnboundNight(binding);
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
