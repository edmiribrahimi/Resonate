---
phase: 38-live-attendance-freshness
plan: 03
subsystem: check-in & offline (the door)
tags: [live-attendance, reload-discipline, LIVE-02, LIVE-03, LIVE-04, indexeddb, visibility]
requires:
  - "ScannerClient.tsx `fetchAttendance` as the single attendance fetch site"
  - "`isProcessingRef`, taken in the camera decode callback and released in `dismissFlash`"
  - "38-01's written door procedures P1–P4, which are what will actually settle behaviour"
provides:
  - "`requestReload(reason)` — the one entry point every future reload trigger must use"
  - "`pendingReloadRef` — the deferral behind the scan lock, drained in `dismissFlash`"
  - "`lastFetchAtRef` — the monotonic age of the list, for the band and the counter row"
  - "`armSafetyTimer` / `SAFETY_RELOAD_MS` — the re-armed, foreground-only parachute"
  - "`requestReloadRef` — the one-way link that lets code declared above `requestReload` reach it"
affects:
  - "38-05 (the channel subscription): calls `requestReload`, never a second fetch"
  - "38-06 (the band and the counter row): reads `lastFetchAtRef`, and only to decide what is shown"
tech-stack:
  added: []
  patterns:
    - "one entry point + coalescing timeout + deferral behind a lock"
    - "a timer re-armed from the last success, not an interval"
    - "`visibilitychange` on `document`, never on `window`"
    - "`performance.now()` for elapsed time on this device; `Date.now()` never for the age of the list"
key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/scanner/ScannerClient.tsx"
decisions:
  - "D-38-22 accepted and written beside the call: a reload with the search box active does not merge into the offline cache"
  - "D-38-23: RELOAD_COALESCE_MS = 500 ms (A3), SAFETY_RELOAD_MS = 5 min (A2), both named constants carrying their assumption id"
  - "The coalescing timeout is torn down on every change of night, not only on unmount (deviation, Rule 2)"
  - "The safety timer and the visibility listener reach `requestReload` through a ref, so neither carries `searchQuery` in its deps (deviation, Rule 2)"
metrics:
  duration: ~40 min
  tasks: 3
  files: 1
  completed: 2026-08-11
---

# Phase 38 Plan 03: The Reload Discipline Summary

`ScannerClient.tsx` gains one way to ask for a reload — coalesced at 500 ms,
deferred behind the scan lock, drained when the verdict is out — plus a
monotonic measure of the list's age and a 5-minute parachute that re-arms from
the last successful fetch instead of ticking.

Nothing subscribes to anything yet. Plan 38-05 will find the entry point already
here, which is the point: **LIVE-02 is satisfied structurally**, because the only
way into a reload passes the lock before it can reach IndexedDB.

---

## What Was Built

### Task 1 — `requestReload`, the single entry point (`788ff18`)

| Anchor | Line | What it is |
|---|---|---|
| `RELOAD_COALESCE_MS` | `:335` | module constant, 500 ms, comment names assumption `A3` |
| `pendingReloadRef` | `:976` | a reload that arrived mid-verdict, waiting |
| `reloadTimerRef` | `:978` | the coalescing timeout |
| `requestReload` | `:993` | `useCallback`, deps `[fetchAttendance, searchQuery]` |
| the drain | `:1235-1236` | inside `dismissFlash`, after the lock is released, before the camera resumes |
| the reset path | `:2140` | inside `handleChangeParty`, cleared **without** draining |

Three properties, in the order they matter:

1. **It defers before it does anything else.** `isProcessingRef.current` is the
   first branch. The reason is written beside it and is not about React
   rendering: `mergeAttendees` opens a `readwrite` transaction on the same
   IndexedDB object store the offline verdict reads, and IndexedDB serialises
   those on a store — so an unguarded merge really can sit between a scan and its
   answer while looking, in review, like two ordinary `await`s.
2. **It never fetches.** No `fetch(` appears in its body; it calls
   `fetchAttendance`, the site the scanner already has. A sibling fetch would be
   a second place a `MergeResult` refusal can be dropped — the defect FIX-06
   closed.
3. **The drain is unconditional.** It may cost one extra GET when the scan's own
   reload was going to fire anyway. That is the correct side to err on: a
   duplicated fetch costs one request, a dropped one leaves a stale list at a
   door.

D-38-22 is written at the call, in the terms that stop the next reader
"repairing" it: turning a search-filtered reload into a merge would feed
`mergeAttendees` a **shrinking payload**, which it refuses as a typed value — so
the fix produces a refusal notice at a door, not a fresher cache.

### Task 2 — the age of the list, and the parachute (`e6c589c`)

| Anchor | Line | What it is |
|---|---|---|
| `SAFETY_RELOAD_MS` | `:351` | module constant, `5 * 60_000`, comment names assumption `A2` |
| `lastFetchAtRef` | `:699` | `useRef<number \| null>(null)` |
| `safetyTimerRef` | `:701` | the safety `setTimeout` |
| `requestReloadRef` | `:716` | the one-way link (see Deviation 2) |
| `armSafetyTimer` | `:722` | clears and restarts; deps `[]`, stable |
| `setCacheNotices(notices)` | **`:940`** | the notices commit |
| `lastFetchAtRef.current = performance.now()` | **`:952`** | strictly after `:940` |
| `armSafetyTimer()` | `:957` | arming site 1 of 2 |
| `visibilitychange` on `document` | `:1080` | arming site 2 of 2 is at `:1077` |

**The ordering `940 → 952` is the design.** Every failure branch of
`fetchAttendance` returns early above the notices commit, so a fetch that failed
and surfaced a notice does not count as fresh and the age keeps climbing — which
is what makes the band appear when it should.

**`performance.now()` and not `Date.now()`.** `Date.now()` can step backwards on
an NTP correction, which happens precisely when the network returns — the worst
possible moment — and would print a negative age. The rule already written at the
clock-drift measurement extends here unchanged: the device clock is **evidence,
never authority**. The only branch this number may drive is whether a band is
shown. No verdict, no refusal and no admission reads it.

**Re-armed, not periodic.** A `setTimeout` restarted on every successful fetch,
armed from exactly two places. On a night with a queue in front of the door it
fires zero times — which is the honest answer to "is this polling under another
name". `hidden` clears it and does not re-arm; `visible` fires a full reload and
then re-arms, so the age after a resume is ~0 and the band correctly stays away.

The three reasons for foreground-only are in the code in order of weight (iOS PWA
suspension, the resume path already forcing a reload, Android background battery),
as is the sentence `sync-manager.ts` makes necessary: that file declares *two
triggers and deliberately no timer, because a parallel trigger set is two
schedulers fighting over one queue*. This is a third trigger on a **different
subject** — the attendee list, not the sync queue — and saying so is what stops
the next reader taking it for the contradiction it looks like.

### Task 3 — the LIVE-02 before-figure

No code. Its deliverable is the evidence table below, run **before** plan 38-05,
which is the plan that could break it. A check first run after the change it
exists to catch has already stopped being a check.

---

## Verification Evidence

`npm run build` → **exit 0**, run after every task.

**What it proves:** the file compiles and typechecks (`next build --webpack`;
there is no separate `typecheck` script — the build is the type gate).
**What it does not prove:** anything about behaviour. It does not check a single
Supabase column name, no client here is parameterised with `Database`, and **this
repository has no test runner for the product** — no `test` script, no `*.test.*`,
no `*.spec.*`. Whether the deferral and the parachute actually do what they claim
is settled by procedures **P1**, **P2**, **P4** (and **P3**, the pocket), written
in plan 38-01 and executed in plan 38-07. Nothing here may be called "verified"
on the strength of a green build.

### The five LIVE-02 structural checks — the before-figure for plan 38-05

Command shape (macOS/BSD), run per function against
`src/app/(admin)/admin/scanner/ScannerClient.tsx`:

```bash
awk '/(const|async function|function) <fn>/,/^  \};?$/' "$f" \
  | grep -nE 'channel|Channel|realtime|Realtime|channelLive'
```

| # | Function | Body extracted (lines) | Output | Verdict |
|---|---|---|---|---|
| 1 | `handleVerify` | 55 | *(nothing)* | clean |
| 2 | `ticketOffline` | 98 | *(nothing)* | clean |
| 3 | `membershipOffline` | 54 | *(nothing)* | clean |
| 4 | `ticketOnline` | 130 | *(nothing)* | clean |
| 5 | `membershipOnline` | 87 | *(nothing)* | clean |

**Assertion that the check can fail, taken before reading its result.** An empty
grep over an empty extraction is a false negative, and this project has already
recorded that failure mode (`ai-engineering.md`, gate *prova per mutazione*). Two
controls were run:

- the extraction landed — each `awk` range returns a non-empty body, sizes above;
- the pipeline fires — the same extraction over `handleVerify` grepped for a
  token that *is* present returns **7** matches:

```bash
awk '/(const|async function|function) handleVerify/,/^  \};?$/' "$f" | grep -cE 'selectedPartyId'
# 7
```

So the five empty results are a real green, not a broken pipe.

### LIVE-07 — the door's store stays the door's

| Command | Output | Reading |
|---|---|---|
| `grep -rl "offline/checkin-store" src --include='*.ts' --include='*.tsx'` | `src/app/api/tickets/checkin/route.ts`, `src/app/(admin)/admin/scanner/ScannerClient.tsx` | **2 files, and the plan expected 1** — see Deviation 3. The route hit is prose only, two docblock citations (`:34`, `:220`), not an import |
| `grep -rln 'from "@/lib/offline/checkin-store"' src --include='*.ts' --include='*.tsx'` | `src/app/(admin)/admin/scanner/ScannerClient.tsx` | **1 importer.** LIVE-07 holds |
| `git diff --quiet -- src/lib/supabase/client.ts` | exit 0 | untouched |
| `git diff --stat 17c5f3d HEAD -- src/lib/supabase/client.ts` | *(empty)* | byte-identical to the plan's base. `worker: true` is not adopted (D-38-14) |
| `git diff --name-only 17c5f3d HEAD` | `src/app/(admin)/admin/scanner/ScannerClient.tsx` | one file, as scoped |

### The one-fetch-site figure

| Command | Before (`17c5f3d`) | After | Reading |
|---|---|---|---|
| `grep -cE 'await fetch\("/api/tickets/attendance\|fetch\(\`/api/tickets/attendance' "$f"` | **3** | **3** | the plan's own check, and it never counted 1 — see Deviation 1 |
| `grep -cE 'fetch\(\`/api/tickets/attendance\?' "$f"` | **1** | **1** | the attendee-list GET. **Unchanged: no second fetch site was created** |

The three loose matches are `fetchParties` (`:656`, the party selector's GET, no
query string), `fetchAttendance` (`:678`, the attendee list) and
`handleGuestCheckIn` (`:1929`, a **POST**). Only the second is the subject of
D-38-02.

### Task-1 structural checks

| Check | Result |
|---|---|
| `awk '/const requestReload = useCallback/,/\[fetchAttendance/' \| grep -nE 'isProcessingRef.current\|fetch\('` | one line: `12:      if (isProcessingRef.current) {` — the lock is the first branch, and no `fetch(` in the body |
| `awk '/const dismissFlash = useCallback/,/^  \}, \[/' \| grep -n …` | `3: isProcessingRef.current = false` → `9,10: pendingReloadRef` → `16: scanner.resume` — drained after the release, before the resume |
| `grep -n 'scanner:reload'` | `:935`, `console.info("scanner:reload", { reason })` — the house category convention, not a bare string |
| `grep -n '\`A3\`'` / `\`A2\`` | `:330` / `:346` — both constants carry their assumption id |
| D-38-22 beside the call | `:936-946` |

### Task-2 structural checks

| Check | Result |
|---|---|
| `lastFetchAtRef.current = performance.now()` after `setCacheNotices(notices)` | `952 > 940` ✓ |
| `grep -cE 'window\.addEventListener\("visibilitychange"'` | `0` — it did not bubble before Safari 14 |
| `document.addEventListener("visibilitychange"` | `:1080` ✓ |
| `visibilityState` gates the timer | `:1066` ✓ |
| arming sites | exactly two: `:957` (after a successful fetch), `:1077` (on visible) |
| `setInterval` driving the safety reload | none. The two `setInterval` in the file (`:600` queue counts, `:664` the 30 s ticker) are pre-existing and untouched |
| `Date.now()` used for the age of the list | none. The `nowMs` ticker (`:502`, `:663-664`) and the clock-drift display (`:822`) are untouched |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — blocking issue in the plan's own check] The one-fetch-site grep counted 3 before any change**

- **Found during:** Task 1 verification.
- **Issue:** the plan's `(G)` command,
  `grep -cE 'await fetch\("/api/tickets/attendance|fetch\(`/api/tickets/attendance'`,
  asserts `-eq 1`. It returned **3** on the plan's base commit, before a line was
  written, because it also matches `fetchParties`' GET of the same path without a
  query string and `handleGuestCheckIn`'s **POST** to it. A gate that is red
  before the work starts cannot say anything about the work.
- **Fix:** the check was narrowed to what the criterion means — the attendee-list
  GET, `grep -cE 'fetch\(`/api/tickets/attendance\?'` — which is **1 before and 1
  after**. Both figures are recorded above rather than the wrong one being
  quietly replaced. No code changed.
- **Files modified:** none.
- **Commit:** n/a (verification only).

**2. [Rule 2 — missing critical functionality] The safety timer and the visibility listener reach `requestReload` through a ref**

- **Found during:** Task 2.
- **Issue:** `requestReload` depends on `searchQuery`, so a listener or a callback
  holding it directly is rebuilt on **every keystroke** in the search box. The
  visibility effect's cleanup clears the safety timeout — so typing would clear
  the parachute, and if the fetch that followed then failed, it would be left
  unarmed. That is precisely the case the parachute exists for. `armSafetyTimer`
  additionally has to be callable from **inside** `fetchAttendance`, which is
  declared *above* `requestReload` (because `requestReload` calls it).
- **Fix:** one `requestReloadRef` (`:716`), kept current in its own effect
  (`:1032-1034`). `armSafetyTimer` and the visibility listener both have stable
  dependency arrays and never churn. The reason is written on the ref.
- **Files modified:** `src/app/(admin)/admin/scanner/ScannerClient.tsx`.
- **Commit:** `e6c589c`.

**3. [Rule 2] The coalescing timeout is cleared on every change of night, not only on unmount**

- **Found during:** Task 1.
- **Issue:** the plan asks only for an unmount teardown. But a coalesced reload
  armed while night A was open captures night A's `fetchAttendance`; if the
  operator switches night inside the 500 ms window, that fetch lands and calls
  `setAttendance` with the **previous** night's list. That is the same defect the
  `doorAuth` effect above already guards against in its opening line, and it
  would be invisible on screen.
- **Fix:** the teardown effect is keyed on `selectedPartyId` (`:1099-1106`), which
  is a superset of the unmount cleanup the plan asked for. `handleChangeParty`
  additionally clears `pendingReloadRef` without draining, exactly as specified.
- **Files modified:** `src/app/(admin)/admin/scanner/ScannerClient.tsx`.
- **Commit:** `788ff18`.

**4. [Rule 3] The LIVE-07 grep matched prose, not imports**

- **Found during:** Task 3.
- **Issue:** `grep -rl "offline/checkin-store" src` asserts `-eq 1` but returns
  **2**, because `src/app/api/tickets/checkin/route.ts` cites the store twice in
  docblocks (`:34`, `:220`). Those are references in prose, not an import — the
  route imports nothing from it.
- **Fix:** the invariant was re-measured on the import form,
  `grep -rln 'from "@/lib/offline/checkin-store"' src`, which returns exactly one
  file. Both figures recorded above. LIVE-07 holds. No code changed.
- **Files modified:** none.
- **Commit:** n/a (verification only).

### Not fixed, and said out loud

**A door that opens with no network is never automatically retried by this plan
alone.** The parachute is armed only from a *successful* fetch and from becoming
visible. If the very first fetch of a night fails, nothing here re-arms it, so
the age climbs with no automatic reload behind it. This is the design the plan
states ("re-armed from the last successful fetch") and adding a third arming site
would contradict an explicit acceptance criterion, so it was not changed. It is
mostly covered by plan 38-05, which adds the `online` and resume triggers — i.e.
the case where the network actually comes back. It is written here rather than
left for someone to discover: `deferred-items.md` was not used because this is a
property of this plan's own design, not an unrelated find.

---

## Cross-domain Impact

- **Check-in & offline (primary).** Nothing was added between a scan and its
  verdict; the deferral is the mechanism. The four resolution paths and
  `handleVerify` are untouched — see the five-row table above.
- **Access & gating.** Nothing here reads or writes `doorAuth`, `cacheDoorAuth`
  or any capability. `src/lib/supabase/client.ts` is byte-identical to its state
  before this plan.
- **Next.js architecture.** No new surface, no new route, no new element on
  screen. The counter row and the band belong to plan 38-06.
- **Monotone guards** (`meta-gates.md`): none of the three is touched — no venue
  reveal, no payment state, no series numbering.
- **Zero silent failures.** One new logged path, `scanner:reload` with its
  `reason`, in the file's own `scanner:<snake_case>` category convention, so a
  reload is attributable to the reason that asked for it. Honest caveat, and it
  is the same one the whole project carries: there is **no error tracking**, so a
  log is a place nobody looks. The observable effect this phase relies on is the
  freshness display, and that is built in plan 38-06 — until then, the reload
  discipline is real but unobservable from outside the console.

---

## Threat Flags

None. No new network endpoint, no auth path, no schema change, no new trust
boundary. `console.info("scanner:reload", { reason })` carries an internal literal
(`"deferred"`, `"safety"`, `"foreground"`), never a person, a code or a night's
identity. `performance.now()` is a local elapsed count that leaves the device only
if something renders it.

The register's dispositions were honoured: **T-38-03-01** mitigated by the
`isProcessingRef` gate and the `dismissFlash` drain; **T-38-03-02** accepted with
D-38-22 written beside the call; **T-38-03-03** mitigated by the categorised
`scanner:reload` line; **T-38-03-04**, **T-38-03-05** accepted as recorded;
**T-38-03-SC** — **no package was installed, removed or upgraded**.

## Known Stubs

None.

## Self-Check: PASSED

| Claim | Command | Result |
|---|---|---|
| `ScannerClient.tsx` exists and is the only file changed | `git diff --name-only 17c5f3d HEAD` | one path ✓ |
| commit `788ff18` exists | `git log --oneline 17c5f3d..HEAD` | present ✓ |
| commit `e6c589c` exists | `git log --oneline 17c5f3d..HEAD` | present ✓ |
| build green | `npm run build; echo $?` | `0` ✓ |
| no file deleted by either commit | `git diff --diff-filter=D --name-only HEAD~1 HEAD` (per commit) | empty ✓ |
