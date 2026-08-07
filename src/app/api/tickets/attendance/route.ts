import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getPostHogServer } from "@/lib/posthog/server";
import {
  DOOR_HTTP,
  type DoorOutcome,
  type DoorSubjectType,
} from "@/lib/door/outcome";
import {
  DOOR_UNRESOLVED_STATUS,
  requireDoorOperator,
  type DoorAuth,
} from "@/lib/door/require-operator";

/**
 * The refusal body for this route's envelope, which is `{ error }` and nothing
 * else. Written once because both handlers below refuse identically — and the
 * point of this plan is that the door's routes cannot answer differently from
 * one another about the same person on the same night.
 *
 * Takes the already-resolved verdict rather than resolving again: `cache()` does
 * not memoise inside a Route Handler, so a second `requireDoorOperator()` call
 * would be a second network round trip before the door gets its list.
 */
function refuse(auth: Extract<DoorAuth, { ok: false }>) {
  return NextResponse.json(
    {
      error: auth.error,
      ...(auth.kind === "unresolved" ? { status: DOOR_UNRESOLVED_STATUS } : {}),
    },
    { status: auth.status }
  );
}

/**
 * One row of the attendance payload — the shape the offline cache is built from.
 *
 * Declared once so the three sources below (live tickets, guest-list entries,
 * refunded tickets) cannot drift apart field by field. Everything the door has
 * to be able to say with the radio off has to be here before the radio goes
 * off; there is no second chance to fetch it.
 *
 * `subjectType` / `subjectId` are the composite key the device stores under
 * (`checkin-store.ts` → `attendeeKey`). They are sent rather than re-derived on
 * the phone from `isGuestList`, which is the same fact reconstructed twice.
 *
 * `ticketId`, `guestListEntryId` and `isGuestList` stay alongside them on
 * purpose: a staff device may run the previous bundle against this API for one
 * session, and that session is a night at the door. The payload is additive for
 * one release — the owner's locked decision.
 *
 * There is deliberately no `email`. `hasEmail` is a boolean and stays one: the
 * door needs to know whether an entry has a contact route, never what it is,
 * and everything here lands in IndexedDB on a phone and stays there.
 */
interface AttendeeItem {
  subjectType: DoorSubjectType;
  subjectId: string;
  ticketId: string | null;
  guestListEntryId: string | null;
  name: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  /** An operator **label**, never an identifier. `null` only when the row is not checked in. */
  checkedInBy: string | null;
  /** Present on every item, `null` where there is no refund — so the device never distinguishes "absent" from "not refunded". */
  refundedAt: string | null;
  isGuestList: boolean;
  hasEmail: boolean;
  ticketType: string;
  tierName: string | null;
}

/** The operator column is NULL: the moment had nowhere to be written before 2026-08-05. */
const OPERATOR_NOT_RECORDED = "Not recorded";

/** An operator id was recorded but no name resolves for it. Distinct from "not recorded" — the two are different statements. */
const OPERATOR_UNKNOWN = "Unknown operator";

/** The profile lookup itself failed. Distinct again: a lookup that failed is not a fact that was never written. */
const OPERATOR_LOOKUP_FAILED = "Operator lookup failed";

/**
 * A refunded ticket whose holder cannot be named without risking naming the
 * wrong person. See `refundedHolderName` for why that risk is real.
 */
const REFUNDED_SUBJECT_LABEL = "Refunded ticket";

/** Rows as this route selects them. The service client is untyped, so the shape is declared here rather than cast at each use. */
interface TicketRow {
  id: string;
  party_id: string | null;
  tier_id: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  user_id: string;
  ticket_type: string | null;
}

interface GuestRow {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  email: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
}

interface RefundRow {
  refunded_ticket_id: string | null;
  refunded_party_id: string | null;
  refunded_event_id: string | null;
  refunded_at: string | null;
  requested_by: string;
  type: "user_request" | "admin_initiated";
}

/**
 * The operator label for one row.
 *
 * `null` means *not checked in*. A checked-in row always gets a sentence,
 * because the third outcome promises "who recorded it and when" and a blank
 * after the separator is worse than the weaker sentence.
 */
function operatorLabel(
  checkedIn: boolean,
  operatorId: string | null,
  labels: Map<string, string>
): string | null {
  if (!checkedIn) return null;
  if (!operatorId) return OPERATOR_NOT_RECORDED;
  return labels.get(operatorId) ?? OPERATOR_UNKNOWN;
}

/**
 * Who to name against a refunded ticket, and when to name nobody.
 *
 * `ticket_refunds` has no holder column and the ticket row is deleted, so
 * `requested_by` is the only person on the record. It is the holder **only**
 * when `type = 'user_request'` (`refund-actions.ts:56` — the member asked for
 * their own refund). On `admin_initiated` it is the holder in two writers
 * (`finance/actions.ts:102`, `reconcile-refunds/route.ts:111`) and the **admin**
 * in a third (`refund-actions.ts:378`), and nothing on the row tells them apart:
 * all three also set `processed_by` to the same id.
 *
 * So on that branch the payload names nobody. At the door the label is prose —
 * the scan matches on `subjectId` — and naming the wrong person on a phone held
 * in front of a queue is a worse failure than naming none.
 */
function refundedHolderName(
  row: RefundRow,
  labels: Map<string, string>
): string {
  if (row.type !== "user_request") return REFUNDED_SUBJECT_LABEL;
  return labels.get(row.requested_by) ?? REFUNDED_SUBJECT_LABEL;
}

/** What could not be read for one party, and therefore what the payload would be lying about. */
type PartyResult =
  | { ok: true; value: PartyPayload }
  | {
      ok: false;
      partyId: string;
      source: "tickets" | "guest_list_entries";
      message: string;
    };

interface PartyPayload {
  partyId: string;
  partyTitle: string;
  eventTitle: string;
  date: string;
  time: string | null;
  totalTickets: number;
  guestListCount: number;
  refundedCount: number;
  checkedIn: number;
  /**
   * Counted rather than only logged. There is no error tracking in this
   * project, so a log is a place nobody looks; a number in the response can at
   * least be read by whoever is holding the phone.
   */
  diagnostics: {
    /** Refund rows dropped because the ticket they name is still live — a delete that did not happen. */
    refundCollisions: number;
    /** More than one approved refund naming the same ticket. Only the earliest is kept. */
    duplicateRefundRows: number;
    /** The refund evidence could not be read: every holder is present, the amber flag is not. */
    refundEvidenceUnavailable: boolean;
  };
  attendees: AttendeeItem[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().toLowerCase() || "";
  const partyIdFilter = searchParams.get("partyId");

  // Once per handler. This is the request the door makes before the radio goes
  // off, so a round trip saved here is a round trip saved on a weak signal.
  const auth = await requireDoorOperator();
  if (!auth.ok) return refuse(auth);

  const serviceClient = getServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch current and upcoming parties (today + future) with their events
  let partiesQuery = serviceClient
    .from("event_parties")
    .select("id, title, date, time, event_id, events(title)")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  // If partyId filter provided, only fetch that party
  if (partyIdFilter) {
    partiesQuery = partiesQuery.eq("id", partyIdFilter);
  }

  const { data: parties } = await partiesQuery;

  if (!parties || parties.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const results: PartyResult[] = await Promise.all(
    parties.map(async (party): Promise<PartyResult> => {
      const event = party.events as unknown as { title: string };

      const [ticketsRes, guestRes, refundsRes] = await Promise.all([
        // An event-level ticket carries `party_id IS NULL` and is valid for
        // every party of its event — the partial unique index
        // `tickets_event_user_master_unique`
        // (20260226300000_multi_sub_events.sql:66-68) exists for exactly that
        // product — so filtering this list by party alone drops a paying holder
        // out of the offline cache, and a false refusal happens in front of a
        // queue. This is the same NULL-tolerant predicate the guest-list query
        // below has always used.
        serviceClient
          .from("tickets")
          .select(
            "id, party_id, tier_id, checked_in, checked_in_at, checked_in_by, user_id, ticket_type"
          )
          .eq("event_id", party.event_id)
          .or(`party_id.eq.${party.id},party_id.is.null`)
          .order("checked_in", { ascending: true })
          .order("created_at", { ascending: true }),

        // Guest list entries without tickets (name-only check-in)
        serviceClient
          .from("guest_list_entries")
          .select(
            "id, first_name, last_name, status, email, checked_in_at, checked_in_by"
          )
          .eq("event_id", party.event_id)
          .or(`party_id.eq.${party.id},party_id.is.null`)
          .is("ticket_id", null)
          .not("status", "eq", "failed"),

        // A refunded ticket's row is deleted (Option B), so `ticket_refunds` is
        // the only way the device can learn that a holder was refunded before
        // the list was downloaded. A refund issued *after* the download cannot
        // be known locally at all — that is the honest limit of an offline
        // door, and it belongs in the night's runbook rather than being
        // engineered around. The second `or` branch is the event-level ticket
        // case, which is why `refunded_event_id` exists at all.
        serviceClient
          .from("ticket_refunds")
          .select(
            "refunded_ticket_id, refunded_party_id, refunded_event_id, refunded_at, requested_by, type"
          )
          .eq("status", "approved")
          .not("refunded_ticket_id", "is", null)
          .or(
            `refunded_party_id.eq.${party.id},and(refunded_party_id.is.null,refunded_event_id.eq.${party.event_id})`
          ),
      ]);

      // The list is the list. If it cannot be read, an empty payload would tell
      // a device that is about to trust it that nobody is on tonight — and the
      // device's own plausibility guard only catches that when it already holds
      // a cache. Fail the request instead: the phone keeps what it has, and the
      // staff sees a failure rather than an empty room.
      if (ticketsRes.error) {
        return {
          ok: false,
          partyId: party.id,
          source: "tickets",
          message: ticketsRes.error.message,
        };
      }
      if (guestRes.error) {
        return {
          ok: false,
          partyId: party.id,
          source: "guest_list_entries",
          message: guestRes.error.message,
        };
      }

      // A refunds failure is different in kind: the door still gets every
      // holder, it only loses the amber flag on one of them. Degrade, and say
      // so in the response rather than only in a log.
      const refundEvidenceUnavailable = refundsRes.error !== null;
      if (refundsRes.error) {
        console.error("[attendance] ticket_refunds read failed", {
          partyId: party.id,
          message: refundsRes.error.message,
        });
      }

      const tickets = (ticketsRes.data ?? []) as TicketRow[];
      const guestEntries = (guestRes.data ?? []) as GuestRow[];
      const refundRows = (refundsRes.data ?? []) as RefundRow[];

      // ── Refund evidence, de-duplicated against the live rows ──────────────
      // A `refunded_ticket_id` that still matches a live ticket means the
      // delete did not happen — the silent failure plan 31-09 closes. The live
      // row wins, because a ticket that still exists still admits its holder,
      // and the drop is counted rather than swallowed.
      const liveTicketIds = new Set(tickets.map((t) => t.id));
      const refundsByTicket = new Map<string, RefundRow>();
      let refundCollisions = 0;
      let duplicateRefundRows = 0;

      for (const row of refundRows) {
        const ticketId = row.refunded_ticket_id;
        if (!ticketId) continue;
        if (liveTicketIds.has(ticketId)) {
          refundCollisions++;
          continue;
        }
        const seen = refundsByTicket.get(ticketId);
        if (!seen) {
          refundsByTicket.set(ticketId, row);
          continue;
        }
        // Two approved refunds naming one ticket. Keep the earliest moment:
        // the first refund is when the holder stopped being expected.
        duplicateRefundRows++;
        const seenAt = seen.refunded_at ?? "";
        const rowAt = row.refunded_at ?? "";
        if (rowAt && (!seenAt || rowAt < seenAt)) {
          refundsByTicket.set(ticketId, row);
        }
      }

      // ── One profile fetch for every label this payload needs ──────────────
      // Separate fetch then Map, never a join: the FK to profiles runs through
      // auth.users and is ambiguous on these paths.
      const labelIds = new Set<string>();
      for (const t of tickets) {
        if (t.user_id) labelIds.add(t.user_id);
        if (t.checked_in_by) labelIds.add(t.checked_in_by);
      }
      for (const g of guestEntries) {
        if (g.checked_in_by) labelIds.add(g.checked_in_by);
      }
      for (const row of refundsByTicket.values()) {
        if (row.type === "user_request") labelIds.add(row.requested_by);
      }

      const profileMap = new Map<string, string>();
      if (labelIds.size > 0) {
        const { data: profiles, error: profilesError } = await serviceClient
          .from("profiles")
          .select("id, full_name")
          .in("id", [...labelIds]);
        if (profilesError) {
          console.error("[attendance] profiles read failed", {
            partyId: party.id,
            message: profilesError.message,
          });
        }
        for (const p of (profiles ?? []) as {
          id: string;
          full_name: string | null;
        }[]) {
          profileMap.set(p.id, p.full_name ?? "Unknown");
        }
      }

      // Tier names for tickets. `tier_id` is now selected above — it was read
      // through a cast without being selected, so this map was always empty and
      // `tierName` was always null.
      const tierIds = [
        ...new Set(tickets.map((t) => t.tier_id).filter(Boolean)),
      ] as string[];
      const tierMap = new Map<string, string>();
      if (tierIds.length > 0) {
        const { data: tiers } = await serviceClient
          .from("ticket_tiers")
          .select("id, name")
          .in("id", tierIds);
        for (const t of (tiers ?? []) as { id: string; name: string }[]) {
          tierMap.set(t.id, t.name);
        }
      }

      const ticketAttendees: AttendeeItem[] = tickets.map((t) => ({
        subjectType: "ticket",
        subjectId: t.id,
        ticketId: t.id,
        guestListEntryId: null,
        name: profileMap.get(t.user_id) ?? "Unknown",
        checkedIn: t.checked_in,
        checkedInAt: t.checked_in_at,
        checkedInBy: operatorLabel(t.checked_in, t.checked_in_by, profileMap),
        refundedAt: null,
        isGuestList: false,
        hasEmail: true,
        ticketType: t.ticket_type || "purchased",
        tierName: (t.tier_id && tierMap.get(t.tier_id)) || null,
      }));

      const guestListAttendees: AttendeeItem[] = guestEntries.map((g) => {
        const checkedIn = g.status === "checked_in";
        return {
          subjectType: "guest_list_entry",
          subjectId: g.id,
          ticketId: null,
          guestListEntryId: g.id,
          name: `${g.first_name} ${g.last_name}`,
          checkedIn,
          // NULL here means *not recorded* — including on a row already at
          // 'checked_in', whose moment had nowhere to be written before
          // 2026-08-05. Read `checkedIn` for whether the guest came in.
          checkedInAt: g.checked_in_at,
          checkedInBy: operatorLabel(checkedIn, g.checked_in_by, profileMap),
          refundedAt: null,
          isGuestList: true,
          hasEmail: !!g.email,
          ticketType: "guest_list",
          tierName: null,
        };
      });

      const refundedAttendees: AttendeeItem[] = [...refundsByTicket.values()]
        .filter((row): row is RefundRow & { refunded_ticket_id: string } =>
          Boolean(row.refunded_ticket_id)
        )
        .map((row) => ({
          subjectType: "ticket",
          subjectId: row.refunded_ticket_id,
          ticketId: row.refunded_ticket_id,
          guestListEntryId: null,
          name: refundedHolderName(row, profileMap),
          checkedIn: false,
          checkedInAt: null,
          checkedInBy: null,
          refundedAt: row.refunded_at,
          isGuestList: false,
          // Not claimed: the ticket row is gone and no contact route has been
          // established for this entry.
          hasEmail: false,
          ticketType: "purchased",
          tierName: null,
        }));

      const allAttendees = [
        ...ticketAttendees,
        ...guestListAttendees,
        ...refundedAttendees,
      ];

      // Apply search filter to all types
      const filteredAttendees = search
        ? allAttendees.filter((a) => a.name.toLowerCase().includes(search))
        : allAttendees;

      // Sort: unchecked first, then alphabetical
      filteredAttendees.sort((a, b) => {
        if (a.checkedIn !== b.checkedIn) return a.checkedIn ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      return {
        ok: true,
        value: {
          partyId: party.id,
          partyTitle: party.title,
          eventTitle: event.title,
          date: party.date,
          time: party.time,
          // Live tickets only: a refunded ticket is not a sold seat for tonight.
          totalTickets: ticketAttendees.length,
          guestListCount: guestListAttendees.length,
          refundedCount: refundedAttendees.length,
          checkedIn: allAttendees.filter((a) => a.checkedIn).length,
          diagnostics: {
            refundCollisions,
            duplicateRefundRows,
            refundEvidenceUnavailable,
          },
          attendees: filteredAttendees,
        },
      };
    })
  );

  const failure = results.find((r): r is Extract<PartyResult, { ok: false }> => !r.ok);
  if (failure) {
    console.error("[attendance] attendee list unavailable", failure);
    return NextResponse.json(
      {
        error: `Attendance list unavailable: the ${failure.source} query failed`,
        source: failure.source,
        partyId: failure.partyId,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    events: results.map((r) => (r as Extract<PartyResult, { ok: true }>).value),
  });
}

/**
 * POST handler for guest-list name-based check-in.
 * Updates guest_list_entries status to 'checked_in', and records when and by whom.
 */
export async function POST(request: Request) {
  // Once per handler, same as the GET.
  const auth = await requireDoorOperator();
  if (!auth.ok) return refuse(auth);

  let body: { guestListEntryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { guestListEntryId } = body;
  if (!guestListEntryId) {
    return NextResponse.json(
      { error: "guestListEntryId is required" },
      { status: 400 }
    );
  }

  const serviceClient = getServiceClient();

  // Verify the entry exists and is not already checked in. `maybeSingle`, not
  // `single`: "the row is not there" and "the query failed" are different
  // failures and a 404 for the second one sends the door looking for the wrong
  // problem.
  const { data: entryData, error: fetchError } = await serviceClient
    .from("guest_list_entries")
    .select(
      "id, status, first_name, last_name, checked_in_at, checked_in_by, updated_at"
    )
    .eq("id", guestListEntryId)
    .maybeSingle();

  if (fetchError) {
    console.error("[attendance] guest_list_entries read failed", {
      guestListEntryId,
      message: fetchError.message,
    });
    return NextResponse.json(
      { error: "Could not read the guest list entry" },
      { status: 500 }
    );
  }

  if (!entryData) {
    return NextResponse.json(
      { error: "Guest list entry not found" },
      { status: 404 }
    );
  }

  const entry = entryData as GuestRow & { updated_at: string };

  if (entry.status === "checked_in") {
    // The label is prose; `operatorId` below is the fact. A lookup that failed
    // and a fact that was never written are different statements and get
    // different words.
    let label = OPERATOR_NOT_RECORDED;
    if (entry.checked_in_by) {
      const { data: operator, error: operatorError } = await serviceClient
        .from("profiles")
        .select("id, full_name")
        .eq("id", entry.checked_in_by)
        .maybeSingle();
      if (operatorError) {
        console.error("[attendance] operator lookup failed", {
          guestListEntryId,
          message: operatorError.message,
        });
        label = OPERATOR_LOOKUP_FAILED;
      } else {
        label =
          (operator as { full_name: string | null } | null)?.full_name ??
          OPERATOR_UNKNOWN;
      }
    }

    // Typed against the shared contract, so the three outcome strings live in
    // one place and a divergence is a build error rather than a night at the
    // door. `already_recorded` states a fact and carries no cause: the
    // classification happens afterwards, over `door_scan_events`, never here.
    const alreadyRecorded: Extract<
      DoorOutcome,
      { outcome: "already_recorded" }
    > = {
      outcome: "already_recorded",
      subject: {
        type: "guest_list_entry",
        id: entry.id,
        label: `${entry.first_name} ${entry.last_name}`,
      },
      // `checked_in_at` is NULL on a row checked in before 2026-08-05, when the
      // column did not exist. `updated_at` is that row's last change, and this
      // route is what wrote it — an approximation for legacy rows only, never
      // the clock of the current read, which would claim the entry was recorded
      // just now.
      at: entry.checked_in_at ?? entry.updated_at,
      by: {
        // Empty means no operator was ever recorded, which the label says in
        // words. It is not a placeholder identifier.
        operatorId: entry.checked_in_by ?? "",
        operatorLabel: label,
      },
    };

    // The legacy `error` / `alreadyCheckedIn` fields stay: a staff device can
    // run the old bundle against this API for one session, and that session is
    // a night at the door. The status was already 409 and is now read from the
    // contract's table instead of being written out again.
    return NextResponse.json(
      {
        ...alreadyRecorded,
        error: "Guest already checked in",
        alreadyCheckedIn: true,
      },
      { status: DOOR_HTTP.already_recorded }
    );
  }

  // Update status to checked_in, and record the two facts the third outcome
  // promises: when, and who.
  const now = new Date().toISOString();
  const { error: updateError } = await serviceClient
    .from("guest_list_entries")
    .update({
      status: "checked_in",
      checked_in_at: now,
      checked_in_by: auth.userId,
      updated_at: now,
    })
    .eq("id", guestListEntryId);

  if (updateError) {
    console.error("[attendance] guest check-in write failed", {
      guestListEntryId,
      message: updateError.message,
    });
    return NextResponse.json(
      { error: "Failed to record the guest check-in" },
      { status: 500 }
    );
  }

  const posthog = getPostHogServer();
  posthog.capture({
    distinctId: auth.userId,
    event: "guest_list_checkin",
    properties: {
      guest_list_entry_id: guestListEntryId,
    },
  });

  return NextResponse.json({
    success: true,
    name: `${entry.first_name} ${entry.last_name}`,
    checkedInAt: now,
  });
}
