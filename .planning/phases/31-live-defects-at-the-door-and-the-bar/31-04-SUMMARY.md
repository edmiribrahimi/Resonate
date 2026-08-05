---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 04
subsystem: supabase-data
tags: [migration, rls, refunds, check-in, door, schema]
status: paused-at-checkpoint
requires:
  - "src/lib/door/outcome.ts (plan 31-02) — the four literal sets the CHECK constraints mirror"
  - "31-REFUND-PROBE.md (plan 31-03) — Consequences row 2, settled REQUIRED"
provides:
  - "public.door_scan_events — append-only door record, with RLS and one SELECT policy"
  - "ticket_refunds refund evidence that outlives the deleted ticket (Option B)"
  - "attendances.party_id + two partial unique indexes (FIX-07)"
  - "guest_list_entries.checked_in_at / checked_in_by, and ticket_id ON DELETE SET NULL"
  - "DoorScanEvent and three corrected interfaces in src/types/database.ts"
affects:
  - "plan 31-07 — writes the is_undo row"
  - "plan 31-08 — must add the party_id predicate to the 23505 branch of membership/verify"
  - "plan 31-09 — the refund writers fill the evidence columns before the delete, and check the delete's error"
  - "plan 31-11 — the review list reads door_scan_events"
tech-stack:
  added: []
  patterns:
    - "transaction-wrapped migration touching four tables (20260310000000_guest_list.sql)"
    - "partial unique indexes for a nullable column (20260226300000_multi_sub_events.sql:54-67)"
    - "RLS + policy in the same file as the CREATE TABLE"
    - "type-only import from a contract module into src/types/database.ts (first time in this file)"
key-files:
  created:
    - supabase/migrations/20260805120000_door_scan_events.sql
  modified:
    - src/types/database.ts
decisions:
  - "The migration is NOT applied. Task 3 is a blocking human-action checkpoint and the Supabase CLI is absent from this machine."
  - "No door_scan_events_select_master policy: an organizer already reads every profile via profiles_select_admin, so FIX-12 is enforced by what the table holds, not by who may select."
  - "The four refund-evidence columns are deliberately not foreign keys — the point is to survive the row they name."
metrics:
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 1
  completed: 2026-08-05
---

# Phase 31 Plan 04: Schema Foundation for the Door Summary

A transaction-wrapped migration gives the night a durable record, gives a refund
evidence that outlives the ticket it refunded, lets one member be present at two
parties of one event, and lets a guest-list entry name the moment it was
recorded — with RLS on the new table in the same file, and the interfaces
corrected in the same commit. **The migration has not been applied**; that is
the blocking checkpoint below.

**Commit:** `0d39797`

---

## What Was Built

### Task 1 + Task 2 — one commit, on purpose

`supabase-data.md`, gate *tipi allineati*, requires the schema change and
`src/types/database.ts` to land together, and the plan's own success criteria
say the same. The two tasks were therefore committed as one atomic change rather
than two. This is the only departure from per-task commits and it is the plan's
instruction, not a shortcut.

### `public.door_scan_events` — new, append-only

`supabase/migrations/20260805120000_door_scan_events.sql:60-125` — sixteen
columns, no column holding a member's name and none holding an address. RLS is
enabled at `:147` and the single policy is at `:155-156`.

The three subject links (`ticket_id:78`, `guest_entry_id:79`,
`subject_user_id:83`) are all `ON DELETE SET NULL`. A scan event survives the
ticket it names — which is precisely the property `ticket_refunds` lacked, and
the reason the review list can still be read after a refund.

### `ticket_refunds` — the evidence outlives the ticket (Option B)

The ordering the probe made mandatory is asserted in the file itself:

| Line | Statement |
|---|---|
| `:179` | `ALTER TABLE public.ticket_refunds ALTER COLUMN ticket_id DROP NOT NULL;` |
| `:182` | `DROP CONSTRAINT IF EXISTS ticket_refunds_ticket_id_fkey;` |
| `:185-187` | `ADD CONSTRAINT ticket_refunds_ticket_id_fkey … ON DELETE SET NULL` |

179 < 185. A foreign-key action cannot write NULL into a NOT NULL column, so the
reverse order would leave a constraint that raises on every refund.

Four evidence columns (`:196-207`), none of them a foreign key — commented at
`:190-195` with the reason, because it inverts this repository's default.

### `attendances` — a presence belongs to a party

`party_id` added at `:236-237`; the old `unique(event_id, user_id)` dropped at
`:245`; two partial unique indexes at `:247-253`. Postgres treats NULLs as
distinct, so a naive three-column unique key would have allowed unlimited
duplicates on the event-level rows — the in-repo precedent is
`20260226300000_multi_sub_events.sql:54-67`.

### `guest_list_entries` — who recorded it, and when

`checked_in_at` / `checked_in_by` at `:277-281`; the foreign key re-created with
an explicit `ON DELETE SET NULL` at `:296-301`.

---

## The Probe Decided Two Statements, and Both Are Honoured

The plan was written while `31-REFUND-PROBE.md` read UNDECIDED. It is now
**CLOSED**, both claims **CONFIRMED** (2026-08-05, throwaway PostgreSQL 16.14
container, never production).

| Probe finding | Consequence | Where it lands |
|---|---|---|
| A1 — `refunds_before = 1`, `DELETE 1`, `refunds_after = 0` | `ticket_refunds.ticket_id` must lose NOT NULL **before** the FK becomes SET NULL | `:179` then `:185` |
| A2 — SQLSTATE `23503`, ticket survived, `confdeltype = 'a'` | `guest_list_entries.ticket_id` gains an explicit `ON DELETE SET NULL` — **REQUIRED**, not optional | `:296-301`, with the probe line quoted in the comment at `:288-295` |

---

## The CHECK Sets, Quoted Both Sides

Asserted by extracting every string literal from both files and comparing the
sets mechanically, not by eye alone.

| Column | `src/lib/door/outcome.ts` | Migration |
|---|---|---|
| `subject_type` | `DoorSubjectType:56` — `ticket`, `guest_list_entry`, `membership` | `:69-70` — same three, same order |
| `outcome` | `DoorScanOutcomeKind:116` (= `DoorOutcome["outcome"]`) — `recorded`, `already_recorded`, `not_valid` | `:84-85` — same three, same order |
| `cause` | `DoorScanCause:127-135` — `double_read`, `second_ticket_same_holder`, `two_devices`, `invalid_signature`, `not_in_cache`, `wrong_night`, `refunded_before_night`, `refunded_after_night` | `:89-99` — the same **eight**, same order |
| `source` | `DoorScanSource:138` — `online`, `offline_sync` | `:114-115` — same two |

The only literals in the SQL file outside these four sets are `'a'` and
`'checked_in'`, both inside explanatory comments quoting the probe.

---

## FIX-12 Is a Serialisation Rule, and It Is Enforced in the Schema

No `door_scan_events_select_master` policy exists — `grep -c "select_master"`
returns **0**. An organizer already reads every profile through
`profiles_select_admin` (`20260224_rbac_migration.sql:151`), so a master-only
policy here would be an interface affordance dressed up as a boundary.

What actually enforces FIX-12 is that the table **has no column** to leak: the
copyable technical view renders these columns straight and therefore cannot
export a member's personal data. Verified mechanically — the `CREATE TABLE`
block contains no line matching `^\s+(full_)?name|email`.

---

## Verification

**There is no test runner for this product.** No claim below rests on tests.

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run build` | **✓ Compiled successfully in 2.2s** |
| RLS present | `grep -c "ENABLE ROW LEVEL SECURITY"` | `1` |
| Exactly one policy | `grep -c "CREATE POLICY"` | `1` |
| No master policy | `grep -c "select_master"` | `0` |
| Parenthesised helper call | `grep -c "(SELECT public.is_admin_or_organizer())"` | `1` |
| Transaction wrapper | `grep -nE "^(BEGIN\|COMMIT);"` | `17:BEGIN;` `302:COMMIT;` |
| No name/address column | `awk` over the CREATE TABLE block + `grep -inE` | no match |
| Literals imported, not re-declared | `grep -c "double_read" src/types/database.ts` | `0` |
| No new suppression | `grep -rn "as unknown as TicketRefund\|checked_in_at!" src/` | no match |
| No applied migration edited | `git diff --name-only supabase/migrations/` | only the new file |

**Build warning, pre-existing and out of scope:** `Next.js inferred your
workspace root` — a lockfile sits beside the worktree's. Not introduced by this
plan; logged, not fixed.

### `src/types/database.ts`

| Interface | Line | What changed |
|---|---|---|
| import block | `:1-13` | the four literal sets, type-only, from `@/lib/door/outcome`, with the reason the direction is inverted |
| `Attendance` | `:81-92` | `party_id` added; `checked_in_at` and `checked_in_by` corrected to `\| null` |
| `TicketRefund` | `:193-218` | `ticket_id` corrected to `\| null`; four evidence columns added |
| `GuestListEntry` | `:288-310` | `checked_in_at`, `checked_in_by` added |
| `DoorScanEvent` | `:320-337` | new, sixteen fields, one per migration column, in the same order |

**No call site broke.** `TicketRefund` and `Attendance` are imported nowhere in
`src/` outside `database.ts` itself, so the two corrected lies surfaced no
latent bug. `GuestListEntry` is used at four call sites, all of which cast an
untyped Supabase result — adding nullable fields does not narrow those casts.
Nothing was silenced with `!` or `as`.

---

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 3 — plan instruction over per-task commits] Tasks 1 and 2 committed together**
- **Found during:** Task 2
- **Issue:** The executor default is one commit per task, but the plan and
  `supabase-data.md` gate *tipi allineati* both require the migration and
  `src/types/database.ts` to be in the **same** commit.
- **Resolution:** One commit, `0d39797`. The stricter rule wins
  (`meta-gates.md`: on conflict, the more restrictive gate wins).

**2. [Rule 2 — idempotence gate] `DROP POLICY IF EXISTS` before `CREATE POLICY`**
- **Found during:** Task 1
- **Issue:** Postgres has no `CREATE POLICY IF NOT EXISTS`, so a bare
  `CREATE POLICY` breaks the gate *idempotenza DDL* on a second run.
- **Resolution:** `:149` drops it first — the form already used at
  `20260225120000_phase7_media.sql:19` and six other migrations.

**3. [Rule 2 — FIX-12 by construction] The five explanatory comments sit above the table, not inside it**
- **Found during:** Task 1 verification
- **Issue:** The FIX-12 comment necessarily contains the word for a member's
  contact address, which inside the `CREATE TABLE` block would trip the very
  acceptance grep meant to prove no such column exists.
- **Resolution:** All five comments (FIX-13, FIX-12, FIX-04a, SET-NULL,
  `is_undo`) are in the block at `:20-58`, immediately above the table. The
  check now proves what it was written to prove.

### Not deviations — decisions the plan already carried

- `COMMENT ON COLUMN` is used nowhere in this repository (0 files). SQL `--`
  comments were used, matching all 32 existing migrations.

---

## Deferred / Open

| Item | Why it is not here | Who owns it |
|---|---|---|
| The refund writers filling the four evidence columns **before** the delete | Plan 31-09 | 31-09 |
| The `23505` branch of `membership/verify/route.ts:124-141` gaining the `party_id` predicate | Plan 31-08. Named in the migration comment at `:262-268` so the link cannot be lost | 31-08 |
| Writing the `is_undo` row from the undo route | Plan 31-07 | 31-07 |
| Narrowing `door_scan_events_select_admin` to a per-night scope | Per-night scoping of an organizer does not exist yet. Commented at `:151-154` | Phase 35 |
| Option A (soft-invalidating `tickets`, 63 call sites / 22 files) | Owner chose Option B. Recorded as deferred, explicitly **not** to be drifted into partially | milestone |
| `fetchEventRevenue` (`src/lib/analytics/event-queries.ts:84-92`) has under-reported refunds as structurally zero since 2026-02-27 | The probe raised it and deliberately left the decision open | project owner |

**No stubs.** Nothing in this plan renders a placeholder or a hardcoded empty
value; both artifacts are schema and types.

---

## Threat Flags

None. Every security-relevant surface this plan introduces was already in the
plan's `<threat_model>`: the new table's read boundary (T-31-04-01), the absence
of personal-data columns (T-31-04-02), the two `SET NULL` repairs (T-31-04-03,
T-31-04-04), the deliberate absence of write policies (T-31-04-05), and the
no-edit rule on applied migrations (T-31-04-06). No new endpoint, no new auth
path, no new file access was created.

**T-31-04-01 is only half-mitigated until the checkpoint clears.** The policy
ships in the same file as the table, so it cannot be applied without it — but
until the file is actually run, nothing is protected because nothing exists.

---

## Checkpoint Reached — Task 3 Not Executed

**Type:** human-action · **Gate:** blocking · **Progress:** 2/3

The Supabase CLI is **not installed** on this machine (`which supabase` → not
found), so `supabase db push` cannot be run from here.

**The migration is NOT applied. The schema is NOT live.** `npm run build` passed
above and that green is a **false positive** for this question: the TypeScript
types come from `src/types/database.ts`, not from the database. Code compiled
against a table that does not exist will fail at the first request. That
false-positive is the entire reason this checkpoint blocks.

Details, the SQL to apply, the fallback route and the seven observations are in
the executor's returned checkpoint message and in `31-04-PLAN.md` Task 3.

---

## Self-Check: PASSED

- `supabase/migrations/20260805120000_door_scan_events.sql` — FOUND (302 lines)
- `src/types/database.ts` — FOUND (modified, +369 lines net across both files)
- Commit `0d39797` — FOUND in `git log`
- Post-commit deletion check — no tracked file was deleted
