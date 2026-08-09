import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import {
  DOOR_NIGHT_ERROR,
  DOOR_NIGHT_NOT_ASSIGNED,
  DOOR_NIGHT_OTHER_NIGHT,
  DOOR_NIGHT_UNRESOLVED,
  type DoorNightRefusal,
} from "@/lib/door/outcome";
import type { DoorAuth } from "@/lib/door/require-operator";

/**
 * The second arm of the door's authorisation — *"may this account work THIS
 * night's door, even though the role says no?"* — everything about that question
 * **except the asking of it**.
 *
 * Written by plan 35-22 for `src/app/api/tickets/checkin/route.ts` and lifted
 * here unchanged when the guest-list check-in needed the same answer. It is one
 * function and not two on purpose: `require-operator.ts` exists because *"the
 * same person refused by one scanner and admitted by another, on the same night,
 * is undiagnosable"*, and two copies of the appeal would reintroduce exactly
 * that, one route at a time.
 *
 * **The call to the guard stays inline in each handler, never here, and that is
 * not an oversight.** The standing checks on the door routes measure by line
 * number that the role form of the guard is called before the per-night form; a
 * helper that made the call would hide the order. So the asking stays where the
 * order is visible, and the answering — which is the part with the reasoning in
 * it — lives here.
 *
 * ── Why it is a second call and not an argument on the first ─────────────────
 *
 * Somebody will propose merging the two into one call with an optional night,
 * and this paragraph exists to take the reason away. The per-night form of the
 * guard resolves through `public.my_access_context(uuid)`, **a function that
 * does not exist in production** until row 8 of the hand-applied queue lands.
 * The guard answers that correctly — `unresolved`, 503 — and 503 on the *only*
 * authorisation call would be **503 on every scan, from the first deploy, at two
 * in the morning, with a queue at the door**. Plan 35-12 refused that road and
 * was right; this arm inherits the decision rather than reopening it.
 *
 * Splitting it in two is what makes the failure harmless: everybody who gets
 * here has already been refused by the role arm, so the worst this function can
 * do is leave that refusal exactly where it found it.
 *
 * ── The status code, and the bucket it produces ─────────────────────────────
 *
 * **403 for all three refusals. Never 503, and that is deliberate.**
 *
 * Read off `src/lib/offline/sync-manager.ts`'s classification table:
 * `401 || 403` is filed under **`blocked`**, `>= 500` under **`retry`**. Three
 * reasons `blocked` is the right bucket here, in increasing order of importance:
 *
 *   1. **It is unreachable from the drain by construction.** Every caller asks
 *      this arm only when the request is *not* a queued report, so no queue
 *      entry can ever be classified by one of these answers. It is the same
 *      argument plan 35-11 made for the undo route, and it is checkable: each
 *      caller's condition names its own `isQueuedReport`.
 *   2. **If a future edit did make it reachable, `blocked` is the survivable
 *      mistake and `retry` is not.** A 503 would put the entry in `retry`, where
 *      it would be sent again on every `online` for the rest of the night
 *      against a condition a retry cannot change — the missing resolver is not
 *      going to appear at 03:00. `blocked` at least keeps the entry, and keeps
 *      it counted on a screen somebody looks at (`getBlockedCount`).
 *   3. **403 is the code this caller had already been given.** The role arm
 *      answered *"no"* on the server's clock and that answer stands; the second
 *      arm only failed to overturn it. Answering 503 would tell an operator with
 *      no title that the server is broken, and would move a refusal that was
 *      already correct into the retryable bucket. The permission was resolved.
 *      What was not resolved is the appeal.
 *
 * ── Outcome 2 comes from the coarse field, and grants nothing ────────────────
 *
 * `liveAssignmentCapabilities` answers *"does this subject hold ANY live
 * assignment, and for which trades?"* — `server.ts:161-183` says in as many
 * words that it is **wider than the real permission** and that no surface may
 * decide with it alone. Nothing here decides with it: the verdict was taken by
 * the guard, on the named night. This read only says which **sentence** the
 * refusal gets, and a field that is too wide is exactly the right instrument for
 * that — "assigned somewhere, refused here" is precisely what it can see.
 *
 * Its three states are honoured as three (`server.ts:222-243`): `null` is *the
 * key was not in the payload*, i.e. row 14 of the queue is behind, and it is
 * **outcome 3** — never the empty set's meaning, which is the answered fact *"no
 * live assignment"*. Collapsing those two would make a migration that has not
 * been applied indistinguishable from a person who is not working tonight, and
 * the second sentence is the one somebody reads in front of a queue.
 */

/**
 * What the second arm answered.
 *
 * `http` is carried rather than derived so that the one place that chooses a
 * status code is the one place that explains the choice. Each route renders it
 * into its own envelope — `{ valid, status, error }` on the check-in route,
 * `{ error, status }` on the attendance route — because the two envelopes were
 * shipped to devices that are still in the field.
 */
export type NightArm =
  | { granted: true; operatorId: string }
  | { granted: false; http: 401 | 403; status: string; error: string };

/** The refusal shape, so the exits below cannot drift apart. */
export function refuseNight(status: DoorNightRefusal): NightArm {
  return { granted: false, http: 403, status, error: DOOR_NIGHT_ERROR[status] };
}

/**
 * Read the per-night verdict the caller has already asked for.
 *
 * `perNight === null` means the guard **threw** at the call site. It throws
 * `door.invalid_party_id` for a malformed night and nothing else, and every
 * caller shape-checks the night before asking, so it is unreachable — carried as
 * a value rather than trusted, because an uncaught throw would be answered by a
 * handler's last-resort 500, which is the wrong shape for a caller who was
 * simply refused.
 */
export async function readNightArm(
  perNight: DoorAuth | null
): Promise<NightArm> {
  if (perNight === null) return refuseNight(DOOR_NIGHT_UNRESOLVED);

  if (perNight.ok) return { granted: true, operatorId: perNight.userId };

  // The session went away between the two resolutions. 401, and the same body
  // the role arm's 401 has always carried — a sign-in is the remedy, and
  // `blocked` is the bucket that waits for one.
  if (perNight.kind === "unauthenticated") {
    return {
      granted: false,
      http: 401,
      status: "unauthorized",
      error: "Unauthorized",
    };
  }

  // The lookup itself failed — today, every time, because the resolver is not
  // in production yet. Its own category, and NOT a denial.
  if (perNight.kind === "unresolved") {
    return refuseNight(DOOR_NIGHT_UNRESOLVED);
  }

  // A real refusal for this night. All that is left is to say which of the two
  // it is, and that costs one read of the coarse field.
  let liveAnywhere: Set<string> | null;
  try {
    liveAnywhere = (await getAccessContext()).liveAssignmentCapabilities;
  } catch (error) {
    // The refusal is real either way; what could not be established is its
    // sentence. Outcome 3 rather than outcome 1, because outcome 1 asserts a
    // fact — *"not assigned anywhere"* — that nobody just verified.
    console.error("[door.night_arm_reason_unresolved]", error);
    return refuseNight(DOOR_NIGHT_UNRESOLVED);
  }

  if (liveAnywhere === null) return refuseNight(DOOR_NIGHT_UNRESOLVED);

  return refuseNight(
    liveAnywhere.has(CAP.DOOR_OPERATE)
      ? DOOR_NIGHT_OTHER_NIGHT
      : DOOR_NIGHT_NOT_ASSIGNED
  );
}
