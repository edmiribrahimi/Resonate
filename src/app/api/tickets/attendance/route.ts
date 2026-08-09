import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { CAP } from "@/lib/capabilities/keys";
import { getPostHogServer } from "@/lib/posthog/server";
import {
  DOOR_HTTP,
  type DoorOutcome,
  type DoorSubjectType,
} from "@/lib/door/outcome";
import {
  DOOR_UNRESOLVED_ERROR,
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
 * The shape a night identifier must have before it reaches the door guard.
 *
 * Same literal as `src/app/api/tickets/checkin/undo/route.ts:23-24`,
 * `src/lib/capabilities/server.ts` and `src/lib/door/require-operator.ts` —
 * copied rather than reinvented, because four regexes for one shape are four
 * answers waiting to disagree.
 *
 * It is checked HERE, in the route, rather than left to the guard: with a
 * `partyId` the guard **throws** `door.invalid_party_id` on a malformed id and
 * says in its `@throws` note why — a permanent caller fault laundered into the
 * retryable 503 bucket would be retried for the rest of the night
 * (`sync-manager.ts:141`). The route owns validating its own input and
 * answering 400.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The door's verdict, as the device receives it — ASSIGN-08.
 *
 * ── Why it rides on this response and not on a fourth call ───────────────────
 *
 * This is the request the scanner makes when it opens a night
 * (`ScannerClient.tsx:486`), and it already costs one authorisation. Resolving
 * the verdict here means the device learns *what it may do tonight* for **zero
 * extra round trips**, and never asks again for the rest of the session: N
 * scans cost N check-in calls and no authorisation call at all.
 *
 * That is not an optimisation, it is the requirement. `require-operator.ts`
 * measured the thing that makes it one: **`cache()` does not memoise inside a
 * Route Handler** — three calls ran the body three times, in `next dev` and in
 * a production build alike. A second resolution is therefore a second network
 * round trip on a phone with one bar, in front of a queue, and **no compiler
 * will ever see it**.
 *
 * ── Decided by POSITION, never by message ────────────────────────────────────
 *
 * Every field here is a value at a fixed key. Next redacts server-side error
 * messages in production builds (CR-01), so a device that had to parse prose to
 * learn a category would work in `next dev` and stop working where it matters.
 */
interface DoorAuthorisation {
  /** May scan tonight — by ROLE **or** by an assignment to this night. The two are one verdict here. */
  mayScan: boolean;
  /** ASSIGN-05: may **reverse** an admission. A separate key (`door.supervise`), never a flag on the first. */
  maySupervise: boolean;
  /**
   * When this night ends, as an instant — ASSIGN-02, and a **courtesy of the
   * interface**.
   *
   * It decides **what is drawn**, never **what is permitted**, and it is never
   * a reason to drop anything from the queue. The boundary is on the server, in
   * the resolver's predicate (`now() < pa.ends_at`, the server's clock, which
   * no device can move). A cache may stop trusting itself at this instant; a
   * scan already queued is evidence of something that happened and outlives it.
   *
   * `null` when the night declares no end — and `null` is **not** invented into
   * an expiry, because `event_parties.end_time` is nullable and a fabricated
   * one would be shown to staff as a fact.
   */
  validUntil: string | null;
  /**
   * The **server's** clock at the moment the verdict was resolved.
   *
   * It is here so the device can **measure the drift of its own clock instead
   * of trusting it**: a phone twenty minutes fast at 02:00 must not expire a
   * verdict twenty minutes early. A device clock is evidence, never authority —
   * `src/app/api/membership/verify/route.ts:412`, and the same lexicon in
   * `checkin-store.ts:135-136`.
   */
  resolvedAt: string;
}

/**
 * The four fields, built from the verdict that has ALREADY been resolved.
 *
 * Takes the resolved arm rather than resolving again, for the reason written
 * out above and in `refuse` — the same discipline, on the other branch.
 */
function doorAuthorisation(
  auth: Extract<DoorAuth, { ok: true }>
): DoorAuthorisation {
  return {
    mayScan: auth.mayScan,
    maySupervise: auth.maySupervise,
    validUntil: auth.validUntil,
    resolvedAt: auth.resolvedAt,
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ADMISSION SET OF THE NIGHT LIST — one field more per row, never one row
 * fewer. This is the load-bearing paragraph of this file; read it before
 * touching the branch below.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The night list is **the first thing the scanner loads**
 * (`ScannerClient.tsx:464`, before any night is chosen), and an empty list at
 * the door **is a refusal** — the staff sees no night to open and nobody gets
 * in. `checkin-offline.md` names the false refusal, the one that happens in
 * front of a queue, as the worse of the two failures, and this repository has
 * already made the same call for the twin case: `membership/list/route.ts:45-52`
 * admits on `membership_code` alone and reads neither role nor status,
 * deliberately, because *"adding a status test would create a NEW way to refuse
 * somebody at the door"*.
 *
 * So the rule here, and it is a rule and not a preference:
 *
 *   * Whoever holds `door.operate` **by role** sees every night from the window
 *     onward, **exactly as before**. Zero rows fewer, for anybody who had them.
 *   * Whoever does **not** hold it by role but holds a live per-night
 *     assignment sees the nights they are assigned to. That set is empty today —
 *     without the role they were refused 403 before reaching this line — so the
 *     change is **purely additive**: it gives rows to somebody who had none.
 *
 * **What was deliberately NOT done.** The obvious-looking move is to narrow the
 * list to "the nights you are assigned to" for everyone. That is option (b) of
 * `35-RESEARCH.md` § T-5 turned inside out, and it fails in the direction this
 * product refuses: it takes nights away from people who can work them, and it
 * discovers the mistake at 02:00 on a phone with an empty list.
 *
 * **And the case to enumerate by name, because it is the one that will show up
 * first:** a person with a live assignment and no role that confers
 * `door.operate` must get a NON-EMPTY list. If the assignment read fails, the
 * answer is **not** an empty list — it is a distinct, retryable outcome with its
 * own log category, so an error can never wear the costume of "nobody is on
 * tonight". That disguise is precedent CR-02, and the newsletter form recorded
 * in `.planning/codebase/CONCERNS.md` is the same defect one product surface
 * over.
 */
type AssignmentProbe =
  | { ok: true; partyIds: Set<string> }
  | { ok: false };

/**
 * Which nights the CURRENT session holds a live `door.operate` assignment on.
 *
 * ── The client is the cookie-bound one, and that is the whole safety of it ───
 *
 * `party_assignments_select_own` is `USING (user_id = (select auth.uid()))`
 * (`20260809000000_party_assignments.sql:549-550`), so this query answers about
 * the caller and has no way to name anybody else. The service client would
 * bypass that policy and return every assignment in the database — which is why
 * it is not used here even though the rest of this route holds one.
 *
 * ── Liveness mirrors the resolver's arm 2, and is not a boundary ─────────────
 *
 * `revoked_at is null` is ASSIGN-03 — a revocation is a row that was UPDATED,
 * never one that was removed — and it is pushed to the database. `now() <
 * ends_at` is ASSIGN-02 and is applied here, in TypeScript, against this
 * runtime's clock rather than the database's.
 *
 * That difference is stated rather than hidden. It is not an authorisation
 * boundary: the boundary is `now() < pa.ends_at` inside
 * `private.has_capability`, on the database's own clock, evaluated again when
 * the scanner actually opens the night. This list only decides what is
 * **offered**, and the two clocks in question are both servers within a second
 * of each other, against an `ends_at` that falls at 06:00 — the hour the door is
 * already shut.
 *
 * ── It costs a round trip only for somebody who gets nothing today ──────────
 *
 * It is issued **only** on the branch that currently answers 403 with no list at
 * all. A role holder never reaches it, so the door path everyone uses today
 * costs exactly what it cost before.
 */
async function liveDoorAssignments(): Promise<AssignmentProbe> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("party_assignments")
    .select("party_id, ends_at")
    .eq("capability", CAP.DOOR_OPERATE)
    .is("revoked_at", null);

  if (error) {
    // Its own category, and only `error.code`. The message is not logged and
    // not returned: a PostgREST message can carry the shape of the query and
    // this response reaches a phone. A code is enough to tell a missing
    // migration from a policy refusal from a dead connection.
    console.error(
      `[attendance.assignments_lookup_failed] could not read party_assignments ` +
        `for the night list: ${error.code ?? "unknown"}. This is NOT "no ` +
        `assignments" and must never be answered with an empty list.`
    );
    return { ok: false };
  }

  const now = Date.now();
  const rows = (data ?? []) as { party_id: string; ends_at: string }[];

  return {
    ok: true,
    partyIds: new Set(
      rows.filter((r) => Date.parse(r.ends_at) > now).map((r) => r.party_id)
    ),
  };
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
  /**
   * How this row was reached — *"un campo in piu' per riga, non una riga in
   * meno"*.
   *
   *   * `false` — by ROLE. The row would have been here before this plan too.
   *   * `true`  — by a live per-night assignment, and by nothing else. The
   *     interface can mark it, and can avoid offering a night it will then be
   *     refused on once the assignment expires.
   *   * `null`  — **not determined**, which is not `false`. On the single-night
   *     branch the guard resolves role and assignment as ONE union verdict and
   *     does not distinguish them; asking a second time to find out would be the
   *     round trip this whole plan exists to avoid. A fabricated `false` would be
   *     a claim nobody measured.
   *
   * Present on every row rather than omitted where unknown, following the rule
   * `refundedAt` already sets in this file: the device must never have to
   * distinguish *absent* from *false*.
   */
  reachedByAssignment: boolean | null;
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

  // T-35-47. The `partyId` on the query string is untrusted input, and it is
  // checked before it can reach either the guard or PostgREST. See UUID_PATTERN
  // for why a malformed id is a 400 here and not one of the guard's four
  // outcomes.
  if (partyIdFilter !== null && !UUID_PATTERN.test(partyIdFilter)) {
    return NextResponse.json(
      { error: "partyId must be a uuid" },
      { status: 400 }
    );
  }

  // Once per handler, and with the night NAMED when there is one. This is the
  // request the door makes before the radio goes off, so a round trip saved
  // here is a round trip saved on a weak signal — and naming the night here is
  // what lets the verdict ride home on this response instead of costing a
  // fourth call. `cache()` does not memoise inside a Route Handler: a second
  // call to the door guard would be a second full round trip, and no compiler
  // would see it. The literal is not spelled out again on purpose — the plan's
  // check counts occurrences of it in this file, and a check that has to be
  // read around is a check that gets ignored the third time it goes red.
  const auth = await requireDoorOperator(
    partyIdFilter ? { partyId: partyIdFilter } : undefined
  );
  // ── Who is admitted, and to how much ─────────────────────────────────────
  //
  // Read the admission-set paragraph above `liveDoorAssignments` before
  // changing a line of this. `null` means **reached by role** — every night,
  // exactly as before this plan, zero rows fewer. A Set means **reached by
  // assignment** and holds the only nights this session may open.
  let assignedPartyIds: Set<string> | null = null;

  if (!auth.ok) {
    // A NAMED night has already had the assignment question asked of it: the
    // guard's per-night form unions what the role confers with what a live
    // assignment on that night confers, so a refusal there is a real refusal.
    // Only the LIST branch has a second question left to ask, because a list
    // names no night and the guard therefore answered on role alone.
    if (partyIdFilter || auth.kind !== "forbidden") return refuse(auth);

    const probe = await liveDoorAssignments();

    if (!probe.ok) {
      // NOT an empty list, and NOT a 403. *"Could not find out"* is its own
      // outcome and keeps its own shape: 503 lands in the retry bucket
      // (`sync-manager.ts:141`) instead of the blocked one a 403 would reach,
      // which signing in again would never clear. `DOOR_UNRESOLVED_STATUS` is
      // the value the device already knows, so nothing new has to be taught to
      // a bundle already in the field.
      return NextResponse.json(
        {
          error: DOOR_UNRESOLVED_ERROR,
          status: DOOR_UNRESOLVED_STATUS,
          source: "party_assignments",
        },
        { status: 503 }
      );
    }

    // No role and no live assignment is the refusal it has always been — same
    // 403, same body, same words. Nobody who is refused today is refused
    // differently.
    if (probe.partyIds.size === 0) return refuse(auth);

    assignedPartyIds = probe.partyIds;
  }

  // Built from the verdict already resolved above — never a second question.
  // Additive: it is a new key beside `events`, and no existing key changes name,
  // type or meaning. A staff device may run the previous bundle against this API
  // for a whole session, and that session is a night at the door.
  //
  // **Absent, never `false`**, on the one branch where there is no single
  // verdict to report: reached by assignment alone, *"may I scan"* has no answer
  // that is not per-night. The answer arrives on the request that names a night,
  // which is the request the scanner makes when it opens one.
  const doorAuth = auth.ok ? doorAuthorisation(auth) : undefined;
  const envelope = doorAuth ? { doorAuth } : {};

  const serviceClient = getServiceClient();

  // ── The window opens YESTERDAY, and that is a repair rather than a widening ─
  //
  // A night is filed under the date it STARTS and runs to 06:00 the morning
  // after (`party_end_instant`, and `src/utils/datetime.ts` for the same rule in
  // TypeScript). `new Date().toISOString()` is the **UTC** calendar date, so
  // from 00:00 UTC — 02:00 in Turin in summer — the night IN PROGRESS carries a
  // `date` strictly before it, and a `gte("date", today)` dropped it.
  //
  // The consequence was the one this file exists to avoid: a device that
  // reloads at 02:30 — a crash, a flat battery, a second phone arriving late —
  // found an empty list during the four hours the door is busiest, and an empty
  // list at the door is a refusal. One day back puts the night in progress
  // inside the window at every hour of it.
  //
  // It only ADDS rows. Nobody loses one.
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Fetch the night in progress and the upcoming ones, with their events
  let partiesQuery = serviceClient
    .from("event_parties")
    .select("id, title, date, time, event_id, events(title)")
    .gte("date", windowStart)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  // If partyId filter provided, only fetch that party
  if (partyIdFilter) {
    partiesQuery = partiesQuery.eq("id", partyIdFilter);
  }

  const { data: parties, error: partiesError } = await partiesQuery;

  if (partiesError) {
    // This error was DISCARDED before this plan — the destructuring took `data`
    // only — and the handler fell through to `{ events: [] }` with a 200. That
    // is a read failure wearing the costume of *"no nights tonight"*, which is
    // precedent CR-02 and the newsletter form of `CONCERNS.md` one surface over.
    // It now has its own category and a status that says a failure happened.
    console.error(
      `[attendance.parties_lookup_failed] could not read event_parties for the ` +
        `night list: ${partiesError.code ?? "unknown"}. This is NOT "no nights ` +
        `tonight".`
    );
    return NextResponse.json(
      { error: "Could not read the list of nights", source: "event_parties" },
      { status: 500 }
    );
  }

  // Narrowed to a const so the closure below keeps the narrowing.
  const assigned = assignedPartyIds;

  // The ONLY place the list is narrowed, and it narrows a set that was empty
  // before this plan: without the role, this session never reached this line.
  const visibleParties = assigned
    ? (parties ?? []).filter((p) => assigned.has(p.id))
    : (parties ?? []);

  /**
   * Per row by design even though it is uniform per request today: a role
   * holder who also carries assignments still reaches every row BY ROLE, and
   * the field says what is true of the row rather than of the account.
   */
  const reachedByAssignment: boolean | null = partyIdFilter
    ? null
    : assigned !== null;

  if (visibleParties.length === 0) {
    return NextResponse.json({ events: [], ...envelope });
  }

  const results: PartyResult[] = await Promise.all(
    visibleParties.map(async (party): Promise<PartyResult> => {
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
          reachedByAssignment,
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
    ...envelope,
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
