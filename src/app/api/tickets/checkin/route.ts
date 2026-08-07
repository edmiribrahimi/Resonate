import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  DOOR_UNRESOLVED_STATUS,
  requireDoorOperator,
} from "@/lib/door/require-operator";
import { verifyTicketToken } from "@/utils/qr";
import { partyStartInstant } from "@/utils/datetime";
import {
  DOOR_HTTP,
  type DoorFlag,
  type DoorOutcome,
  type DoorScanCause,
  type DoorScanSource,
} from "@/lib/door/outcome";
import type { DoorScanEvent } from "@/types/database";

/**
 * The door: one scanned code, one of three answers.
 *
 * Four shapes in this file are load-bearing and are not stylistic:
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
 *
 * 3. **`respond()` is the only way out.** It inserts the `door_scan_events` row
 *    and *then* returns, in that order, in one place. FIX-03 depends on the
 *    order — the sync manager may drop a queue entry when it sees a 409, and it
 *    may only do that safely if the conflict is already persisted. Written as
 *    one function, the order cannot be reversed by an edit at one call site,
 *    which is exactly how it would be lost.
 *
 * 4. **`cause` is NULL on every row this route writes except the two refund
 *    ones.** FIX-04a: at the door the answer states a fact — who recorded the
 *    entry and when — and never a verdict about the person standing there.
 *    Classification happens afterwards, over `door_scan_events`. The two refund
 *    causes are the exception because they are a server fact derived from a
 *    stored timestamp, not a judgement.
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
 * The legacy response fields, kept **additively for one release**.
 *
 * `skipWaiting: true` and `clientsClaim: true` mean a staff phone can be running
 * the previous bundle against this API for the length of one session — and that
 * session is a night at the door. So every response carries both vocabularies:
 * the `DoorOutcome` union for the new bundle, and these fields for the old one.
 *
 * Removing them is a follow-up plan, not this phase. The condition for removal
 * is that no device can still be serving the pre-Phase-31 bundle, which is a
 * fact about deployment, not about code.
 *
 * Known limit of the compatibility, stated rather than discovered: the old
 * bundle recognises `wrong_event` and `not_found`, and this route now answers
 * `wrong_night` and `unknown_code`. Both fall to the old bundle's final `else`
 * (ScannerClient.tsx:498-507), which shows a red "Check-in failed" — a refusal
 * stays a refusal, and only the detail line is lost. No scan changes from
 * admitted to refused, or the reverse, on an old bundle.
 */
interface LegacyFields {
  member_name?: string;
  event_title?: string;
  party_title?: string;
  ticket_type?: string;
  tier_name?: string | null;
  party_id?: string | null;
  event_id?: string | null;
  checked_in_at?: string | null;
  ticket_party_id?: string | null;
  ticket_event_id?: string | null;
}

type ScanEventInsert = Omit<DoorScanEvent, "id">;

/**
 * Role decides the door. Status does not.
 *
 * The predicate that used to live here as `verifyOrganizerRole()` is now
 * `requireDoorOperator()` in `@/lib/door/require-operator`, asking the
 * `door.operate` capability — **role alone**, exactly as before. The owner
 * decision of 2026-08-06 is unchanged and is written out in full in that
 * module: staff always get in, because a staff member refused by the scanner at
 * two in the morning cannot admit anyone at all, and the hole a status check
 * would have closed is closed at its source in `updateMemberRole`
 * (src/app/(admin)/admin/members/actions.ts).
 *
 * What changed is that there is now **one** copy instead of four. The three
 * other door routes — `undo`, `membership/verify`, `attendance` — plus
 * `membership/list` call the same function, so they can no longer diverge: the
 * same person refused by one scanner and admitted by another, on the same
 * night, is undiagnosable with no error tracking anywhere in this repository.
 *
 * And the scan is one round trip **cheaper**. The old predicate cost
 * `auth.getUser()` plus a `profiles` select before a code could resolve;
 * `public.my_access_context()` derives the subject from `auth.uid()` inside the
 * JWT and needs neither.
 */

/** The legacy `status` string for an outcome, and whether the old bundle reads it as green. */
function legacyStatusFor(outcome: DoorOutcome): { valid: boolean; status: string } {
  if (outcome.outcome === "recorded") return { valid: true, status: "checked_in" };
  if (outcome.outcome === "already_recorded") {
    return { valid: false, status: "already_checked_in" };
  }
  return { valid: false, status: outcome.reason };
}

export async function POST(request: Request) {
  try {
    // Resolved ONCE, into a local. `cache()` does not memoise inside a Route
    // Handler (measured — three calls, three executions), so a second call here
    // would be a second network round trip before a scan resolves.
    const auth = await requireDoorOperator();
    if (!auth.ok) {
      // The 401 and the 403 keep the exact body and code they have always had.
      // `unresolved` is the third case and is deliberately neither: it says the
      // permission could not be *looked up*, which is not the same statement as
      // "not permitted", and 503 puts it in the sync manager's retryable bucket
      // (`sync-manager.ts:141`) rather than its blocked one (`:131`).
      return NextResponse.json(
        {
          valid: false,
          status:
            auth.kind === "unauthenticated"
              ? "unauthorized"
              : auth.kind === "forbidden"
                ? "forbidden"
                : DOOR_UNRESOLVED_STATUS,
          error: auth.error,
        },
        { status: auth.status }
      );
    }

    /**
     * Who is holding the phone, hoisted out of the tagged union deliberately.
     *
     * `respond()` below is a nested **function declaration**, and TypeScript
     * drops the `auth.ok` narrowing inside one — declarations are hoisted, so
     * the compiler cannot know the guard ran first. That is why the code this
     * replaces reached for a non-null assertion at that same line: the `!` was
     * paying for this exact limitation, not for a genuinely nullable subject.
     *
     * (Written without spelling the old expression out. The standing assertion
     * for this file is a literal `grep -c` for it, and a comment quoting the
     * token would make that check fail on a correct file — the same
     * self-invalidating shape this plan already guards against on
     * `requires_approved`.)
     *
     * A `const` captured after the guard carries the narrowed `string` into the
     * closure with no assertion at all, which is the point — `operator_id` is
     * NOT NULL and an unattributed admission is a door override nobody can
     * review (`ACCESS-MODEL-DECISIONS.md` §5). One name, one fact, used by both
     * writes below.
     */
    const operatorId: string = auth.userId;

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
    //
    // This refusal and the one below it are the only two outcomes this route
    // cannot record. `door_scan_events.party_id` is NOT NULL and there is no
    // night to attribute the scan to — a row invented here would be a row
    // attributed to the wrong night, which is the defect the column exists to
    // prevent. Said out loud rather than left for a reader to notice a gap.
    const partyId = typeof body.partyId === "string" ? body.partyId.trim() : "";
    if (!UUID_PATTERN.test(partyId)) {
      return NextResponse.json(
        { outcome: "not_valid", reason: "no_party_selected", valid: false, status: "no_party_selected" },
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
        { valid: false, status: "error", error: "Party lookup failed" },
        { status: 500 }
      );
    }

    if (!party) {
      return NextResponse.json(
        { outcome: "not_valid", reason: "no_party_selected", valid: false, status: "no_party_selected" },
        { status: DOOR_HTTP.not_valid }
      );
    }

    const eventTitle =
      (party.events as unknown as { title: string } | null)?.title || "";

    // --- Evidence, not authority ----------------------------------------------
    // The device clock says when the phone read the code. It is stored as
    // evidence and is never used to decide anything: a backdated `scannedAt`
    // must not be able to place a scan before the night began. The one
    // before/after decision in this file compares two server-side values.
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

    const rawToken = typeof body.token === "string" ? body.token.trim() : "";

    // A digest, never the token. It proves the code was read and cannot be
    // replayed, so an organizer reading `door_scan_events` never holds a
    // credential that would admit anyone (T-31-07-05).
    const tokenFingerprint = rawToken
      ? crypto.createHash("sha256").update(rawToken).digest("hex")
      : null;

    const scannedAt = deviceScannedAt ?? new Date().toISOString();

    /**
     * The only way out of this handler once the night is known.
     *
     * Insert first, answer second. Reversing these two statements re-breaks
     * FIX-03 silently: the sync manager drops a queue entry on a 409, so a
     * conflict acknowledged before it is persisted is a conflict destroyed at
     * the moment it arrives.
     */
    async function respond(
      outcome: DoorOutcome,
      row: Pick<
        ScanEventInsert,
        "ticket_id" | "subject_user_id" | "cause"
      >,
      legacy: LegacyFields
    ) {
      const insert: ScanEventInsert = {
        party_id: party!.id,
        event_id: party!.event_id,
        subject_type: "ticket",
        ticket_id: row.ticket_id,
        guest_entry_id: null,
        subject_user_id: row.subject_user_id,
        outcome: outcome.outcome,
        cause: row.cause,
        scanned_at: scannedAt,
        recorded_at: new Date().toISOString(),
        // Non-null by the type on the `ok: true` arm — no `!` assertion, and no
        // second call to the Auth server to obtain it. Same subject, same JWT,
        // verified by Postgres instead.
        operator_id: operatorId,
        device_id: deviceId,
        source,
        token_fingerprint: tokenFingerprint,
        is_undo: false,
      };

      const { error: insertError } = await serviceClient
        .from("door_scan_events")
        .insert(insert);

      if (insertError) {
        console.error("checkin:event_insert", {
          partyId: insert.party_id,
          ticketId: insert.ticket_id,
          outcome: insert.outcome,
          code: insertError.code,
          message: insertError.message,
          source,
          deviceId,
        });
        // Deliberately **not** the outcome. Answering `already_recorded` here
        // would tell the sync manager the conflict is safe to drop when nothing
        // was written. 503 carries no `outcome` field, so `isDoorOutcome` is
        // false and the drain retries instead of draining.
        return NextResponse.json(
          { valid: false, status: "record_failed", error: "Scan could not be recorded" },
          { status: 503 }
        );
      }

      const legacyStatus = legacyStatusFor(outcome);
      return NextResponse.json(
        { ...outcome, ...legacyStatus, ...legacy },
        { status: DOOR_HTTP[outcome.outcome] }
      );
    }

    // --- Proof that a code was read -------------------------------------------
    if (!TICKET_TOKEN_PATTERN.test(rawToken)) {
      return respond(
        { outcome: "not_valid", reason: "invalid_signature" },
        { ticket_id: null, subject_user_id: null, cause: null },
        { event_title: eventTitle, party_title: party.title || "" }
      );
    }

    const ticketId = verifyTicketToken(rawToken);
    if (!ticketId) {
      return respond(
        { outcome: "not_valid", reason: "invalid_signature" },
        { ticket_id: null, subject_user_id: null, cause: null },
        { event_title: eventTitle, party_title: party.title || "" }
      );
    }

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
        source,
        deviceId,
      });
      return NextResponse.json(
        { valid: false, status: "error", error: "Ticket lookup failed" },
        { status: 500 }
      );
    }

    // --- No ticket: a refunded holder, or an unknown code ----------------------
    if (!ticket) {
      // A refund deletes the ticket (owner decision: Option B, evidence
      // persisted rather than the ticket soft-invalidated), so "not found" and
      // "refunded" are the same lookup result and must be told apart here. The
      // evidence columns survive the ticket by construction — they are
      // deliberately not foreign keys (20260805120000_door_scan_events.sql:188-204).
      const { data: refund, error: refundError } = await serviceClient
        .from("ticket_refunds")
        .select("id, refunded_at, refunded_party_id, refunded_event_id")
        .eq("refunded_ticket_id", ticketId)
        .eq("status", "approved")
        .order("refunded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (refundError) {
        console.error("checkin:refund_lookup", {
          ticketId,
          partyId,
          code: refundError.code,
          message: refundError.message,
        });
        return NextResponse.json(
          { valid: false, status: "error", error: "Refund lookup failed" },
          { status: 500 }
        );
      }

      if (refund) {
        // Europe/Rome, through the one module that owns the conversion.
        // `time-and-scheduling.md` is explicit and commit 8f4e004 exists to stop
        // a stored date+time being parsed in the runtime's zone.
        const nightStart = partyStartInstant(party.date, party.time);
        const refundedAt = refund.refunded_at
          ? new Date(refund.refunded_at)
          : null;

        let cause: DoorScanCause | null;
        let flags: DoorFlag[] | undefined;

        if (refundedAt === null) {
          // Only reachable if a refund writer stored the ticket id without the
          // timestamp — the two are written by the same statement, so this is a
          // data-integrity anomaly rather than an expected shape. Admit anyway
          // (the asymmetry), flag it so someone looks, and leave the cause
          // unclassified because there is nothing to classify it from.
          console.error("checkin:refund_missing_timestamp", {
            refundId: refund.id,
            ticketId,
            partyId,
          });
          cause = null;
          flags = ["refunded_before_night"];
        } else if (refundedAt < nightStart) {
          // FIX-09: the holder is standing there and a red screen is a false
          // refusal on data they cannot argue with. Admit, and flag it for the
          // night's review list.
          cause = "refunded_before_night";
          flags = ["refunded_before_night"];
        } else {
          // A refund issued after the night began is accounting. It belongs to
          // the finance surface, not to the door's review list, which filters
          // this cause out — so it is recorded without a flag.
          cause = "refunded_after_night";
          flags = undefined;
        }

        // There is nothing to mark checked in: the ticket row is gone. The
        // `door_scan_events` row **is** the record of this admission, which is
        // why a reader will not find a `tickets` update below.
        //
        // And `ticket_id` must be NULL here for the same reason: the column is a
        // foreign key to a row that no longer exists, so a value would raise
        // 23503. The identity of what was scanned survives as
        // `token_fingerprint`. That the refunded admission cannot name its
        // ticket in the review list is a real limit of Option B, recorded rather
        // than papered over.
        return respond(
          {
            outcome: "recorded",
            subject: { type: "ticket", id: ticketId },
            at: new Date().toISOString(),
            ...(flags ? { flags } : {}),
          },
          { ticket_id: null, subject_user_id: null, cause },
          {
            member_name: "Unknown",
            event_title: eventTitle,
            party_title: party.title || "",
            ticket_type: "purchased",
            tier_name: null,
            party_id: refund.refunded_party_id ?? null,
            event_id: refund.refunded_event_id ?? null,
          }
        );
      }

      return respond(
        { outcome: "not_valid", reason: "unknown_code" },
        { ticket_id: null, subject_user_id: null, cause: null },
        { event_title: eventTitle, party_title: party.title || "" }
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
    const wrongParty = ticket.party_id !== null && ticket.party_id !== partyId;
    const wrongEvent = ticket.event_id !== party.event_id;

    const memberProfile = ticket.profiles as unknown as {
      full_name: string;
    } | null;
    const memberName = memberProfile?.full_name || "Unknown";
    const tier = ticket.ticket_tiers as unknown as { name: string } | null;

    if (wrongParty || wrongEvent) {
      return respond(
        { outcome: "not_valid", reason: "wrong_night" },
        {
          ticket_id: ticket.id,
          subject_user_id: ticket.user_id ?? null,
          cause: null,
        },
        {
          member_name: memberName,
          event_title: eventTitle,
          party_title: party.title || "",
          ticket_party_id: ticket.party_id,
          ticket_event_id: ticket.event_id,
        }
      );
    }

    // --- Already recorded ------------------------------------------------------
    if (ticket.checked_in) {
      const checkedInBy = ticket.checked_in_by as string | null;

      // A lookup, not a join: this repository does not join `profiles` on these
      // paths (there is an ambiguous foreign key through `auth.users`).
      let operatorLabel = "Unknown";
      if (checkedInBy) {
        const { data: operator } = await serviceClient
          .from("profiles")
          .select("id, full_name")
          .eq("id", checkedInBy)
          .maybeSingle();
        operatorLabel = operator?.full_name || "Unknown";
      }

      // Same operator and different operator take the *same* branch. The
      // previous code returned `valid: true` for a re-read by the same phone,
      // so a second scan rendered as a fresh green admission — which is the
      // "system decides for you" behaviour FIX-04a forbids. Whether this was a
      // double read, two devices or a second ticket for the same holder is
      // classified afterwards, from `operator_id`, `device_id` and the interval
      // between two `scanned_at` values.
      return respond(
        {
          outcome: "already_recorded",
          subject: { type: "ticket", id: ticket.id, label: memberName },
          // The first record's moment, not this read's. Empty only for a row
          // admitted before the timestamp was written, which no current path
          // produces.
          at: (ticket.checked_in_at as string | null) ?? "",
          by: { operatorId: checkedInBy ?? "", operatorLabel },
        },
        {
          ticket_id: ticket.id,
          subject_user_id: ticket.user_id ?? null,
          cause: null,
        },
        {
          member_name: memberName,
          event_title: eventTitle,
          party_title: party.title || "",
          ticket_type: ticket.ticket_type || "purchased",
          tier_name: tier?.name || null,
          party_id: ticket.party_id,
          event_id: ticket.event_id,
          checked_in_at: ticket.checked_in_at,
        }
      );
    }

    // --- Record the admission --------------------------------------------------
    // The ticket is updated first and the event row written second, on purpose.
    // If the event insert then fails, the person really is admitted and the
    // retry lands on the branch above, which records the conflict with the true
    // moment and operator. The reverse order would write an admission that the
    // ticket does not reflect.
    const checkedInAt = new Date().toISOString();
    const { error: updateError } = await serviceClient
      .from("tickets")
      .update({
        checked_in: true,
        checked_in_at: checkedInAt,
        checked_in_by: operatorId,
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
        source,
        deviceId,
      });
      return NextResponse.json(
        { valid: false, status: "error", error: "Check-in write failed" },
        { status: 500 }
      );
    }

    return respond(
      {
        outcome: "recorded",
        subject: { type: "ticket", id: ticket.id, label: memberName },
        at: checkedInAt,
      },
      {
        ticket_id: ticket.id,
        subject_user_id: ticket.user_id ?? null,
        cause: null,
      },
      {
        member_name: memberName,
        event_title: eventTitle,
        party_title: party.title || "",
        ticket_type: ticket.ticket_type || "purchased",
        tier_name: tier?.name || null,
        party_id: ticket.party_id,
        event_id: ticket.event_id,
        checked_in_at: checkedInAt,
      }
    );
  } catch (error) {
    // The genuine last resort, and nothing else. The `.single()` errors, the
    // check-in update, the refund lookup and the `door_scan_events` insert are
    // each handled above with their own category, so anything arriving here is
    // by definition a cause this phase did not foresee — and it must not be
    // indistinguishable from one it did. Do not widen it, and do not remove it.
    console.error("checkin:unexpected", error);
    return NextResponse.json(
      { valid: false, status: "error", error: "Unexpected check-in failure" },
      { status: 500 }
    );
  }
}
