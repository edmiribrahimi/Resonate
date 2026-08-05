# 31-03 — Refund Probe: what the database actually does

**Status: OPEN. Neither database claim has been executed.**
**Date opened:** 2026-08-05
**Requirement:** FIX-09
**Reads into:** plan 31-04's migration (the `guest_list_entries` decision, below)

---

## Why this document exists

`31-RESEARCH.md § Answer E` carries two findings marked **MEDIUM confidence**.
Both are unambiguous in the migration text. **Neither has been run against a
database.** `ai-engineering.md`, gate *hallucination*: a DDL reading is a
hypothesis until it is confirmed at the source. `supabase-data.md`, gate
*migration in avanti*: an applied migration is a historical fact and is never
edited — a second one is written instead. Those two gates together are the whole
reason this observation comes **before** plan 31-04 and not after it.

`ticketing-payments.md` states the same discipline for the money path: *«lo stato
di un pagamento si legge interrogando il provider, mai dal corpo del webhook»* —
never trust what announces itself. A claim about what Postgres does is subject to
the same rule. Reading the DDL is the announcement. Running it is the source.

---

## What was run and where

**Nothing has been run yet.**

| | |
|---|---|
| Target used | *(to be filled by the operator)* — a **non-production** project, or a local Postgres carrying the repository's 32 migrations |
| Ran against production | **No.** Production must not be touched — see the constraint below |
| Date run | *(to be filled)* |
| Role that ran it | *(to be filled — role, never a person)* |

**Why production is excluded.** `STATE.md` records production as holding
**2 events, 3 parties, 1 ticket, 4 profiles**. A `DELETE FROM tickets` there is
unrecoverable, and it would destroy the single row the rest of this phase's
research describes. The probe therefore runs on a non-production target only.

**What must never be pasted into this file.** `.planning/` is tracked in a
**public** repository (`ai-engineering.md`, gate *la pianificazione e' pubblica*).
No connection string, no service key, no project hostname, no member name, no
address of any kind. Row identifiers only, and roles instead of people.

---

## Probe A — does the cascade destroy the refund audit row?

**The claim (A1).** `supabase/migrations/20260227200000_ticket_refunds.sql:3`
declares:

```sql
ticket_id uuid NOT NULL REFERENCES public.tickets ON DELETE CASCADE,
```

All four refund writers insert or update the `ticket_refunds` row and then delete
the ticket. If the cascade behaves as the DDL reads, the delete destroys the audit
row written one statement earlier.

**Statements to run** (non-production target, in one session):

```sql
-- 1. a ticket, on any event and party that already exist there
INSERT INTO public.tickets (...) RETURNING id;              -- note the id as <T1>

-- 2. a refund row pointing at it
INSERT INTO public.ticket_refunds (ticket_id, requested_by, amount, status)
VALUES ('<T1>', '<any auth user id>', 1.00, 'approved');

-- 3. baseline
SELECT count(*) FROM public.ticket_refunds WHERE ticket_id = '<T1>';   -- expect 1

-- 4. the delete the refund path performs
DELETE FROM public.tickets WHERE id = '<T1>';

-- 5. the observation
SELECT count(*) FROM public.ticket_refunds WHERE ticket_id = '<T1>';
```

**Literal output of step 5:** *(not yet observed)*

| Observation at step 5 | Verdict on A1 |
|---|---|
| `0` | **CONFIRMED** — the cascade destroys the audit row |
| `1` | **DISPROVED** — the audit trail survives, and the scope of the fix shrinks |
| anything else | neither; record it verbatim and stop |

**Verdict on A1: OPEN — not observed.**

**Second consequence, to be stated only if A1 is confirmed.**
`fetchEventRevenue` (`src/lib/analytics/event-queries.ts:84-92`) computes ticket
refunds in two steps: it collects the event's ticket ids, then queries
`ticket_refunds` with `.in("ticket_id", ticketIds)`. If the cascade is real, both
sides of that join are gone after a refund, so `ticketRefundsTotal` is
structurally `0` and the gross figure loses the refunded ticket too. The finance
surface would then under-report **with no error raised anywhere** — which is
exactly the failure shape `meta-gates.md` names *zero fallimenti silenziosi*, and
the repo has **no error tracking** to catch it. If A1 is confirmed, the refund
rows already destroyed are gone and **cannot be backfilled**.

---

## Probe B — does a guest-list entry block the delete?

**The claim (A2).** `supabase/migrations/20260310000000_guest_list.sql:55` declares:

```sql
ticket_id uuid REFERENCES public.tickets(id),      -- no ON DELETE clause
```

No `ON DELETE` clause means the default, `NO ACTION`. Deleting a ticket that a
guest-list entry points at should therefore raise a foreign-key violation. The
column is genuinely populated in practice — `src/lib/guest-list/process-entry.ts`
writes `ticket_id` at lines 178, 186, 196, 214, 266 and 283 — so this is a
reachable state, not a theoretical one.

**Statements to run:**

```sql
-- 6. a second ticket
INSERT INTO public.tickets (...) RETURNING id;              -- note the id as <T2>

-- 7. a guest-list entry pointing at it
UPDATE public.guest_list_entries SET ticket_id = '<T2>' WHERE id = '<G1>';
--   (or INSERT a fresh entry carrying ticket_id = '<T2>')

-- 8. the delete the refund path performs
DELETE FROM public.tickets WHERE id = '<T2>';

-- 9. only if step 8 raised — is anything left?
SELECT count(*) FROM public.tickets            WHERE id = '<T2>';
SELECT count(*) FROM public.guest_list_entries WHERE ticket_id = '<T2>';
```

**Literal output of step 8:** *(not yet observed — record the deleted row count,
or the full error text including its SQLSTATE)*

| Observation at step 8 | Verdict on A2 |
|---|---|
| error, SQLSTATE `23503` (foreign key violation) | **CONFIRMED** — the delete is blocked, the ticket survives, and the refund is already marked approved |
| `DELETE 1`, ticket gone, `guest_list_entries.ticket_id` left dangling or nulled | **DISPROVED** — record which of the two happened, and stop |
| any other error | neither; record it verbatim including its SQLSTATE |

**Verdict on A2: OPEN — not observed.**

---

## Probe C — the swallowed error

**This one is a `file:line` reading, not a database observation, and it is
settled.** Verified 2026-08-05 against the current tree.

All four refund writers issue the delete without destructuring its result, so no
error from it is ever inspected:

- `src/app/(public)/tickets/refund-actions.ts:138-141` — free / guest-list branch:
  ```ts
  await serviceClient
    .from("tickets")
    .delete()
    .eq("id", ticket.id);
  ```
- `src/app/(public)/tickets/refund-actions.ts:180-183` — paid branch, same shape
- `src/app/(public)/tickets/refund-actions.ts:389-392` — `adminRefund`, same shape
- `src/app/(admin)/admin/finance/actions.ts:110` — `await supabase.from("tickets").delete().eq("id", ticket.id);`
- `src/app/api/cron/reconcile-refunds/route.ts:121` — same, inside a `try` whose
  `catch {}` at `:124-126` only increments `errors++` and discards the cause

Compare with the same file's insert path, which **does** check:
`refund-actions.ts:63-65` destructures `insertError` and throws with its message.
The delete is the one write in the refund path that is not checked.

**Is a failing delete observable to anyone today? No.** The Supabase JS client
does not throw on a database error — it returns it in the `error` field. Discarded
here, so:

- the server action returns `{ success: true }` (`refund-actions.ts:145`, `:221`),
- the organizer sees a successful refund,
- the cron increments `ticketsInvalidated` (`route.ts:122`) whether or not the
  ticket was actually removed,
- and the repository has **no error tracking** (`meta-gates.md`) — so nothing
  reaches a human on its own.

That much is confirmed regardless of how Probes A and B come out. What is **not**
yet known is whether the delete ever actually fails — that is Probe B.

---

## Consequences for plan 31-04's migration

| # | Change | Required? | Follows from |
|---|---|---|---|
| 1 | `ticket_refunds.ticket_id` becomes nullable and its foreign key becomes `ON DELETE SET NULL` | **REQUIRED — regardless of A1** | Option B keeps deleting the ticket, and a `NOT NULL` column cannot be set to `NULL` by a foreign-key action. This does not depend on the probe |
| 2 | `guest_list_entries.ticket_id` gains an explicit `ON DELETE SET NULL` | **UNDECIDED — blocked on Probe B** | Required **if and only if** step 8 raised SQLSTATE `23503`. If step 8 deleted the row instead, this is *not required* — and the reason must be written into this line so the question is not re-opened |
| 3 | Plan 31-09's refund writers detach the guest-list entry before the delete, or only add an error check | **UNDECIDED — blocked on Probe B** | If the violation is real, an error check alone turns a silent failure into a loud one but still leaves the refund unfinishable; a detachment step (or item 2) is what makes it complete. If the violation is not real, an error check is sufficient |

**Plan 31-04 reads row 2 of this table and nothing else to decide the guest-list
foreign key.** While it says UNDECIDED, the migration must not be written.

---

## What is now known to be lost

**Unknown until A1 is settled.** If A1 is confirmed, every refund row ever written
in production was destroyed by the delete that followed it, and none of them can
be reconstructed — `ticket_refunds` was the only record. `STATE.md` reports one
ticket in production, so the loss is **negligible in size and total in kind**. It
is recorded here, not repaired.

If A1 is disproved, nothing was lost and this section closes as empty.

---

## How to close this document

1. Run Probes A and B on a non-production target.
2. Paste the literal output of steps 5 and 8 into their sections — verbatim, not
   paraphrased, including any SQLSTATE.
3. Change each **OPEN** verdict to **CONFIRMED** or **DISPROVED**.
4. Fill row 2 and row 3 of the Consequences table with *required* or *not
   required*, each with its reason.
5. Fill the "What was run and where" table, naming the target as non-production.
6. Only then may plan 31-04 be written.

There is no test runner for this product (`meta-gates.md`). Nothing here can be
closed by a green build. It closes by someone running it and writing down what
happened.
