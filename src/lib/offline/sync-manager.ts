import * as store from "./checkin-store";
import type { FailureReason, PendingCheckin } from "./checkin-store";
import { isDoorOutcome } from "@/lib/door/outcome";
import type { DoorNotValidReason } from "@/lib/door/outcome";

/**
 * The drain: what the door recorded with the radio off, reported to the server.
 *
 * Three faults lived in fourteen lines of this file, and all three had the same
 * shape — the queue letting go of an entry the server had never recorded, or
 * holding on to one it never could.
 *
 * 1. **A queued scan travelled as a bare identifier.** The scanner split the
 *    signed string and kept the id, so a synced admission was indistinguishable
 *    from something typed by hand. The entry now carries the token it was read
 *    from (`PendingCheckin.token`) and the route re-verifies it exactly as it
 *    does online (FIX-10).
 * 2. **The transport `ok` flag decided everything.** Five returns in
 *    `api/tickets/checkin/route.ts` and one in `api/membership/verify/route.ts`
 *    encoded failure at HTTP 200 before this phase, so that flag was `true` for
 *    a conflict and the entry was deleted — the one piece of evidence that two
 *    people walked in on one ticket, destroyed at the moment it arrived
 *    (FIX-03). The **body** is authoritative here now, and the flag is never
 *    consulted. Should a route ever encode failure at 200 again, the classifier
 *    below will read it out of the body rather than believe the status.
 * 3. **There was no third answer.** A response that was neither a success nor a
 *    conflict fell through and was retried on every `online` and every
 *    `visibilitychange`, forever, while a membership scan the server could never
 *    accept was dropped as though it had landed. One handler both retained dead
 *    entries and deleted live ones (FIX-08).
 *
 * What replaces them is one classifier, four buckets, and a single rule: an
 * entry leaves the queue only when the server has said, in its own body, that
 * the scan is on the record.
 *
 * **Where a failure becomes visible.** There is no error tracking in this
 * project, so a log line is a place nobody looks. The observable effect is the
 * store itself — `failedCheckins` keeps what could not be recorded and
 * `getBlockedCount()` counts what is waiting for a sign-in — plus the counters
 * this module returns, which plan 31-11 renders on the phone in the hand of the
 * person at the door. That person is the only observer that exists.
 */

let isSyncing = false;

/** Why an entry is being left in the queue for another attempt. Each is logged apart. */
type RetryCause = "offline" | "transport" | "throttled" | "server";

/**
 * The four buckets, and the only four.
 *
 * `done` is the sole bucket that removes an entry from the queue, and it is
 * reached only from a body that says the server holds the record.
 */
type Classification =
  | {
      bucket: "done";
      via:
        | "recorded"
        | "recorded_after_revocation"
        | "already_recorded"
        | "legacy_success";
    }
  | { bucket: "retry"; cause: RetryCause }
  | { bucket: "dead"; reason: FailureReason }
  | { bucket: "blocked" };

/**
 * The reasons a `not_valid` body may carry, as a runtime set.
 *
 * `isDoorOutcome` is deliberately narrow — it checks the discriminant and stops
 * — so the `reason` field is unverified data until it has been through here. A
 * total `Record` over the union means adding a fifth reason is a build error
 * rather than a queue entry silently retired under the wrong cause.
 */
const NOT_VALID_REASONS: Record<DoorNotValidReason, true> = {
  invalid_signature: true,
  unknown_code: true,
  wrong_night: true,
  no_party_selected: true,
  // The fifth, and the only one that arrives from this file's own requests: the
  // check-in route answers it when the operator held no door assignment for that
  // night at `scannedAt`. It reaches `failedCheckins` under its own name rather
  // than under `unexpected_response`, which is the difference between a night's
  // review saying *"this device was not assigned"* and saying *"something went
  // wrong"*.
  no_assignment_at_scan: true,
};

/**
 * Did the server say the assignment behind this admission had been revoked
 * since the scan?
 *
 * An **additive** field of the answer, alongside the `DoorOutcome` rather than
 * inside it: `outcome.ts` says in as many words that the union has three members
 * and that adding to it breaks FIX-04a's requirement. This is not a fourth
 * outcome and not a `DoorFlag` — flags are rendered at the door, and by the time
 * a drain runs there is no door.
 *
 * `=== true` and nothing looser. An absent field, a `false` and a truthy string
 * all have to mean the same thing here: **not stated**. A bundle answering from
 * a deployment that predates plan 35-12 simply never sends it, and reading a
 * missing field as an anomaly would turn every ordinary admission into one.
 */
function saysAssignmentRevokedAfterScan(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { assignmentRevokedAfterScan?: unknown })
      .assignmentRevokedAfterScan === true
  );
}

function asFailureReason(value: unknown): FailureReason {
  return typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(NOT_VALID_REASONS, value)
    ? (value as DoorNotValidReason)
    : "unexpected_response";
}

/**
 * A success shape that predates the three-outcome contract.
 *
 * Only `/api/tickets/attendance` needs one: its 409 carries `outcome`
 * (plan 31-06) but its success still answers `{ success: true }` at HTTP 200
 * with no `outcome` field (`route.ts:688-692`). Treating that as unrecognised
 * would record a guest who really was checked in as permanently failed, which
 * is the opposite of what this file is for. The check is narrow on purpose —
 * status **and** an explicit `success: true` — so no other 200 slips through
 * it. It comes out when that route joins the contract.
 */
type LegacySuccessCheck = (status: number, body: unknown) => boolean;

const guestLegacySuccess: LegacySuccessCheck = (status, body) =>
  status === 200 &&
  typeof body === "object" &&
  body !== null &&
  (body as { success?: unknown }).success === true;

/**
 * One response, one bucket — for all three endpoints, because all three now
 * answer with the same contract. Three copies of this switch would be three
 * places for it to drift.
 *
 * The order is the contract:
 *
 * | Condition                                            | Bucket  |
 * |------------------------------------------------------|---------|
 * | 401 or 403                                           | blocked |
 * | 408 or 429                                           | retry   |
 * | >= 500                                               | retry   |
 * | body `recorded` **+ `assignmentRevokedAfterScan`**    | done    |
 * | body `outcome: "recorded"`                           | done    |
 * | body `outcome: "already_recorded"`                   | done    |
 * | body `not_valid` **+ `no_assignment_at_scan`**       | dead    |
 * | body `outcome: "not_valid"`                          | dead    |
 * | anything else                                        | dead    |
 *
 * An entry carrying {@link LocallyUndoneMarker} is not a row of this table: it
 * reports a **reversal** rather than an admission, and the answer to that report
 * is classified by this same table, unchanged. See {@link isLocallyUndone}.
 *
 * The transport-level `ok` boolean does not appear anywhere in it, and that is
 * the point: it was `true` for every failure this phase exists to fix.
 *
 * ── The two rows in bold, and why each is where it is (ASSIGN-03) ────────────
 *
 * **`recorded` + `assignmentRevokedAfterScan` → `done`.** The scan was taken
 * while the door assignment was live and the assignment was revoked before this
 * drain ran. The server has judged it at `scannedAt` and written the row
 * (`api/tickets/checkin/route.ts`, outcome 2), so the entry leaves the queue
 * because it has been **resolved**, never because it was lost. It is `done` and
 * not a bucket of its own: `done` means the server holds the record, and it
 * does. What the extra row buys is the `via` — the night's queue can say
 * *"reported, and the assignment behind it had already been taken away"* instead
 * of filing it as an ordinary admission, and it is logged apart accordingly.
 *
 * **`not_valid` + `no_assignment_at_scan` → `dead`.** No assignment ever covered
 * that operator on that night at that moment. The server still wrote a row, so
 * the presence is on the record; the entry goes to `failedCheckins` under its
 * own reason, which is a place the phone counts and a person reads. It needs no
 * branch of its own below — `NOT_VALID_REASONS` is a total `Record`, so the
 * reason arrives named rather than flattened into `unexpected_response`, and
 * that totality is the mechanism, not a coincidence. The row is in this table
 * anyway, because a contract that only lists the conditions that needed code is
 * a contract with holes in it.
 *
 * ── The three things this deliberately is NOT ───────────────────────────────
 *
 * Each of these will be proposed again by somebody reading only the code, so
 * each is refused here with its reason:
 *
 *   1. **Not a fourth status code landing in `retry`.** It would retry, for the
 *      rest of the night and every `online` after it, a condition that will
 *      never become true — a revoked assignment is not coming back and an
 *      assignment that never existed is not going to appear. That is the loop
 *      with no ceiling that `MAX_SYNC_ATTEMPTS = 8` exists to stop, and reaching
 *      the ceiling would retire the entry under `unexpected_response`, losing
 *      the one useful thing the server said.
 *   2. **Not `blocked`.** `blocked` waits for a new login, and **no login
 *      returns a revoked assignment**. That is the exact defect this plan
 *      corrects, and putting either new row there would reinstate it under a
 *      different name.
 *   3. **Not "do not revoke while a queue exists".** It is not knowable: the
 *      server cannot see what is sitting in IndexedDB on a phone, and a
 *      revocation that had to wait for a device to come back would be a
 *      revocation that never completes. The question moves in time instead, and
 *      that is the whole of the fix.
 *
 * **The `401`/`403` → `blocked` row is untouched, and must stay so.** It is
 * right for what it exists for — a session that expired at 02:00, which a
 * sign-in genuinely does clear. Neither new row travels through a status code;
 * both are read out of the body, which is why the first row of this table did
 * not have to move.
 */
function classifyResponse(
  status: number,
  body: unknown,
  legacySuccess: LegacySuccessCheck | null
): Classification {
  // An expired session is neither a failure nor something to retry. Recorded as
  // failed, a whole night's queue is discarded at 02:00; retried, it spins on an
  // endpoint with no rate limiting anywhere in this repository. Kept and held is
  // the third answer, and `retryBlockedAfterSignIn` is the way back.
  if (status === 401 || status === 403) return { bucket: "blocked" };

  if (status === 408 || status === 429) {
    return { bucket: "retry", cause: "throttled" };
  }

  // Includes the 503 that `respond()` returns when the `door_scan_events`
  // insert fails: the route deliberately does not answer with an outcome there,
  // so the entry must stay in the queue rather than be drained on a conflict
  // that was never persisted.
  if (status >= 500) return { bucket: "retry", cause: "server" };

  if (isDoorOutcome(body)) {
    switch (body.outcome) {
      case "recorded":
        // The refinement first, because the plain `recorded` below would swallow
        // it and the distinction would exist only in the server's row.
        return saysAssignmentRevokedAfterScan(body)
          ? { bucket: "done", via: "recorded_after_revocation" }
          : { bucket: "done", via: "recorded" };
      case "already_recorded":
        // Dropping a conflict from the queue is safe **only** because
        // `api/tickets/checkin/route.ts` writes the `door_scan_events` row and
        // then returns, in that order, from a single `respond()` — and
        // `api/membership/verify/route.ts` does the same before its 409. If that
        // ordering is ever reversed, FIX-03 breaks here and nowhere else will
        // notice: the evidence that two people entered on one ticket would be
        // acknowledged and then deleted, which is the defect this phase exists
        // to fix.
        return { bucket: "done", via: "already_recorded" };
      case "not_valid":
        // Permanent by construction: a bad signature, an unknown code, the
        // wrong night or no party will not become valid on a later attempt.
        return {
          bucket: "dead",
          reason: asFailureReason((body as { reason?: unknown }).reason),
        };
    }
  }

  if (legacySuccess?.(status, body)) {
    return { bucket: "done", via: "legacy_success" };
  }

  // A 400, a 404, or a body from a bundle that does not speak the contract. It
  // is not going to succeed by being sent again, so it is retired **visibly**
  // into `failedCheckins` instead of being retried forever or deleted.
  return { bucket: "dead", reason: "unexpected_response" };
}

/**
 * ── The contract for an admission undone with the radio off ──────────────────
 *
 * **Defined here, produced by plan 35-13.** It is written on the consumer's side
 * on purpose: the drain is what has to make sense of such an entry, and a
 * contract written by the producer and merely read by the consumer is a contract
 * that drifts. What follows is the whole of what the drain promises.
 *
 * **What happens today, and why it is a defect.** With the radio off, the
 * scanner's undo branch (`ScannerClient.tsx:869-892`) **deletes** the queue
 * entry. The branch itself is right and its comment says why — *"an undo that
 * silently does nothing is worse than one that refuses out loud"* — but deleting
 * is the wrong half of it. Two things follow from the deletion, and the second is
 * the worse one:
 *
 *   1. Nobody ever sees that somebody was admitted and then taken back out.
 *      `checkin-offline.md` calls the undo *"il percorso piu' semplice per far
 *      rientrare qualcuno"* and requires it to be recorded with who and when. A
 *      deleted entry records neither, and the night's record shows an evening in
 *      which the admission never happened at all.
 *   2. The same deletion is how a supervision rule that lives only in the route
 *      is **stepped around by turning the radio off**. That is T-3, and it is
 *      closed on the device by plan 35-13.
 *
 * **What replaces it.** An entry undone locally is no longer deleted. It is
 * marked, it stays in the queue, and on the next drain it reports the
 * **reversal** instead of the admission — so the night's record carries both the
 * entry and its undo, each with its actor and its moment. The reversal is
 * reported to `/api/tickets/checkin/undo`, and its answer is classified by the
 * table above with no change: `done` removes the entry because the server holds
 * the reversal, `retry` keeps it, `blocked` holds it for a sign-in, `dead`
 * retires it visibly. **No bucket deletes it silently, which is the entire
 * point.**
 *
 * **Nothing here runs today, and that has to be said** — a branch that never
 * fires reads as dead code to somebody who arrives without this paragraph. No
 * code in this repository writes {@link LocallyUndoneMarker} onto a queue entry,
 * so {@link isLocallyUndone} is `false` for every entry that exists, and the
 * drain's behaviour is byte for byte what it was. The producer is plan 35-13,
 * and the send path lands **with** it rather than before it, deliberately: a
 * marked entry with no sender would be an entry no bucket could ever resolve —
 * the same stranding, one file further along.
 */
export interface LocallyUndoneMarker {
  /** Set by plan 35-13 when an admission is reversed with the radio off. */
  undoneLocally: true;
  /** Device clock at the reversal. Evidence, not authority — as `scannedAt` is. */
  undoneAt: string;
  /** Who reversed it, so the record can say. `door_scan_events` attributes every row. */
  undoneBy: string;
}

/**
 * Is this entry a reversal waiting to be reported, rather than an admission?
 *
 * Read structurally rather than off the type: {@link LocallyUndoneMarker} is not
 * yet part of `PendingCheckin` — plan 35-13 owns `checkin-store.ts` and puts it
 * there — and this predicate exists so that the drain's side of the contract is
 * written, reviewable and unchanged in behaviour before the field arrives.
 *
 * `=== true`, for the same reason as {@link saysAssignmentRevokedAfterScan}: an
 * absent field and a `false` mean the same thing, and only the literal marker
 * means the other.
 */
export function isLocallyUndone(entry: PendingCheckin): boolean {
  return (
    (entry as Partial<LocallyUndoneMarker>).undoneLocally === true
  );
}

/** Where an entry goes, and what travels with it. */
interface Target {
  url: string;
  body: Record<string, unknown>;
  legacySuccess: LegacySuccessCheck | null;
}

function targetFor(entry: PendingCheckin): Target {
  switch (entry.type) {
    case "ticket":
      // The signed string exactly as it was read, never a bare identifier: the
      // route re-verifies the signature, so synchronising still proves the code
      // was in front of the camera.
      return {
        url: "/api/tickets/checkin",
        body: {
          token: entry.token,
          partyId: entry.partyId,
          scannedAt: entry.scannedAt,
          deviceId: entry.deviceId,
          source: "offline_sync",
        },
        legacySuccess: null,
      };
    case "membership":
      // `entryRole` is the role the roster on this device held **at the door**,
      // and the route reads it only when `source === "offline_sync"` — which is
      // the only case that reaches here. Online, the door and the write are the
      // same moment and the route uses the profile it has just read; queued,
      // they are hours apart and only the device holds what was true then.
      //
      // **An entry with no role sends no field**, following the `guest` branch
      // below: state the absence rather than paper over it with a value that
      // would be silently wrong. Two kinds of entry arrive here without one — a
      // scan queued by a release before this one, and a scan taken while the
      // roster on this device predated the role field. Neither is dropped,
      // neither is retried differently, and neither is reported as carrying a
      // marker: the route writes NULL and admits, and NULL means `unknown`, not
      // `member`.
      return {
        url: "/api/membership/verify",
        body: {
          code: entry.subjectId,
          partyId: entry.partyId,
          scannedAt: entry.scannedAt,
          deviceId: entry.deviceId,
          source: "offline_sync",
          ...(entry.entryRole ? { entryRole: entry.entryRole } : {}),
        },
        legacySuccess: null,
      };
    case "guest":
      // `source` and `scannedAt` are sent so that the route can tell a report
      // from the drain apart from a tap on the button, which is what keeps its
      // per-night appeal (CR-01) **unreachable from here by construction**. That
      // is the ASSIGN-03 protection plan 35-12 measured: asking *"is the
      // assignment live NOW"* about a moment that has already passed admits on
      // the strength of an assignment granted after the fact.
      //
      // `partyId` rides along for the same reason it does on the other two
      // branches — a guest-list entry may be **event-level**
      // (`guest_list_entries.party_id` is nullable), and then the night has to
      // be named for the row to be bound to one at all.
      //
      // What this path still carries **less** of, stated rather than papered
      // over: no device id, and the route persists none of these three, so a
      // guest-list admission still cannot be told apart afterwards as having
      // arrived through the queue. A refused account's queued guest entry
      // therefore keeps its 403 and stays in `blocked` — counted on the screen,
      // and named in the route's docblock as the half this change does not close.
      return {
        url: "/api/tickets/attendance",
        body: {
          guestListEntryId: entry.subjectId,
          partyId: entry.partyId,
          scannedAt: entry.scannedAt,
          source: "offline_sync",
        },
        legacySuccess: guestLegacySuccess,
      };
  }
}

/** Send one entry and read the answer. Never throws: a thrown fetch is a bucket. */
async function attempt(entry: PendingCheckin): Promise<Classification> {
  if (!navigator.onLine) return { bucket: "retry", cause: "offline" };

  const target = targetFor(entry);

  let res: Response;
  try {
    res = await fetch(target.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target.body),
    });
  } catch {
    // The request never reached a server, so nothing can be concluded about
    // whether the scan was recorded. Keep it.
    return { bucket: "retry", cause: "transport" };
  }

  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    // An HTML error page, an empty body, or a response from a proxy. Left null
    // so it falls to the dead bucket rather than being mistaken for a contract
    // body.
    parsed = null;
  }

  return classifyResponse(res.status, parsed, target.legacySuccess);
}

/** What one drain did. Four numbers, because one cannot tell a drained queue from a discarded one. */
export interface SyncCounters {
  synced: number;
  retried: number;
  failed: number;
  blocked: number;
}

/**
 * Apply a classification to the store, and log it once under a category that
 * names the bucket and the kind of entry — never a message shared between
 * causes, which is the failure mode `meta-gates.md` names.
 */
async function applyClassification(
  entry: PendingCheckin,
  classification: Classification,
  counters: SyncCounters
): Promise<void> {
  switch (classification.bucket) {
    case "done": {
      await store.markSynced(entry.key);
      counters.synced++;
      console.info(`sync:synced:${entry.type}:${classification.via}`, {
        key: entry.key,
        partyId: entry.partyId,
      });
      return;
    }

    case "blocked": {
      await store.markBlocked(entry.key);
      counters.blocked++;
      console.warn(`sync:blocked:${entry.type}`, {
        key: entry.key,
        partyId: entry.partyId,
      });
      return;
    }

    case "dead": {
      await store.markFailed(entry.key, classification.reason);
      counters.failed++;
      console.error(`sync:failed:${entry.type}:${classification.reason}`, {
        key: entry.key,
        partyId: entry.partyId,
        attempts: entry.attempts,
      });
      return;
    }

    case "retry": {
      // An attempt that never left the device is not an attempt: burning the
      // cap on it would retire an entry that could still land, and a report
      // lost to a flapping radio is exactly what the queue exists to prevent.
      if (classification.cause === "offline") {
        counters.retried++;
        return;
      }

      const bumped = await store.bumpAttempts(entry.key);
      if (bumped.state === "failed") {
        counters.failed++;
        console.error(`sync:failed:${entry.type}:attempts_exhausted`, {
          key: entry.key,
          partyId: entry.partyId,
          attempts: bumped.attempts,
          storedReason: bumped.reason,
          cause: classification.cause,
        });
        return;
      }
      if (bumped.state === "missing") {
        // Undone at the door while the drain was in flight. Not an error, and
        // it gets its own category so it never reads like one.
        console.info(`sync:vanished:${entry.type}`, { key: entry.key });
        return;
      }
      counters.retried++;
      return;
    }
  }
}

/**
 * Drain the queue once.
 *
 * Skips when offline or when a drain is already running: the re-entrancy guard
 * is not decoration, since `online` and `visibilitychange` routinely fire
 * together when a phone comes out of a pocket in a room with bad signal.
 *
 * Returns four numbers rather than one. A single count cannot distinguish a
 * drained queue from a discarded one, and that distinction is the requirement:
 * `synced` left because the server holds the record, `failed` left because it
 * never could, `blocked` is waiting for a sign-in, and `retried` is still in the
 * queue. The scanner reads the store directly for what remains — these are what
 * the drain itself just did.
 */
export async function syncPendingCheckins(): Promise<SyncCounters> {
  const counters: SyncCounters = {
    synced: 0,
    retried: 0,
    failed: 0,
    blocked: 0,
  };

  if (!navigator.onLine || isSyncing) return counters;

  isSyncing = true;

  try {
    const pending = await store.getPendingCheckins();

    for (const entry of pending) {
      // Per item, so one bad entry never aborts the drain — the discipline of
      // `api/cron/reconcile-refunds/route.ts:95-127`. Not its catch block,
      // though: that one increments a single error tally and discards the
      // cause, which is the pattern FIX-08 exists to remove. Every terminal
      // classification below is counted **and** logged under its own category.
      try {
        // A ticket entry with no token was rekeyed from version 2 by plan
        // 31-05's upgrade: the bundle that queued it discarded the signature.
        // It cannot prove possession and must not be replayed as though it
        // could — a fabricated token would turn a real admission into a
        // forgery, and the route would refuse it anyway. It is recorded as
        // failed rather than deleted, so it stays visible under "could not be
        // recorded" and the night's runbook covers the person it belongs to.
        if (entry.type === "ticket" && entry.token === null) {
          await store.markFailed(entry.key, "unexpected_response");
          counters.failed++;
          console.error(`sync:failed:${entry.type}:token_missing`, {
            key: entry.key,
            partyId: entry.partyId,
            scannedAt: entry.scannedAt,
          });
          continue;
        }

        const classification = await attempt(entry);
        await applyClassification(entry, classification, counters);

        // The radio went during the drain. Everything after this entry would
        // only be counted, not attempted, so stop and leave the rest pending.
        if (classification.bucket === "retry" && classification.cause === "offline") {
          break;
        }
      } catch (error) {
        // The store itself failed — an IndexedDB error, not a network one. The
        // entry stays exactly where it was, which is the recoverable failure.
        console.error(`sync:store_failure:${entry.type}`, {
          key: entry.key,
          error,
        });
      }
    }
  } finally {
    isSyncing = false;
  }

  return counters;
}

/**
 * Return every held entry to the queue, then drain.
 *
 * A staff session expiring at 02:00 turns every queued entry into a 401, and
 * blocked entries are deliberately never retried — so without this they would
 * wait for a timer that does not exist. Plan 31-11 wires the sign-in prompt to
 * it: one action, and the night's queue is moving again.
 *
 * The unblock happens even when the device is offline. The drain then does
 * nothing and the entries sit in `pending`, which is where the next `online`
 * will find them — the recoverable order, rather than leaving them held on a
 * session that is now valid.
 */
export async function retryBlockedAfterSignIn(): Promise<
  SyncCounters & { unblocked: number }
> {
  const unblocked = await store.unblockAll();
  console.info("sync:unblocked", { unblocked });
  const counters = await syncPendingCheckins();
  return { ...counters, unblocked };
}

/**
 * Set up automatic sync triggers:
 * 1. When device comes back online
 * 2. When app returns to foreground (visibility change)
 *
 * Call this once on mount. Returns a cleanup function.
 *
 * Two triggers, and deliberately no timer: a parallel trigger set is two
 * schedulers fighting over one queue.
 */
export function setupSyncListeners(): () => void {
  const onOnline = () => {
    syncPendingCheckins();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      syncPendingCheckins();
    }
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
