---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 11
subsystem: checkin-offline
tags: [door, scanner, three-outcomes, offline, observability, fix-04a, fix-06, fix-08]
status: blocked-on-checkpoint
requires:
  - "src/lib/door/outcome.ts (31-02) — DoorOutcome, isDoorOutcome, DoorFlag, DoorNotValidReason"
  - "src/utils/haptics.ts (31-02) — vibrateAlreadyRecorded, the third pattern"
  - "src/lib/offline/checkin-store.ts (31-05) — MergeResult, findBySubject, getDeviceId, attendeeKey, the four queue states"
  - "src/app/api/tickets/attendance/route.ts (31-06) — subjectType/checkedInBy/refundedAt, the diagnostics, the 500"
  - "src/app/api/tickets/checkin/route.ts + undo/route.ts (31-07) — the three outcomes, and the undo's partyId requirement"
  - "src/lib/offline/sync-manager.ts (31-10) — SyncCounters, retryBlockedAfterSignIn"
provides:
  - "A three-state ScanFlash driven by one lookup keyed by the semantic type"
  - "The same three outcome names on the online and the offline path, for tickets and for memberships"
  - "An uncached but well-formed ticket token admitted and flagged offline, never refused"
  - "partyId and deviceId sent with every scan and every undo"
  - "pending / failed / blocked counters rendered in both connectivity states"
  - "A persistent banner for a refused refresh, the 31-06 diagnostics and the 31-06 500"
affects:
  - "Phase 42 (DS-04) — the scanner's colour is now changed in exactly one place, ScanFlash's FLASH_STATES"
  - "plan 31-12 — the review list reads the rows these scans write; deviceId now travels, so two_devices is classifiable"
  - "the door runbook — the offline membership refusal has a written workaround that belongs in it"
tech-stack:
  added: []
  patterns:
    - "semantic prop + module-scope lookup, instead of a boolean ternary that does not extend"
    - "classify transport status in the same order as the sync manager, then read the body"
    - "read every field off the raw body, since isDoorOutcome is deliberately narrow"
    - "refusal-as-a-value rendered as a persistent banner, never a toast"
decisions:
  - "The third ScanFlash state is named `already_recorded` and also carries a flagged admission. Both mean *admitted, look at this afterwards*; the union stays at three members and the name is the one the contract already uses."
  - "Amber (`amber-500`) for the third state, because `yellow-500` is the Offline pill and the two must not read as one signal in the dark."
  - "The Offline pill lost its `(N)`: it is the connectivity indicator, and the count now lives in a chip that renders in both states."
  - "Offline, an uncached well-formed ticket token is admitted and flagged; an unknown membership code is still refused. A ticket is HMAC-signed and re-verified on sync — a bounded window; a membership QR has no signature and its code space comes from Math.random (QR-01), so admitting it would be unbounded with nothing downstream able to catch it."
  - "cacheMembers is awaited and its failure is a banner, because a stale roster produces a false refusal at the door — the consequence the plan asked to be judged."
  - "An undo performed offline drops the queue entry locally. Leaving it would report the admission on the next drain, so the reversal a member of staff performed would never have happened."
metrics:
  tasks_completed: 3
  tasks_total: 4
  commits: 3
  files_created: 0
  files_modified: 2
  completed: 2026-08-06
---

# Phase 31 Plan 11: The Door Says the Same Three Things, With the Radio On and Off — Summary

The scanner now answers with one of three states whichever path produced it, the
third one states a fact instead of passing a verdict, nobody valid is turned away
by a cache that had not heard of them, and the failures that used to reach only a
log now reach the one observer this project has — the screen of the person at the
door.

**Commits:** `cf91e2b` (Task 1), `d14b44d` (Task 2), `82a772f` (Task 3)

**Task 4 is a blocking checkpoint and has NOT been run.** It cannot be run from
here: it requires a production build on a phone, in a dark room, with the radio
physically off. Nothing below is claimed as observed at runtime.

---

## What Was Built

### Task 1 — a third state in `ScanFlash`, from a lookup (`cf91e2b`)

`src/components/scanner/ScanFlash.tsx`, 86 → 161 lines.

- `ScanFlashType = "success" | "already_recorded" | "error"` (`:21`), exported so
  `ScannerClient` cannot invent a fourth. Still semantic: no colour prop, no
  `variant`, no className override (T-31-11-05).
- Both `isSuccess ? … : …` ternaries are gone — `grep -c "isSuccess"` returns
  **0**. One module-scope `FLASH_STATES` lookup (`:74-108`) carries `bg`, `icon`
  and `delay` per state. Phase 42 has exactly one place to retint.
- `bg-amber-500/90` (`:91`), not `yellow-500` — the pill's colour. The reason is
  written at the lookup and repeated at the pill.
- The third glyph is a clock face (`:96-100`): it reads as *already, earlier*.
  Dwell is 2500 ms against 1500/2000 (`:90`), because it carries a time and an
  operator to read while someone is waiting.
- `z-[70]`, `role="status"`, `aria-live="assertive"` and tap-to-dismiss are
  unchanged (`:135-138`).

**The naming decision, out loud.** `already_recorded` also carries a *flagged
admission* (`refunded_before_night`, `not_in_cache`). Both mean the same
instruction to a member of staff — admitted, look at this afterwards — and the
plan requires the union to stay at three. The doc comment at `:8-20` says so, so
the next reader does not think the state has drifted from the contract.

### Task 2 — one switch for both paths (`d14b44d`)

`src/app/(admin)/admin/scanner/ScannerClient.tsx`.

**The three outcomes, online** — `ticketOnline` (`:993`), `switch (parsed.outcome)`
at `:1037`; `membershipOnline` (`:1233`), switch at `:1274`.

**The three outcomes, offline** — `ticketOffline` (`:1133`), `membershipOffline`
(`:1338`). The offline ticket decision table as built:

| Local state | Outcome | Flash | `file:line` |
|---|---|---|---|
| cached, `checkedIn: false`, no `refundedAt` | recorded | green | `:1156-1189` |
| cached, `checkedIn: false`, `refundedAt` set | recorded + flag | **amber** | `:1168-1189` |
| cached, `checkedIn: true` | already_recorded | **amber**, with cached `checkedInAt` / `checkedInBy` | `:1140-1155` |
| `findBySubject` finds it under another party | not_valid / wrong_night | red | `:1193-1196` |
| not in the cache at all | recorded + `not_in_cache` | **amber**, admitted and flagged | `:1198-1226` |
| not shaped like one of our codes | not_valid / unknown_code | red | `:1433` |
| no party selected | not_valid / no_party_selected | red | `:1399` |

`grep -c "Ticket not found (offline)"` returns **0**. The fifth row carries a
sixteen-line comment (`:1198-1213`) explaining that it looks like a hole and is a
decision: refusing there refuses a guest whose ticket was bought after the
download, the forgery window needs a `uuid.64-hex` string, and the scan surfaces
as `invalid_signature` the moment the signal returns (T-31-11-01, accepted).

**FIX-04a — the fact, not the verdict.** `recordedFact()` (`:111-125`) renders
`Recorded at HH:MM by ⟨operator⟩`. Called at `:1085` (online ticket), `:1141`
(offline ticket), `:1290` (online membership), `:1353` (offline membership) and
`:1493` (guest list). There is no cause word in it, and an absent value is stated
rather than blanked: `(time not on record)`, `(operator not on record)`.

> The one place a cause word does appear is `FLAG_MESSAGE.refunded_before_night`
> (`:76`). That is a flag on a **recorded** outcome and a server fact derived
> from a stored timestamp — `outcome.ts:127-135` already separates it from a
> classification, and the plan specifies the wording.

**FIX-10 — the signature is not discarded.** `ticketIdFromToken` (`:131-134`)
cuts at the last dot for the lookup only; the full scanned string goes to
`checkInLocally` as `token` at `:1005` and `:1158`. `grep -c "code.split"` returns
**0**.

**Inherited from 31-07.** `deviceId` travels with the scan (`:1009`, `:1245`) and
`partyId` + `deviceId` with the undo (`:855-856`). Without the first, no row this
device writes can be classified `two_devices`; without the second, an Event Pass
undo answered 400.

**The four refusals, four sentences** — `NOT_VALID_MESSAGE` (`:61-66`), plus a
fifth (`:69`) for a reason a future bundle might send that this one does not know.
`notValidSentence` (`:246`) checks with `hasOwnProperty`, mirroring
`sync-manager.ts:76-81`, because `isDoorOutcome` verifies the discriminant and
nothing else.

**The catch-alls, closed.** Transport is classified in the same order the drain
uses — 401/403, then ≥ 500, then the body (`:1029-1035`, `:1266-1272`) — each with
its own sentence from `serverFaultMessage` (`:81-87`). Only a genuine `fetch`
throw returns `"network_failed"` and falls through to the cache (`:1017`,
`:1253`; used at `:1409` and `:1424`). `grep -c "Connection error"` returns **1**,
at `:1410`, inside `handleGuestCheckIn`'s catch — reached only when the request
never left the device.

### Task 3 — the queue is visible online, and a refusal is on the screen (`82a772f`)

- **The counters.** `refreshQueueCounts` (`:375-393`) reads pending, failed and
  blocked together on the existing 5 s poll. The chips are at `:1784-1826`; the
  `isOnline` ternary is at `:1722-1732`. **The ranges do not overlap** — the count
  is no longer inside the offline branch, which is the standing defect 31-10's
  summary handed over.
- A fourth chip (`:1819-1824`) says the queue could not be read at all. Zero and
  unknown are opposite facts.
- **Failed is inspectable** (`:1839-1866`): each entry with its reason, via
  `failedEntryLabel` (`:200-212`), which renders the kind, a short id and the
  moment — and **never** the record key, because for a membership entry the
  subject id *is* the membership code (T-31-11-04).
- **Blocked is actionable** (`:1805-1815` → `handleRetryBlocked`, `:776-789`),
  reporting the five numbers `retryBlockedAfterSignIn` returns.
- **The refused refresh** (`:549-563`): `mergeAttendees` is awaited, its
  `MergeResult` put into state, and each refusal reason gets its own sentence with
  the counts (`mergeRefusalSentence`, `:224-234`). `grep -c "cacheAttendees"`
  returns **0**. Rendered at `:1977-1993` as a persistent banner above the
  scanner, cleared only by a refresh that succeeds (`:593`).
- **31-06's diagnostics and its 500** (`:517-540` and `:471-497`).
- `grep -c "catch(() => {})"` returns **0** over the file.

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 2 — missing critical functionality] `handleGuestCheckIn` wrote into a state nothing rendered**

- **Found during:** Task 2.
- **Issue:** every branch called `setMessage(...)` and `message` was **never
  rendered anywhere in the file**. A 409, a 500 and a dead radio all set a string
  nobody could see. That is the newsletter form's recorded defect
  (`meta-gates.md`) reproduced in a second place, and worse — there the user at
  least saw one sentence.
- **Fix:** the `message` state is deleted; every branch goes through `showFlash`
  and the history. The 409 renders the contract's `already_recorded` that plan
  31-06 added to that route (`:1467-1483`).
- **Commit:** `d14b44d`.

**2. [Rule 2] A failed undo was swallowed whole**

- **Found during:** Task 2.
- **Issue:** `if (res.ok) { … }` with no else and `catch {}`. A refused undo left
  the person checked in, the history unchanged and the operator uninformed —
  on the operation `checkin-offline.md` calls *«il percorso piu' semplice per far
  rientrare qualcuno»*.
- **Fix:** the error body is read and shown (`:885`), the record is **not** marked
  undone, and the unreachable case says the check-in still stands (`:892`).
- **Commit:** `d14b44d`.

**3. [Rule 2] An undo with the radio off did nothing at all**

- **Found during:** Task 2.
- **Issue:** an offline admission sits in the queue. `POST /undo` cannot reach the
  server, so the entry survived and the admission was reported on the next drain —
  the reversal performed at the door never happened.
- **Fix:** when offline and the record carries a `localKey`, `undoCheckInLocally`
  drops the queue entry (`:820`) and the screen says *Undone on this device — not
  reported* (`:822`). A record with no `localKey` (admitted online) refuses the
  offline undo explicitly at `:811-818` rather than pretending.
- **Cost, stated:** a ticket admitted online and undone locally is `checkedIn:
  false` on this device while the server still holds the admission. The next
  refresh restores it, and the next scan answers `already_recorded` — nobody is
  wrongly refused, and no record is lost.
- **Commit:** `d14b44d`.

**4. [Rule 2] The camera failing into nothing**

- **Found during:** Task 3, closing the remaining `catch(() => {})`.
- **Issue:** `initScanner().catch(() => {})` swallowed a denied camera permission
  or a camera held by another app: a blank box, no sentence, and a member of staff
  with no idea whether to wait or switch to the list. `checkin-offline.md` names
  *permesso fotocamera negato* as a thing discovered in ten minutes in front of a
  queue.
- **Fix:** a `cameraFault` banner naming both recoverable causes and the fallback
  (state `:363`, set at `:678-683`, rendered `:1968-1976`). The teardown catch
  keeps its silence and gains a log category — a failure there has no consequence
  for a scan or a record.
- **Commit:** `82a772f`.

**5. [Rule 1] Two comments would have broken static assertions**

- **Found during:** Task 2 verification. A comment quoted the old catch-all
  string, and another said *"the previous code split at the call site"* — which
  `grep -c "code.split"` matches, because `.` is any character.
- **Fix:** both reworded, with a note at the first saying why the old wording must
  not be quoted. This is the identical mistake plan 31-07 recorded; the note is
  there so it is not made a third time.
- **Commit:** `d14b44d`.

### Decisions the plan left to this executor

**A membership code the roster does not know is still refused offline.** The plan
gives the admit-and-flag table for tickets and says only "the same three-outcome
treatment" for memberships. The two are not treated alike, on purpose, and the
reasoning is written at the function (`:1321-1337`): a ticket token is
HMAC-signed, so an uncached one still had to be a `uuid.64-hex` string and the
server re-verifies it on sync — a bounded window with a catcher on the far side. A
membership QR carries **no signature at all** and its code space is generated with
`Math.random()` (`src/utils/qr.ts:49`, QR-01, still open), so admitting an unknown
one offline would be an unbounded hole that nothing downstream could detect.

**The cost of that choice is a real false refusal** — a member who joined after
the roster was downloaded — which is precisely why the next decision goes the
other way.

**`cacheMembers` is no longer fire-and-forget.** The plan asked for a judgement:
keep it silent only if its failure has no consequence for a scan. It has one, and
it is the false refusal above. It is awaited and a failed refresh is a banner that
names the workaround — check that person in from the list rather than refusing
them (`:565-591`).

**The Offline pill lost its `(N)`.** The plan says to leave the pill exactly as it
is, and the count inside it *is* the defect: it rendered only while offline. The
pill keeps its role, its `yellow-500` and its dot; the count moved to a chip that
renders in both states. Read as: the pill is connectivity, the chips are the
queue.

---

## Verification

**There is no test runner for this product.** `package.json` has no `test` script
and there are no `*.test.*` / `*.spec.*` files. Nothing below is claimed on the
strength of a passing test.

### Automated — run, with output

```
$ npm run build                                                  ✓ Compiled successfully
$ npx tsc --noEmit                                               (clean)
$ grep -c "isSuccess"                 ScanFlash.tsx           → 0
$ grep -n "amber-500"                 ScanFlash.tsx           → 91
$ grep -c "cacheAttendees"            ScannerClient.tsx       → 0
$ grep -c "Ticket not found (offline)" ScannerClient.tsx      → 0
$ grep -c "code.split"                ScannerClient.tsx       → 0
$ grep -c "catch(() => {})"           ScannerClient.tsx       → 0
$ grep -c "Connection error"          ScannerClient.tsx       → 1   (:1410, the guest catch)
$ grep -n "vibrateAlreadyRecorded"    ScannerClient.tsx       → 8, 652
$ grep -n "getFailedCount|getBlockedCount" ScannerClient.tsx  → 23, 24, 376, 377
```

Build run and green before each of the three commits.

### file:line — the plan's assertions

| Assertion | Evidence |
|---|---|
| Both paths resolve through the same three outcome names | `switch (parsed.outcome)` at `:1037` and `:1274`; the offline decision blocks at `:1136-1226` and `:1338-1372` |
| The "not in cache" branch admits with a flag and shows amber | `:1214-1226`; `grep -c "Ticket not found (offline)"` = 0 |
| The full scanned `code` is the token; the lookup id is derived separately | `ticketIdFromToken` `:131`, `token: code` at `:1005` / `:1158` |
| `already_recorded` renders a time and an operator, no cause word | `recordedFact` `:111-125`, called `:1085`, `:1141`, `:1290`, `:1353`, `:1493` |
| Four `not_valid` reasons → four distinct sentences | `NOT_VALID_MESSAGE` `:61-66`, plus the fifth at `:69`; resolved by `notValidSentence` `:215`, used `:1100` and `:1305` |
| The chips render outside the `isOnline` ternary | ternary `:1722-1732`; chips `:1784-1826` — **disjoint** |
| Each `MergeResult` refusal reason maps to its own sentence | `mergeRefusalSentence` `:224-234`; no shared wording |
| The failed chip reveals entries with reasons; the blocked chip runs the retry | `:1839-1866`; `:1805-1815` → `:776-789` |
| `partyId` and `deviceId` are sent with the undo | `:855-856` |
| `deviceId` is sent with the scan | `:1009`, `:1245` |

### NOT run — and it must not be read as passed

Every **observable** criterion in this plan is unexecuted:

- the six scans, online and with the radio physically off;
- the dark-room pass, telling the three states apart by icon and by vibration;
- amber against the Offline yellow;
- the uncached token offline;
- the pending count while online;
- the refused refresh under Slow 3G, with the IndexedDB row count watched in
  DevTools.

Two reasons, both structural. **First**, none of it exists in `npm run dev`: the
service worker is disabled there (`next.config.ts:13`), so the offline path, the
cache and the queue are not present. **Second**, plan 31-04's migration is written
and **not applied to any reachable database**, so `door_scan_events` does not
exist and every scan that reaches the server would fail at the insert. The green
build says nothing about either: the Supabase clients are not parameterised with
`Database`, so no column name in this repository is checked by the type checker.

That is Task 4, and it is a **blocking** checkpoint. It has not been run and its
result has not been assumed.

---

## Known Stubs

None. Every branch reaches a real store call, a real fetch or a real rendered
sentence.

---

## Deferred Items

| Item | Why | Where it belongs |
|---|---|---|
| A membership admission queued offline cannot be undone once back online | The undo route addresses an `attendances` row id, and an offline entry never got one. It now fails **loudly** instead of silently; before this plan it failed silently | a follow-up on `undo/route.ts`, with the guest and membership `door_scan_events` rows plan 31-07 deferred to this caller |
| Guest-list and membership undos still write no `door_scan_events` row | This plan sends `partyId` and `deviceId`, which is what 31-07 said was missing; the route still has to use them on those two branches | follow-up on `undo/route.ts` |
| A manual refresh control | LIVE-05, deliberately not added | Phase 38 |
| A live channel | LIVE-01, deliberately not added | Phase 38 |
| `pruneParty` is still called by nothing | Cached rows for old parties accumulate on a staff device. A bounded leak, not a correctness defect — noted by plan 31-05 and still true | unassigned |
| `markCheckedInLocally` failing after an online admission is logged, not shown | Its only consequence is an amber flag instead of an amber flag on a later offline re-scan; no admission and no refusal turns on it | accepted, `:1071-1075` |

---

## Threat Register

| Threat | Disposition met by |
|---|---|
| T-31-11-01 forged token admitted offline | **accepted**, deliberately, and written into the branch at `:1198-1213` rather than left to be discovered |
| T-31-11-02 red refusal for a late-bought or repeat ticket | both are amber admissions; `grep -c "Ticket not found (offline)"` = 0 |
| T-31-11-03 an invisible failed sync or refused refresh | counters at `:1784-1826` in both connectivity states; the merge refusal as a persistent banner at `:1977-1993` |
| T-31-11-04 the flash or the failed list over-sharing | the flash shows a display label and a time; `failedEntryLabel` (`:200-212`) renders kind, short id and moment — never the record key, never a membership code, never an email. JSX read before each commit |
| T-31-11-05 a colour prop letting a caller assert a state | the prop stays semantic: three values, one lookup, no style escape hatch |
| T-31-11-06 colour as the only channel in the dark | icon and dwell per state plus a haptic per state — **verified by the Task 4 dark-room pass, which has not been run** |
| T-31-11-SC npm installs | nothing installed |

---

## Threat Flags

None. No new network endpoint, no new auth path, no schema change, no new
service-client call site. The two routes this file now sends extra fields to
(`partyId`, `deviceId` on the undo; `deviceId` on the scan) already validated
them server-side before this plan.

---

## Self-Check: PASSED

- `src/components/scanner/ScanFlash.tsx` — FOUND
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — FOUND
- `.planning/phases/31-live-defects-at-the-door-and-the-bar/31-11-SUMMARY.md` — FOUND
- commit `cf91e2b` — FOUND
- commit `d14b44d` — FOUND
- commit `82a772f` — FOUND
- `npm run build` — passes on all three committed states
- files touched outside `files_modified` — none
