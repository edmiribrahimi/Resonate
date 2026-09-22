import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";

/**
 * *Was this operator assigned to this night at the moment the code was read?*
 *
 * ── Why this lives here, and not in one route ───────────────────────────────
 *
 * Until 2026-09-22 this function was private to `api/tickets/checkin/route.ts`,
 * and the guest-list route (`api/tickets/attendance`) said in its own docblock
 * that it had "no `judgeAtScanTime`", so a **queued** guest admission from an
 * account that holds the door only by per-night assignment kept the `403` the
 * role arm had given it. That was declared as a limit — and phase 51 turned it
 * into a false refusal: plan 51-15 gave the *Check in* button an offline branch
 * (an invitee without an e-mail cannot be scanned, only found by name), and the
 * first drain from a real phone at the door (`51-ESITI.md`, P-51-1 «dopo», step
 * 7) answered *"Sign in again to record 1 entry"* to a member of staff who had
 * been assigned that very night. A sign-in does not turn anybody into an
 * assignee; asking the question **at scan time** does, and this is that
 * question. Two door routes must answer it identically about the same person
 * on the same night — the reason `require-operator.ts` and `night-arm.ts`
 * exist — so it moved here, **byte for byte**, rather than being copied.
 *
 * Everything below this line is the function as the check-in route wrote it.
 * The paragraphs are kept because each one records a decision that was
 * measured, not assumed.
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
export type ScanTimeJudgement =
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
export async function judgeAtScanTime(
  serviceClient: ReturnType<typeof getServiceClient>,
  partyId: string,
  scannedAt: string,
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
