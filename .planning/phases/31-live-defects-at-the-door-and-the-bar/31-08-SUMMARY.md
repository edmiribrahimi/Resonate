---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 08
subsystem: check-in-offline
tags: [door, membership, attendances, door_scan_events, double-bill, sync-queue]
requires:
  - "src/lib/door/outcome.ts (plan 31-02) — DOOR_HTTP and the three-outcome union"
  - "supabase/migrations/20260805120000_door_scan_events.sql (plan 31-04) — attendances.party_id, the two partial unique indexes, and the door_scan_events table"
provides:
  - "The three-outcome contract on the membership half of the door"
  - "A membership presence recorded per party, so a double bill stops manufacturing conflicts"
  - "A door_scan_events row for every recordable membership scan"
  - "A 422 the sync queue can retire, in place of the 200 that deleted the entry"
affects:
  - "src/lib/offline/sync-manager.ts (plan 31-06) — reads the new statuses"
  - "src/components/scanner/ScannerClient.tsx — renders the third outcome"
  - "The FIX-11 review list — now sees the membership half of the night"
tech-stack:
  added: []
  patterns:
    - "Separate fetch + Map to resolve an operator label, never a join (convention: tickets/attendance/route.ts:77-86)"
    - "Additive response: legacy fields kept beside the contract fields, so a staff phone on the previous bundle survives a whole night"
    - "`satisfies` against the shared union literals, so a divergence is a build error"
key-files:
  created: []
  modified:
    - "src/app/api/membership/verify/route.ts"
decisions:
  - "A missing `code` reports `unknown_code`, not `no_party_selected` — the plan's mapping would send staff to the party selector when the fault is an empty scan"
  - "Two of the four POST outcomes cannot write a door_scan_events row, and the file says so: `party_id` is NOT NULL and a foreign key"
  - "`at` stays null when `checked_in_at` is null, rather than substituting the current clock"
  - "The unauthenticated GET is untouched; RATE-01 and QR-01 stay open and are named in the file"
metrics:
  duration: ~35 min
  completed: 2026-08-05
  tasks: 2
  files: 1
---

# Phase 31 Plan 08: The membership half of the door speaks the same three outcomes

Membership scans now record a presence **per party** (so a double bill stops
reporting a false conflict at the second act), return `422` for a code that can
never resolve (so the sync queue retires it instead of deleting or retrying it
forever), name the operator who made the first record, and append a
`door_scan_events` row before answering.

## What was built

### Task 1 — a presence belongs to a party, and a conflict says who recorded it

Commit `e8045d1`.

- **`src/app/api/membership/verify/route.ts:341`** — `party_id: party.id` on the
  `attendances` insert. This is the line that fires tonight: until plan 31-04's
  migration the table was `unique(event_id, user_id)`, so a member present at the
  sunset act of a double bill collided on the second scan at the night act and
  the door was told they had *already been admitted*. Not a rare conflict — a
  **false** one, every time, in front of a queue.
- **`:368`** — `.eq("party_id", party.id)` on the `23505` re-fetch, alongside the
  event and user predicates. It must agree with
  `supabase/migrations/20260805120000_door_scan_events.sql:248-250`:
  `CREATE UNIQUE INDEX attendances_party_user_unique ON public.attendances
  (party_id, user_id) WHERE party_id IS NOT NULL`. Postgres treats NULLs as
  distinct, which is why that migration used two partial indexes rather than one
  three-column key — and why matching on `event_id` + `user_id` alone would, on a
  double bill, return the **other** party's row and report a moment from a
  different act of the same evening. The migration names this file at
  `:262-268` for exactly this reason.
- **`:366`** — the re-fetch selects `checked_in_by`; **`:379-395`** resolves it to
  a label through a separate `profiles(id, full_name)` fetch and a `Map`, the
  convention at `src/app/api/tickets/attendance/route.ts:77-86`. Not a join.
- **`:436-448`** — the conflict response carries `outcome: "already_recorded"`,
  `subject: { type: "membership", id }`, `at` and `by`, at
  `DOOR_HTTP.already_recorded` (409), **while keeping** the legacy `valid`,
  `status`, `member_name` and `checked_in_at` exactly as they were.
- **`:231-238`** — the non-`23505` insert failure gets its own log category, so it
  never reads like the conflict branch above it.

Two judgement calls written into the file rather than left implicit:

- The local is named `firstOperatorId`, not `operatorId` — the outer `operatorId`
  is whoever holds the phone **now**, and on a genuine repeat those are routinely
  two different people at two different doors.
- `at` is the moment of the **first** record. When `checked_in_at` is NULL it
  stays null; substituting the current clock would state this read as the first
  record, which `src/lib/door/outcome.ts:105` forbids in as many words.

### Task 2 — an unknown code is a 422, and every recordable scan lands in the night

Commit `aab8752`.

| Branch | Before | After | Line |
|---|---|---|---|
| absent `partyId` | 400 `{error}` | 422 `not_valid` / `no_party_selected` | `:200-208` |
| unknown party | 404 `{error}` | 422 `not_valid` / `wrong_night` | `:233-241` |
| unknown / blank code | **200** `{valid:false, status:"not_found"}` | **422** `not_valid` / `unknown_code` | `:307-315` |
| success | 200, no status argument | 200 `recorded` + `subject` + `at` | `:489-496` |

The third row is the consequential one. `src/lib/offline/sync-manager.ts:52`
marks a membership entry synced on `res.ok` — which was `true` at 200 — so a scan
the server could never accept was **silently deleted from the queue**. Meanwhile a
permanent 400/404 stayed and was retried on every `online` event and every
`visibilitychange`, forever. The pending count was both inflated by dead entries
and deflated by lost ones; that is FIX-08's *"so the pending count means
something"*.

- **`:163-192`** — `recordScanEvent`, one append to `door_scan_events` with the
  service client, called **before** every return that can carry one:
  `:295` (unknown code, `subject_user_id` NULL) → returns at `:307`;
  `:416` (already recorded) → returns at `:433`;
  `:472` (recorded) → returns at `:489`.
- **`:182`** — `token_fingerprint: null`, with the reason in the docblock at
  `:150-158`: a membership QR is a plain URL carrying the code
  (`src/utils/qr.ts:33-43`), so there is **no signature to digest**. The proof on
  this path is weaker than on the ticket path, and that is recorded rather than
  papered over with a digest of something unsigned.
- **`:302-305`, `:427-430`, `:483-486`** — a failed `door_scan_events` insert
  returns a retryable 500, never `recorded`. An entry the queue believes was
  recorded end to end, but which left no trace, is an entry that disappears.
- **`:107-119`, `:129-132`** — `scannedAt`, `deviceId` and `source` accepted on the
  body and validated explicitly (no validation library exists here and none was
  added). Each **falls back** rather than rejecting: refusing would strand a
  queued entry from an older bundle on a staff phone. The device clock is
  evidence, never authority — the `attendances` row keeps the server clock
  (`:343`), the phone's reading goes on the event row (`:179`).
- Both `.single()` branches handled distinctly on the party lookup (`:220-226`)
  and the profile lookup (`:281-291`): "does not exist" is a miss, "there are
  two" is data corruption and gets its own log category.

## Verification

**There is no test runner in this repository, so nothing here is verified because
"the tests pass".** `npm run build` (which is also the typecheck gate) is the only
automatic check, and it passes on both commits.

Automated, run and recorded:

- `npm run build` → `✓ Compiled successfully`
- Every `NextResponse.json` in the POST branch carries an explicit status:
  **15 calls, 15 explicit statuses** (`awk` over lines 80–511).
- `grep -n "party_id"` → `:341` (insert), `:368` (re-fetch predicate)
- `grep -n "DOOR_HTTP.not_valid"` → `:207`, `:240`, `:314`
- `grep -n "door_scan_events"` → `:169` (the insert)

### Manual verification still owed — written, not evoked

The migration **is not applied to the live database.** `src/types/database.ts`
carries its types, so the build compiles; that green says nothing about the live
schema. Everything below must be run **after** the migration is applied, as
`master` or `organizer`, on a real double bill.

1. **A double bill does not manufacture a conflict.** On one event with two
   parties, POST the same `membership_code` to party A, then to party B. Both
   return HTTP 200 with `outcome: "recorded"`. Then read
   `select id, party_id from attendances where user_id = <id>` — **two rows,
   different `party_id`**. Record both row ids.
2. **A genuine repeat says who and when.** POST the same code twice at party A.
   The second returns HTTP **409** with `outcome: "already_recorded"`, a real
   `at`, and `by.operatorLabel` naming the operator of the first read (use two
   different staff accounts to make the distinction visible).
3. **An unknown code is retired, not deleted.** POST a `code` that does not
   exist, with a valid `partyId`. Expect HTTP **422**, `outcome: "not_valid"`,
   `reason: "unknown_code"` — and a `door_scan_events` row for that party with
   `subject_type = 'membership'`, `subject_user_id IS NULL`, `cause IS NULL`.
4. **Offline, on the device.** Queue a membership scan with the network
   disabled, close the app, reopen it, restore the network. The entry drains on a
   `recorded` or a `409`, and stops being retried on a `422`. This is the path
   that matters at two in the morning; the desk with fibre proves nothing here.

## Deviations from Plan

### 1. [Rule 3 — blocking constraint] Two of the four outcomes cannot be recorded

- **Found during:** Task 2
- **Issue:** The plan asks for a `door_scan_events` row on **every** one of the
  four POST outcomes. `door_scan_events.party_id` is `NOT NULL` and a foreign key
  to `event_parties` (migration `:64-66`), deliberately — "the party is the unit
  of the review list, not the event". A scan with **no** `partyId` has no night to
  file itself under, and a scan naming an **unknown** party has no
  `event_parties` row to point at.
- **Fix:** Those two branches return their 422 without a row, and the file says
  why at `:194-198` and `:229-232`. The two outcomes that *are* recordable
  (`unknown_code` with a known party, and both admission outcomes) all write one.
  The plan's own acceptance criterion names only the `unknown_code` and `recorded`
  rows, and both exist.
- **Files modified:** `src/app/api/membership/verify/route.ts`
- **Commit:** `aab8752`

### 2. [Rule 2 — correctness] A missing `code` reports `unknown_code`

- **Found during:** Task 2
- **Issue:** The plan maps the old `:78-83` branch (missing `code` **or**
  `partyId`) onto `no_party_selected`. For a missing `code` that names the wrong
  cause: it sends a member of staff to the party selector when the fault is an
  empty scan.
- **Fix:** `partyId` absent → `no_party_selected`; `code` absent or blank →
  `unknown_code`. Both permanent, both 422, so the queue's classification is
  unchanged. Reasoned at `:277-283`. `meta-gates.md` forbids collapsing distinct
  causes into one message; this is the same rule applied to a reason code.
- **Files modified:** `src/app/api/membership/verify/route.ts`
- **Commit:** `aab8752`

### 3. [Rule 2 — correctness] `.single()` handled on both branches

- **Found during:** Task 2
- **Issue:** Both lookups destructured `data` only. `checkin-offline.md`'s *gate
  query a esito singolo* is explicit: "does not exist" and "there are two" are
  different errors, and the second is data corruption. Two profiles on one
  `membership_code` would have silently read as a miss and produced a red screen
  at the door.
- **Fix:** `PGRST116` is the miss; anything else is logged with its own category
  and returns a 500.
- **Files modified:** `src/app/api/membership/verify/route.ts`
- **Commit:** `aab8752`

## Deferred, and named

| Item | Status | Where |
|---|---|---|
| **RATE-01** — the unauthenticated GET is a brute-force oracle | **Open, untouched.** No rate limiting exists anywhere in this repository | Comment at `route.ts:5-15` |
| **QR-01** — `generateMembershipCode` uses `Math.random()` (`src/utils/qr.ts:49`) | **Open, untouched.** The code space it guards is the one RATE-01 exposes | Comment at `route.ts:150-158` |
| A membership scan carries **no signature** to fingerprint | **Accepted and recorded**, not mitigated. `token_fingerprint` is NULL by construction on this path | `route.ts:150-158`, `:182` |
| The POST admits on `membership_code` alone, **without reading `status`** | **Pre-existing, out of scope, and left alone deliberately.** `member` is a role and `approved` is a status — two different axes. Adding a status check here would introduce a new way to **refuse** someone at the door, which is the error this phase exists to remove; it is a product decision, not a fix | — |
| `two_devices` cannot be classified for a row whose `device_id` fell back to `"unknown"` | Accepted — rejecting the sync would strand the entry | `route.ts:129-132` |

## Threat Flags

None. No new network surface, auth path, file access or trust-boundary schema
change beyond what `31-08-PLAN.md`'s `<threat_model>` already registers. The
mitigations it assigns are implemented: T-31-08-01 (`:307-315`), T-31-08-02
(`:341`, `:368`), T-31-08-03 (`:366`, `:379-395`, `:445-447`), T-31-08-06 (the
service client is reachable only after the `master`/`organizer` guard at
`:100-109`, and every value it writes is server-derived or validated — stated in
the commit message and at `:132-135`).

## Known Stubs

None.

## Self-Check: PASSED

- `src/app/api/membership/verify/route.ts` — FOUND
- `.planning/phases/31-live-defects-at-the-door-and-the-bar/31-08-SUMMARY.md` — FOUND
- commit `e8045d1` — FOUND
- commit `aab8752` — FOUND
- `npm run build` — passes
- Files touched: 1, exactly the one in `files_modified`. No sibling plan's file
  was opened for writing.
