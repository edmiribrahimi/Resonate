---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 10
subsystem: checkin-offline
tags: [offline-queue, sync, door, fix-03, fix-08, fix-10]
requires:
  - "src/lib/door/outcome.ts (31-02) — DoorOutcome, isDoorOutcome"
  - "src/lib/offline/checkin-store.ts (31-05) — composite key, four transitions, MAX_SYNC_ATTEMPTS"
  - "src/app/api/tickets/checkin/route.ts (31-07) — three outcomes, insert-then-respond"
  - "src/app/api/membership/verify/route.ts (31-08) — unknown code is 422, not 200"
provides:
  - "syncPendingCheckins(): Promise<SyncCounters> — { synced, retried, failed, blocked }"
  - "retryBlockedAfterSignIn(): Promise<SyncCounters & { unblocked }> — the sign-in recovery 31-11 wires"
  - "SyncCounters — the renderable shape of one drain"
affects:
  - "src/app/(admin)/admin/scanner/ScannerClient.tsx (31-11) — both existing call sites ignore the resolved value, so the widened return type is additive"
tech-stack:
  added: []
  patterns:
    - "Classify on the response body, never on the transport status alone"
    - "Namespace import of the store, so every effect on the queue names where it lands"
key-files:
  created: []
  modified:
    - "src/lib/offline/sync-manager.ts"
decisions:
  - "An offline entry mid-drain is not bumped and the drain stops — an attempt that never left the device must not burn the retry cap"
  - "The guest route's HTTP 200 { success: true } is accepted as a recorded outcome through one narrow, named predicate"
  - "The store is imported as a namespace, so markSynced/markFailed/markBlocked each appear exactly once"
metrics:
  duration: ~35 min
  completed: 2026-08-06
---

# Phase 31 Plan 10: The Sync Manager Stops Throwing Away Its Evidence — Summary

The drain now classifies on the response body instead of the transport status,
so a conflict reaches the night's record before the queue lets go of it, an
entry that can never succeed is retired visibly, and a session that expires at
02:00 is a state the door recovers from in one action.

## What Changed

`src/lib/offline/sync-manager.ts` — the only file touched — went from 105 lines
with three faults in fourteen of them to one classifier, four buckets and one
rule: **an entry leaves the queue only when the server has said, in its own
body, that the scan is on the record.**

### The three faults, closed

| Fault | Was | Is |
|---|---|---|
| FIX-10 | the queued entry travelled as a bare identifier | `token: entry.token`, the signed string as read (`:193`) |
| FIX-03 | the transport flag was true for a 200-encoded conflict, so the duplicate was deleted | `switch (body.outcome)` (`:144`); `already_recorded` drains **only** because the route persists the row first, and the coupling is written at the branch (`:147-155`) |
| FIX-08 | no third answer: dead entries retried forever, live ones deleted | four buckets — `done` / `retry` / `dead` / `blocked` (`:57-61`) |

### The four buckets

- **done** → `store.markSynced` (`:280`). The only path that removes an entry.
- **retry** → `store.bumpAttempts` (`:319`), which enforces 31-05's named cap.
- **dead** → `store.markFailed` (`:300`). Moves the entry to `failedCheckins`,
  where it stays visible and countable. Never deleted.
- **blocked** → `store.markBlocked` (`:290`). Keeps the entry, stops the
  retries. Recoverable through `retryBlockedAfterSignIn` (`:434`).

`grep -c "markBlocked"` returns **1**: the store is imported as a namespace
(`import * as store`), so the single call site is the only line that names it,
and the same holds for `markSynced` and `markFailed`.

### The counters

```ts
export async function syncPendingCheckins(): Promise<SyncCounters>   // :357
export interface SyncCounters {                                      // :261
  synced: number; retried: number; failed: number; blocked: number;
}
```

A single number could not tell a drained queue from a discarded one, which is
the distinction FIX-08 is about. Both existing callers
(`ScannerClient.tsx:182`, `:695`) ignore the resolved value, so the widened
type is additive and **that file was not touched** — it belongs to 31-11.

### What reaches the person holding the phone

There is no error tracking in this project, so the observable effect is not a
log. It is: the counters this module returns, plus `failedCheckins` and
`getBlockedCount()` in the store, which 31-11 renders. Every terminal
classification is *also* logged, under a category that names the bucket, the
entry's kind and the cause — `sync:failed:ticket:invalid_signature`,
`sync:blocked:membership`, `sync:vanished:guest`, `sync:store_failure:ticket`,
`sync:failed:ticket:token_missing`, `sync:failed:ticket:attempts_exhausted` —
never a message shared between causes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The guest route's success carries no `outcome`, and the plan's table would have recorded it as failed**

- **Found during:** Task 2, reading `src/app/api/tickets/attendance/route.ts`
- **Issue:** The plan's interface section states that route answers "200, or 409
  with `outcome: already_recorded`". The 409 does carry it (`:645-652`), but the
  **success** still answers `{ success: true, name, checkedInAt }` at HTTP 200
  with no `outcome` field (`:688-692`). Under the plan's seventh row —
  *anything else → dead* — a guest who really had been checked in would have
  been moved to `failedCheckins` on every successful sync.
- **Fix:** One narrow, named predicate, supplied only by the guest branch:
  `guestLegacySuccess` requires status 200 **and** an explicit `success === true`
  (`:96-100`). No other 200 passes it. It is a documented compatibility shim with
  a stated removal condition — when that route joins the contract — not a
  widening of the classifier.
- **Why not fix the route instead:** the plan pins `files_modified` to this file
  alone, and plan 31-12 is running in parallel.
- **Commit:** a85cc87

**2. [Rule 2 — Missing critical behaviour] An offline entry mid-drain no longer burns the retry cap**

- **Found during:** Task 1
- **Issue:** The plan's first row sends `navigator.onLine === false` to
  `bumpAttempts`. The cap is 8 (`checkin-store.ts:55`), and past it an entry is
  retired as `unexpected_response`. At a door with a flapping radio, eight drains
  that each start online and lose signal would retire **live** entries under a
  cause that never happened — a report lost to bad signal, described as an
  unexpected server answer.
- **Fix:** an attempt that never left the device is not an attempt. The `offline`
  cause counts as `retried`, does not bump, and stops the drain (`:311-317`,
  `:404-407`); the remaining entries stay untouched in `pending` for the next
  `online`. A genuine transport throw — the request left and failed — still
  bumps, because that is a real attempt.
- **Commit:** 9cf2810

### Ordering note, not a deviation

The classifier was written as a shared function in Task 1 rather than extracted
in Task 2. Task 1 requires `grep -c "res.ok"` to return **0** over the whole
file, which the membership and guest branches could not satisfy while still
using the old test — so routing all three through one classifier immediately was
the only way to keep both the build and that criterion green without writing
throwaway code twice. Task 2's own scope (the counters, the sign-in recovery,
the categorised logging, the guest evidence note) is intact in `a85cc87`.

## The guest path carries less evidence, and it is not being hidden

`/api/tickets/attendance` accepts `guestListEntryId` and nothing else
(`route.ts:537`). So a guest-list entry synchronises **without** its device
clock, its device id or its `source` — meaning a guest admission cannot be told
apart afterwards as having arrived through the queue, and cannot be classified
`two_devices`. Sending those fields anyway would have them silently ignored,
which reads like evidence and is not. Written at the branch (`:214-220`) and
recorded here rather than papered over.

## Verification

**There is no test runner for the product in this repository.** Nothing below is
claimed on the strength of a passing test.

### Automatic

| Check | Result |
|---|---|
| `npm run build` (Next's typecheck) | ✓ Compiled successfully |
| `grep -c "res.ok" src/lib/offline/sync-manager.ts` | 0 |
| `grep -c "offlineSync" src/lib/offline/sync-manager.ts` | 0 |
| `grep -c "markBlocked" src/lib/offline/sync-manager.ts` | 1 |
| `grep -c "catch { errors++ }"` / `grep -c "catch {}"` | 0 / 0 |
| `grep -c "setInterval\|setTimeout"` | 0 |
| `addEventListener` occurrences | exactly 2 — `online`, `visibilitychange` |
| `grep -n "isDoorOutcome"` | `:3`, `:64`, `:143` |

### Manual, to be run before this reaches a door

A **production build on a phone** — `npm run build && npm start`, then the
device. Never `npm run dev`: the service worker is disabled there, and the
service worker is half of what the offline path is.

1. **A conflict survives (FIX-03).** With the party selected, check a ticket in
   online. Put the phone in airplane mode, scan the same ticket → green, one
   entry in `pending`. Restore the network and let a `visibilitychange` fire.
   *Expect:* the entry leaves `pending`, and a `door_scan_events` row with
   `outcome = 'already_recorded'` and `source = 'offline_sync'` exists for it.
   *Record:* the entry key and the row id.
2. **A dead entry retires visibly (FIX-08).** Queue a membership scan offline for
   a code that resolves to nobody. Reconnect. *Expect:* it leaves `pending`,
   appears once in `failedCheckins` with `reason = 'unknown_code'`, and is **not**
   retried on a subsequent `visibilitychange`. *Record:* the entry key and the
   reason.
3. **An expired session keeps the night.** With a non-empty queue, invalidate the
   session (sign out in another tab), then reconnect. *Expect:* entries move to
   `blocked`, the queue is intact, nothing is retried. Sign in, call
   `retryBlockedAfterSignIn()`. *Expect:* they drain.
4. **The token travels (FIX-10).** Check the network tab on a synced ticket
   entry: the POST body carries `token`, `partyId`, `scannedAt`, `deviceId`,
   `source` — and no bare identifier.

Steps 1 and 2 require this phase's migration to be applied to the database it is
run against. `door_scan_events` does not exist until it is, and **no green build
proves otherwise**: the Supabase clients are not parameterised with `Database`,
so no column name in this repository is checked by the build.

## Deferred / Out of Scope

- **RATE-01** — there is no rate limiting anywhere in this repository. The
  blocked bucket stops a retry storm against `/api/tickets/checkin` from a device
  with an invalid session, which is a mitigation of one path, not a fix for the
  gap. Recorded, not silently relied upon.
- **The legacy guest-success shim** comes out when
  `/api/tickets/attendance` answers its success on the three-outcome contract.
  Until then a guest sync is confirmed by `success: true`, one release of
  compatibility, exactly like the additive legacy fields in the other two routes.
- **`ScannerClient.tsx:173`** still drops the value `mergeAttendees` returns, and
  nothing yet renders these counters. That is 31-11, next wave, and this plan
  deliberately did not touch that file.

## Known Stubs

None. Every branch of the classifier acts on the store; nothing returns a
placeholder.

## Threat Flags

None. No new network surface, no new auth path, no schema change: this plan
changes which of three existing endpoints a queued entry is sent to and how its
answer is read.

## Self-Check: PASSED

- `src/lib/offline/sync-manager.ts` — FOUND
- `.planning/phases/31-live-defects-at-the-door-and-the-bar/31-10-SUMMARY.md` — FOUND
- commit `9cf2810` — FOUND
- commit `a85cc87` — FOUND
