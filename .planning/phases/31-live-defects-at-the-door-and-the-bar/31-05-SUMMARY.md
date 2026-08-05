---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 05
subsystem: check-in-offline
tags: [indexeddb, offline, door, queue, migration]
requires:
  - src/lib/door/outcome.ts (plan 31-02 — DoorSubjectType, DoorNotValidReason)
provides:
  - "IndexedDB v3: composite record keys, a stable per-install device id, a merging refresh with a plausibility guard, a four-state queue"
  - "mergeAttendees returns a refusal as a value (MergeResult), not an exception"
  - "getDeviceId() — stable across reloads, required by door_scan_events.device_id NOT NULL"
  - "findBySubject() — lets the offline path answer wrong_night locally"
affects:
  - src/lib/offline/sync-manager.ts (plan 31-10 — addresses entries by composite key)
  - src/app/(admin)/admin/scanner/ScannerClient.tsx (plan 31-11 — must render the refusal and the four states)
tech-stack:
  added: []
  patterns:
    - "copy-then-delete versionchange migration, only idb promises awaited inside"
    - "monotone guard: local-true with a matching queue entry beats a server false"
    - "refusal-as-a-value, because there is no error tracking and the phone is the only observer"
key-files:
  created: []
  modified:
    - src/lib/offline/checkin-store.ts
    - src/lib/offline/sync-manager.ts
    - src/app/(admin)/admin/scanner/ScannerClient.tsx
decisions:
  - "The rekey reads every legacy row into memory inside the versionchange transaction, then deletes, then re-creates under the same final names. The alternative (a temporary store and two copies) buys nothing: an abort rolls the whole transaction back either way."
  - "getDeviceId falls back to crypto.getRandomValues where crypto.randomUUID is unavailable — randomUUID is secure-context only, and a missing device id makes a scan unrecordable."
  - "getPendingCount() counts only state='pending'; blocked entries are counted separately. The plausibility guard instead uses the whole store, because a blocked entry is also unreported local knowledge."
  - "The FIRST queued entry for a key is kept; a second read of the same subject at the same party does not overwrite it, which would move scannedAt forward and erase when the person actually came in."
  - "Tasks 1-3 shipped in one commit: no intermediate state of this file compiles, and 'npm run build' is an acceptance criterion of each task."
metrics:
  duration: ~50 min
  completed: 2026-08-05
---

# Phase 31 Plan 05: The Offline Store at Version 3 Summary

The device's own knowledge of a night is now authoritative until it has been
reported: a refresh can only add, a refusal is a value the screen can show, and
a queued scan carries the signed token and the device it was read on.

## What Changed

`src/lib/offline/checkin-store.ts` went from 263 to 963 lines at `DB_VERSION` 3.

### Task 1 — Version 3: composite keys, a device that has a name, a lossless rekey

- `DB_VERSION = 3` (`checkin-store.ts:42`); the upgrade branches on
  `if (oldVersion >= 3) return;` (`:296`).
- `attendeeKey(partyId, subjectType, subjectId)` (`:205`) — the key format
  exists in exactly one place. Every producer calls it.
- `getDeviceId()` (`:380`) — reads `meta` for `"deviceId"`, generates with
  `crypto.randomUUID()` (`:223`) and persists. One read-write transaction, so
  two tabs opening at once cannot each generate an id and disagree.
- New `by-subject` index on `attendees.subjectId` (`:342`, declared `:134`,
  read by `findBySubject` `:591`).
- New stores: `failedCheckins` (`:345`) and `meta` (`:351`). `members` is
  unchanged (`:348`) — a membership code is genuinely global.

**Copy-then-delete, asserted by line order.** The reads that copy the legacy
rows out are at `:326` (`attendees`) and `:329` (`pendingCheckins`). The only
two `deleteObjectStore` calls are at `:336` and `:337`. The copy is complete
before the first delete is issued. The stores are then re-created under the
same final names at `:340`–`:343`, and the rekeyed rows written back at `:360`
and `:365`.

**Route taken, stated because a reader needs to know:** the legacy rows are read
into memory inside the versionchange transaction, then the legacy stores are
deleted, then re-created with `keyPath: "key"`, then repopulated. No temporary
store. If any step throws, the whole versionchange transaction aborts and rolls
back as a unit, so the version-2 stores survive intact — the guarantee is the
same as the two-copy route, at half the moving parts. The reasoning is written
into the file at `:298`–`:315`.

**The awaits inside the versionchange transaction, in full:** `:326`
(`getAll`), `:329` (`getAll`), `:332` (`get`), `:356` (`put`), `:360` (`put`),
`:365` (`put`). All six are `idb` promises. Nothing else is awaited — one await
on a fetch or a timer would close the transaction mid-migration, and no test
runner in this repository could catch it.

**A legacy pending entry rekeys with `token: null`** (`:264`), not with a
fabricated token. An entry queued before this release genuinely has no token;
a fabricated one would fail HMAC verification and turn a real admission into an
apparent forgery.

### Task 2 — A refresh that merges, and refuses out loud

- `mergeAttendees(partyId, rows): Promise<MergeResult>` (`:467`) replaces
  `cacheAttendees`. `MergeResult` (`:429`) is
  `{ applied: true; merged }` or `{ applied: false; reason; cached; received }`.
  Both refusal reasons are reachable and neither path throws:
  `"empty_payload"` at `:482`, `"payload_smaller_than_cache"` at `:487`.
- **The monotone rule** is at `:510`:
  `const localWins = local && local.checkedIn === true && hasUnreportedEntry ? local : null;`
  and it decides `checkedIn` (`:524`), `checkedInAt` (`:525`) and `checkedInBy`
  (`:528`, falling back to `THIS_DEVICE_LABEL`). A refresh may add knowledge; it
  may never subtract an admission that has not yet been reported.
- **Rows absent from the payload are not touched.** The merge loop iterates the
  payload only (`:499`). Pruning lives solely in `pruneParty(partyId,
  olderThanIso)` (`:548`), which additionally refuses to drop any row that still
  has an unreported queue entry (`:561`).
- `cacheMembers` (`:939`) no longer clears — it merges. The roster is the
  device's only way to resolve a membership code offline.

### Task 3 — A queue with four states, carrying the token and the device

All fifteen exports named in the plan exist: `getDeviceId` (`:380`),
`mergeAttendees` (`:467`), `findAttendee` (`:571`), `findBySubject` (`:587`),
`checkInLocally` (`:612`), `checkInMemberLocally` (`:693`), `markSynced`
(`:805`), `markFailed` (`:839`), `markBlocked` (`:866`), `bumpAttempts`
(`:905`), `getPendingCheckins` (`:764`), `getPendingCount` (`:778`),
`getFailedCheckins` (`:788`), `getBlockedCount` (`:783`), `attendeeKey`
(`:205`). Plus `getFailedCount` (`:794`), `unblockAll` (`:880`),
`getBlockedCheckins` (`:771`), `pruneParty` (`:548`), `undoCheckInLocally`
(`:749`), `markCheckedInLocally` (`:732`).

- `markFailed` **moves** the entry: it puts into `failedCheckins` (`:852`) then
  deletes from the pending store within the same transaction (`:853`). The only
  two `db.delete("pendingCheckins", …)` calls in the file are at `:760`
  (inside `undoCheckInLocally`, which starts `:749`) and `:807` (inside
  `markSynced`, which starts `:805`).
- `markBlocked` (`:866`) keeps the entry in `pendingCheckins` and changes only
  `state` (`:874`).
- The attempts cap is the named constant `MAX_SYNC_ATTEMPTS = 8` (`:55`), read
  at `:918`. Not an inline number.
- `checkInLocally` stores the token unmodified (`:666`). There is no
  `.split(".")` anywhere in the file (`grep -c` returns 0).
- The module docblock (`:8`–`:38`) states the four facts, including the honest
  limit: a membership QR carries no signature, so a membership entry queues with
  `token: null` because there is nothing to carry — a weaker proof than a
  ticket's, written down rather than papered over.

## Deviations from Plan

### 1. [Rule 3 — Blocking] The two callers were adapted, though the plan assigns them to 31-10 and 31-11

- **Found during:** Task 3, at the first typecheck.
- **Issue:** every store signature changed with the record key. Leaving
  `sync-manager.ts` and `ScannerClient.tsx` untouched left the repository
  unbuildable, and `npm run build` is an acceptance criterion of all three
  tasks — and of waves 3 and 4 that follow.
- **The one that could not be deferred safely:** `checkInMemberLocally` went
  from `(membershipCode, partyId)` to `(partyId, membershipCode)`. Both are
  `string`, so the old call site would have compiled and silently written every
  membership admission under a transposed key. That is a data-corruption trap,
  not a compile error, so the call site had to change.
- **Fix:** the mechanical minimum. `cacheAttendees` → `mergeAttendees` (the
  `MergeResult` is still dropped at the call site, with a comment naming 31-11
  as its renderer); `findAttendee` / `checkInLocally` / `markCheckedInLocally`
  take the party and the subject type; `checkInLocally` receives the full
  scanned string as `token`; `sync-manager` addresses entries by `key` and reads
  `subjectId`. None of 31-10's classification or 31-11's rendering is
  pre-empted.
- **Also:** the two offline ticket branches now require a selected party
  (`ScannerClient.tsx:356`), matching the guard the membership branch already
  had (now `:525`).
  A scan without a party has no meaning and the record key is party-scoped
  (`checkin-offline.md`, gate *identità del party*).
- **Files modified:** `src/lib/offline/sync-manager.ts`,
  `src/app/(admin)/admin/scanner/ScannerClient.tsx`
- **Commit:** `f949d78`

### 2. [Rule 2 — Missing critical functionality] A device-id fallback for non-secure contexts

- **Found during:** Task 1.
- **Issue:** `crypto.randomUUID` is restricted to secure contexts. A staff
  phone reaching a preview build over plain http would get a `TypeError`, the
  whole `openDB` upgrade would abort, and the store would be unusable — while
  `door_scan_events.device_id` is NOT NULL, so the scan would be unrecordable.
- **Fix:** `newDeviceId()` (`:221`) uses `crypto.randomUUID()` when present and
  otherwise builds a v4 UUID from `crypto.getRandomValues`, which is **not**
  secure-context restricted. Both are CSPRNGs, so this does not repeat the
  `Math.random()` defect in `src/utils/qr.ts` (QR-01, still deferred and still
  present — not touched here).
- **Commit:** `46a5695`

### 3. [Rule 2] Richer return values than the plan specified

- `mergeAttendees`' refusal carries `cached` and `received` alongside `reason`,
  so 31-11 can say *how many* rows were kept rather than only that something was
  refused. The required fields are exactly as specified; these are additions.
- `checkInLocally` returns `LocalCheckinResult` (`:595`) with `wasCached`,
  `alreadyRecorded` and `at`, rather than `AttendeeRecord | null`. The plan's
  minimal return cannot express *not in the cache* (admit and flag, FIX-09) or
  *already recorded by this device* (the third outcome with its `at`), and the
  RESEARCH § Answer B outcome table requires both offline.
- `markFailed` / `markBlocked` return `boolean` and `bumpAttempts` returns a
  `BumpResult` (`:895`), so a caller can distinguish "recorded as failed" from
  "there was nothing there" instead of assuming. Zero silent failures applies to
  this module's own API, not only to its `catch` blocks.
- **Commit:** `46a5695`

### 4. [Structural] Tasks 1–3 shipped as one commit

No intermediate state of this file compiles: Task 1's schema change breaks the
old `cacheAttendees`, and Task 2's merge is written against Task 3's queue
shape. Splitting the commit would have produced two commits that fail the build
gate each task declares. The rewrite is `46a5695`; the caller adaptation is a
separate commit, `f949d78`.

## Authentication Gates

None.

## Verification

**This repository has no test runner.** Nothing below is verified by tests, and
nothing here should be read as if it were.

Automated, run in this worktree:

| Check | Result |
|---|---|
| `npm run build` (`next build --webpack`, includes the typecheck) | passes |
| `npx tsc --noEmit` | clean |
| `npm run lint` | no new problem in the three files; the ScannerClient warnings are pre-existing |
| `grep -c "\.clear()" src/lib/offline/checkin-store.ts` | `0` |
| `grep -c "cursor.delete()" src/lib/offline/checkin-store.ts` | `0` |
| `grep -c 'split("\.")' src/lib/offline/checkin-store.ts` | `0` |
| `grep -n "DB_VERSION = 3"` | `:42` |
| `grep -n "by-subject"` | `:134`, `:342`, `:591` |
| `grep -n 'db.delete("pendingCheckins"' | `:760` (undoCheckInLocally), `:807` (markSynced) — nowhere else |

**Not verified, and cannot be here.** The upgrade path, the merge and the queue
have no in-repo precedent and no behaviour observable in `npm run dev`, where
the service worker is disabled (`next.config.ts:13`). Their verification is the
manual door pass in `31-VALIDATION.md`, **against a production build or a
preview deployment, on a phone**. Specifically still unproven:

1. That a real version-2 database on a real device upgrades without losing a
   row. The rekey is lossless by construction — both legacy values already
   carry `partyId` — but it has been run zero times against real data.
2. That `deleteObjectStore` and `createObjectStore` behave as expected after an
   awaited `idb` request inside the versionchange transaction. The reasoning is
   sound (both throw on the identical "transaction's state is not active"
   predicate that `put` throws on, and awaiting a request then issuing another
   is the premise of the whole library — the official `idb` README documents
   `async upgrade` and casting to an old schema for exactly this), but reasoning
   is not observation. **Watch this first on the door pass:** open the scanner on
   a device that already holds a version-2 database and confirm the attendee
   list and the pending count survive.
3. That a refusal is visible. It is not, yet — `ScannerClient.tsx` still drops
   the `MergeResult`. Plan 31-11 owns that, and until it lands FIX-06 is
   *implemented but unobservable*.

## Known Stubs

None. One deliberate incompleteness, named rather than hidden: the
`MergeResult` refusal has no renderer until plan 31-11, so the guard protects
the cache but says nothing to the staff member. The plan assigns that surface to
31-11 and the call site carries a comment saying so.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change
at a trust boundary. The threat register's dispositions in the plan are all
`mitigate` on this file and all are implemented:

| Threat | Where it is mitigated |
|---|---|
| T-31-05-01 stale payload replacing a good cache | `:478`–`:492`, the plausibility guard, refusal returned as a value |
| T-31-05-02 an offline admission reverted by a refresh | `:510`, the monotone rule |
| T-31-05-03 a queued entry destroyed by a second party | `:205`, the composite key |
| T-31-05-04 a synced check-in indistinguishable from a typed id | `:666`, the token stored unmodified |
| T-31-05-05 an entry retried forever | `:55` / `:918`, the named cap; `:839`, `markFailed` |
| T-31-05-06 the upgrade deleting before copying | `:326`, `:329` before `:336`, `:337` |
| T-31-05-07 roster at rest on a staff device | accepted, unchanged — narrowing it would remove the offline door |

## Notes for the Plans That Follow

- **31-10 (sync-manager):** `getPendingCheckins()` returns only
  `state === "pending"` — blocked entries are excluded from the drain by
  construction. Use `bumpAttempts` for the retry bucket, `markFailed` for the
  dead bucket, `markBlocked` for 401/403, and `unblockAll()` after a successful
  sign-in. `markSynced` is the only path that removes an entry, and the plan is
  explicit that it must follow confirmation, not merely a response.
- **31-11 (ScannerClient):** `mergeAttendees` already returns the refusal; the
  call site at `ScannerClient.tsx:173` drops it and carries a comment saying so.
  `checkInLocally` returns `wasCached` and `alreadyRecorded`, which is what the
  three offline outcomes need. `findBySubject(subjectId)` distinguishes *not in
  the cache* from *another night*. `getBlockedCount()` and `getFailedCount()`
  exist for the chips, and note the pill's yellow-500 is already taken by
  "Offline".
- **31-06 (attendance payload):** `AttendeeRow` (`:403`) already accepts
  `subjectType`, `subjectId`, `checkedInBy` and `refundedAt` as optional. Send
  them and the derivation in `resolveSubject` (`:440`) stops being used; until then the legacy
  `isGuestList` + id pair is derived from, and carries the same information.
- **Open, and not decided here:** a party switch should call `pruneParty`, but
  nothing calls it yet. Until something does, cached rows for old parties
  accumulate. That is a bounded leak on a staff device, not a correctness
  defect, and pruning was made a deliberate call precisely so it is not a side
  effect of a refresh.

## Self-Check: PASSED
