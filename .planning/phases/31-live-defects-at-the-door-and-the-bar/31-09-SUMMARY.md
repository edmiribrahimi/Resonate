---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 09
subsystem: ticketing-payments
tags: [refunds, audit-trail, silent-failure, cron, idempotency]
requires:
  - "31-04 migration: ticket_refunds.ticket_id nullable + ON DELETE SET NULL, four non-FK evidence columns, guest_list_entries.ticket_id ON DELETE SET NULL"
  - "src/types/database.ts: TicketRefund carries the four refunded_* fields (shipped with 31-04)"
provides:
  - "ticket_refunds.refunded_ticket_id / refunded_party_id / refunded_event_id / refunded_at, written by every refund writer before the ticket is deleted"
  - "A refund whose ticket could not be deleted fails loudly instead of returning success"
  - "reconcile-refunds returns per-cause failure counters under `failures`"
affects:
  - "src/app/api/tickets/checkin/route.ts (31-07) reads refunded_ticket_id on a not-found"
  - "src/app/api/tickets/attendance/route.ts (31-06) reads refunded_party_id / refunded_event_id"
  - "src/lib/analytics/event-queries.ts fetchEventRevenue — the join it needs now has a durable side"
tech-stack:
  added: []
  patterns:
    - "Evidence written before the destructive statement, never after"
    - "Every Supabase write in the money path destructures { error } — the client returns errors, it never throws them"
    - "One counter and one log category per cause, never a shared `errors` number"
key-files:
  created: []
  modified:
    - "src/app/(public)/tickets/refund-actions.ts"
    - "src/app/(admin)/admin/finance/actions.ts"
    - "src/app/api/cron/reconcile-refunds/route.ts"
decisions:
  - "The guest-list detachment branch was NOT written: the 31-04 migration already gives guest_list_entries.ticket_id an explicit ON DELETE SET NULL"
  - "adminRefund was fixed too, although the plan's call-site table omits it — same file, same defect, named by the probe"
  - "The evidence write's error is checked as well as the delete's: an unchecked evidence write means this plan's guarantee can silently not happen"
  - "The cron skips its insert when a refund row already carries the ticket's refunded_ticket_id (idempotency gate)"
  - "Where SumUp already moved the money, nothing is reversed and the message says not to retry"
metrics:
  duration: "~35 min"
  completed: 2026-08-05
  tasks: 2
  commits: 3
---

# Phase 31 Plan 09: A refund leaves something behind — Summary

Every refund path now writes which ticket, which party, which event and when
**before** deleting the ticket, and every delete's error is checked — so a
refund that could not remove its ticket says so to the organizer instead of
returning success while the holder keeps a ticket that still scans.

## What was built

### 1. The evidence, written before the delete

Four writers, five call sites (the plan's table counts four; `adminRefund` is the
fifth — see Deviations).

| Writer | Evidence write | `delete()` | Order |
|---|---|---|---|
| `refund-actions.ts` `approveRefund`, free/guest-list branch | `:142-161` (`refunded_ticket_id` at `:149`) | `:178-181` | write first |
| `refund-actions.ts` `approveRefund`, paid branch | `:231-244` (`:238`) | `:266-269` | write first |
| `refund-actions.ts` `adminRefund` | `:482-500` (`:494`) | `:519-522` | write first |
| `finance/actions.ts` `refundTransactionAction` | `:107-125` (`:118`) | `:149-152` | write first |
| `reconcile-refunds/route.ts` | `:162-182` (`:173`) | `:200-203` | write first |

The ticket selects were widened, because after the delete `party_id` and
`event_id` cannot be recovered from anywhere:

- `refund-actions.ts:119` — `.select("id, sumup_transaction_code, event_id, party_id, amount_paid, ticket_type")`
- `refund-actions.ts:454` — `.select("id, user_id, amount_paid, sumup_transaction_code, event_id, party_id, ticket_type")`
- `finance/actions.ts:97` — `.select("id, amount_paid, user_id, party_id, event_id")`
- `reconcile-refunds/route.ts:101` — `"id, user_id, amount_paid, party_id, event_id, sumup_transaction_code, sumup_checkout_id"`

`refunded_party_id` is **never coerced away from NULL** — an event-level ticket
belongs to no party, and NULL is the true value:
`refund-actions.ts:152`, `:240`, `:496`; `finance/actions.ts:120`;
`reconcile-refunds/route.ts:175` — all read `refunded_party_id: ticket.party_id`.

`refunded_at` reuses the same variable as `processed_at` (`freeProcessedAt`,
`processedAt`, `now`) so the two cannot drift.

`ticket_id` is untouched and still set to the ticket it names; the database nulls
it on the delete now that the foreign key is `ON DELETE SET NULL`
(`20260805120000_door_scan_events.sql:184-186`). The duality is commented once,
at `refund-actions.ts:146-155`, so a reader does not "tidy up" the apparent
duplication.

### 2. The silent failures, closed

All five `tickets.delete()` calls destructure `{ error: deleteError }` and check
it: `refund-actions.ts:178`/`:187`, `:266`/`:274`, `:519`/`:524`;
`finance/actions.ts:149`/`:154`; `reconcile-refunds/route.ts:200`/`:207`.

Each has its **own** log category, not a shared string:
`[refund/approve/free]`, `[refund/approve/paid]`, `[refund/admin]`,
`[finance/refund]`, `[cron/reconcile-refunds/tickets]`,
`[cron/reconcile-refunds/drinks]`.

The failure is **observable**, not merely logged: both callers already render the
thrown message — `RefundActions.tsx:70` and `RefundDialog.tsx:54` both do
`setError(err.message)`. That matters because this repository has no error
tracking, so a log alone would reach nobody.

The evidence write's error is checked too (`refund-actions.ts:163`, `:250`,
`:504`; `finance/actions.ts:131`; `reconcile-refunds/route.ts:185`). If it did
not land, the ticket is **deliberately left in place** — deleting it would
destroy the only place those values could still be read from, which is the exact
defect this plan repairs.

### 3. The cron says why

`grep -c "catch { errors++ }"` returns **0**. Both loops were carrying it (`:74`
and `:124` before this change); the shared `errors` variable is gone.

Four counters, each incremented in its own branch with its own log category, and
all four returned in the response body under `failures` (`:239-246`):

| Counter | Branch | Meaning |
|---|---|---|
| `drinkReconcileFailed` | `:87` | a drink order threw while reconciling |
| `refundWriteFailed` | `:142`, `:186` | the existence lookup or the `ticket_refunds` insert returned an error |
| `ticketDeleteFailed` | `:208` | the refund is recorded but the ticket is still valid at the door |
| `unexpected` | `:226` | anything thrown in the ticket loop (SumUp lookup, network) |

The per-item `try/catch` stays **inside** both loops (`reconcile-refunds/route.ts:225`,
`:86`): one bad item must never abort the drain — `ticketing-payments.md`, gate
*cron non atomico*. `ticketsInvalidated` is no longer incremented when the delete
failed (`:207-217` `continue`s before `:219`), so the cron stops reporting work it
did not do.

## Key decisions

**The guest-list detachment branch was not written, and that is the probe's
answer, not a judgement made here.** `31-REFUND-PROBE.md` Consequences row 2 reads
*"REQUIRED — settled by Probe B, 2026-08-05"* for giving
`guest_list_entries.ticket_id` an explicit `ON DELETE SET NULL`, and the 31-04
migration carries it at `20260805120000_door_scan_events.sql:295-300`. Row 3 then
asks for the error check **on top of** it — *"an error check alone would turn a
silent failure into a loud one while still leaving the refund unfinishable. Item 2
is what makes it complete… Both, not either."* Row 2 is the migration's; row 3 is
this plan's, and it is what shipped here. Detaching by hand as well would be a
second mechanism for a constraint that already resolves itself.

**Money that has already moved is not reversed.** In the paid branch, in
`adminRefund` and in `finance/actions.ts`, the SumUp refund happens before these
writes. When a write then fails, the code does not roll the refund back — a
payment state moves forward only (`meta-gates.md`, monotone guards). It stops,
and it says so.

**The messages tell the operator whether retrying is safe, because the two cases
differ.** In the free branch nothing moved, so the message invites a retry
(`:196`). Everywhere money moved, it says *do not retry* (`:259`, `:284`, `:513`,
`:533`; `finance/actions.ts:142`, `:165`) — `adminRefund` and
`refundTransactionAction` have no pending-status guard, so a retry would attempt a
second SumUp refund. `approveRefund` happens to be protected by its own
`status !== "pending"` check at `:110-112`, which now also makes a failed delete
un-retryable through the UI; that is why its message says to remove the ticket
manually rather than to try again.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 2 — missing critical functionality] `adminRefund` fixed as well**
- **Found during:** Task 1
- **Issue:** The plan's call-site table lists four sites and omits
  `refund-actions.ts` `adminRefund`. `31-REFUND-PROBE.md:250` names it
  explicitly — *"refund-actions.ts:389-392 — adminRefund, same shape"* — and it
  has the identical insert-then-delete defect in a file already in
  `files_modified`.
- **Fix:** Evidence written before the delete (`:482-500`), delete's error
  checked (`:519-527`), insert's error checked (`:504-517`).
- **Commits:** `3f145bc`, `e85a99b`

**2. [Rule 2 — missing critical functionality] the evidence write's error is checked, not only the delete's**
- **Found during:** Task 2
- **Issue:** The plan asks for the delete's error. But if the evidence
  `update`/`insert` silently fails and the delete then succeeds, the plan's own
  guarantee — *"a refund records which ticket… before the ticket row is
  deleted"* — has not happened, and nothing says so. That is the same class of
  defect the plan exists to close.
- **Fix:** Every evidence write destructures its error; on failure the ticket is
  not deleted and the action throws with its own category.
- **Commit:** `e85a99b`

**3. [Rule 2 — missing critical functionality] idempotency guard on the cron's insert**
- **Found during:** Task 2
- **Issue:** `ticketing-payments.md`, gate *idempotenza*: a refund handler must
  be runnable twice with the effect of once. The cron scans `tickets`; a ticket
  whose delete keeps failing stays in the table and would collect a new approved
  `ticket_refunds` row **every night**. With the join repaired, `fetchEventRevenue`
  would then over-count refunds — the mirror image of the under-count this plan
  fixes.
- **Fix:** `reconcile-refunds/route.ts:135-158` looks for an existing row with
  this `refunded_ticket_id` and skips the insert if one is there. The delete is
  still retried.
- **Commit:** `e85a99b`

**4. [Rule 3 — blocking] the drink loop's `catch { errors++ }` also replaced**
- **Found during:** Task 2
- **Issue:** The verification requires `grep -c "catch { errors++ }"` to return 0
  over the whole file, and the shared `errors` variable could not be removed
  while the drink loop still used it.
- **Fix:** Its own counter, `drinkReconcileFailed`, and its own log category
  (`:86-93`). The loop's logic is otherwise untouched.
- **Commit:** `e85a99b`

## Verification

**Automated — the only automatic gate this repository has.** There is no test
runner for the product (`package.json` has no `test` script, no `*.test.*` or
`*.spec.*` file exists), so nothing here is verified because "the tests pass".

```
npm run build                                   -> ✓ Compiled successfully in 3.8s
grep -c "catch { errors++ }" reconcile-refunds  -> 0
grep -c "refunded_ticket_id" refund-actions.ts  -> 6
grep -c "refunded_ticket_id" finance/actions.ts -> 2
grep -c "refunded_ticket_id" reconcile-refunds  -> 2
```

**What the build does NOT prove, and it matters here.**
`src/lib/supabase/service.ts:4` calls `createClient` **without the `Database`
generic**, so the service client is untyped: `.insert()` and `.update()` accept
any object and no compiler confirms a single one of these column names. The green
build says the TypeScript is well-formed, not that the columns exist. That is why
the manual step below is the real verification.

**Manual verification — required, not optional, and not yet performed.**

*Precondition:* the 31-04 migration is **not applied to the live database**.
Until it is, `refunded_ticket_id` does not exist and every refund path here fails
at its evidence write — visibly now, which is the intended behaviour, but it means
none of the steps below can pass before the migration runs.

1. Apply `supabase/migrations/20260805120000_door_scan_events.sql` on a
   **non-production** project.
2. As an `organizer`, refund one paid ticket from
   `/organizer/events/[id]/tickets`. Expect the success state.
3. `SELECT refunded_ticket_id, refunded_party_id, refunded_event_id, refunded_at, ticket_id
   FROM ticket_refunds WHERE refunded_ticket_id = '<ticket id>';`
   Expect the four evidence columns populated and `ticket_id` **NULL**. Record the
   row by identifier only.
4. Repeat on an **event-level** ticket (no party): expect `refunded_party_id`
   NULL and the other three populated — NULL here is correct, not a miss.
5. Force a delete failure: point a `guest_list_entries` row at a ticket, then
   **drop the `ON DELETE SET NULL`** on `guest_list_entries_ticket_id_fkey` to
   reproduce the pre-migration constraint, and refund that ticket. Expect the UI
   to show *"…the ticket could NOT be removed (23503): it is still valid at the
   door"* and the ticket to still exist. Restore the constraint afterwards.
6. Run the cron with the `CRON_SECRET` bearer header and read the response body:
   expect a `failures` object with the four named counters.

## Known limitations

**The cron's counters reach a human only on a manual run.** There is no error
tracking in this repository, so on the scheduled nightly invocation the response
body is written to a log nobody reads. The counters are a genuine improvement
over one collapsed number, and they are still not an alert. `meta-gates.md` asks
that this be said rather than left to be assumed.

**Rows written before 2026-08-05 have `refunded_ticket_id IS NULL`, and that means
*unknown*, not *none*.** The tickets they named were destroyed by the cascade
(`20260805120000_door_scan_events.sql:215-220`). No backfill is possible and none
was attempted.

## Deferred Issues

Recorded here rather than in a shared `deferred-items.md`, because three sibling
plans are executing in parallel against the same phase directory and a shared
append would conflict.

1. **`finance/actions.ts` deletes the ticket on a *partial* refund too.**
   `refundTransactionAction(transactionCode, amount)` accepts a partial amount
   (`RefundDialog.tsx:48-51`), yet the ticket is removed and the refund row is
   written with `amount: ticket.amount_paid` — the full price — whatever was
   actually returned. Pre-existing; out of this plan's scope, which was not to
   restructure the refund flow.
2. **The drink loop's writes are still unchecked.**
   `reconcile-refunds/route.ts:60-70` updates `drink_tokens` and `drink_orders`
   without destructuring their errors, so a failed token invalidation still
   counts as `drinkRefunded++`. Same defect class as the one fixed on the ticket
   side; left alone to keep this plan inside its stated scope.
3. **`adminRefund` and `refundTransactionAction` have no idempotency guard.**
   Neither checks for an existing approved refund before calling SumUp, so a
   determined retry can attempt a second refund. Mitigated here only by wording —
   the messages say not to retry. A real guard is a change to the refund flow.

## Threat Flags

None. No new network endpoint, auth path, file access or trust-boundary schema
change was introduced. The columns written live on `ticket_refunds`, whose
existing policies (`refunds_select_own`, `refunds_select_admin`) are untouched —
adding columns to a table does not widen its policies (T-31-09-03, disposition
*accept*).

## Self-Check: PASSED

- `.planning/phases/31-live-defects-at-the-door-and-the-bar/31-09-SUMMARY.md` — created
- `src/app/(public)/tickets/refund-actions.ts` — FOUND
- `src/app/(admin)/admin/finance/actions.ts` — FOUND
- `src/app/api/cron/reconcile-refunds/route.ts` — FOUND
- commit `3f145bc` — FOUND
- commit `e85a99b` — FOUND
</content>
</invoke>
