---
phase: 31
slug: live-defects-at-the-door-and-the-bar
status: partial — static evidence complete, manual evidence not executed
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-05
updated: 2026-08-06
source: 31-RESEARCH.md § Validation Architecture
evidence: 31-VERIFICATION.md
---

> **`nyquist_compliant` stays `false`, deliberately.** The **file:line** half of
> this contract is complete and recorded in `31-VERIFICATION.md`. The **manual**
> and **observable** halves are **not executed**: the door pass has not been run,
> and although plan 31-04's migration WAS applied to production on 2026-08-06
> (Management API, version `20260806111113`), no code path that writes to
> `door_scan_events` has executed against it yet — the table exists, the
> behaviour is unobserved. The requirements
> whose evidence is still missing are FIX-01 (observable half), FIX-02 (manual
> half), FIX-03, FIX-04, FIX-04a, FIX-05, FIX-06, FIX-07, FIX-08, FIX-09, FIX-10
> (manual half), both FIX-11 rows, and FIX-12. FIX-13 is complete.
>
> Closing this flag while those are open would be the tampering
> `31-13-PLAN.md`'s threat register calls T-31-13-03.

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

> **There is no test runner for the product.** `package.json` has no `test` script and
> the repository contains no `*.test.*` / `*.spec.*` file (verified 2026-08-05). **No
> requirement in this phase may be called verified because "tests pass."** Each one is
> proved by exactly one of three kinds of evidence, named explicitly per row:
>
> - **`file:line`** — a static assertion someone can re-check by opening the file
> - **observable** — a behaviour visible on screen, in the data, or in the response
> - **manual** — a written procedure naming the role, the device, the network state, and what must be seen
>
> `npm run verify:persona` does **not** apply here: it runs only when `CLAUDE.md` or
> `.claude/**` changes, and it verifies the persona's coherence, never the product's
> correctness.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **none** — no runner exists for the product |
| **Config file** | none |
| **Quick run command** | `npm run build` — the Next typecheck, and the only automatic gate |
| **Full suite command** | `npm run build` + every manual procedure below, executed and written into `31-VERIFICATION.md` |
| **Estimated runtime** | build ~minutes; the manual door pass is a scheduled session, not a command |

**If a runner were introduced** (recorded, *not* proposed for this phase): it would need a
DOM-less IndexedDB (`fake-indexeddb`) for the merge and the rekey, and a fetch stub for the
four sync buckets — and it would still not cover the camera, the haptics, the service
worker or the dark venue. Introducing it here would make the phase about tooling.

---

## Sampling Rate

- **After every task commit:** `npm run build` — the typecheck must pass before the commit
- **After every plan wave:** `npm run build` + every **file:line** assertion for that plan's requirements, re-read and quoted
- **Before `/gsd-verify-work`:** every **manual** row executed against **a production build or a preview deployment — never `npm run dev`**, on a phone, including at least one full pass with the radio physically off
- **Max feedback latency:** one build for static evidence; the door pass is once per phase, scheduled

> **Why never `npm run dev`:** the service worker is disabled in development
> (`next.config.ts:9`). Every offline verification run in dev measures the wrong cache
> and proves nothing.

---

## Per-Requirement Verification Map

Task IDs are assigned when the plans are written; this map is keyed by requirement and is
the contract each plan's tasks must satisfy.

| Req | Behaviour | Evidence kind | Concrete step / assertion | Status |
|---|---|---|---|---|
| FIX-01 | Inbound `x-user-*` never reaches server code | **file:line** + **observable** | `src/lib/supabase/middleware.ts:131-133` deletes all three **before** `:136-138` sets them. `curl -H "x-user-role: master" <deployment>/` returns the anonymous page | ✅ file:line — §FIX-01 · ⬜ observable (no deployment exercised) |
| FIX-02 | Second "serve" fails distinctly | **file:line** + **manual** | `organizer/events/actions.ts:1192` and `menu/actions.ts:311` throw on `applied === false`. Manual: as organizer, press Serve twice on one token — the second shows "already been served" and the count does not move | ✅ file:line — §FIX-02 · ⬜ manual |
| FIX-03 | A genuine duplicate survives sync | **manual** (two devices, network off) | Two staff sessions offline scan the same ticket; reconnect both. One `door_scan_events` row with `outcome = 'already_recorded'`; the queue entry is removed **only after** that row exists; the review list shows one `two_devices` entry | ⬜ manual — ordering proved statically (§FIX-03, `checkin/route.ts:308` < `:326`/`:333`); behaviour unobserved |
| FIX-04 | Three outcomes, identical on and off | **manual** (production build, on then off) | Six scans — valid / repeat / unknown — once online, once with the radio off. Three screens, the same three, in the same order; the repeat shows a time and an operator **both** times | ⬜ manual — the six scans have not been run (§FIX-04) |
| FIX-04a | The third outcome states a fact, not a verdict | **observable** + **file:line** | The amber flash reads "Recorded at HH:MM by ⟨role label⟩" and contains no cause word. Assert `cause` is `NULL` on the row the scanner produced | ✅ file:line — §FIX-04a (`cause: null` at `checkin/route.ts:563`; `recordedFact` `:111-119` carries no cause word) · ⬜ observable — no row exists to read |
| FIX-05 | An unsynced check-in survives a refresh | **manual** (network off, then refresh) | Offline check-in; force a refresh with the queue non-empty. Still shown as arrived, still one pending entry, `checkedInAt` unchanged | ✅ file:line — §FIX-05 (two greps → 0/0; monotone rule `checkin-store.ts:510-511`) · ⬜ manual |
| FIX-06 | The cache is never empty during a refresh | **manual** + **observable** | Throttle to 3G, let the `"apis"` cache serve a stale payload, refresh. The guard refuses, the count does not drop, the screen says the list was not refreshed. DevTools → Application → IndexedDB: row count never reaches 0 | ✅ file:line — §FIX-06 (`checkin-store.ts:481-491`) · ⬜ manual · ⬜ observable |
| FIX-07 | Same person, two parties, one device | **manual** (network off) | Offline, check the same membership code in at two parties. `pendingCheckins` holds **two** rows with distinct keys — read both in DevTools and record them in `31-VERIFICATION.md` | ✅ file:line — §FIX-07 (`attendeeKey` `checkin-store.ts:205-211`; `verify/route.ts:341`, `:368`) · ⬜ manual — no keys recorded |
| FIX-08 | A permanent failure is recorded as failed | **manual** + **observable** | Queue a scan for a deleted member, reconnect: it leaves `pending`, appears once under "could not be recorded" with its reason, and is never retried. Separately: expire the session, reconnect → `blocked`, sign-in prompt, queue intact | ✅ file:line — §FIX-08 (four buckets `sync-manager.ts:55-59`; chips `:1789-1815` disjoint from the ternary `:1722-1732`) · ⬜ manual · ⬜ observable |
| FIX-09 | Refunded ticket admitted and flagged | **manual** ×3 + **observable** | (a) refund **before** the night, scan online → admitted, amber, review entry `refunded_before_night`; (b) same with the radio off → admitted, flagged on sync; (c) refund **after** the night's start → **no** review entry, the finance surface shows it | ✅ file:line — §FIX-09 (five writers, evidence before delete) · ⬜ manual ×3 — none can run until the migration is applied |
| FIX-10 | The queued scan carries the signed token | **file:line** + **manual** | The `offlineSync && directTicketId` branch is **gone** from `checkin/route.ts` (assert by grep). Offline scan → `pendingCheckins` holds a `uuid.64-hex` token, not a bare id. Negative: `POST /api/tickets/checkin {"ticketId":"…","offlineSync":true}` as organizer returns `not_valid` | ✅ file:line — §FIX-10 (three greps → 0/0/0, output recorded) · ⬜ manual — the negative probe was not sent |
| FIX-11 | The review list, classified by cause | **manual** (four seeded cases) + **observable** | Produce all four on one night: double read (same operator, same device, seconds apart), a second unused ticket for the same holder, two devices minutes apart, an invalid signature. Three rows; the double read **absent from the list and present in the counter**; the invalid signature also surfaced at the door when the network returns | ✅ file:line — §FIX-11(a) (counted `classify.ts:313`, excluded `:344`; `refunded_after_night` excluded `:345`) · ⬜ manual — no causes seeded |
| FIX-11 | Empty on a normal night | **observable** | A night with no conflicts: the list renders its designed empty state, no badge, no notification | ✅ file:line — §FIX-11(b) (`ReviewListClient.tsx:321`) · ⬜ observable — the list has never been opened against real rows |
| FIX-12 | Prose for the supervisor, identifiers for a master | **observable** + **file:line** | The technical view's copied text contains no `@` and no full name — verify by pasting into a plain editor. Assert `door_scan_events` has no name/email column (schema read) | ✅ file:line — §FIX-12 (sixteen columns, no name column; `TechnicalView` `:136` takes `entries` only; nine identifier columns `:139-149`) · ⬜ observable — nothing pasted, no rows exist |
| FIX-13 | No automatic label on a member | **file:line (negative)** | `grep -rn 'from("profiles")'` over the files this phase adds or changes returns **zero writes**. Assert the review list carries no per-member aggregate. Record the grep **and its output** in `31-VERIFICATION.md` | ✅ **complete** — §FIX-13. Ten hits, full output recorded, every one shown to be a `.select(`; the complementary write grep recorded; no per-member aggregate |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**How to read a split row.** A row carrying both a ✅ and a ⬜ has one half of its
evidence and not the other. The `§` reference points at the section of
`31-VERIFICATION.md` that carries it. **Only FIX-13 is complete**, because it is
the only requirement whose contract is satisfiable by a static check alone.

---

## Wave 0 Requirements

Nothing else can be built against a contract that does not exist yet:

- [x] `src/lib/door/outcome.ts` — the shared three-outcome union
- [x] The migration for `door_scan_events` **with its RLS policy in the same file**, plus the refund-evidence columns — **written and verified structurally against a throwaway container; NOT applied to any real database.** Everything server-side depends on it, and until it is applied none of it has run
- [x] `src/types/database.ts` — the matching interfaces, in the same commit as the migration (`supabase-data.md`)
- [x] The service-worker `/api/*` override in `src/app/sw.ts` — declared at `:34`, `:38`, `:42`, `:46`, spread **before** `...defaultCache` at `:60`. **And a defect found in this phase: the worker was never built at all** until `package.json:7` became `next build --webpack`. It now builds — 53,166 bytes, carrying all four route patterns
- [x] A stable `deviceId` written once into IndexedDB — `getDeviceId()` in `src/lib/offline/checkin-store.ts`, with a non-secure-context fallback
- [x] A written door runbook for the verification night — `31-DOOR-RUNBOOK.md`, 202 lines, devices, accounts by role, fallback, and who decides (`checkin-offline.md`)

**Wave 0 is complete as code and incomplete as fact.** Row 2 is the one that
matters: a migration in the repository and not in the database is the exact false
positive this phase's plans were shaped around. `wave_0_complete` stays `false`
until it is applied.

---

## Manual-Only Verifications

Everything touching the camera, the haptics, the service worker or the dark venue is
manual by nature — there is no runner, and a runner would not reach them either.

| Behaviour | Requirement | Why manual | Instructions |
|---|---|---|---|
| The door pass with the radio off | FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, FIX-09, FIX-10 | The service worker and the offline queue only exist in a production build on a real device | Production build or preview deploy, on a phone, radio physically off. Run the six-scan sequence, then reconnect and observe the sync |
| The two-devices conflict | FIX-03, FIX-11 | Requires two distinct `device_id` values, which a second browser profile does not reproduce | Two installs on two devices, both offline, same ticket, minutes apart |
| The four seeded conflict causes | FIX-11 | Classification can only be judged against real rows produced by real scans | Seed all four on one night, then read the review list |

*A `31-VERIFICATION.md` without a single `file:line` citation does not satisfy the gate.*

---

## Validation Sign-Off

- [ ] Every requirement above has its evidence kind named and its evidence recorded
      — **the kind is named for all fourteen rows; the evidence is recorded for the
      `file:line` half only.** Every **manual** and **observable** row is unrecorded
      because it was not executed
- [x] `npm run build` green at every task commit — and green on the merged branch
      on 2026-08-06. **With the limit now written down:** none of the four Supabase
      clients carries the `Database` generic, so no column name in this repository
      is checked by that build
- [ ] Wave 0 complete before any dependent work — the artefacts exist; the
      migration is not applied to a real database
- [ ] The manual door pass executed against a production build, on a phone, radio
      off — **NOT EXECUTED.** No pass of any kind has been run: no phone, no dark
      room, no radio off, no second device
- [x] Results written into `31-VERIFICATION.md` with `file:line` citations — 903
      lines, 72 `path:line` citations, five greps reproduced with their output, and
      what was **not** executed stated per requirement
- [ ] `nyquist_compliant: true` set in frontmatter — **left `false` on purpose.**
      The requirements still missing evidence are listed in the note at the top of
      this file

**Approval:** **not given.** The static half of this contract is satisfied and
auditable. The half that decides whether the door works at two in the morning has
not been executed, and this document does not pretend otherwise.

**Four blocking checkpoints remain open:** 31-01 Task 3 (the `apis` cache check on
a device), 31-04 Task 3 (applying the migration), 31-11 Task 4 (the dark-room
amber-versus-yellow check), and 31-13 Task 2 (the door pass itself).
