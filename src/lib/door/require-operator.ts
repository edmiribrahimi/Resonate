import { CAP } from "@/lib/capabilities/keys";
import {
  getAccessContext,
  getPartyAccessContext,
  type AccessContextResult,
} from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { partyEndInstant } from "@/utils/datetime";

/**
 * The one door authorisation. Four routes ask it, and only it.
 *
 * Before this module there were four copies of one predicate — `checkin`,
 * `checkin/undo`, `tickets/attendance` and `membership/verify` each carried
 * their own `verifyOrganizerRole()`, and `membership/list` a fifth inline copy.
 * `src/app/api/tickets/checkin/route.ts` said in as many words why that was
 * dangerous: *"the same person refused by one scanner and admitted by another,
 * on the same night, is undiagnosable with no error tracking anywhere in this
 * repository."* Four copies cannot be kept identical by intention. One function
 * cannot diverge at all, which is the strongest available form of that
 * requirement.
 *
 * ── The question is `door.operate`, and role alone ───────────────────────────
 *
 * *"May this person work the door tonight."* Not *"are they approved"*.
 *
 * `keys.ts:65-66` names `door.operate` for exactly the middleware
 * `/admin/scanner` rule and these routes, ROLE ALONE. Its two grant rows in
 * `private.role_capabilities` carry `requires_approved = false`, and
 * `supabase/migrations/20260807000000_capability_model.sql:416-417` comments
 * *"These two rows must not become true."*
 *
 * **There is no status test in this file, and adding one would be a defect.**
 * A `pending` organizer refused by the scanner at two in the morning cannot
 * admit anyone at all; `checkin-offline.md` names the false refusal — the one
 * that happens in front of a queue — as the worse of the two failures. The hole
 * a status test would close is already closed at its source, in
 * `updateMemberRole` (`src/app/(admin)/admin/members/actions.ts`), which sets
 * `status = 'approved'` when it grants the organizer role. The unevenness
 * between the two axes here is the decision, not an oversight to tidy up.
 *
 * `staff.manage` resolves to the same predicate today and would be the wrong
 * key: phase 35 must be able to grant one night's door without also granting
 * the sixteen tables `staff.manage` carries. A key is named by the question it
 * asks, never by the predicate that happens to match it (`keys.ts:38-45`).
 *
 * ── Why this file has the one legitimate `catch` around the resolver ─────────
 *
 * The rule that holds everywhere else in this phase — never `catch { return
 * false }` around `getAccessContext()` — is about **collapsing "could not find
 * out" into "not permitted"**. An empty capability set refuses a master exactly
 * the way it refuses a pending member, and `server.ts` throws precisely so that
 * a caller *can* tell the two apart.
 *
 * The `catch` below does the opposite of collapsing them: it returns a
 * **fourth** outcome that is neither 401 nor 403, so the difference survives all
 * the way to the phone in the operator's hand. The door is the caller that must
 * make that distinction, because at 02:00 it decides whether staff reboot the
 * device or go and fetch a different account.
 *
 * The `catch` is entered **by position** and never reads `error.message`. Next
 * redacts server-side error messages in production builds, so a branch on a
 * message string works in `next dev` and silently stops working where it
 * matters (CR-01). Do not delete this `catch` on principle — read the paragraph
 * above first.
 *
 * ── 503, and the bucket it lands in ─────────────────────────────────────────
 *
 * Checked against `src/lib/offline/sync-manager.ts`'s classification table
 * (`:102-175`), which is what decides the fate of a queued scan:
 *
 *   - `:131` — `401 || 403` → **blocked**. Held until the operator signs in
 *     again. Correct for a real refusal; wrong here, because signing in again
 *     fixes nothing when the capability lookup itself failed.
 *   - `:133` — `408 || 429` → retry (`throttled`).
 *   - `:141` — `>= 500` → **retry** (`server`). This is the retryable bucket.
 *
 * So `unresolved` answers **503**: a lookup that failed at 02:00 is retried when
 * the network returns, instead of being filed as a permanent refusal or held
 * behind a sign-in that would not help. 503 is also already the code
 * `checkin/route.ts`'s `respond()` uses for a scan that could not be written, so
 * the drain's handling of it is exercised rather than new.
 *
 * ── The observable effect, and its named limit ──────────────────────────────
 *
 * This project has **no error tracking** (`meta-gates.md`): a log line reaches
 * nobody. `checkin-offline.md`, gate *il fallimento va visto*, requires every
 * check-in error path to show itself to the staff present — the only observer
 * that really exists. So `unresolved` carries a distinct human string in `error`
 * and a distinct machine-readable `DOOR_UNRESOLVED_STATUS` in each route's own
 * envelope.
 *
 * **The limit, measured rather than assumed:**
 * `src/app/(admin)/admin/scanner/ScannerClient.tsx:81-87` maps HTTP status to a
 * headline before it reads the body, and 503 already has one — *"The scan was
 * not written to the record — scan again"*. Our `error` string reaches the
 * screen only as the **detail** line under it (`reportServerFault`, `:946-965`,
 * reads `body.error` into `showFlash`'s second argument). So the headline for a
 * capability-resolve failure currently reads as a failed write, which is not
 * what happened. The detail line says what did. Correcting the headline means
 * editing `ScannerClient.tsx`, which belongs to no plan in this wave; it is
 * recorded as a named gap in `33-04-SUMMARY.md` rather than shipped silently.
 *
 * **The same limit now applies to the supervision refusal, and it is renewed
 * here rather than assumed to have been read once.** `DOOR_SUPERVISION_REQUIRED`
 * travels in a route's envelope beside a 403, and 403 already has its own
 * headline on that surface, chosen before the body is parsed. So a device shown
 * "not permitted" cannot yet tell *"this account may never supervise"* from
 * *"this account is not the supervisor for THIS night"*. Closing that half is
 * plan **35-13**, on the device; this file owns only the value it sends.
 *
 * ── Three questions, one resolution ─────────────────────────────────────────
 *
 * With a `partyId`, this function resolves the context **once** and answers
 * three things from it:
 *
 *   1. `mayScan` — `door.operate`, by role **or** by an assignment to that
 *      night. It is the verdict that decides `ok`.
 *   2. `maySupervise` — `door.supervise`, by role **or** by assignment. This is
 *      ASSIGN-05: somebody assigned only to work the door does not have it, and
 *      an organizer does. It is a **separate key**, not a flag on
 *      `door.operate` — `keys.ts:38-45`, a key is named by the question it asks,
 *      and reusing `door.operate` would make every operator a supervisor, which
 *      is the one thing ASSIGN-05 refuses.
 *   3. `validUntil` / `resolvedAt` — see the next section.
 *
 * **Calling this twice in one handler is the defect, and no compiler will see
 * it.** `cache()` does not memoise inside a Route Handler — measured, three
 * calls ran the body three times, identically in `next dev` and in a production
 * build. That is why the supervision verdict is **returned** rather than left
 * for a second `await requireDoorOperator(`: the same shape `assertStaffManage()`
 * uses, for the same reason (`@/lib/capabilities/guards`). A second call here is
 * a second network round trip before a scan resolves, on a phone, on a bad
 * network, in front of a queue.
 *
 * **A failure to resolve the supervision verdict is never `maySupervise:
 * false`.** It cannot be, structurally: there is one resolution, and if it fails
 * the function has already returned `unresolved`. That is the property, not a
 * promise — a false `false` here is a refusal wearing the costume of an answer,
 * and `checkin-offline.md` names the false refusal, the one that happens in
 * front of a queue, as the worse of the two failures.
 *
 * **Without a `partyId` nothing changes**, and `maySupervise` then reports what
 * the ROLE confers and nothing else — an assignment contributes nothing to a
 * question that names no night. That is the same silence the SQL guard enforces
 * (`p_party_id is not null` is the first condition of the assignment arm), and
 * plan 35-03 measured what its absence costs: 16/16 probes with the guard,
 * **13/16 without**, and one of the three that flip is the call shape all 70 RLS
 * policies use. So: **to ask the supervision question, name the night.** Reading
 * `maySupervise` off an argument-less call is a false negative, and this
 * repository has no test that would notice.
 *
 * ── `validUntil` is a courtesy of the interface, never a boundary ───────────
 *
 * `validUntil` is when the night ends, as an instant, and `resolvedAt` is the
 * **server's** clock at the moment it was resolved. The pair exists so a device
 * can **measure the drift of its own clock instead of trusting it** — a phone at
 * 02:00 whose clock is twenty minutes fast must not expire a verdict twenty
 * minutes early, and one that is slow must not hold it twenty minutes late.
 *
 * It is **not** an authorisation boundary and must never be used as one. The
 * boundary is the resolution itself: `now() < pa.ends_at`, on the server's
 * clock, inside the SQL resolver. `validUntil` only tells a cache when to stop
 * trusting itself, and the lexicon for that distinction already exists in this
 * repository — `checkin-store.ts:135-136`, *"Device clock at the read. Evidence,
 * not authority."*
 *
 * `null` means **there is no server-declared end**, and it has more than one
 * cause: the night declares no `end_time`; the row is not visible to this reader
 * (`event_parties_select_admin` asks `staff.manage`, which somebody assigned to
 * a single night does not hold, so an assignee sees an unpublished event's party
 * not at all); or the read did not answer. They are collapsed **for the
 * consumer** deliberately, because the consequence is the same one and it is the
 * safe one — no expiry, so the device asks the server again — and kept
 * **distinct for diagnosis** by the log category on the read itself.
 */

/**
 * The machine-readable classification of the fourth outcome.
 *
 * A **value**, decided by position in `requireDoorOperator`, never a parsed
 * message (CR-01). Each route places it in whichever field its existing
 * envelope already uses for a classification string.
 */
export const DOOR_UNRESOLVED_STATUS = "capability_unresolved";

/**
 * The human sentence for the fourth outcome. Deliberately says nothing about
 * permission: the whole point of this arm is that permission is unknown.
 */
export const DOOR_UNRESOLVED_ERROR =
  "Could not check this account's door permission — this is not a refusal. Try again.";

/**
 * The machine-readable classification of a supervision refusal.
 *
 * Same form as `DOOR_UNRESOLVED_STATUS` and for the same measured reason: a
 * **value**, decided by position, never a parsed message. Next redacts the
 * message of an error thrown out of a Server Action in a production build, so a
 * category that has to reach a device cannot travel in prose (CR-01).
 *
 * It classifies a **403**, not a fourth status code. An account that may work
 * the door but may not reverse an admission has been answered, and answered
 * correctly; the retryable 503 belongs to the case where nobody answered.
 */
export const DOOR_SUPERVISION_REQUIRED = "door_supervision_required";

/**
 * The human sentence for a supervision refusal.
 *
 * It names the **way out** — ask an organizer for this night — because at 02:00
 * the useful part of a refusal is what to do next, and because this refusal is
 * about one night rather than about the account. English only: the interface
 * language is a milestone decision, not a per-string choice.
 */
export const DOOR_SUPERVISION_REQUIRED_ERROR =
  "Undoing a check-in needs a supervisor. Ask an organizer for this night.";

/**
 * The shape a night identifier must have before it reaches this guard.
 *
 * Same literal as `src/app/api/tickets/checkin/undo/route.ts:23-24` and as the
 * data-access layer's own check — three copies of one regex would be three
 * answers waiting to disagree, so it is the same one, copied rather than
 * reinvented.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The door's authorisation answer, tagged by position.
 *
 * Four arms, not three. `unauthenticated` and `forbidden` preserve the 401 and
 * the 403 the four routes have always returned; `unresolved` is the outcome
 * that used to be indistinguishable from a refusal.
 *
 * `userId` is `string` — not `string | null` — on the `ok: true` arm, which is
 * what lets `operator_id` and `checked_in_by` be written without a `!`
 * assertion. A null there would be a silently unattributed admission, and
 * `ACCESS-MODEL-DECISIONS.md` §5 makes a door override an attributed record.
 *
 * The three refusal arms are **unchanged** — 401, 403, 503 — and the `ok: true`
 * arm carries more, so that one resolution answers three questions. `mayScan` is
 * the literal `true`: it is the verdict that produced this arm, written out
 * rather than implied, so a route reading `auth.mayScan` gets the same answer as
 * a route reading `auth.ok` instead of two names for one fact drifting apart.
 */
export type DoorAuth =
  | {
      ok: true;
      userId: string;
      mayScan: true;
      maySupervise: boolean;
      validUntil: string | null;
      resolvedAt: string;
    }
  | { ok: false; kind: "unauthenticated"; error: string; status: 401 }
  | { ok: false; kind: "forbidden"; error: string; status: 403 }
  | { ok: false; kind: "unresolved"; error: string; status: 503 };

/**
 * May the current session work the door?
 *
 * **Call this ONCE per handler and reuse the result.** `cache()` does not
 * memoise inside a Route Handler — measured, three calls ran the body three
 * times, identically in `next dev` and in a production build
 * (`@/lib/capabilities/server`, *Memoisation, and its limit*). Two calls here
 * are two network round trips before a scan resolves, on a phone, on a bad
 * network, in front of a queue.
 *
 * Resolved this way the scan is one round trip **cheaper** than it was: the
 * predicate this replaces cost `auth.getUser()` **plus** a `profiles` select,
 * and `public.my_access_context()` derives the subject from `auth.uid()` inside
 * the JWT, so it needs neither.
 *
 * ── What each shape costs, since the door is where that matters ─────────────
 *
 *   - `requireDoorOperator()`            — one round trip, exactly as before.
 *   - `requireDoorOperator({ partyId })` — two: the resolution, and then the
 *     night's end for `validUntil`.
 *
 * The second read is issued **after** the verdict and only when the verdict is
 * `ok`, so a refusal still costs one. Issuing the two in parallel was considered
 * and refused: the refusal paths return before the second promise is awaited,
 * which is a dangling rejection, and the refusal path is the one that must stay
 * cheapest — it is the path a queued scan retries.
 *
 * @throws `door.invalid_party_id` — `partyId` was supplied and is not a uuid.
 *         This is a **caller bug**, deliberately not one of the four outcomes:
 *         the route owns validating its own body and answering 400. Laundering
 *         it into `unresolved` would put a permanent client fault into the
 *         retryable bucket (`sync-manager.ts:141`), where a malformed id would
 *         be retried for the rest of the night; laundering it into `forbidden`
 *         would put it into `blocked`, which a sign-in never clears.
 */
export async function requireDoorOperator(opts?: {
  partyId?: string;
}): Promise<DoorAuth> {
  const partyId = opts?.partyId;

  // Before any client, any await, and outside the `try` below on purpose: this
  // must not be caught and turned into the fourth outcome. See the @throws note.
  if (partyId !== undefined && !UUID_PATTERN.test(partyId)) {
    throw new Error("door.invalid_party_id");
  }

  let ctx: AccessContextResult;

  try {
    // THE one resolution. With a night it is the per-night form, whose
    // capability list is the union of what the role confers and what a live
    // assignment on that night confers; without one it is what it always was.
    ctx = partyId
      ? await getPartyAccessContext(partyId)
      : await getAccessContext();
  } catch (error) {
    // Entered by position. Nothing below inspects the error — it is logged for
    // diagnosis and the verdict is a fixed fourth arm. See the file comment for
    // why this one `catch` is correct where every other one in this phase is
    // not.
    console.error("[capabilities.resolve_failed] door", error);
    return {
      ok: false,
      kind: "unresolved",
      error: DOOR_UNRESOLVED_ERROR,
      status: 503,
    };
  }

  // No session. `ANONYMOUS_CONTEXT.userId` is `null` (never `""`) and this is
  // exactly the case where `auth.getUser()` used to yield no user, so the 401
  // the four routes returned is preserved.
  if (!ctx.userId) {
    return {
      ok: false,
      kind: "unauthenticated",
      error: "Unauthorized",
      status: 401,
    };
  }

  // A session, but not this door's. Role — or, when a night was named, an
  // assignment to that night. Still no status test, and adding one would still
  // be a defect: see the file comment.
  if (!ctx.capabilities.has(CAP.DOOR_OPERATE)) {
    return { ok: false, kind: "forbidden", error: "Forbidden", status: 403 };
  }

  return {
    ok: true,
    userId: ctx.userId,
    mayScan: true,
    // From the SAME resolution. Never a second question, and never a `false`
    // standing in for an unanswered one.
    maySupervise: ctx.capabilities.has(CAP.DOOR_SUPERVISE),
    validUntil: partyId ? await readNightEnd(partyId) : null,
    // The SERVER's clock, so the device can measure its own against it rather
    // than trust it. Read last, so it is the instant this verdict was completed.
    resolvedAt: new Date().toISOString(),
  };
}

/**
 * When this night ends, as an instant — or `null`, which is an honest answer.
 *
 * Total by construction: it never throws and never refuses. A courtesy field
 * that could take down an authorisation would not be a courtesy.
 *
 * The client is the **cookie-bound** one, never the service client. This read is
 * about a night the caller is already authorised to work, so there is nothing to
 * gain by bypassing row-level security and something to lose: the service client
 * would answer for every party in the database, including one the caller named
 * by mistake.
 *
 * The conversion goes through `partyEndInstant`, and that is not a preference.
 * `event_parties.date` is a DATE and `end_time` a TIME, both **without a zone**,
 * both meaning wall-clock time in Turin; `new Date(\`${date}T${end_time}\`)`
 * parses in the *runtime's* zone, which is UTC on Vercel. That is a one- or
 * two-hour shift that raises no error, and `src/utils/datetime.ts` says in as
 * many words that a variant of this conversion inlined at a call site is the
 * defect the module exists to prevent. A night ending at `06:00` is also the
 * morning *after* the date it is filed under — the crossing-midnight rule lives
 * in that module too, and is not re-derived here.
 */
async function readNightEnd(partyId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_parties")
    .select("date, end_time")
    .eq("id", partyId)
    .maybeSingle();

  if (error) {
    // Its own category, so the diagnosis survives even though the consumer
    // cannot act on it differently. This is NOT a refusal and NOT an expiry:
    // the device simply gets no server-declared end and keeps asking.
    console.error(
      `[door.night_end_unreadable] could not read event_parties for the ` +
        `validUntil courtesy: ${error.code ?? "unknown"}. The verdict stands; ` +
        `only the expiry hint is missing.`
    );
    return null;
  }

  const night = data as { date?: string; end_time?: string | null } | null;

  // No row (not visible to this reader, or no such night) and no declared end
  // are the same answer here, for the reason in the file comment.
  if (!night?.date || !night.end_time) return null;

  return partyEndInstant(night.date, night.end_time).toISOString();
}
