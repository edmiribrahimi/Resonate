-- The mirror's boundary stops being optional
-- Phase 58, Plan 11: ICS-02, D-58-06 — the closer named by 20260820121000
--
-- WHY THIS FILE EXISTS, in one sentence. `20260820121000_production_calendar_key.sql`
-- gave four tables a `calendar_key` and declared, in as many words, that its
-- nullability was **transitional** and that a second migration would close it
-- once the first mirror run had collected the key-less rows. This is that second
-- migration, and it exists because *a transition without a declared closer is a
-- transition that does not end.*
--
-- WHAT HAPPENED IN BETWEEN, measured rather than remembered. The first mirror
-- ran under supervision on 2026-08-20, twice: once for each calendar key that
-- has entries today, the first of the two carrying the explicit one-off argument
-- that takes in the rows written before the column existed. It adopted 150
-- key-less rows across the three mirrored tables — 2 plans, 63 pieces, 85
-- commitments — which is exactly the population the live catalogue reported at
-- 20:46:20Z, immediately before the run.
--
-- THE PRECONDITION, ASSERTED RATHER THAN ASSUMED. Read from the live catalogue
-- at 2026-08-20T20:46:46Z, with `read_only: true`, from a different instrument
-- than the one that caused the effect:
--
--     production_plan        calendar_key IS NULL → 0
--     production_piece       calendar_key IS NULL → 0
--     production_commitment  calendar_key IS NULL → 0
--
-- The three `SET NOT NULL` statements below therefore scan and pass. **No
-- `USING` clause appears in this file, and none may ever be added**: a `USING`
-- here would invent a calendar for a row that carries no evidence of one, into
-- the very column that governs a `DELETE`. If the counts above were not zero,
-- the correct move would be to re-run the mirror with its one-off argument, not
-- to soften this file.
--
-- ⚠ `production_import_run` IS NOT TIGHTENED, AND THAT IS THE POINT.
-- The register is **never deleted** — it is this domain's only diagnostic
-- instrument, the one that made it possible to date the 17 false absence stamps
-- by comparing them against the hour of the imports, and the one that answered
-- *who wrote that sixth run* when nobody could remember. Because it is never
-- deleted, its historical rows will stay key-less **forever**: they were written
-- when the column did not exist, and no evidence in them says which calendar
-- they mirrored. Back-filling them would make the register lie about the past it
-- exists to preserve, and tightening the column would force exactly that
-- back-fill. So the column stays nullable, and this file SAYS SO instead of
-- leaving the next reader to wonder whether the fourth table was forgotten.
-- Measured at the same instant: 6 register rows carry no key, and 2 do.
--
-- ── IDEMPOTENCE ─────────────────────────────────────────────────────────────
--
-- `SET NOT NULL` is idempotent by nature: applied to a column that is already
-- `NOT NULL` it is a no-op that neither errors nor rewrites the table. No
-- `IF NOT EXISTS` spelling exists for it and none is needed. There is no
-- backfill, no `UPDATE`, no `INSERT` and no `DELETE` in this file, so there is
-- nothing that could run twice with a different result.
--
-- The four `CHECK` constraints written by `20260820121000` are **left exactly as
-- they are**, on all four tables, and that is deliberate rather than lazy. Their
-- predicate is *null, or one of the three*, and on a `NOT NULL` column the null
-- branch is simply unreachable — a constraint that admits something the column
-- can no longer hold is not a contradiction, it is a predicate with a dead arm.
-- Rewriting them to drop that arm would mean dropping and re-adding four
-- constraints, i.e. four validating scans and four chances to mistype a name,
-- to buy nothing observable. `production_import_run`'s CHECK, meanwhile, still
-- needs its null branch and would have to be left alone anyway — so rewriting
-- the other three would also break the symmetry that makes the four readable
-- side by side.
--
-- ── CROSS-DOMAIN NOTE (`meta-gates.md`) ─────────────────────────────────────
--
--   * **RLS and policies: untouched.** No policy is created, dropped or
--     redefined, no `GRANT` is altered, no function is redefined. A row-level
--     policy is a predicate over the row; changing a column's nullability
--     changes nothing about who may read or write that row.
--   * **No row is inserted, updated or deleted.** `SET NOT NULL` takes a full
--     table scan to validate and rewrites nothing. The proof is taken rather
--     than assumed: row counts read from the live catalogue before and after,
--     which must be identical.
--   * **The monotone guards are untouched.** No progressivo is assigned,
--     renumbered or read here; nothing in this file can advance a venue reveal
--     or a payment state. `production_plan_refuse_renumber` is a
--     `BEFORE UPDATE OF number` trigger and this file performs no `UPDATE`.
--   * **What this file changes for the mirror.** From here on every row in the
--     three mirrored tables knows which calendar it came from, so *"absent from
--     the file"* and *"belongs to a different file"* can no longer be the same
--     observation to a reader — which is finding 3 of phase 48 and the whole
--     reason `ICS-02` exists. The one table that does not know is the one that
--     declares, in its own column comment, that it cannot.

BEGIN;

-- =============================================================================
-- 1. public.production_plan — mirrored, therefore tightened
-- =============================================================================

ALTER TABLE public.production_plan
  ALTER COLUMN calendar_key SET NOT NULL;

COMMENT ON COLUMN public.production_plan.calendar_key IS
  'Which calendar this row is mirrored from. NOT NULL since the first supervised mirror run: '
  'the transition the column was born in is closed, and every row now carries the scope that '
  'governs the DELETE of the next mirror. The CHECK still spells "null or one of the three"; '
  'the null arm is unreachable and left in place on purpose.';

-- =============================================================================
-- 2. public.production_piece — mirrored, therefore tightened
-- =============================================================================

ALTER TABLE public.production_piece
  ALTER COLUMN calendar_key SET NOT NULL;

COMMENT ON COLUMN public.production_piece.calendar_key IS
  'Which calendar this row is mirrored from. NOT NULL since the first supervised mirror run. '
  'The CHECK still spells "null or one of the three"; the null arm is unreachable and left in '
  'place on purpose.';

-- =============================================================================
-- 3. public.production_commitment — mirrored, therefore tightened
-- =============================================================================

ALTER TABLE public.production_commitment
  ALTER COLUMN calendar_key SET NOT NULL;

COMMENT ON COLUMN public.production_commitment.calendar_key IS
  'Which calendar this row is mirrored from. NOT NULL since the first supervised mirror run. '
  'The CHECK still spells "null or one of the three"; the null arm is unreachable and left in '
  'place on purpose.';

-- =============================================================================
-- 4. public.production_import_run — NOT tightened, and the reason is the table
-- =============================================================================
--
-- Nothing is altered here. The statement that would belong in this section is
-- the one this file refuses to write, and the refusal is worth a section of its
-- own rather than a silence somebody later reads as an omission.
--
-- The register is never deleted, so its pre-column rows will never acquire a
-- key. `SET NOT NULL` on this table would fail on those rows, and the only way
-- to make it pass would be to back-fill them with a calendar nobody can name —
-- turning the one instrument that preserves what actually happened into one that
-- asserts what did not. The column comment already says this; the statement
-- below re-states it, so that a reader who greps for `production_import_run` in
-- this file finds the decision instead of finding nothing.

COMMENT ON COLUMN public.production_import_run.calendar_key IS
  'Which calendar this run mirrored. NULLABLE FOREVER, on purpose, and deliberately NOT tightened '
  'by the migration that tightened the three mirrored tables. The register is never deleted, so '
  'the runs that predate this column will always be key-less; back-filling them would make the '
  'register lie about the past it exists to preserve.';

COMMIT;
