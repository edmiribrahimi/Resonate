---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 07
subsystem: checkin-offline
tags: [door, check-in, undo, refunds, event-pass, hmac, audit]
status: complete
requires:
  - "src/lib/door/outcome.ts (plan 31-02) — DOOR_HTTP and the DoorOutcome union, imported and never re-declared"
  - "supabase/migrations/20260805120000_door_scan_events.sql (plan 31-04) — the table written into, and DoorScanEvent in src/types/database.ts"
  - "src/utils/datetime.ts partyStartInstant (plan 31-02) — the before/after-the-night decision"
  - "src/lib/offline/checkin-store.ts PendingCheckin.token (plan 31-05) — the signed string a queued scan now carries"
provides:
  - "The door's three-outcome contract, with a matching HTTP status on every return"
  - "HMAC verification on every path, including the offline one"
  - "An Event Pass (party_id NULL) admitted at any party of its event"
  - "A refunded holder admitted and flagged instead of refused"
  - "A door_scan_events row written before the answer, on every outcome the night can be attributed to"
  - "An undo recorded as an is_undo event with the operator who performed it, and checked_in_by preserved"
affects:
  - "plan 31-10 — the sync manager switches on this body via isDoorOutcome, and may drop a 409 only because the row is written first"
  - "plan 31-11 — ScannerClient renders the three outcomes and must pass partyId and deviceId to the undo route"
  - "plan 31-12 — the review list reads the rows this route writes; cause is NULL on all of them except the two refund ones"
  - "plan 31-09 — the refund writers must fill refunded_ticket_id and refunded_at, or the refunded-holder branch here never fires"
tech-stack:
  added: []
  patterns:
    - "factored verifyOrganizerRole, matching attendance/route.ts:6-28, extended with the status axis"
    - "typed body parsed inside a try, every field validated explicitly (attendance/route.ts:180-196)"
    - "a single respond() closure that inserts then answers, so the FIX-03 ordering cannot be reversed at one call site"
    - "SHA-256 fingerprint of the scanned token instead of the token"
key-files:
  created: []
  modified:
    - src/app/api/tickets/checkin/route.ts
    - src/app/api/tickets/checkin/undo/route.ts
decisions:
  - "respond() is the only exit once the night is known: one insert, one return, in one place — the ordering FIX-03 depends on cannot be lost to an edit at a call site."
  - "A failed door_scan_events insert answers 503 with no outcome field, so isDoorOutcome is false and the sync manager retries rather than draining a conflict that was never written."
  - "The ticket update precedes the event insert on the recorded path: a retry after a failed insert lands on already_recorded and records the true moment, whereas the reverse order would record an admission the ticket does not reflect."
  - "The two no_party_selected refusals are the only outcomes not recorded — door_scan_events.party_id is NOT NULL and inventing a night is the defect the column prevents."
  - "ticket_id is NULL on the refunded-holder row: the column is a foreign key to a row the refund deleted, so a value would raise 23503. The scan's identity survives as token_fingerprint."
  - "Role AND status on both routes. updateMemberRole writes role without touching status, so a role-only check admits an unapproved organizer to the door."
  - "The undo accepts an optional partyId, required only for an event-level ticket, and validates it against the ticket's event before writing."
metrics:
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 2
  completed: 2026-08-05
---

# Phase 31 Plan 07: The Door Answers One of Three Things Summary

The check-in route now proves a code was read on every path, says exactly one of
`recorded` / `already_recorded` / `not_valid` with the HTTP status to match, and
writes the night's record **before** it answers. An Event Pass holder is admitted
instead of refused, a refunded holder is admitted and flagged instead of shown a
red "Ticket not found", and reversing an admission leaves behind who reversed it
without destroying who granted it.

**Commits:** `7300c8c`, `2301d5e`, `042f1b4`

---

## What Was Built

### Task 1 — verification on every path, a validated body, the Event Pass (`7300c8c`)

The queued-scan shortcut is gone. It accepted a bare identifier from the request
body as proof that a code had been read and then handed it to an RLS-bypassing
service client; a queued scan now carries the signed string it was read from
(`checkin-store.ts:102`), so the offline path verifies the HMAC exactly as the
online one does. The two identifiers it used are absent from the file, and the
header comment says explicitly not to name them even to explain the history —
because a grep returning nothing is FIX-10's standing assertion, and a comment
would silently break it. (It did, on the first pass: the grep returned 1 and the
comment was reworded.)

The body is parsed inside a `try` and every field is declared `unknown`, so the
only thing that keeps a value honest is an explicit check — there is no
validation library here and one was not added for this route.

**The order of the file is deliberate and reads backwards:** the party is
resolved *before* the token. `door_scan_events.party_id` and `.event_id` are NOT
NULL, so a scan can only enter the night's record once the night is known.
Resolving the party first is what lets a bad signature be **recorded** rather
than merely refused.

### Task 2 — three outcomes, the refunded holder, the record before the answer (`2301d5e`)

| Situation | Outcome | HTTP | `route.ts` |
|---|---|---|---|
| not checked in, write succeeds | `recorded` | 200 | `:610-632` |
| already checked in, **any** operator | `already_recorded` + `at` + `by` | 409 | `:548-580` |
| ticket not found, no refund evidence | `not_valid` / `unknown_code` | 422 | `:480-484` |
| wrong night | `not_valid` / `wrong_night` | 422 | `:507-524` |
| bad shape or bad signature | `not_valid` / `invalid_signature` | 422 | `:338-352` |
| not found, refund exists before the night | `recorded` + `flags: ["refunded_before_night"]` | 200 | `:437-478` |
| no party selected | `not_valid` / `no_party_selected` | 422 | `:198-201`, `:228-232` |

`already_by_you` is deleted, and returns nothing anywhere in `src/`.

### Task 3 — an undo is an event (`042f1b4`)

`checked_in_by` is no longer cleared, and a `door_scan_events` row with
`is_undo: true` is written **before** the reversal, carrying the operator who
pressed undo. A failed insert aborts the undo and says so.

---

## Evidence

Every claim below is a line in a committed file, a grep with its output, or a
written manual step. **There is no test runner for this product**, and the
`door_scan_events` migration is written but **not applied to the live database**
— so no behaviour here is claimed as observed at runtime.

### Automated

```
$ grep -c "offlineSync" src/app/api/tickets/checkin/route.ts            → 0
$ grep -c "directTicketId" src/app/api/tickets/checkin/route.ts         → 0
$ grep -c "already_by_you" src/app/api/tickets/checkin/route.ts         → 0
$ grep -rn "already_by_you" src/ | wc -l                                → 0
$ grep -c "NextResponse.json(" src/app/api/tickets/checkin/route.ts     → 11
$ grep -c "{ status:" src/app/api/tickets/checkin/route.ts              → 11
$ grep -c 'new Date(`' src/app/api/tickets/checkin/route.ts             → 0
$ grep -c "checkin:unexpected" src/app/api/tickets/checkin/route.ts     → 1
$ grep -c "checked_in_by: null" src/app/api/tickets/checkin/undo/route.ts → 0
$ git diff --name-only supabase/migrations/                             → (nothing)
$ npm run build                                                          → ✓ Compiled successfully
```

The eleven-and-eleven pair is the phase's root cause closed: every
`NextResponse.json` in the file carries an explicit status, where five used to
carry none.

### file:line

| Claim | Evidence |
|---|---|
| `verifyTicketToken` runs on every path that resolves a ticket id; no path reaches an id from the body | `checkin/route.ts:338` (shape) and `:346` (signature) are the only producers of `ticketId`; the body's fields are `token`, `partyId`, `scannedAt`, `deviceId`, `source` (`:65-71`) |
| The body is parsed in a `try`, each required field rejected distinctly | `:176-183` (parse), `:194-201` (`partyId`), `:338-352` (`token`) |
| The cross-party check refuses only a non-null mismatch, and asserts the event | old: `if (partyId && ticket.party_id !== partyId)` — new: `:498-499` `const wrongParty = ticket.party_id !== null && ticket.party_id !== partyId;` / `const wrongEvent = ticket.event_id !== party.event_id;` |
| The `.single()` error is destructured and the no-rows case branches separately | party `:216-226`, ticket `:367-380`; `PGRST116` is a scan outcome, anything else logs its own category and returns 500 |
| The check-in update's error is checked and does not return an admission | `:595-607` |
| The `door_scan_events` insert precedes **every** return that follows it | `:306-309` insert, `:331-334` the only success return, `:324-327` the failure return. Both returns are inside `respond()` and both are *after* the insert — structurally, not by convention |
| …specifically for `already_recorded`, which FIX-03 depends on | the branch at `:548-580` calls `respond()`, which inserts at `:307` before returning at `:331`. There is no other path to a 409 |
| `cause` is NULL on `already_recorded` and on every `not_valid` | `:509-515` (wrong_night), `:340-344` / `:349-353` (invalid_signature), `:481-484` (unknown_code), `:566-570` (already_recorded) |
| The before/after decision goes through `partyStartInstant` | `:415`; `grep -c 'new Date(\`'` returns 0 |
| `refunded_before_night` admits, `refunded_after_night` admits without the flag | `:440-441` and `:445-447`; the outcome is `recorded` in both, at `:461-467` |
| The final catch carries a distinct category | `:638` `console.error("checkin:unexpected", error)` — the only occurrence |
| The undo's insert precedes the `tickets` update | `undo/route.ts:214-215` insert, `:244-245` update |
| The undo row carries `is_undo: true`, `cause: null`, and the undoing operator | `undo/route.ts:210`, `:200`, `:205` (`operator_id: auth.user.id`, resolved from the session performing the undo) |
| A failed insert returns without performing the undo | `undo/route.ts:217-236` — 503, check-in left in place, comment first |
| Insert and update errors are separate branches with distinct categories | `undo:event_insert` `:223`, `undo:ticket_update` `:252` |

### Manual steps, written because they are the only proof that will exist

These cannot be run here: the migration is not applied, so `door_scan_events`
does not exist in the live database and every write below would raise. They go
into `31-VALIDATION.md` / the door runbook, to be executed against a production
build after plan 31-04's checkpoint is cleared.

1. **Event Pass.** As a `master`, issue an event-level ticket (`party_id` NULL)
   for an event with two parties. Scan it at party A: expect HTTP 200, body
   `outcome: "recorded"`. Scan the same code again at party A: expect HTTP 409,
   `outcome: "already_recorded"`, with `at` and `by` filled. Scan it at a party
   of a *different* event: expect HTTP 422, `reason: "wrong_night"`.
2. **The queued-scan shortcut is closed.**
   `POST /api/tickets/checkin {"ticketId":"<any uuid>","offlineSync":true}` as an
   organizer. Expect HTTP 422 and `reason: "invalid_signature"` — never an
   admission. (Record the exact request and response body in VERIFICATION.)
3. **Refunded holder.** Refund a ticket through the normal path *after* plan
   31-09 has landed, then scan its code at the night's door. Expect HTTP 200,
   `outcome: "recorded"`, `flags: ["refunded_before_night"]`, and one
   `door_scan_events` row with `cause = 'refunded_before_night'` and
   `ticket_id IS NULL`.
4. **Undo.** Check a ticket in, undo it, then read `door_scan_events` for that
   party: one row with `is_undo = true` carrying the operator who pressed undo,
   and `tickets.checked_in_by` still populated. Record both by identifier, never
   by name.
5. **The record precedes the answer.** Revoke insert permission on
   `door_scan_events` for the service role (or rename the table on a throwaway
   database), scan a ticket that is already checked in, and confirm the response
   is 503 with no `outcome` field — not a 409. This is the only way to observe
   FIX-03's ordering rather than read it.

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 2 — missing critical functionality] The auth guard checks status, not only role**

- **Found during:** Task 1, extending `attendance/route.ts:6-28`.
- **Issue:** `updateMemberRole`
  (`src/app/(admin)/admin/members/actions.ts:114-118`) writes `role` without
  touching `status`, so an organizer promoted from a member who was still
  `pending` keeps `status = 'pending'`. A role-only check hands that account the
  door. `access-gating.md` gate *due assi* forbids exactly this.
- **Fix:** `select("role, status")` and a second, **separately worded** refusal —
  "Forbidden: account not approved". Two different messages on purpose: with no
  error tracking in this repository, the sentence on the operator's phone is the
  only observer that exists, and a bare "Forbidden" at 2 a.m. names no fix.
- **Files:** `checkin/route.ts:136-148`, `checkin/undo/route.ts:43-55`.
- **Commits:** `7300c8c`, `042f1b4`.
- **Cost, stated:** an organizer whose status was never moved to `approved` is
  now refused at the door. That is a false refusal of *staff*, and the door
  runbook's pre-flight check ("provato prima della porta") is where it must be
  caught. The alternative — an unapproved account admitting members — is the
  worse of the two.

**2. [Rule 2] The undo route's auth guard aligned with the check-in route**

- **Found during:** Task 3.
- **Issue:** the plan did not mention the undo's guard. Leaving it role-only
  would mean an operator who may not admit someone could still reverse an
  admission — the cheaper of the two operations left less protected.
- **Fix:** the same guard, same shape, with a comment saying why it is identical.
- **Commit:** `042f1b4`.

**3. [Rule 3] The undo needs a night, and an event-level ticket has none**

- **Found during:** Task 3, blocking.
- **Issue:** `door_scan_events.party_id` is NOT NULL, and an event-level ticket
  carries `party_id IS NULL`. With the body the undo receives today (an id and
  nothing else) the reversal of an Event Pass could not be recorded at all — and
  the plan requires that a reversal that cannot be recorded does not happen.
- **Fix:** an **optional** `partyId` in the body, required only when
  `ticket.party_id` is NULL, and validated against the ticket's `event_id` before
  use, so a reversal is never attributed to a foreign night. Backward compatible:
  every party-scoped ticket keeps working with the current caller.
- **Files:** `undo/route.ts:138-183`.
- **Cross-plan link:** ScannerClient must pass `selectedPartyId` (and ideally
  `deviceId`) to `/api/tickets/checkin/undo`. That file belongs to **plan 31-11**
  and was not touched here. Until it does, an Event Pass undo returns a 400 that
  names the missing field.

**4. [Rule 1] A comment broke a static assertion**

- **Found during:** Task 1 verification.
- **Issue:** the header comment explained the deleted branch by naming its two
  identifiers, so `grep -c` returned 1 instead of 0 — FIX-10's assertion is a
  grep over the whole file, not over the code.
- **Fix:** reworded, and the file now says explicitly that those names must not
  appear even as history, so the next reader does not re-break it.
- **Commit:** `7300c8c` (before the commit).

### Not deviations, but choices the plan left open

- **Legacy `status` for the two new reasons.** The plan says `not_valid` maps to
  the reason string. `wrong_night` and `unknown_code` are strings the previous
  bundle does not recognise, so it falls to its final `else`
  (`ScannerClient.tsx:498-507`) and shows a red "Check-in failed". A refusal
  stays a refusal and only the detail line is lost — no scan flips between
  admitted and refused on an old bundle. Written into the code beside the legacy
  block rather than left to be discovered.
- **The order of the two writes on the `recorded` path.** Ticket first, event
  second. If the event insert then fails the person really *is* admitted, and the
  retry lands on `already_recorded`, which records the true moment and operator.
  The reverse order would write an admission the ticket does not reflect.
- **The refunded holder has no name at the door.** The ticket row is gone, so
  there is no `user_id` to resolve. `ticket_refunds.requested_by` is the holder
  for a user-requested refund but not necessarily for an admin-initiated one, and
  showing a possibly-wrong name at the door is worse than showing none. Legacy
  `member_name` is `"Unknown"` and `subject.label` is omitted.

---

## Known Stubs

None. Every branch in both files reaches a real query and a real response.

---

## Deferred Items

| Item | Why | Where it belongs |
|---|---|---|
| Guest-list and membership undo are not recorded as events | Both subjects carry a nullable `party_id`, and the caller sends only an id — recording them needs the scanner to pass the selected party | plan 31-11 (the caller), then a follow-up on this route |
| The refunded admission's row cannot name its ticket | `door_scan_events.ticket_id` is a foreign key and the refund deleted the row, so a value raises 23503. The scan is identified by `token_fingerprint` only | a real limit of Option B; Option A (soft-invalidate) is already recorded as deferred in 31-RESEARCH § Answer E |
| No rate limiting on this endpoint | RATE-01, deferred; none exists anywhere in the repository. The route requires a `master`/`organizer` session, so it is not an anonymous oracle | RATE-01 |
| `at` is `""` for a ticket checked in without a timestamp | No current path produces one, but the union promises a string. A blank where a fact is promised is the thing pitfall N5 warns about | plan 31-11 renders it; worth a constraint later |
| Ticket `checked_in_at` / `checked_in_by` are still the door's own state, separate from `door_scan_events` | Two records of one fact can drift | out of scope; the review list is built on the events table |

---

## Threat Flags

None. Every trust boundary this plan touches was already in the plan's threat
register, and no new network surface, auth path or schema change was introduced.

For the record against the register:

| Threat | Disposition met by |
|---|---|
| T-31-07-01 (bare identifier as proof) | branch deleted; `grep` 0/0; `verifyTicketToken` at `:346` on every path |
| T-31-07-02 (conflict acknowledged then destroyed) | `respond()` inserts at `:307` before returning at `:331`; a failed insert answers 503, not 409 |
| T-31-07-03 (undo erases who admitted) | `checked_in_by` preserved (`undo/route.ts:243-249`); the undo is its own row; a failed insert aborts |
| T-31-07-04 (refused paying guest) | refund lookup at `:389-396`; NULL `party_id` valid for every party of the event at `:498` |
| T-31-07-05 (replayable credential in a readable table) | `crypto.createHash("sha256")` at `:266-268`; the token itself is never stored |
| T-31-07-06 (service client) | justified in both commit messages: reachable only after the role+status guard and after HMAC verification; every written value server-derived or explicitly validated |
| T-31-07-07 (backdated device clock) | `scannedAt` is stored and never compared; the before/after decision uses `refunded_at` against `partyStartInstant`, both server-side (`:415-417`) |
| T-31-07-08 (valid/not-valid oracle) | accepted; recorded above under deferred |
| T-31-07-SC (npm installs) | nothing installed; `crypto` is built in |

---

## Self-Check

- `src/app/api/tickets/checkin/route.ts` — FOUND
- `src/app/api/tickets/checkin/undo/route.ts` — FOUND
- commit `7300c8c` — FOUND
- commit `2301d5e` — FOUND
- commit `042f1b4` — FOUND
- `npm run build` — passes
- files outside `files_modified` touched — none (`git status --short` clean after each commit)

## Self-Check: PASSED
