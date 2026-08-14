---
phase: 46-silent-failures-on-the-money-path
plan: 07
subsystem: ticketing-payments
tags: [cron, refunds, observability, drink-tokens, obs-02, obs-03]
requires:
  - "46-01 — the approved sentence list (46-COPY.md §4)"
  - "46-02 — src/lib/failure/money-path.ts (SafeError, logMoneyPathFailure)"
provides:
  - "The first converted cron in this repository: a named outcome vocabulary, two total maps, one response function"
  - "A truthful cleanup report — asked-for and deleted are separate numbers"
  - "A non-2xx terminal status on a failed run, which is the only observable channel this route has"
affects:
  - "src/app/api/cron/refund-expired-tokens/route.ts"
  - "the platform's cron dashboard — runs that previously showed green while deleting nothing now show red"
tech-stack:
  added: []
  patterns:
    - "as const satisfies Record<Union, number> for the status map (from finalize/route.ts:236-254)"
    - "one respond() producing category, log line and response together (from finalize/route.ts:414-421)"
    - "unknown narrowed to SafeError before any log — code and message only"
key-files:
  created: []
  modified:
    - "src/app/api/cron/refund-expired-tokens/route.ts"
decisions:
  - "D-46-06 extended by the owner's answer A in 46-COPY.md: refundErrors > 0 also terminates the run non-2xx"
  - "The three failure outcomes share status 500 — the dashboard reads only the 2xx boundary, so a finer code would be a distinction nobody reads; the map stays total so the next category must still declare one"
  - "Money outranks cleanup in the outcome ordering: a failed refund names the outcome even when the delete also failed. The counts carry the rest"
  - "The log in respond() fires on failure only — a nightly success line is noise in the one place a real failure has to be legible"
metrics:
  duration: ~35 min
  completed: 2026-08-14
---

# Phase 46 Plan 07: The Refund Cron's Report Summary

The refund cron stops reporting the rows it failed to delete as deleted, and a run
that did not finish now terminates non-2xx so it shows red in the cron dashboard —
the one observable channel this phase gets for free.

## What was wrong

Two separate defects at one site (`route.ts:161-174` before the change):

```ts
const { count } = await supabase.from("drink_tokens").delete().in("id", tokenIdsToDelete);
deletedCount = count ?? tokenIdsToDelete.length;
```

1. **The delete's `error` was never destructured.** A refused delete reported as a
   full success.
2. **The coalesce was backwards.** `.delete()` without `{ count: "exact" }` returns
   `count === null` on the **success** path too, so `?? tokenIdsToDelete.length`
   reported the *intended* length essentially always. The rows that remain were
   counted as deleted — and the route returned 200 regardless, at night, where
   nobody is watching.

## What was built

### Task 1 — the truth, and the run's colour (`3a5292a`)

- `.delete({ count: "exact" })` at `route.ts:317` — the number reported is now a
  measurement, not an intention.
- `const { count, error }` at `:315`; on `error` the failure goes through
  `logMoneyPathFailure` (`:320`) and sets `deleteRefused`.
- `deletedCount = count ?? 0` at `:325`. A null count is not a measurement, so it
  reports as zero deleted and the run goes red on the short branch — the coalesce
  to the intended length is gone.
- The body carries `deleteRequested` beside `deleted`, so *asked 40, deleted 40* and
  *asked 40, deleted 0* are two different lines in a dashboard rather than the same
  one. `refunded` and `refundErrors` keep their existing names.
- The refund loop's `catch` (`:263-271`) no longer passes the whole caught value to
  the log. `toSafeError` (`:17-26`) narrows `unknown` to `code` and `message`, both
  only when they are strings; everything else is dropped rather than stringified.
  `orderId` stays in the scope string, which is what made that line useful (T-46-23).

### Task 2 — the vocabulary, the two total maps, the one function (`fcf644c`)

- Four constants (`:47-50`), a union from `typeof` (`:52-56`).
- `CRON_REFUND_HTTP` (`:81-86`) — `as const satisfies Record<CronRefundOutcome, number>`.
- `CRON_REFUND_REPORT` (`:100-109`) — `Record<CronRefundOutcome, string>`, the four
  sentences **verbatim from `46-COPY.md` §4**.
- `respond()` (`:134-141`) — one function writing the log line and returning the JSON
  with the status from the map, so category, status and log cannot drift apart.
- The failure statuses carry their meaning in place (`:58-80`, the `CRON_REFUND_HTTP`
  docblock): a cleanup that could
  not run is not a refusal of anyone — this route's only caller is a scheduler — it
  is a run that **did not finish**. The comment states plainly that the dashboard's
  2xx/non-2xx boundary is the whole observable channel for this route, that there is
  no error tracking in this repository (`OBS-01`, deferred to Future), and records
  D-46-06's accepted cost: **if it fails often the red becomes wallpaper.**

## The owner's decision, as implemented

`46-COPY.md` §4 carries the disposition note in place, answered in the 46-01 approval
(Decision 1, answer **A**):

| Outcome | Status |
|---|---|
| `CRON_REFUND_OK` | 200 |
| `CRON_REFUND_DELETE_REFUSED` | 500 — failed run |
| `CRON_REFUND_DELETE_SHORT` | 500 — failed run |
| `CRON_REFUND_REFUNDS_FAILED` | 500 — failed run |

The plan deferred the third row to the owner; the answer was already recorded, so no
checkpoint was raised. Reason on the record: it is the only path in the phase where
money has to go back and does not, and without error tracking a counter inside a 200
is a log line — a place nobody looks.

## Verification

**No test claim is made. This repository has no test runner for the product.** The
evidence below is `npm run build`, greps, and one mutation probe.

### Before/after grep counts, as the plan asked

| Predicate | Before | After | Expected |
|---|---|---|---|
| `count ?? tokenIdsToDelete.length` | 1 | **0** | 0 |
| `delete({ count: "exact" })` | 0 | **1** | 1 |
| `error` within 3 lines after the delete | 0 | **2** | ≥1 |
| `Refund failed for order` (whole-object log) | 1 | **0** | 0 |
| new bare `console.error` in Task 1's diff | — | **0** | 0 |
| `menuCloseInstant` | 3 | **3** | unchanged |
| `refundedCount += tokens.length` | 1 | **1** | 1, still inside the loop |
| `refundTransaction\|refunded_amount\|status: "refunded"` | 6 | **6** | unchanged |
| `satisfies Record<` | 0 | **1** | ≥1 |
| `NextResponse.json` | 2 | **2** | 2 |

### The four sentences are verbatim

Checked mechanically against `46-COPY.md` — each string extracted from
`CRON_REFUND_REPORT` and matched as a substring of the approved document:
`count=4 missing=0`. No sentence was edited, and none was invented.

### The totality map was proved by mutation

A gate that no reachable situation trips is decoration, so it was tripped. A fifth
union member (`"cron_refund_mutation_probe"`) was added **without** a status entry;
the mutation was asserted present (`grep -c` → 1) before the build was read, so the
green that followed the revert could not be a false negative.

```
Failed to compile.
Type error: Type '{ readonly cron_refund_ok: 200; … }' does not satisfy the
expected type 'Record<CronRefundOutcome, number>'.
```

The probe was reverted and the file confirmed byte-identical to its pre-mutation
state (`diff` → no output), then `npm run build` green again.

### Perimeter

Measured with `git diff --stat` against the plan's base `bd8eb8d`:

- `supabase/migrations/` → empty
- `src/app/api/webhooks/` → empty
- `src/app/api/cron/` → **only** `refund-expired-tokens/route.ts`; no other cron opened
- `package.json`, `package-lock.json` → empty (no package installed; `node_modules`
  was symlinked to the main checkout for the build and removed afterwards)
- `src/` → one file, 178 insertions, 6 deletions

`npm run verify` was **never run** — `scripts/rls-baseline.mjs:205-215` reaches the
Supabase Management API against production.

### What was deliberately not touched

- **The window arithmetic.** Grace and cleanup windows still go through
  `menuCloseInstant` in Europe/Rome (`:178`, `:294`, and the import at `:4`). A
  two-hour slip on a daily cron does not produce a two-hour error, it produces a
  whole day.
- **The money path.** `refundTransaction`, the `refunded_amount` accumulation and the
  token transition to `refunded` are unchanged — the grep count is 6 before and 6
  after. Nothing here makes an amount that was taken look untaken (monotone guard,
  `meta-gates.md`).
- **Per-item progress.** `refundedCount += tokens.length` stays inside the per-order
  loop (`:262`), and each refund's failure is still counted per item
  (`ticketing-payments.md`, gate *cron non atomico*). The route remains safe to run
  twice: the refund loop only selects `status = "purchased"` tokens, and the cleanup
  deletes by id — a second run finds nothing left to do.
- **The authorization check** at `:150-154`.
- `console.error` at `:228` (*No transaction code for order …, skipping refund*) —
  it already logs a distinct, non-object line, and the refund side's money logic is
  out of scope for this plan.

## Manual procedure — `Result: pending`

> **Role:** whoever watches deployments. (A role, never a person — `.planning/` is
> public.)
>
> **Environment:** the owner's own environment. **Not** a worktree pointed at
> `.env.local` (D-41.2-04), and **not** production.
>
> **Steps**
>
> 1. Arrange for the cleanup delete to be refused — e.g. revoke the service role's
>    delete on `drink_tokens`, or point the cron at a database where that grant is
>    absent — with at least one `redeemed` or `refunded` token older than 24h past
>    its menu close, so `deleteRequested > 0`.
> 2. Invoke the cron with its authorization header:
>    `curl -i -H "Authorization: Bearer $CRON_SECRET" <base>/api/cron/refund-expired-tokens`
>
> **What must appear**
>
> - A body naming **how many rows were asked for and how many were deleted** —
>   `deleteRequested` non-zero beside `deleted: 0` — with `outcome` and the approved
>   `report` sentence.
> - A **non-2xx** status, and the run marked **failed** in the hosting dashboard —
>   not green.
>
> 3. Restore the grant and invoke it again with the delete succeeding.
>
> **What must appear:** `200`, `outcome: "cron_refund_ok"`, and `deleted` equal to
> `deleteRequested`.
>
> **Result: pending**

## Deviations from Plan

**One, and it is cosmetic.** A docblock sentence written during Task 1 contained the
literal text `console.error` in prose, which made the plan's mechanical check
(*no new bare `console.error` in the diff*) return 1 on a comment rather than on a
call. The prose was reworded to *"logging that value whole"*; the check then returned
0. No behaviour was involved. Recording it because a check that is satisfied by
rewording deserves to be visible rather than quietly passed.

Otherwise the plan executed as written. No Rule 4 situation arose, and the plan's one
open question (`refundErrors > 0`) was already answered in `46-COPY.md`, so no
checkpoint was raised.

## Known Stubs

None. No placeholder, no TODO and no unwired path was introduced by this plan.

## Threat Flags

None. This plan opens no new network endpoint, no auth path, no file access and no
schema surface. Every register entry in the plan's threat model is addressed:
T-46-23 (whole-object log) and T-46-25 (a failed cleanup reported as success) are
mitigated in code; T-46-24 is held by the body carrying counts and a category
constant only; T-46-26 is asserted by the unchanged grep counts above; T-46-27 is the
accepted cost, unchanged.

## Self-Check: PASSED

- `src/app/api/cron/refund-expired-tokens/route.ts` — FOUND
- `.planning/phases/46-silent-failures-on-the-money-path/46-07-SUMMARY.md` — FOUND
- commit `3a5292a` — FOUND
- commit `fcf644c` — FOUND
</content>
</invoke>
