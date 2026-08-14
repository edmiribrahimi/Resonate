---
phase: 46-silent-failures-on-the-money-path
plan: 03
subsystem: ticketing-payments
tags: [observability, purchase-path, discount-codes, permissive-reads]
requires:
  - "src/lib/failure/money-path.ts (46-02)"
provides:
  - "PurchasePrecheckUnreadable — three named ways a pre-check read in purchaseTicket fails to answer"
  - "logPurchasePrecheckUnreadable — the safe log line for this file's purchase region"
  - "an in-file record of why the purchase pre-check stays permissive, and of the residual it leaves"
affects:
  - "src/app/(admin)/admin/events/actions.ts — purchaseTicket only"
tech-stack:
  added: []
  patterns:
    - "constants → union from typeof → total Record (money-path.ts §1)"
    - "S5's destructuring, classification and safe log — WITHOUT S5's refusal"
key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/events/actions.ts"
decisions:
  - "D-46-05 applied: the pre-check keeps its permissive direction on a failed read"
  - "D-46-08 applied: observability, not a new refusal"
  - "D-46-07 recorded at the site, not only in .planning/"
metrics:
  tasks: 2
  commits: 2
  files-changed: 1
  lines: "+121 / -8"
  completed: 2026-08-14
requirements: [OBS-03]
---

# Phase 46 Plan 03: The Three Permissive Reads in `purchaseTicket` Summary

Three reads on the purchase path — the tier list, the sold count and the discount
usage count — now destructure their error and log it safely, and the code names
the difference between *counted zero* and *could not count*. **None of the three
changed what it decides.**

## What this plan closes, and what it does not

**This plan closes OBS-03. This plan does NOT close OBS-02 for these three sites.**

Saying it in those words is part of the deliverable, not a hedge. `OBS-03` asks
that a failed read stop being indistinguishable from a legitimate answer — that
is done, in the type and in the prose beside each branch. `OBS-02` asks for an
effect **a person can see**, and there is none here, deliberately:

- `D-46-05` keeps the pre-check permissive, so a failed read produces no refusal
  and therefore nothing a buyer perceives.
- The project has no error tracking (`meta-gates.md`), so the log line this plan
  adds reaches nobody on its own. A log is not an observable effect.
- The person-visible outcome for a genuinely unavailable tier arrives from
  `reserve_ticket`, at the database, **after payment** — which is `D-46-07`, the
  accepted risk, and the deferred seat-reservation phase is its fix.

A summary claiming OBS-02 here would be exactly the confident, well-formatted,
wrong statement this phase exists to remove.

## Tasks

| Task | Name | Commit | Files |
|---|---|---|---|
| 1 | The two capacity reads say which failure they had | `3e5f896` | `src/app/(admin)/admin/events/actions.ts` |
| 2 | The discount usage-limit read stops reading a failure as never used | `3e2c5c9` | `src/app/(admin)/admin/events/actions.ts` |

## What was built

### The construction (Task 1)

Immediately above `purchaseTicket`: three constants, a union built from `typeof`
over them, and a **total** `Record<PurchasePrecheckUnreadable, string>` holding
each category's scope string. Not a bare string union with a `switch` — the
`Record` is what makes a fourth category added later an `npm run build` error
rather than a log line naming nothing. Same construction as
`src/lib/door/outcome.ts:278-302` and `src/app/api/media/finalize/route.ts:236-254`.

One helper, `logPurchasePrecheckUnreadable(category, error)`, delegates to
`logMoneyPathFailure` from `src/lib/failure/money-path.ts` (built by 46-02). Its
second parameter is typed `SafeError | null`, which has no `details` field — so
*never log the whole error object* is enforced by the type instead of remembered
by the author. **No `console.error` was added to this file's purchase region**
(asserted by diff, below).

### The three reads

| Read | Before | After | Direction |
|---|---|---|---|
| tier list | `const { data: allTiers } = await tierQuery;` — a failed read made the **entire** capacity block vanish | destructures `error`; the single `if (allTiers && allTiers.length > 0)` is split into three named arms — *could not count*, *counted zero*, *counted* | **unchanged** |
| sold count | `const { data: soldCounts } = await supabase…` — a failed read left `soldMap` empty, so every tier read as zero sold and therefore available | destructures `error`; the empty-map case is labelled at the point `soldMap` is built as an **unread** count, not an empty one | **unchanged** |
| discount usage | `const { count } = await supabase…` — a failed count read as *this code has never been used*, opening the limit | destructures `error`; the branch states that `count` is null, so `(count ?? 0) >= max_uses` is false, so the limit opens — an unread count, not an unused code | **unchanged** |

### The docblock, and why it carries four things

Written over the chain-validation block. It records (1) that the permissive
direction is **deliberate**, decided as D-46-05, so the next reader does not
"finish the job"; (2) why — `reserve_ticket` is the guard that actually holds;
(3) the counter-argument that was weighed, `checkin-offline.md`'s asymmetry
(refusing a valid holder is worse than admitting a duplicate, because the first
happens in front of people); and (4) **the residual, stated rather than hidden** —
D-46-07, the window where a payment completes for a seat that is not there, with
the note that nothing in this file makes it visible today.

Task 2's comment **points at that docblock** instead of restating the argument.
Two copies of one argument drift.

### Verified at the source, not from a document

The docblock asserts three things about `reserve_ticket`. Each was read directly
in `supabase/migrations/20260310100000_discount_codes.sql` (read-only, never
edited) before being written down:

- locks the tier row `FOR UPDATE` — `:130-133`
- counts sold and **raises** `Tier sold out` rather than coalescing — `:140-147`
- validates `max_uses` in the same transaction, locking the discount code
  `FOR UPDATE` too — `:150-169`

This also settles `46-FINDING-01.md`'s "Not verified here" question — *whether
any database-level constraint bounds tickets per tier*. One does, and it fails
closed. The finding's severity claim should be read with that amendment
(D-46-05), which is why the finding's own recommendation to weigh the direction
rather than assume it was followed rather than skipped.

## Coordinates: three re-measured, one was wrong

Six of eight coordinates handed to this phase were stale. All three sites here
were matched **by predicate text**, never by remembered line number:

| Cited | Actually | Anchor used |
|---|---|---|
| `:1228-1233` (folded todo, DI-TODO-A) | **wrong file region** — `:1228-1233` is the **profile** read, unrelated and already correctly destructured. Real site `:1411-1416` | `if (code.max_uses !== null)` |
| `:1271` (F-46-01 read 1) | `:1271` — correct | `const { data: allTiers } = await tierQuery;` |
| `:1279` (F-46-01 read 2) | **`:1278`** — off by one | `const { data: soldCounts } = await supabase` |

Editing at `:1228` would have modified the authentication path inside
`purchaseTicket`. The profile read was **not touched**.

## Deviations from Plan

None — plan executed exactly as written. No deviation rule fired.

## Threat Flags

None. No new network endpoint, no new auth path, no schema change, no new file
access. The three sites already existed and their trust boundaries are unchanged;
the register's dispositions (T-46-07 accept, T-46-08 accept, T-46-09 mitigate,
T-46-10 mitigate) all hold as planned.

## Known Stubs

None.

## Verification

### Derivations (mechanical, run on the working tree)

| Check | Expected | Result |
|---|---|---|
| `grep -c 'const { data: allTiers } = await tierQuery;'` | `0` | **0** |
| `grep -c 'const { data: soldCounts } = await supabase'` | `0` | **0** |
| `grep -c 'PurchasePrecheckUnreadable'` | ≥ `3` | **6** |
| `grep -c 'This ticket tier is not available'` | `1` | **1** |
| `grep -c 'reserve_ticket'` | ≥ `1` | **2** |
| `grep -c 'D-46-07'` | ≥ `1` | **1** |
| `grep -A3 'if (code.max_uses !== null)' \| grep -c 'error: usageError'` | `1` | **1** |
| `grep -cE 'Invalid discount code\|Discount code is no longer active\|Code not valid for this event\|Code not valid for this tier\|Code usage limit reached'` | `5` | **5** |
| `grep -c 'Discount would bring price below minimum'` | `1` | **1** |
| added lines containing `console.error` | `0` | **0** |
| removed lines containing `throw new Error` | `0` | **0** |
| `git diff --stat supabase/migrations/` | empty | **empty** |
| `git diff --stat src/app/api/webhooks/` | empty | **empty** |
| `git diff --stat package.json package-lock.json` | empty | **empty** |
| `npm run build` | exit `0` | **✓ Compiled successfully** |

Every predicate the function refused on before, it refuses on now — asserted
positively, not only by the absence of removals:
`soldMap.set(s.tier_id` → 1, `const sold = soldMap.get(t.id) ?? 0;` → 1,
`statusMap.set(t.id, "sold_out")` → 1, `requestedStatus !== "available"` → 1.

The full set of lines **removed** across both commits is eight, and every one is
part of the three reads or their immediate scaffolding — no predicate, no throw,
no branch was deleted.

### The verification claim, stated honestly

**There is no test runner for the product** (`package.json` has no `test` script;
no `*.test.*` or `*.spec.*` exists). Nothing here is verified because "tests
pass". The gate run was `npm run build`, which is also the typecheck, plus the
greps above. `npm run verify` was **not** run — it reaches the Supabase
Management API against production.

### Manual procedure — `Result: pending`

Not run here: it needs a running app against a real Supabase project, and a
worktree may not use `.env.local` (D-41.2-04). Production is forbidden.

**Role:** an organizer or master with a signed-in session, in the owner's own
environment.

1. Pick an event with a **quantity-limited** tier (`ticket_tiers.quantity` not
   null) that still has seats.
2. Induce a failure on the **sold-count** read only — e.g. temporarily revoke the
   session's `SELECT` on `tickets` for that role, or point the client at an
   unreachable host for the duration of that one call. The point is a transient
   read error, not a schema change.
3. Attempt a purchase of that tier from the public event page.
4. **Observe in the server log exactly one line** of the form
   `[purchaseTicket.sold_count_unreadable] code=… message=…` — one line, with a
   `code=` and a `message=`, and **no row contents**: no `details`, no
   `membership_code`, nothing beyond those two fields.
5. **Observe that the purchase is NOT refused by the pre-check.** It proceeds to
   the SumUp checkout. **This is the decided behaviour (D-46-05), not a defect.**
   A refusal here would be the failure to report.
6. Restore access. Repeat with the **tier-list** read failing, expecting
   `[purchaseTicket.tier_list_unreadable] …`, and with the **discount usage**
   read failing on a code that has a `max_uses`, expecting
   `[purchaseTicket.discount_usage_unreadable] …` and the purchase continuing.
7. Record what each run produced next to this procedure.

**Result: pending.**

## What the next phase inherits

- The window D-46-07 records — a completed payment for a seat that is not there —
  **is still open and still silent**, now with its reason written at the site.
  The deferred seat-reservation phase (hold the seat when checkout begins, commit
  on payment, release on expiry) makes it impossible rather than visible.
- The four discount `throw`s plus the usage-limit and minimum-price throws are
  still thrown sentences, and Next redacts them in a production build (S2). They
  were deliberately **not** converted: the caller that would read a returned
  category (`PendingIntentHandler.tsx`) is out of perimeter under D-46-11.

## Self-Check: PASSED

- `src/app/(admin)/admin/events/actions.ts` — FOUND (modified, not created)
- `.planning/phases/46-silent-failures-on-the-money-path/46-03-SUMMARY.md` — FOUND
- commit `3e5f896` — FOUND
- commit `3e2c5c9` — FOUND
</content>
</invoke>
