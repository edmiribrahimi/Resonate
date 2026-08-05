# 31-03 — Refund Probe: what the database actually does

**Status: CLOSED. Both database claims were executed on 2026-08-05, and both are CONFIRMED.**
**Date opened:** 2026-08-05
**Date executed:** 2026-08-05

**Where it was run.** Not a Supabase project: a throwaway PostgreSQL 16.14 container
(`postgres:16` under Docker), destroyed afterwards. **No production database was
touched**, and no Supabase project of any kind was used.

**What was applied.** The two constraint definitions under test were copied
**verbatim** from the repository — `ticket_refunds.ticket_id` from
`supabase/migrations/20260227200000_ticket_refunds.sql:3` and
`guest_list_entries.ticket_id` from
`supabase/migrations/20260310000000_guest_list.sql:56` — together with the
`public.tickets` definition from `supabase/schema.sql:350-360`. Everything else
(`auth.users`, `profiles`, `events`, `event_parties`, `ticket_tiers`) is a bare
stub that exists only so the foreign keys can be created.

**Why this is a valid test, and where its limit is.** `ON DELETE` semantics are a
property of the constraint definition alone, so copying the definitions verbatim
tests the real behaviour rather than a paraphrase of it. What it does **not**
cover is anything Supabase adds on top — RLS, triggers, or a policy that could
prevent the `DELETE` from being reached at all in the live database. Those would
only ever make the delete *less* likely to succeed, so they cannot turn either
CONFIRMED verdict back into a DISPROVED one.

**Closing evidence — the constraints as the database itself reports them:**

| Constraint | `confdeltype` | Meaning |
|---|---|---|
| `ticket_refunds_ticket_id_fkey` | `c` | `CASCADE` |
| `guest_list_entries_ticket_id_fkey` | `a` | `NO ACTION` |

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

**Both probes were run on 2026-08-05.**

| | |
|---|---|
| Target used | A throwaway **PostgreSQL 16.14** container (`postgres:16` under Docker), carrying the two constraint definitions under test copied verbatim from the repository. Destroyed after the run |
| Ran against production | **No.** No production database and no Supabase project of any kind was contacted |
| Date run | 2026-08-05 |
| Role that ran it | The assistant, during phase 31 execution, on the developer's machine |

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

**Literal output of step 5:**

```
--- PROBE A step 3: refunds before the delete (expect 1) ---
 refunds_before
----------------
              1
DELETE 1
--- PROBE A step 5: refunds AFTER the delete <-- THE ANSWER ---
 refunds_after
---------------
             0
--- PROBE A: any refund rows left at all? ---
 total_refund_rows
-------------------
                 0
```

| Observation at step 5 | Verdict on A1 |
|---|---|
| `0` | **CONFIRMED** — the cascade destroys the audit row |
| `1` | **DISPROVED** — the audit trail survives, and the scope of the fix shrinks |
| anything else | neither; record it verbatim and stop |

**Verdict on A1: CONFIRMED — observed 2026-08-05.**

Step 3 returned `refunds_before = 1`. The `DELETE` reported `DELETE 1`. Step 5
returned **`refunds_after = 0`**, and a count over the whole table returned
`total_refund_rows = 0`: the refund row written one statement earlier is gone.
The cascade destroys the audit trail.

**Second consequence — A1 is confirmed, so this now holds.**
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

**Literal output of step 8:**

```
--- PROBE B step 8: deleting a ticket a guest-list entry points at ---
ERROR:  update or delete on table "tickets" violates foreign key constraint
        "guest_list_entries_ticket_id_fkey" on table "guest_list_entries"
DETAIL: Key (id)=(bbbbbbbb-0000-0000-0000-000000000002) is still referenced
        from table "guest_list_entries".

-- re-run inside a DO block to capture the code explicitly:
NOTICE:  SQLSTATE=23503 | update or delete on table "tickets" violates foreign
         key constraint "guest_list_entries_ticket_id_fkey" on table
         "guest_list_entries"

--- PROBE B step 9: did the ticket and the entry survive? ---
 ticket_survived        entry_survived
-----------------      ----------------
               1                      1
```

| Observation at step 8 | Verdict on A2 |
|---|---|
| error, SQLSTATE `23503` (foreign key violation) | **CONFIRMED** — the delete is blocked, the ticket survives, and the refund is already marked approved |
| `DELETE 1`, ticket gone, `guest_list_entries.ticket_id` left dangling or nulled | **DISPROVED** — record which of the two happened, and stop |
| any other error | neither; record it verbatim including its SQLSTATE |

**Verdict on A2: CONFIRMED — observed 2026-08-05.**

Step 8 raised, verbatim:

```
SQLSTATE=23503 | update or delete on table "tickets" violates foreign key
constraint "guest_list_entries_ticket_id_fkey" on table "guest_list_entries"
DETAIL: Key (id)=(…) is still referenced from table "guest_list_entries".
```

Step 9: **the ticket survived** (`ticket_survived = 1`) and so did the entry
(`entry_survived = 1`). The delete is blocked. Since `refund-actions.ts:139`
never inspects the delete's error, the refund is marked approved while the ticket
it refunded is still valid at the door — and with no error tracking in this
project, nobody is told. `src/lib/guest-list/process-entry.ts` populates
`ticket_id` at six call sites, so this is a state the product actually produces.

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
| 2 | `guest_list_entries.ticket_id` gains an explicit `ON DELETE SET NULL` | **REQUIRED — settled by Probe B, 2026-08-05** | Step 8 raised SQLSTATE `23503` and the ticket survived. Without this, every refund of a guest-list ticket fails at the delete and leaves an approved refund against a ticket that still admits its holder |
| 3 | Plan 31-09's refund writers check the delete's error **in addition to** item 2 | **REQUIRED — settled by Probe B, 2026-08-05** | The violation is real, so an error check alone would turn a silent failure into a loud one while still leaving the refund unfinishable. Item 2 is what makes it complete; the error check is what stops the *next* unforeseen delete failure from being silent. Both, not either |

**Plan 31-04 reads row 2 of this table and nothing else to decide the guest-list
foreign key.** It now reads **REQUIRED**, so the migration is unblocked and must
include the explicit `ON DELETE SET NULL` on `guest_list_entries.ticket_id`.

---

## What is now known to be lost

**Settled: A1 is CONFIRMED.** Every refund row ever written in production was
destroyed by the delete that followed it, and none can be reconstructed —
`ticket_refunds` was the only record. `STATE.md` reports one ticket in
production, so the loss is **negligible in size and total in kind**. It is
recorded here, not repaired.

A second, larger consequence follows and belongs to the milestone rather than to
this plan: `fetchEventRevenue` (`src/lib/analytics/event-queries.ts:84-92`) has
been reporting refunds against rows that the cascade had already deleted, so its
refund figure has been structurally zero since `ticket_refunds` shipped on
2026-02-27 — with no error, because nothing failed. **Whether that gets its own
milestone note is a decision for the project owner, not for this plan.**

---

## How this document was closed

1. Probes A and B were run on **2026-08-05** against a throwaway PostgreSQL
   16.14 container, never against production and never against any Supabase
   project. The container was destroyed afterwards.
2. The literal output of steps 5 and 8 is pasted in the sections above,
   including the `23503` SQLSTATE, verbatim.
3. Both verdicts moved from **OPEN** to **CONFIRMED**.
4. Rows 2 and 3 of the Consequences table moved from **UNDECIDED** to
   **REQUIRED**, unblocking plan 31-04's migration.

**This document is closed.** The one thing it deliberately does not decide is
whether the silent under-reporting in `fetchEventRevenue` earns its own
milestone note — that belongs to the project owner.
