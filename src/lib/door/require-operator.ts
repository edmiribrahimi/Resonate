import { CAP } from "@/lib/capabilities/keys";
import {
  getAccessContext,
  type AccessContextResult,
} from "@/lib/capabilities/server";

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
 */
export type DoorAuth =
  | { ok: true; userId: string }
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
 */
export async function requireDoorOperator(): Promise<DoorAuth> {
  let ctx: AccessContextResult;

  try {
    ctx = await getAccessContext();
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

  // A session, but not this door's. Role alone — see the file comment.
  if (!ctx.capabilities.has(CAP.DOOR_OPERATE)) {
    return { ok: false, kind: "forbidden", error: "Forbidden", status: 403 };
  }

  return { ok: true, userId: ctx.userId };
}
