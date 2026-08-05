import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { verifyTicketToken } from "@/utils/qr";
import { DOOR_HTTP, type DoorScanSource } from "@/lib/door/outcome";

/**
 * The door: one scanned code, one answer.
 *
 * Two shapes in this file are load-bearing and are not stylistic:
 *
 * 1. **Every path that resolves a ticket id goes through `verifyTicketToken`.**
 *    The queued-scan shortcut that used to live here accepted a bare identifier
 *    from the request body as proof that a code had been read, and then handed
 *    it to an RLS-bypassing service client. A queued scan now carries the signed
 *    string it was read from (`PendingCheckin.token`,
 *    src/lib/offline/checkin-store.ts:102), so the offline path verifies exactly
 *    as the online one does. `access-gating.md`, gate *service role*: nothing
 *    untrusted from the body reaches the service client. The two identifiers
 *    that shortcut used are deliberately absent from this file, and a grep for
 *    them returning nothing is FIX-10's standing assertion — so do not name them
 *    here, not even to explain the history.
 *
 * 2. **The party is resolved before the token.** It reads backwards, and it is
 *    deliberate: `door_scan_events.party_id` and `.event_id` are NOT NULL, so a
 *    scan can only be written into the night's record once the night is known.
 *    Resolving the party first is what lets a bad signature be *recorded* rather
 *    than merely refused.
 */

/** The scanned string: a ticket uuid, a dot, and 64 hex of HMAC-SHA256. */
const TICKET_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/i;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The accepted body. Every field is `unknown` on purpose: there is no validation
 * library in this repository and one is not being added for this route alone, so
 * the only thing that keeps a value honest is an explicit check below. A typed
 * optional (`token?: string`) would let a number through at runtime while
 * reading as though it could not.
 */
interface CheckinRequestBody {
  token?: unknown;
  partyId?: unknown;
  scannedAt?: unknown;
  deviceId?: unknown;
  source?: unknown;
}

/**
 * Role **and** status, never role alone.
 *
 * `access-gating.md` gate *due assi*: the two are independent axes. And the hole
 * is reachable, not theoretical — `updateMemberRole`
 * (src/app/(admin)/admin/members/actions.ts:114-118) writes `role` without
 * touching `status`, so an organizer promoted from a member who was still
 * `pending` keeps `status = 'pending'`.
 *
 * The two refusals carry **different** messages on purpose. At two in the
 * morning with a queue, a bare "Forbidden" is undiagnosable; "account not
 * approved" names the fix. `meta-gates.md`: with no error tracking anywhere in
 * this repository, the message shown to the person holding the phone is the only
 * observer that exists.
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

  if (profile.status !== "approved") {
    return { error: "Forbidden: account not approved", status: 403 };
  }

  return { user, profile };
}

export async function POST(request: Request) {
  try {
    const auth = await verifyOrganizerRole();
    if ("error" in auth) {
      return NextResponse.json(
        {
          valid: false,
          status: auth.status === 401 ? "unauthorized" : "forbidden",
          error: auth.error,
        },
        { status: auth.status }
      );
    }

    let body: CheckinRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { valid: false, status: "invalid_body", error: "Invalid request body" },
        { status: 400 }
      );
    }

    // --- The night ------------------------------------------------------------
    // A scan with no party selected has no meaning: recording a presence against
    // the wrong night corrupts two nights' data (`checkin-offline.md`, gate
    // *identita' del party*).
    const partyId = typeof body.partyId === "string" ? body.partyId.trim() : "";
    if (!UUID_PATTERN.test(partyId)) {
      return NextResponse.json(
        { valid: false, status: "no_party_selected" },
        { status: DOOR_HTTP.not_valid }
      );
    }

    const serviceClient = getServiceClient();

    const { data: party, error: partyError } = await serviceClient
      .from("event_parties")
      .select("id, event_id, title, date, time, end_time, events(title)")
      .eq("id", partyId)
      .single();

    // PGRST116 is "0 or more than 1 row". `id` is the primary key here, so more
    // than one is impossible and this means the party does not exist. Anything
    // else is an infrastructure failure and must not be reported to the door as
    // a verdict about the code that was scanned.
    if (partyError && partyError.code !== "PGRST116") {
      console.error("checkin:party_lookup", {
        partyId,
        code: partyError.code,
        message: partyError.message,
      });
      return NextResponse.json(
        { valid: false, status: "error" },
        { status: 500 }
      );
    }

    if (!party) {
      return NextResponse.json(
        { valid: false, status: "no_party_selected" },
        { status: DOOR_HTTP.not_valid }
      );
    }

    // --- Proof that a code was read -------------------------------------------
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!TICKET_TOKEN_PATTERN.test(token)) {
      return NextResponse.json(
        { valid: false, status: "invalid_signature" },
        { status: DOOR_HTTP.not_valid }
      );
    }

    const ticketId = verifyTicketToken(token);
    if (!ticketId) {
      return NextResponse.json(
        { valid: false, status: "invalid_signature" },
        { status: DOOR_HTTP.not_valid }
      );
    }

    // --- Evidence, not authority ----------------------------------------------
    // The device clock says when the phone read the code. It is stored as
    // evidence and is never used to decide anything: a backdated `scannedAt`
    // must not be able to place a scan before the night began.
    const deviceScannedAt =
      typeof body.scannedAt === "string" &&
      !Number.isNaN(Date.parse(body.scannedAt))
        ? new Date(body.scannedAt).toISOString()
        : null;

    // `"unknown"` rather than a refusal: refusing would strand a queued entry
    // written by an older bundle that had no device id, and a stranded entry is
    // a scan nobody ever sees again. The cost is that such a row cannot be
    // classified `two_devices` afterwards.
    const deviceId =
      typeof body.deviceId === "string" && body.deviceId.trim() !== ""
        ? body.deviceId.trim()
        : "unknown";

    const source: DoorScanSource =
      body.source === "offline_sync" ? "offline_sync" : "online";

    const scan = {
      scannedAt: deviceScannedAt ?? new Date().toISOString(),
      deviceClockAbsent: deviceScannedAt === null,
      deviceId,
      source,
    };

    // --- The ticket -----------------------------------------------------------
    const { data: ticket, error: ticketError } = await serviceClient
      .from("tickets")
      .select(
        "id, checked_in, checked_in_at, checked_in_by, event_id, party_id, user_id, ticket_type, profiles(full_name), ticket_tiers(name)"
      )
      .eq("id", ticketId)
      .single();

    // Two different failures, and `checkin-offline.md` gate *query a esito
    // singolo* requires them to stay different: "does not exist" is a scan
    // outcome, "there are two" is data corruption.
    if (ticketError && ticketError.code !== "PGRST116") {
      console.error("checkin:ticket_lookup", {
        ticketId,
        partyId,
        code: ticketError.code,
        message: ticketError.message,
        source: scan.source,
        deviceId: scan.deviceId,
      });
      return NextResponse.json(
        { valid: false, status: "error" },
        { status: 500 }
      );
    }

    if (!ticket) {
      return NextResponse.json(
        { valid: false, status: "not_found" },
        { status: DOOR_HTTP.not_valid }
      );
    }

    // --- The right night for this ticket --------------------------------------
    // The line this replaces was `if (partyId && ticket.party_id !== partyId)`,
    // which is *always* true for an event-level ticket — a real, sold product
    // (`tickets_event_user_master_unique`,
    // 20260226300000_multi_sub_events.sql:66-68) whose `party_id` is NULL. An
    // Event Pass holder was therefore refused at every door of the event they
    // had paid to attend.
    //
    // NULL now means "valid for every party of its event", which is why the
    // event still has to match: a NULL `party_id` must not make a ticket valid
    // for a *different* event's door.
    const wrongParty =
      ticket.party_id !== null && ticket.party_id !== partyId;
    const wrongEvent = ticket.event_id !== party.event_id;

    if (wrongParty || wrongEvent) {
      return NextResponse.json(
        {
          valid: false,
          status: "wrong_event",
          member_name:
            (ticket.profiles as unknown as { full_name: string } | null)
              ?.full_name || "Unknown",
          event_title:
            (party.events as unknown as { title: string } | null)?.title || "",
          party_title: party.title || "",
          ticket_party_id: ticket.party_id,
          ticket_event_id: ticket.event_id,
        },
        { status: DOOR_HTTP.not_valid }
      );
    }

    const memberProfile = ticket.profiles as unknown as {
      full_name: string;
    } | null;
    const eventTitle =
      (party.events as unknown as { title: string } | null)?.title || "";
    const tier = ticket.ticket_tiers as unknown as { name: string } | null;

    if (ticket.checked_in) {
      return NextResponse.json(
        {
          valid: false,
          status: "already_checked_in",
          member_name: memberProfile?.full_name || "Unknown",
          checked_in_at: ticket.checked_in_at,
          party_id: ticket.party_id,
          event_id: ticket.event_id,
        },
        { status: DOOR_HTTP.already_recorded }
      );
    }

    // --- Record the admission --------------------------------------------------
    const checkedInAt = new Date().toISOString();
    const { error: updateError } = await serviceClient
      .from("tickets")
      .update({
        checked_in: true,
        checked_in_at: checkedInAt,
        checked_in_by: auth.user.id,
      })
      .eq("id", ticketId);

    // A green screen over a failed write is the worst outcome this file can
    // produce, because it is the one nobody discovers: the person walks in, the
    // night's numbers do not know it, and no error reaches a human.
    if (updateError) {
      console.error("checkin:update_failed", {
        ticketId,
        partyId,
        code: updateError.code,
        message: updateError.message,
        source: scan.source,
        deviceId: scan.deviceId,
      });
      return NextResponse.json(
        { valid: false, status: "error" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        status: "checked_in",
        member_name: memberProfile?.full_name || "Unknown",
        event_title: eventTitle,
        party_title: party.title || "",
        ticket_type: ticket.ticket_type || "purchased",
        tier_name: tier?.name || null,
        party_id: ticket.party_id,
        event_id: ticket.event_id,
        checked_in_at: checkedInAt,
      },
      { status: DOOR_HTTP.recorded }
    );
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { valid: false, status: "error" },
      { status: 500 }
    );
  }
}
