import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import {
  DOOR_UNRESOLVED_STATUS,
  requireDoorOperator,
  type DoorAuth,
} from "@/lib/door/require-operator";
import { verifyTicketToken } from "@/utils/qr";
import { partyStartInstant } from "@/utils/datetime";
import {
  DOOR_HTTP,
  DOOR_NIGHT_ERROR,
  DOOR_NIGHT_OTHER_NIGHT,
  type DoorFlag,
  type DoorOutcome,
  type DoorScanCause,
  type DoorScanSource,
} from "@/lib/door/outcome";
import { readNightArm } from "@/lib/door/night-arm";
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
 *
 * 5. **A report from the drain is judged at `scannedAt`, never at the moment it
 *    arrives.** ASSIGN-03, plan 35-12, and it is the correction of a live defect
 *    rather than a new feature. A door assignment can be revoked between the
 *    scan and the sync; `requireDoorOperator()` asks *"may this account work the
 *    door NOW"*, so a queued scan came back 403 and `sync-manager.ts:131` filed
 *    it under `blocked` — the bucket that *"waits for a new login"*. **No login
 *    returns a revoked assignment**, so that scan hung in the queue for good and
 *    a person who really walked in never appeared in the night's record. The
 *    403 is therefore no longer the last word for a request carrying both
 *    `source: "offline_sync"` and a `scannedAt`: see {@link judgeAtScanTime}.
 *
 * 6. **The authorisation has two arms, and the second one is asked only after
 *    the first has refused.** ASSIGN-01 says a person assigned to a night may
 *    use that night's tools, and at the door the tool is the scan. The guard
 *    call below asks the ROLE question and nothing else, so a `staff` account
 *    assigned to tonight's door reached the scanner, saw the night in its list,
 *    and then took 403 on every code it read. The second arm — asked in the
 *    handler, answered by {@link readNightArm} — closes that, and its position
 *    is the whole of its safety:
 *
 *      - **The role path does not pay for it.** `master` and `organizer` are
 *        answered by the first arm and never reach the second, so their scan
 *        costs exactly what it cost before: one resolution, no extra round trip,
 *        not one changed byte on the way in.
 *      - **Whoever reaches the second arm has already been refused**, so the
 *        second arm can only leave that refusal standing or overturn it. It can
 *        never make an outcome worse — which is why none of its three refusals
 *        is a 503, and why all three keep the 403 the first arm had already
 *        produced. See the paragraph on the status code in {@link readNightArm}.
 *      - **A queued report never reaches it.** That is not tidiness: the second
 *        arm asks *"is the assignment live NOW"*, and point 5 above exists
 *        because that is the wrong question for a moment in the past. Plan
 *        35-12 measured the specific error — an assignment granted *after* the
 *        scan reads as live at drain time — so the drain keeps going to
 *        {@link judgeAtScanTime} and nowhere else.
 *
 *    Nothing on the online path changed for anyone the first arm admits — a live
 *    scan by an operator with the role gets the same 401, 403 and 503 it always
 *    did, from the same single guard call.
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

/**
 * What the assignment question answered, for a report that arrived from the
 * drain. Tagged by position, and **not one of these five arms is a refusal of
 * the person who was scanned.**
 *
 * `operatorId` rides on the three resolved arms because `door_scan_events.
 * operator_id` is NOT NULL: even the arm that admits nobody has to attribute the
 * row it writes, or the scan would be unrecordable and we would be back to
 * losing it.
 */
type ScanTimeJudgement =
  | { kind: "live"; operatorId: string }
  | { kind: "revoked_after_scan"; operatorId: string }
  | { kind: "never_assigned"; operatorId: string }
  | { kind: "unauthenticated" }
  | { kind: "unresolved" };

/**
 * *Was this operator assigned to this night at the moment the code was read?*
 *
 * ── Why the question moves in time, and why the answer is never a refusal ────
 *
 * The row survives its own revocation: a revocation is an `UPDATE` that sets
 * `revoked_at`, never a `DELETE`
 * (`supabase/migrations/20260809000000_party_assignments.sql:215-221`, which
 * names this drain as the reason). So the table can still answer a question
 * about 01:40 at 03:00, and this function asks exactly that one:
 *
 *   `granted_at <= scannedAt` AND `scannedAt < ends_at` AND
 *   (`revoked_at IS NULL` OR `revoked_at > scannedAt`)
 *
 * The middle clause is ASSIGN-02 — access to a night's tools does not outlive
 * the night — asked at the scan rather than at the sync, which is the same
 * correction as the third clause and would otherwise be the same bug.
 *
 * ── The accepted failure mode of `scannedAt`, written out rather than met ────
 *
 * `scannedAt` is **the phone's clock**. The lexicon is this repository's own —
 * `src/lib/offline/checkin-store.ts:135-136`, *"Device clock at the read.
 * Evidence, not authority"*, and `src/app/api/membership/verify/route.ts:412*
 * says the same thing in its own words. A device whose clock is wrong can
 * therefore make an assignment look live when it was not, or dead when it was.
 *
 * **That is accepted, deliberately, and here is the whole of the reasoning.**
 * The direction of the error on this path is *admit and record*, never *refuse*:
 * `checkin-offline.md` names the false refusal — the one that happens in front
 * of a queue — as the worse of the two failures, and refusing here would lose a
 * presence that really occurred. What a wrong clock can buy is one admission
 * recorded that a stricter reading would have listed as unassigned; what
 * refusing would buy is a person erased from the night. The mitigation is that
 * the anomaly is **visible**: the row carries `scanned_at` and `recorded_at`
 * separately, and the distance between them is readable by anyone reviewing the
 * night. It is not an authorisation boundary and must never be used as one —
 * the boundary for a live scan is still `requireDoorOperator()`, on the server's
 * clock, and this function is reached only when that boundary has already
 * refused **and** the request declared itself a report of something past.
 *
 * ── The service client, and why nothing untrusted reaches it ────────────────
 *
 * `access-gating.md`, gate *service role*. Three values reach the query and each
 * one is accounted for: `operatorId` comes from the resolved session and never
 * from the body; `partyId` has been through `UUID_PATTERN` at the call site;
 * `scannedAt` has been through `Date.parse` and re-emitted by `toISOString()`,
 * so it is `YYYY-MM-DDTHH:mm:ss.sssZ`. All three reach the query only as
 * parameters of `.eq` / `.lte` / `.gt`, never as a hand-built filter string —
 * see the paragraph on the query itself. It is the service client and not the cookie-bound
 * one because the question is about a revoked assignment, and a subject whose
 * assignment has been revoked is precisely the subject a live-assignment policy
 * would stop from reading the row that proves they once had it.
 *
 * ── Never a `false` standing in for an unanswered question ──────────────────
 *
 * Both failure arms are `unresolved`, never `never_assigned`. `unresolved` is
 * not `false`: the caller answers 503, which `sync-manager.ts:141` puts in the
 * **retry** bucket, so the entry is tried again when the answer is available
 * instead of being retired on a question nobody answered.
 */
async function judgeAtScanTime(
  serviceClient: ReturnType<typeof getServiceClient>,
  partyId: string,
  scannedAt: string
): Promise<ScanTimeJudgement> {
  let operatorId: string | null;

  // The subject, and only the subject. `requireDoorOperator()` is still called
  // exactly once in this handler — its `forbidden` arm does not carry a user id,
  // and `door_scan_events.operator_id` is NOT NULL, so the id has to come from
  // somewhere. One RPC, and only on this path: a drain report from an account
  // the role grant does not cover. A live scan never reaches this line.
  try {
    operatorId = (await getAccessContext()).userId;
  } catch (error) {
    // Entered by POSITION, and the error is never parsed: Next redacts
    // server-side messages in a production build. Its own category, so it is
    // distinguishable from the read below.
    console.error("[door.assignment_subject_unresolved]", error);
    return { kind: "unresolved" };
  }

  // The 403 came back and there is no subject at all — the session went away
  // between the two reads. Answered as 401 by the caller, which is `blocked`,
  // which is the bucket a sign-in genuinely does clear.
  if (!operatorId) return { kind: "unauthenticated" };

  // Two of the three clauses in the filter, and the third — the revocation —
  // deliberately NOT here.
  //
  // `.or("revoked_at.is.null,revoked_at.gt.<iso>")` was written first and then
  // refused. A PostgREST `or` string is parsed as `column.operator.value` on
  // dots and commas, and an ISO instant carries both a `:` and a `.`; the
  // repository's only precedent for `.or()`
  // (`api/tickets/attendance/route.ts:247`) passes a uuid, which has neither, so
  // it is no precedent at all for this. Getting the quoting wrong would not
  // fail loudly — it would silently match nothing, and matching nothing here
  // reads as *"nobody was ever assigned"*, which is the wrong answer arriving
  // with a confident face. So the comparison happens below, in code that can be
  // read, and the query is left using only the three primitives this repository
  // already exercises.
  //
  // No `limit`, and no ordering that could hide a row: the scope is ONE night ×
  // ONE person × ONE capability, so the result is the number of times that
  // person was assigned and revoked for that single night. A `limit(1)` here
  // could return a revoked row and hide a live one beside it.
  const { data, error } = await serviceClient
    .from("party_assignments")
    .select("id, revoked_at")
    .eq("party_id", partyId)
    .eq("user_id", operatorId)
    .eq("capability", "door.operate")
    .lte("granted_at", scannedAt)
    .gt("ends_at", scannedAt);

  if (error) {
    // Includes the case that is true in production **today**: this table is row
    // 7 of the hand-applied queue in `35-HUMAN-UAT.md` and does not exist yet,
    // so this read answers `42P01`. That is `unresolved` and not "no assignment"
    // — the queue entry is retried rather than retired on a table that is about
    // to appear.
    console.error("[door.assignment_history_unreadable]", {
      partyId,
      scannedAt,
      code: error.code ?? "unknown",
    });
    return { kind: "unresolved" };
  }

  const rows = data ?? [];
  if (rows.length === 0) return { kind: "never_assigned", operatorId };

  // `Date.parse` on both sides, never a string comparison. PostgREST renders a
  // `timestamptz` as `2026-08-09T02:30:00+00:00` while `scannedAt` has been
  // re-emitted by `toISOString()` as `...Z`, so `>` on the two strings compares
  // `+` against `Z` and answers confidently wrong. This is the same class of
  // defect as `src/utils/datetime.ts`'s reason for existing, one layer up.
  const scannedAtMs = Date.parse(scannedAt);
  let sawRevokedAfterScan = false;

  for (const row of rows) {
    if (row.revoked_at === null) return { kind: "live", operatorId };

    const revokedMs = Date.parse(row.revoked_at as string);
    if (Number.isNaN(revokedMs)) {
      // A revocation with a timestamp nothing can read. It is not "revoked
      // before" and it is not "revoked after" — it is *unknown*, and an unknown
      // must not collapse into either answer. Retryable, and its own category.
      console.error("[door.assignment_revocation_unreadable]", {
        partyId,
        assignmentId: row.id,
      });
      return { kind: "unresolved" };
    }

    if (revokedMs > scannedAtMs) sawRevokedAfterScan = true;
  }

  // No live row, but at least one that was still live when the code was read.
  // That is outcome 2: the scan resolves, and it is marked.
  if (sawRevokedAfterScan) return { kind: "revoked_after_scan", operatorId };

  // Every row in the window had already been revoked by `scannedAt`. Same answer
  // as no row at all — the assignment did not cover that moment.
  return { kind: "never_assigned", operatorId };
}

/**
 * ── Where the second arm went, and what stayed ───────────────────────────────
 *
 * The three refusal VALUES now live in `@/lib/door/outcome.ts` and the answering
 * of the per-night question in `@/lib/door/night-arm.ts` ({@link readNightArm}).
 *
 * They were coined in this file by plan 35-22, which wrote the reason beside
 * them: *"coined here and not in `@/lib/door/outcome.ts` because this plan owns
 * one file"*. That reason expired when the guest-list check-in
 * (`api/tickets/attendance`, its POST) turned out to need the same appeal — the
 * third door route asking the same question. Two copies of it would be two
 * answers waiting to disagree about the same person on the same night, which is
 * precisely what `require-operator.ts` exists to make impossible.
 *
 * **What did NOT move is the call.** `requireDoorOperator({ partyId })` is still
 * asked inline in the handler below. The standing check on this file measures by
 * line number that the role form of the guard is called before the per-night
 * form, and a helper that made the call would be hoisted: it would read
 * correctly and measure backwards. The asking stays where the order is visible.
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

    // The 401 and the 503 keep the exact body and code they have always had, and
    // they are answered here, before anything is read. `unresolved` is
    // deliberately neither a refusal nor a failure: it says the permission could
    // not be *looked up*, which is not the same statement as "not permitted", and
    // 503 puts it in the sync manager's retryable bucket (`sync-manager.ts:141`)
    // rather than its blocked one (`:131`).
    //
    // **The 403 is not answered here any more, and that is point 5 of the file
    // comment.** A report from the drain is about a moment that has already
    // happened, and the question this guard asked — *may this account work the
    // door now* — is the wrong one for it. So the body is parsed first, and the
    // 403 is answered below, unchanged, for everything that is not such a report.
    if (!auth.ok && auth.kind !== "forbidden") {
      return NextResponse.json(
        {
          valid: false,
          status:
            auth.kind === "unauthenticated"
              ? "unauthorized"
              : DOOR_UNRESOLVED_STATUS,
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

    // --- Evidence, not authority ----------------------------------------------
    // The device clock says when the phone read the code. It is stored as
    // evidence, and the ONE decision it now takes part in is the assignment
    // question below — which is a question about the past, has no other source
    // of truth, and can only ever admit-and-record. It still decides nothing
    // about the night's boundaries: a backdated `scannedAt` must not be able to
    // place a scan before the night began, and the one before/after decision on
    // the refund path compares two server-side values.
    const deviceScannedAt =
      typeof body.scannedAt === "string" &&
      !Number.isNaN(Date.parse(body.scannedAt))
        ? new Date(body.scannedAt).toISOString()
        : null;

    const source: DoorScanSource =
      body.source === "offline_sync" ? "offline_sync" : "online";

    /**
     * A report of something that already happened, as opposed to a scan taking
     * place right now.
     *
     * Both halves are required, and neither alone would do. `source` alone is a
     * claim in the body and carries no moment to judge at; a `scannedAt` alone
     * arrives on an online scan too, where the guard's *now* is the right
     * question and the answer must not be softened. Together they are the only
     * shape `sync-manager.ts:190-199` produces.
     */
    const isQueuedReport = source === "offline_sync" && deviceScannedAt !== null;

    /**
     * The night, shape-checked HERE and not only below, because the refusal
     * beneath this has to know whether there is a night to appeal to.
     *
     * The predicate is character for character the one that used to live at the
     * `--- The night ---` block, and that block still owns the refusal: a caller
     * who names no night, or names a malformed one, is answered exactly where it
     * always was and with exactly what it always got. Nothing is decided here.
     */
    const namedNight =
      typeof body.partyId === "string" && UUID_PATTERN.test(body.partyId.trim())
        ? body.partyId.trim()
        : null;

    // The 403, byte for byte the answer it has always been, for a caller with no
    // night to appeal to and for nothing else. Reached before the party lookup,
    // so a refused caller still costs one round trip and reads nothing.
    //
    // The added condition is the whole of point 6: a refused caller who DID name
    // a night falls through to the second arm a few lines down, which either
    // overturns this refusal or reissues it with a cause of its own. It cannot
    // do anything else — the refusal is already in hand at this line.
    if (!auth.ok && !isQueuedReport && namedNight === null) {
      return NextResponse.json(
        { valid: false, status: "forbidden", error: auth.error },
        { status: auth.status }
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
    if (namedNight === null) {
      return NextResponse.json(
        { outcome: "not_valid", reason: "no_party_selected", valid: false, status: "no_party_selected" },
        { status: DOOR_HTTP.not_valid }
      );
    }

    /**
     * ONE name for the night, from here down.
     *
     * It is the value handed to the second arm, the value `respond()` writes
     * into `door_scan_events.party_id`, and the value a ticket's own night is
     * compared against below. **That single identity is the night-to-subject
     * binding on this route**, and it is why an assignee cannot name their own
     * night and act on another one: there is no second night to act on. The
     * rule `bindNightToSubject` enforces in `undo/route.ts` — the named night
     * must be the subject's, or a night of the subject's event — is enforced
     * here by `wrongParty || wrongEvent` further down, against this same value,
     * for every caller and not only for an assignee.
     *
     * Keep it that way. If a future edit resolves the night from the ticket
     * instead of from the body, the guard above will have answered about one
     * night while the row is written about another, which is precisely the hole
     * plan 35-11 found and closed on the undo route.
     */
    const partyId = namedNight;

    /**
     * ── The second arm ───────────────────────────────────────────────────────
     *
     * Asked only when the role arm has refused, and only for a request that is
     * not a report from the drain. Both halves of that condition are load-bearing
     * and point 6 of the file comment holds the reasons: the role path must not
     * pay a round trip it does not need, and a queued report must keep being
     * judged at `scannedAt` by {@link judgeAtScanTime} rather than at *now*.
     *
     * It sits **before** `getServiceClient()`, so a refusal from it has touched
     * nothing — same discipline as the supervision gate in `undo/route.ts`.
     */
    let nightGrant: { partyId: string; operatorId: string } | null = null;

    if (!auth.ok && !isQueuedReport) {
      // THE per-night question, asked here and nowhere else. Inline rather than
      // inside {@link readNightArm} so that the two forms of the guard are in
      // the file in the order they run — see the note at the top of that
      // function for why a hoisted helper would have hidden it.
      let perNight: DoorAuth | null;
      try {
        perNight = await requireDoorOperator({ partyId });
      } catch (error) {
        // Entered by POSITION; the error is never parsed (CR-01).
        console.error("[door.night_arm_threw]", error);
        perNight = null;
      }

      const arm = await readNightArm(perNight);

      if (!arm.granted) {
        // The refusal the role arm had already produced, reissued with a cause
        // of its own. Same status, so nobody's outcome moved; a distinct
        // `status` value and a distinct sentence, so the operator at the door
        // can tell "not assigned at all" from "wrong night selected" from "the
        // question could not be asked".
        return NextResponse.json(
          { valid: false, status: arm.status, error: arm.error },
          { status: arm.http }
        );
      }

      nightGrant = { partyId, operatorId: arm.operatorId };
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

    /**
     * The grant is scoped to the night it was granted for, checked against the
     * row that will actually be written.
     *
     * **Unreachable today, and written as a branch anyway** — the same shape and
     * the same reason as the third arm of the judgement below. `party` is read
     * `.eq("id", partyId)`, so the two are equal by construction *right now*;
     * this line exists so that they cannot stop being equal quietly. The edit
     * that would break it is a plausible one — *"resolve the party from the
     * ticket, so an event-level ticket lands on its own night"* — and it would
     * silently turn a grant for night X into a row on night Y, which is the hole
     * plan 35-11 found live on the undo route.
     *
     * A refusal, not a 500: if the two ever disagree, the caller is somebody who
     * was refused by the role arm and is being admitted on the strength of an
     * assignment to a different night. The safe answer is the one the role arm
     * had already given.
     */
    if (nightGrant !== null && nightGrant.partyId !== party.id) {
      console.error("checkin:night_grant_mismatch", {
        granted: nightGrant.partyId,
        writing: party.id,
      });
      return NextResponse.json(
        {
          valid: false,
          status: DOOR_NIGHT_OTHER_NIGHT,
          error: DOOR_NIGHT_ERROR[DOOR_NIGHT_OTHER_NIGHT],
        },
        { status: 403 }
      );
    }

    const eventTitle =
      (party.events as unknown as { title: string } | null)?.title || "";

    // `"unknown"` rather than a refusal: refusing would strand a queued entry
    // written by an older bundle that had no device id, and a stranded entry is
    // a scan nobody ever sees again. The cost is that such a row cannot be
    // classified `two_devices` afterwards.
    const deviceId =
      typeof body.deviceId === "string" && body.deviceId.trim() !== ""
        ? body.deviceId.trim()
        : "unknown";

    // --- Who recorded this, and whether the assignment outlived the scan -------
    //
    // Four outcomes reach the lines below, and **none of them is a refusal of
    // the person who was scanned**:
    //
    //   1. the role arm said yes — exactly as before any of this;
    //   2. the role arm said no and the SECOND arm said yes: an operator
    //      assigned to this night, scanning it live. This is ASSIGN-01 at the
    //      door, and it is the half plan 35-12 named and could not close;
    //   3. the role arm said no, this is a queued report, and the assignment was
    //      live at `scannedAt` and has been revoked since. The scan is recorded,
    //      and the answer carries `assignmentRevokedAfterScan` so the drain can
    //      file it as resolved under its own name;
    //   4. the role arm said no, this is a queued report, and no assignment ever
    //      covered that moment. Handled just below `respond()`, because it still
    //      writes a row.
    //
    // Outcomes 2 and 3 do not overlap, and the ORDER below is what keeps them
    // apart: the second arm never runs for a queued report, so a report from the
    // drain still reaches `judgeAtScanTime` and is still judged at `scannedAt`.
    // Letting the second arm answer a queued report would readmit the exact
    // error plan 35-12 measured — an assignment granted *after* the scan reads
    // as live at drain time.
    let judgement: ScanTimeJudgement;
    if (auth.ok) {
      judgement = { kind: "live", operatorId: auth.userId };
    } else if (nightGrant !== null) {
      // Outcome 2. The subject comes from the same resolution that granted, so
      // no extra call to the Auth server for an id we already hold, and
      // `operator_id` — NOT NULL — is attributed to the account that really
      // scanned.
      judgement = { kind: "live", operatorId: nightGrant.operatorId };
    } else if (deviceScannedAt !== null) {
      judgement = await judgeAtScanTime(serviceClient, partyId, deviceScannedAt);
    } else {
      // Unreachable, still: `isQueuedReport` requires a `deviceScannedAt`, and
      // everything that is NOT a queued report has by now either been refused
      // (the 403 with no night, or the second arm's own refusal) or granted, in
      // which case `nightGrant` is set and the arm above took it. Written as a
      // fourth arm rather than as a non-null assertion, because an assertion
      // here would be a promise and this is a check — and because if either
      // refusal above is ever edited, the failure lands on the recoverable
      // outcome (503, the retryable bucket) instead of on a crash inside a
      // `try` that answers 500 to a scan.
      console.error("checkin:queued_report_without_scanned_at", { partyId });
      judgement = { kind: "unresolved" };
    }

    if (judgement.kind === "unauthenticated") {
      return NextResponse.json(
        { valid: false, status: "unauthorized", error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (judgement.kind === "unresolved") {
      // `unresolved` is not `false`. 503 is the retryable bucket, and it is the
      // same code `respond()` already uses for a scan that could not be written,
      // so the drain's handling of it is exercised rather than new.
      return NextResponse.json(
        {
          valid: false,
          status: DOOR_UNRESOLVED_STATUS,
          error:
            "Could not check this device's door assignment for that night — this is not a refusal. It will be reported again.",
        },
        { status: 503 }
      );
    }

    /**
     * Who is holding the phone, hoisted out of the tagged union deliberately.
     *
     * `respond()` below is a nested **function declaration**, and TypeScript
     * drops the narrowing of a tagged union inside one — declarations are
     * hoisted, so the compiler cannot know the guard ran first. That is why the
     * code this replaces reached for a non-null assertion at that same line: the
     * `!` was paying for this exact limitation, not for a genuinely nullable
     * subject.
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
    const operatorId: string = judgement.operatorId;

    /**
     * The marker for outcome 2, and why it is a field of the answer rather than
     * a column of the row.
     *
     * `door_scan_events.cause` is a closed `CHECK` set in a migration that is
     * **already applied in production**, and point 4 of the file comment is the
     * stronger reason not to reach for it anyway: at the door the row states a
     * fact, and classification happens afterwards, over `door_scan_events`. This
     * is a classification, and it is derivable from evidence that is already
     * complete and cannot be erased — the row carries `operator_id`, `party_id`,
     * `scanned_at`, `recorded_at` and `source`, and `party_assignments` keeps the
     * revocation as an `UPDATE`, never a `DELETE`. A reviewer joining the two
     * sees it; nothing had to be invented for them to.
     *
     * So the field travels in the **answer**, where it has a reader that exists
     * today: `sync-manager.ts` classifies it as `done` under its own `via`, which
     * is the difference between the night's queue saying *"reported"* and saying
     * *"reported, and the assignment behind it had already been taken away"*.
     * It is not a `DoorFlag`: flags are rendered at the door by `FLAG_MESSAGE`,
     * and by the time a drain runs there is no door and nobody standing at it.
     */
    const assignmentRevokedAfterScan = judgement.kind === "revoked_after_scan";

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
        {
          ...outcome,
          ...legacyStatus,
          ...legacy,
          // Additive, and only when true. An absent field and `false` mean the
          // same thing to every reader, and an older bundle that has never heard
          // of it ignores it exactly as it ignores the fields it does not know —
          // the same additive-for-one-release discipline as `LegacyFields` above,
          // in the other direction.
          ...(assignmentRevokedAfterScan
            ? { assignmentRevokedAfterScan: true }
            : {}),
        },
        { status: DOOR_HTTP[outcome.outcome] }
      );
    }

    // --- Outcome 3: no assignment ever covered that moment ---------------------
    //
    // The scan is **not lost**, and it is **not admitted either**. It is written
    // into the night's record as `not_valid` with its own reason, and the queue
    // entry leaves for `failedCheckins`, where the phone shows a count somebody
    // reads. Before this plan the same request came back 403 and the entry went
    // to `blocked` — which waits for a new login, and no login turns anybody into
    // an assignee. Waiting for a remedy that cannot arrive is not a third answer:
    // it is the scan disappearing quietly, which is the one outcome the queue
    // exists to prevent.
    //
    // It is `dead` in the drain and not `retry` for the same reason it is not
    // `blocked`: the condition will not become true on a later attempt, and a
    // retry loop with no ceiling is what `MAX_SYNC_ATTEMPTS` exists to refuse.
    //
    // Placed here, after `respond()`, because it has to write the row: the whole
    // difference between this and the 403 is that a row now exists.
    if (judgement.kind === "never_assigned") {
      console.warn("checkin:no_assignment_at_scan", {
        partyId,
        scannedAt,
        deviceId,
        source,
      });
      return respond(
        { outcome: "not_valid", reason: "no_assignment_at_scan" },
        { ticket_id: null, subject_user_id: null, cause: null },
        { event_title: eventTitle, party_title: party.title || "" }
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
