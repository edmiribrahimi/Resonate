---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 06
subsystem: ticketing-payments
tags: [door, offline-cache, payload, refunds, guest-list, event-pass]
status: complete
requires:
  - "src/lib/door/outcome.ts (plan 31-02) — DoorSubjectType, DoorOutcome, DOOR_HTTP"
  - "supabase/migrations/20260805120000_door_scan_events.sql (plan 31-04) — the ticket_refunds evidence columns and guest_list_entries.checked_in_at / checked_in_by. **Written, not applied.**"
  - "src/lib/offline/checkin-store.ts (plan 31-05) — AttendeeRow is the shape this payload feeds"
provides:
  - "an attendee payload that includes event-level tickets (party_id IS NULL)"
  - "refunded tickets in the payload, with refundedAt, sourced from ticket_refunds"
  - "subjectType / subjectId / checkedInBy / refundedAt on every payload item"
  - "a guest-list check-in that writes checked_in_at and checked_in_by"
  - "a 409 carrying the contract's already_recorded alongside its legacy fields"
  - "per-party diagnostics: refundCollisions, duplicateRefundRows, refundEvidenceUnavailable"
affects:
  - "plan 31-07 — fixes the write half of the same Event Pass defect in checkin/route.ts; one without the other works online and fails at the door"
  - "plan 31-09 — the refund writers fill refunded_ticket_id / refunded_party_id / refunded_event_id / refunded_at that this route reads; until they do, the refunded branch returns nothing"
  - "the scanner client — diagnostics and the 500 on an unreadable list have no surface yet; nothing renders them today"
tech-stack:
  added: []
  patterns:
    - "NULL-tolerant party predicate: .eq(event_id) + .or(party_id.eq.X,party_id.is.null)"
    - "separate-fetch-then-map for every label, never a Supabase join through auth.users"
    - "nested PostgREST or: or(a.eq.X,and(b.is.null,c.eq.Y)) for the event-level refund branch"
    - "a declared payload interface so three sources cannot drift field by field"
    - "response body as the diagnostic surface, since there is no error tracking"
key-files:
  created: []
  modified:
    - src/app/api/tickets/attendance/route.ts
decisions:
  - "A refunded holder is named only when ticket_refunds.type = 'user_request'. On admin_initiated, requested_by is the holder in two writers and the admin in a third, and nothing on the row separates them — naming the wrong person at the door is worse than naming none."
  - "A failed tickets or guest-list read fails the whole request (500) instead of returning an empty list: an empty payload tells a device that is about to trust it that nobody is on tonight."
  - "A failed ticket_refunds read degrades instead of failing: the door still gets every holder, it only loses the amber flag."
  - "Two commits, not three: Tasks 1 and 2 share one payload shape and one profile map, and splitting them produces an intermediate state that does not typecheck."
  - "On a legacy guest-list row, `at` falls back to updated_at — never to the clock of the current read, which would claim the entry was recorded just now."
metrics:
  tasks_completed: 3
  tasks_total: 3
  commits: 2
  files_created: 0
  files_modified: 1
  completed: 2026-08-05
---

# Phase 31 Plan 06: The Attendance Payload Summary

Everything the door must be able to say with the radio off is now downloaded
before the radio goes off: the Event Pass holder who was silently filtered out,
the refunds known at that moment, and the operator who recorded each entry.

**Commits:** `cd0a74c` (Tasks 1 + 2), `d6a4dec` (Task 3)

---

## What Was Built

### Task 1 — the attendee list stops refusing the Event Pass

`src/app/api/tickets/attendance/route.ts:244-252` — the ticket query now reads:

```ts
  .from("tickets")                                            // :245
  .select(
    "id, party_id, tier_id, checked_in, checked_in_at, checked_in_by, user_id, ticket_type"
  )
  .eq("event_id", party.event_id)                             // :249
  .or(`party_id.eq.${party.id},party_id.is.null`)             // :250
```

It matches the guest-list analog eleven lines below — `:260-261`, the identical
`.eq("event_id", …)` + `.or(…party_id.is.null)` pair, which that query has always
used. Before, `.eq("party_id", party.id)` meant a ticket with `party_id IS NULL`
— a real, sold product, the reason `tickets_event_user_master_unique` exists
(`20260226300000_multi_sub_events.sql:66-68`) — never entered the attendee list
and therefore never entered the offline cache. Plan 31-07 fixes the decision
side; **either alone leaves a fix that works online and fails at a dark door.**

Every payload item now carries three new fields, declared once on `AttendeeItem`
(`:56-72`) so the three sources cannot drift apart:

- `subjectType` (`:406`, `:424`, `:448`) — the same strings as `DoorSubjectType`,
  imported from `src/lib/door/outcome.ts` at `:8`, so the device keys its cache on
  what the server said rather than re-deriving it from `isGuestList`.
- `subjectId` (`:407`, `:425`, `:449`) — explicit, instead of `ticketId` doubling
  as both.
- `checkedInBy` (`:413`, `:434`) — an operator **label**, resolved through
  `operatorLabel()` (`:127-135`) from a `Map` built by one `profiles` fetch at
  `:368-386`. No `profiles(...)` join was added to the tickets query; the FK runs
  through `auth.users` and is ambiguous on these paths.

`ticketId`, `guestListEntryId` and `isGuestList` are all still present
(`:408-409`, `:426-427`, `:415`/`:436`/`:457`). The payload is additive for one
release, per the owner's locked decision: a staff phone may run the previous
bundle against this API for one session, and that session is a night at the door.

No `email` was added. `hasEmail` is still a boolean (`:416`, `:437`, `:460`).

### Task 2 — a refund known before the download is known at the door

A third source, `:272-281`:

```ts
  .from("ticket_refunds")                                     // :273
  .select(
    "refunded_ticket_id, refunded_party_id, refunded_event_id, refunded_at, requested_by, type"
  )
  .eq("status", "approved")                                   // :277
  .not("refunded_ticket_id", "is", null)                      // :278
  .or(
    `refunded_party_id.eq.${party.id},and(refunded_party_id.is.null,refunded_event_id.eq.${party.event_id})`
  ),                                                          // :279-281
```

The nested `and(...)` branch is the event-level ticket case, which is why
`refunded_event_id` exists. Each surviving row becomes an item with
`refundedAt` set (`:456`) and `checkedIn: false` (`:453`) — the whole branch is
`:443-463` — so an offline scan of that ticket resolves as *in the cache,
refunded* and produces the amber admit locally instead of landing on *not in the
cache*.

`refundedAt` is on **every** item — `null` on the ticket and guest-list branches
(`:414`, `:435`) — so the device never has to tell "absent" from "not refunded".

De-duplication and its diagnostics (`:321-350`): a `refunded_ticket_id` matching
a live ticket means the delete did not happen, the live row wins (`:334-337`),
and the drop is counted. Two approved refunds naming one ticket keep the earliest
moment (`:344-350`). Both counts, plus a flag for an unreadable refunds table,
are returned in the response body at `:495-499` — not only logged, because there
is no error tracking in this project and a log is a place nobody looks.

### Task 3 — the guest-list check-in records when and by whom

- The transition writes both facts (`:658-666`): `checked_in_at: now` (`:662`)
  and `checked_in_by: auth.user.id` (`:663`), with the update's error
  destructured, logged with its own category and returned as its own message
  (`:668-677`).
- `checkedInAt: null` is gone from the guest-list mapping — the old `:129` is now
  `checkedInAt: g.checked_in_at` at `:433`, with `checked_in_at, checked_in_by`
  selected at `:258`.
- The 409 is additive (`:617-652`): `outcome: "already_recorded"` (`:621`), `at`,
  `by`, **and** the pre-existing `error` and `alreadyCheckedIn` (`:648-649`). It
  is typed as `Extract<DoorOutcome, { outcome: "already_recorded" }>`
  (`:617-620`), so a divergence from the contract is a build error rather than a
  night at the door, and the status comes from `DOOR_HTTP.already_recorded`
  (`:651`) rather than being written out again. This route already had the only
  correct conflict status in the repository; it was brought into the contract,
  not rewritten.

Three distinguishable operator labels rather than a blank after the separator:
`"Not recorded"` (`:75`), `"Unknown operator"` (`:78`), `"Operator lookup
failed"` (`:81`), applied at `:593-611`.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] `tierName` was always null**

- **Found during:** Task 1
- **Issue:** the ticket query never selected `tier_id`, but the old `:91` read it
  through `(t as unknown as { tier_id: string }).tier_id`. The cast is exactly
  what hid it from the type checker: `tierIds` was always empty, `tierMap` always
  empty, `tierName` always `null` on every item the door ever cached.
- **Fix:** `tier_id` added to the select (`:247`) and the cast removed; the field
  is read off the declared `TicketRow` (`:90-99`) and used at `:418`.
- **Commit:** `cd0a74c`

**2. [Rule 1 — Bug] naming a refunded holder from `requested_by` names the wrong person**

- **Found during:** Task 2
- **Issue:** the plan says to resolve `name` from `requested_by`. Verified against
  the four writers: it is the holder at `refund-actions.ts:56` (`user_request`),
  the holder at `finance/actions.ts:102` and `reconcile-refunds/route.ts:111`,
  and the **admin** at `refund-actions.ts:378`. All three `admin_initiated`
  writers also set `processed_by` to the same id, so nothing on the row separates
  them.
- **Fix:** `refundedHolderName()` (`:152-158`, documented at `:137-151`) names the holder only when
  `type = 'user_request'`; otherwise the item is labelled `"Refunded ticket"` and
  names nobody. At the door the label is prose — the scan matches on `subjectId` —
  and naming the wrong person on a phone held in front of a queue is a worse
  failure than naming none.
- **Commit:** `cd0a74c`

**3. [Rule 2 — Missing critical error handling] an unreadable list returned an empty one**

- **Found during:** Task 1
- **Issue:** every source query discarded its error. A failed tickets read
  returned `attendees: []` with HTTP 200 — "nobody is on tonight" — and the
  device's own plausibility guard only catches that once it already holds a
  cache, so the first download of a night would silently cache nothing.
- **Fix:** the per-party mapper returns a typed failure (`PartyResult`,
  `:161-168`), raised at `:289-296` for tickets and `:297-304` for the guest list;
  the request then fails with the source named at `:506-518`. The refunds branch
  degrades instead, because it costs the door a flag and not a holder
  (`:306-315`).
- **Commit:** `cd0a74c`

**4. [Rule 2 — Missing critical error handling] `.single()` collapsed two failures into one 404**

- **Found during:** Task 3
- **Issue:** `if (fetchError || !entry)` returned 404 for both "the row is not
  there" and "the query failed" — the `checkin-offline.md` gate *query a esito
  singolo*.
- **Fix:** `.maybeSingle()` (`:567`) with the two branches separated
  (`:569-585`): 500 with its own message and a categorised log for a failed read,
  404 for a missing row.
- **Commit:** `d6a4dec`

### Process deviation

**Two commits, not three.** Tasks 1 and 2 share one `AttendeeItem` shape, one
profile `Map` and one de-duplication pass; separating them produces an
intermediate state that does not typecheck, and `npm run build` is the only
automatic gate this repository has for the product. Task 3 is genuinely separable
and was committed on its own. Both commits build.

---

## Verification

### Automated — run, with output

- `npm run build` — **`✓ Compiled successfully`**, run on the Task 1+2 state
  before `cd0a74c` and again on the final state before `d6a4dec`.
- `grep -n "party_id.is.null"` → `:250` (tickets), `:261` (guest list).
- `grep -c "checkedInBy"` → 4. `grep -c "refundedAt"` → 7.
- `grep -n "already_recorded"` → `:619`, `:621`, `:651`.
- `grep -n "checked_in_by: auth.user.id"` → `:663`.

**There is no test runner for the product.** Nothing here is verified because
tests pass; there are none.

### Not run — and it must not be read as passed

The plan's two **observable** acceptance criteria were **not executed**:

1. `GET /api/tickets/attendance?partyId=<id>` returning an event-level ticket
   holder.
2. Refunding a ticket on a non-production project, then seeing the holder with
   `refundedAt` set.

Neither could run: the 31-04 migration that creates `ticket_refunds.refunded_*`
and `guest_list_entries.checked_in_at / checked_in_by` is **written but not
applied to any database in reach** (31-04-SUMMARY, blocking checkpoint), and no
Supabase project was reachable from this run. The types are in
`src/types/database.ts`, so `npm run build` compiles — **that green says nothing
about the live schema.** Against an unmigrated database the two new selects
return a PostgREST error, and this route now fails loudly rather than silently:
the refunds branch degrades with `refundEvidenceUnavailable: true`, and the
guest-list select failing takes the request to 500.

### Manual procedure, written so it exists

Run **after** the 31-04 migration is applied, on a production build
(`npm run build && npm start`) — never `npm run dev`, where the service worker is
disabled.

1. **Event Pass, online.** As an organizer, for a night whose event has a ticket
   with `party_id IS NULL`: `GET /api/tickets/attendance?partyId=<partyId>`.
   Expect that ticket's id in `attendees[].subjectId`, `subjectType: "ticket"`,
   `refundedAt: null`. Record the ticket id and the party id — **identifiers, not
   names.**
2. **Event Pass, offline.** With the same list downloaded to the phone, put the
   device in airplane mode and scan that ticket. Expect a green admit, not
   "Ticket not found (offline)". This is the pair with plan 31-07: if the scan
   admits offline but the online scan refuses, 31-07 did not ship.
3. **Refund before the night.** Refund a ticket on a non-production project, then
   re-download the list. Expect the holder still present with `refundedAt` set
   and `checkedIn: false`; offline, expect an amber admit rather than a green one.
4. **Guest-list, twice.** `POST` a `guestListEntryId`, then `POST` the same id
   again. Expect 409 with `outcome: "already_recorded"`, a real ISO `at`, and
   `by.operatorLabel` holding the operator's name — not a blank, and not "Not
   recorded", which would mean the first write did not record it.
5. **Diagnostics.** Read `events[].diagnostics` on any response: three zeroes and
   `false` on a healthy night. A non-zero `refundCollisions` means a refund's
   delete did not happen — that is plan 31-09's territory.

---

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure | `src/app/api/tickets/attendance/route.ts` | `checkedInBy` puts a **staff member's** display name into IndexedDB on a staff phone, where it stays. It is required by the third outcome ("who recorded it and when") and it is an operator, not a guest — but the payload now holds a category of personal data it did not hold before, and T-31-06-02 in the plan's register only covered guest email. No email and no identifier is exposed: the label is resolved server-side and only the label travels. |

Nothing else: no new endpoint, no new service-client call site, no new column on
a publicly-readable table.

---

## Known Limits

- **A refund issued after the download cannot be known offline at all.** Stated
  in the code at `:265-271` and belonging in the night's runbook, not in an
  engineering workaround.
- **The diagnostics have no surface yet.** `refundCollisions`,
  `duplicateRefundRows`, `refundEvidenceUnavailable` and the new 500 are in the
  response body and nothing renders them — the scanner client belongs to a
  sibling plan and was deliberately not touched. Until it reads them, the failure
  is *reported* but not yet *observable to the staff at the door*, which is the
  standard `meta-gates.md` sets. Saying so is the point.
- **The refunded branch returns nothing until plan 31-09 ships.** The evidence
  columns are only populated by the refund writers that plan modifies; every row
  written before then has `refunded_ticket_id IS NULL`, which means *unknown*,
  never *none*.

---

## Self-Check: PASSED

- `src/app/api/tickets/attendance/route.ts` — FOUND
- commit `cd0a74c` — FOUND
- commit `d6a4dec` — FOUND
- `npm run build` — passes on both committed states
- files touched outside `files_modified` — none
