-- The seventh piece kind: `flyering` — and the two CHECKs that mirror the list
-- Phase 58, Plan 06: ICS-08b, D-58-04
--
-- Changes:
-- 1. public.production_piece — drop and re-add `production_piece_kind_check` so
--    `kind` admits a seventh value, `flyering`
-- 2. public.production_pipeline_rule — drop and re-add
--    `production_pipeline_rule_kind_check` for the same seven values, because
--    the piece kind is constrained in TWO places
--
-- Two statements pairs, ONE transaction. A half-applied version of this file is
-- strictly worse than none of it, and the failure it would produce is the exact
-- one this phase exists to remove. `src/lib/production/ics/vocabulary.ts` claim
-- (a) states the invariant in as many words: *editing either literal set means
-- editing both, in the same commit*. A database whose `production_piece` admits
-- `flyering` while `production_pipeline_rule` still refuses it is a database in
-- which the piece can be stored and a rule for it can never be written — so the
-- kind would exist as a row and could never become a rule, which is the shape of
-- a vocabulary that has already started drifting from the mirror that guards it.
-- `BEGIN; … COMMIT;` is therefore not decoration.
--
-- `supabase-data.md`, gate *migration in avanti*. The file this one corrects is
-- applied to production and is therefore a historical fact that is NOT edited:
--
--   * `20260815120000_production_calendar.sql:418-419` created
--     `production_piece_kind_check` with the six-value list production enforces
--     today;
--   * `20260815120000_production_calendar.sql:992-993` created the second,
--     independent six-value list on `production_pipeline_rule`.
--
-- Neither is touched. This file corrects both forward, in the same transaction.
--
-- ⚠ WHAT THIS FILE DELIBERATELY DOES NOT TOUCH.
-- `production_piece_naming_check` stays at `('canonical', 'legacy')`. Plan 58-03
-- decided that the named variant of the canonical grammar records `canonical`
-- and opens no third convention (D-44-21), and the bare `Timetable` this phase's
-- reader admits records `canonical` too. A third word there would be a
-- vocabulary drifting from a CHECK for a distinction two existing columns
-- already carry.
--
-- WHY BOTH CONSTRAINTS ARE NAMED EXPLICITLY RATHER THAN DERIVED. Postgres
-- auto-names a CHECK `<table>_<column>_check`, and neither live name matches
-- that rule — the columns are `kind` and `piece_kind`, and both constraints were
-- named by hand at creation. Both names were **read from `pg_constraint`** with
-- `contype = 'c'` on 2026-08-20 (plan 58-02, measurement M4, twelve names read
-- across the two tables) rather than derived. A derived name that is wrong
-- produces a silent no-op on `DROP … IF EXISTS` followed by a duplicate-name
-- error on the `ADD`, and the phase would learn about it from a failing deploy
-- rather than from a query. The precedent is recorded in
-- `20260808000500_staff_role.sql:34-40`.
--
-- WHY `NOT VALID` IS NEITHER NEEDED NOR WANTED. This is the question the next
-- reader will ask, so the argument is written down rather than assumed.
-- Widening an `IN` list is a **strict relaxation**: every value the old
-- constraint admitted, the new one admits too, and the new one admits one more.
-- So every existing row already satisfies the new constraint, the validating
-- scan Postgres runs on `ADD CONSTRAINT` cannot fail, and the constraint is
-- added VALIDATED. `NOT VALID` belongs to a **restriction** — where a
-- pre-existing violating row may exist — and writing it here out of caution
-- would be cargo-culting a decision that belongs to a different constraint
-- (`20260808000500_staff_role.sql:52-64`, same argument, same shape).
--
-- IDEMPOTENCE. `IF EXISTS` on both drops. The two `ADD CONSTRAINT`s cannot take
-- `IF NOT EXISTS` — no Postgres version supports it for table constraints — but
-- each is preceded by its own drop, so re-running the file is safe. A constraint
-- dropped and re-created with the same name and the same predicate is the same
-- constraint.
--
-- CROSS-DOMAIN NOTE (`meta-gates.md`). This widens WHAT MAY BE STORED, and
-- nothing else.
--
--   * No policy is touched, no GRANT is altered, no function is redefined, and
--     no column is added — so no RLS verdict can move because of it. The two
--     tables keep the policies `20260815120100_production_calendar_access.sql`
--     gave them.
--   * No row is inserted, updated or deleted. In particular **no pipeline rule
--     row is seeded for `flyering`**, and that absence is the decision, not an
--     omission: nobody has measured an anchor for it, and an invented
--     `(anchor, weekday, direction)` triple would be an offset written where a
--     rule belongs — the error `production-calendar.md` records against itself,
--     with the date, so that it is not repeated.
--   * The consequence of having no rule is **declared** rather than left to a
--     default: a `flyering` piece carries `conforms_to_rule = NULL`, never
--     `false`. That column is nullable for exactly this reason and its comment
--     says so (`20260815120000_production_calendar.sql:392-398`): *"we could not
--     work it out" is a third answer and must not arrive dressed as false.*
--     Having no rule, such a piece is also never joined to a night by the
--     importer's second pass — it stays an ORPHAN PIECE, which
--     `production_piece.plan_id` is nullable to allow, and an orphan that is
--     visible is what D-58-04 was for.
--   * The monotone guards are untouched: no progressivo is assigned, renumbered
--     or read here, and nothing in this file can advance a venue reveal or a
--     payment state.
--
-- IF AN ANCHOR IS EVER MEASURED for this kind, its rule is born the way the
-- other sixteen were: from the calendar, in a new migration, written by whoever
-- owns that format.

BEGIN;

-- =============================================================================
-- 1. public.production_piece — the kind a stored piece may carry
-- =============================================================================

ALTER TABLE public.production_piece
  DROP CONSTRAINT IF EXISTS production_piece_kind_check;

ALTER TABLE public.production_piece
  ADD CONSTRAINT production_piece_kind_check
  CHECK (kind IN ('listing', 'tonight', 'recap', 'livecut', 'timetable', 'after_movie', 'flyering'));

-- =============================================================================
-- 2. public.production_pipeline_rule — the second list, and why skipping it
--    would break the mirror inside this same transaction
-- =============================================================================
--
-- The piece kind is constrained in TWO places, not one. This one guards the rule
-- table (`20260815120000_production_calendar.sql:992-993`), and check G of
-- `scripts/verify-ics-import.mjs` reads BOTH lists out of the migrations on disk
-- and holds them against `PIECE_KINDS`. Widening only section 1 leaves a CHECK
-- vocabulary that overlaps `PIECE_KINDS` and lacks a member it declares, which
-- is precisely the direction that gate reports — so a half-widening is caught by
-- a script rather than by production, and only because both lists are here.

ALTER TABLE public.production_pipeline_rule
  DROP CONSTRAINT IF EXISTS production_pipeline_rule_kind_check;

ALTER TABLE public.production_pipeline_rule
  ADD CONSTRAINT production_pipeline_rule_kind_check
  CHECK (piece_kind IN ('listing', 'tonight', 'recap', 'livecut', 'timetable', 'after_movie', 'flyering'));

COMMIT;
