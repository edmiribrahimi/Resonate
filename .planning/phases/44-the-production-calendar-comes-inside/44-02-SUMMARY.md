---
phase: 44-the-production-calendar-comes-inside
plan: 02
subsystem: supabase-data
tags: [migration, production-calendar, ddl, rls, pipeline-rules]
requires:
  - public.formats
  - public.party_series
  - public.venues
  - public.event_parties
  - auth.users
provides:
  - public.production_plan
  - public.production_piece
  - public.production_commitment
  - public.production_import_run
  - public.production_checklist_item
  - public.production_pipeline_rule
  - public.party_series.ics_alias
affects:
  - 44-03 (anchors resolve against production_pipeline_rule)
  - 44-04 (capability key, SELECT policies, tick function, number-refusing trigger)
  - 44-07 (applies this file)
  - 44-08 (asserts the CHECK vocabularies against vocabulary.ts)
tech-stack:
  added: []
  patterns:
    - "constraints NAMED and declared inside the table"
    - "pg_constraint DO block, never DROP CONSTRAINT IF EXISTS + ADD"
    - "partial unique index for a two-level rule set"
    - "RLS enabled with no policy — deny by default until a key exists"
key-files:
  created:
    - supabase/migrations/20260815120000_production_calendar.sql
  modified: []
decisions:
  - "The anchor is stored as (kind, weekday, direction); there is no offset column of any name"
  - "production_pipeline_rule carries a nullable series_id, because the Nizza series is a series of RSNT running a contradicting pipeline"
  - "RLS is enabled here with zero policies; the grants stay in plan 44-04"
  - "Lateness is computed, never stored — no cron may be required to keep a flag true"
metrics:
  tasks: 3
  commits: 3
  duration: ~55 min
  completed: 2026-08-15
---

# Phase 44 Plan 02: The Structural Migration Summary

One SQL file — six tables, one added column and sixteen published pipeline rules —
carrying zero rows of production material, applied nowhere, and proved to apply twice
without duplicating anything.

## What Was Built

`supabase/migrations/20260815120000_production_calendar.sql`, 1146 lines, one
transaction:

| § | Object | What it is for |
|---|---|---|
| 0 | RLS posture | enabled on all six, granted to nobody |
| 1 | `production_plan` | one row per night the calendar holds |
| 2 | `production_piece` | one row per piece, written **or** proposed |
| 3 | `production_commitment` | a day taken by something that is not ours |
| 4 | `production_import_run` | the observable effect of an import |
| 5 | `production_checklist_item` | what a night owes — pieces **and** production steps |
| 6 | `party_series.ics_alias` | the declared abbreviation that makes the join possible |
| 7 | `production_pipeline_rule` + 16 rows | which pieces a format owes, and on which weekday |

**The file is not applied.** Plan 44-07 applies it through the Management API migrations
endpoint and is the only plan permitted to.

## Verification — what was actually done, and what it does not mean

The plan's verification section says no grep proves the SQL is valid, and that validity
belongs to 44-07. That remains true of production. It is **not** true of syntax and
semantics, which were established here in a throwaway `postgres:17.6` container — the
device plan 36-04 already used for the same purpose — seeded with stub relations for the
five things this file references. Nothing touched production, and the container was
removed.

| Check | Result |
|---|---|
| First application | clean through `COMMIT`; `INSERT 0 14` + `INSERT 0 2` |
| **Second** application | clean; **`INSERT 0 0` on both inserts** — idempotent, measured not asserted |
| Rules seeded | 16, matching the count the header commits to |
| `npm run build` | exits 0 (it is also the typecheck; there is no test runner) |

### Six mutation proofs — every constraint was seen to fire

`ai-engineering.md`'s *gate prova per mutazione* asks that a new guard be broken on
purpose and observed refusing. Each failed with its **named** constraint:

| Attempted | Refused by |
|---|---|
| a progressivo on a commitment | `column "number" ... does not exist` — the column is absent, so it is a guarantee and not a rule |
| a piece carrying both a date and a reason | `production_piece_date_xor_reason` |
| a proposal carrying a file uid | `production_piece_proposal_has_no_source` |
| a direction with no weekday to count from | `production_pipeline_rule_weekday_required_check` |
| a series-level rule naming another format's series | `production_pipeline_rule_series_format_fk` |
| a role holding `GRANT SELECT` reading the rules | **0 rows** — RLS enabled, no policy |

The last is the security proof for the RLS deviation below: an explicit `GRANT SELECT` is
not enough, which is the whole point of enabling without granting.

**What a green does NOT mean.** The container proves the SQL parses, executes, and is
idempotent against *stub* relations. It does not prove the column names match production's
real `formats`, `party_series`, `venues` and `event_parties` — those were read from
`20260810120000_formats_and_series.sql` by hand, and 44-07's read-back is what settles it.
It proves nothing about whether the sixteen rules are the *right* rules; that is
`production-calendar.md`'s weekday table, transcribed and checked by eye.

## Deviations from Plan

### 1. [Rule 2 — missing critical functionality] RLS enabled here, not in 44-04

- **Found during:** Task 1
- **Issue:** the plan scopes this file to structure only, with all access in 44-04. But
  `supabase-data.md`'s gate *tabella nuova = policy nuova* forbids creating a table of
  non-public data without RLS in the **same** migration, and `production_plan.venue_word`
  may name a space under negotiation. Applied alone, the file would have left six
  relations open to `select=*` on the anonymous key.
- **Fix:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all six, **with zero policies**,
  each directly under the table it closes. It grants nothing, names no capability key
  (which does not exist yet, and naming it would be refused by Postgres), and 44-04's own
  `ENABLE` will be a no-op.
- **Gate conflict, resolved as `meta-gates.md` requires:** the plan's boundary against the
  supabase-data gate — the **more restrictive** wins, and the conflict is documented in
  the commit.
- **Commit:** c6e1063

### 2. [Rule 1 — bug] `production_pipeline_rule` gained a nullable `series_id`

- **Found during:** Task 3
- **Issue, and it is the substantive one.** The plan asks for `UNIQUE (format_id,
  piece_kind)` and, in the same breath, for the Nizza series' rules to be seeded. Those
  cannot both happen. The Nizza series is a **series of `RSNT`**, not a fifth format —
  `production-calendar.md` says so explicitly and Phase 36 seeds it that way — but it runs
  the light pipeline, and **two of its rules contradict the night's on the same
  `(format, piece_kind)` pair**: its listing *is* derivable from the nearest preceding
  Tuesday where the night's is not, and its LiveCut anchors to **itself** where the night's
  anchors to the **following edition**.
- **What would have happened:** with `ON CONFLICT ... DO NOTHING`, the two Nizza rows would
  have been **dropped in silence**. The surface would then have read the night's rule for a
  Nizza date — waiting on an edition that does not apply, and reporting a conforming series
  as diverging. A silent failure arriving *through the very mechanism chosen for
  idempotence*.
- **Fix:** a nullable `series_id` (NULL = the format's default, set = that series'
  override), two **partial** unique indexes so each level is idempotent on its own terms,
  and the composite FK `(series_id, format_id) REFERENCES party_series (id, format_id)`,
  which points at the constraint Phase 36 created *only to be pointed at*. `MATCH SIMPLE`
  makes it vacuous for format-level rows and binding for series-level ones.
- **Measured after the fix:** `RSNT` now carries two `listing` rows and two `livecut` rows,
  one format-level and one series-level, exactly as the published pipeline requires.
- **Commit:** 5f5f174

**Literal divergence this creates, declared rather than buried:** the plan's acceptance
criterion reads *"the count of `INSERT INTO public.production_pipeline_rule` equals the
count of `ON CONFLICT (format_id, piece_kind) DO NOTHING`"*. There are two inserts and two
`ON CONFLICT ... DO NOTHING` clauses, but the second infers on `(series_id, piece_kind)`.
The criterion's **intent** — every seeded row is idempotent — is met and was measured
(`INSERT 0 0` on the second run). The literal string is not present twice. Plan 44-08
should assert the intent, not the string.

### 3. [Rule 2] The `ics_alias` column landed on a table with a public read arm

- **Found during:** Task 2
- **Issue:** `party_series` is not one of the six new tables. It has had RLS since Phase 36
  and a `party_series_select_published` arm, and RLS is per **row**, never per column — so
  a new column is readable with the anonymous key on any series that has a published night.
  `supabase-data.md` requires that be answered *before* the column is added.
- **Answer, written into the file:** for a series **with** a published night the alias adds
  nothing — that series' `name` already carries the venue word through the same arm. For a
  series **without** one — every series of a space under negotiation — the arm returns no
  row at all. The case the gate is about is closed. The paragraph also records what would
  break it.
- **Commit:** 9464212

### 4. [Rule 1] Two prohibition sentences tripped their own greps

- **Found during:** Task 2
- **Issue:** writing *"there is deliberately no `is_late` column"* and *"there is no
  `UPDATE public.party_series` in this file"* made the acceptance greps return 1 instead
  of 0 — the assertion matching only the sentence forbidding the thing.
- **Fix:** both rewritten without the forbidden literal, with `formats/actions.ts:58-63`
  cited beside one of them: *a grep whose only match is the sentence forbidding the thing
  is a grep that gets ignored the third time it goes red.*
- **Commit:** 9464212

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure | `supabase/migrations/20260815120000_production_calendar.sql` | Confirmed at the database level, not merely anticipated: every `CHECK` refusal printed a `DETAIL:` line containing **the entire failing row**. On `production_plan` that row carries `venue_word`. PostgREST surfaces this as `error.details`. Plan 44-04's write paths and every action reading these tables must log `error.code` and `error.message` only — never the error object, never the third field. This is `44-RESEARCH.md` Pitfall 10 observed happening. |

## Known Stubs

None. Every table, constraint, index and seeded row in this file is complete and was
exercised.

## What This Plan Deliberately Did Not Do

- **No policy, no capability key, no tick function, no `number`-refusing trigger** — all
  plan 44-04's. A policy naming a key or a column that does not exist yet is refused with
  the transaction in rollback.
- **No re-implementation of the numbering guard.** `bump_series_watermark` fires on
  `event_parties`, which nothing in this phase writes. There is no counter, no `max()+1`
  and no second watermark here.
- **`docs/Music-*.ics` was not opened.**

## Self-Check: PASSED

- `supabase/migrations/20260815120000_production_calendar.sql` — FOUND
- commit c6e1063 — FOUND
- commit 9464212 — FOUND
- commit 5f5f174 — FOUND
- six tables, six `ENABLE ROW LEVEL SECURITY`, zero `CREATE POLICY` — verified
- zero date literals, zero uuid literals, zero offset columns, zero stored lateness — verified
- `STATE.md` and `ROADMAP.md` untouched — verified
