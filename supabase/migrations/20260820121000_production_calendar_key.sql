-- The mirror's BOUNDARY: which calendar a row came from
-- Phase 58, Plan 07: ICS-02, D-58-06
--
-- WHY THIS FILE EXISTS, in one sentence. The three mirrored tables and the
-- import register carry **no trace of where a row came from** — the only column
-- that comes close, `production_import_run.file_byte_size`, is deliberately
-- blind (`20260815120000_production_calendar.sql:585-589`: *a byte size says
-- nothing about any date, any space or anybody's name*) and a size is not an
-- identity. Without a boundary, the import that mirrors ONE calendar deletes the
-- rows of the OTHER, because *"absent from the file"* and *"belongs to a
-- different file"* are the same observation to a reader that cannot tell the two
-- calendars apart. That is finding 3 of phase 48, and it is why `ICS-02` exists.
--
-- WHY THE OBVIOUS ROUTE IS CLOSED, measured rather than assumed. The tempting
-- answer is to read the scope out of the file: `X-WR-CALNAME`, or the filename.
-- Both were measured in this phase's research and both fail:
--
--   * the two `.ics` snapshots on the owner's machine declare the **same**
--     `X-WR-CALNAME`, and the parser this repository owns exposes no
--     calendar-level property at all;
--   * a filename carries a DATE, not a scope — the snapshots are named for the
--     day they were exported.
--
-- So the scope is **declared**, never inferred: it arrives as a required
-- argument of the importer (plan 58-09) and is written here. Handing a `DELETE`
-- in production a free-form string written by somebody else's application is
-- exactly the risk this requirement closes.
--
-- FOUR TABLES, ONE TRANSACTION, and the halves are each bad in their own way.
-- Three of them are the mirrored tables — `production_plan`, `production_piece`,
-- `production_commitment` — and the fourth is `production_import_run`, which is
-- NOT mirrored and is here for a different reason: a run's report says how many
-- rows it wrote, and a report that cannot say WHICH calendar it wrote them for
-- is a report that stops being readable the day a second calendar exists. A
-- half-applied version of this file would give the deleting `WHERE` a boundary
-- on some tables and not others — which is worse than no boundary at all,
-- because it reads as protection while one table stays unprotected.
--
-- `BEGIN; … COMMIT;` is therefore not decoration here either.
--
-- ── THE VOCABULARY IS CLOSED AT THREE, AND NONE OF THE THREE NAMES A SPACE ───
--
-- `rsnt`, `rmdb`, `mtnlb` (D-58-06). One per format, taken from the sigle, which
-- are **public** — they are printed on materials. The per-venue sigle
-- (`RMDB-<venue>`) stay OUT: this key is per CALENDAR, not per series, and a
-- venue under negotiation named in a column would be published in every report,
-- every type and every `.planning/` document that quotes one. This repository is
-- public and a publication is irreversible (`venue-acquisition.md`, gate *uno
-- spazio non acquisito non si nomina*).
--
-- Adding a format, or splitting the calendars differently, needs a NEW key —
-- and every addition is a declared migration, never a free value. That is what
-- the `CHECK` buys: a value outside the vocabulary cannot enter the column even
-- by mistake, which is a guarantee rather than an application-level filter that
-- one caller can forget.
--
-- ── NULLABILITY: TRANSITIONAL, AND THE TRANSITION HAS A NAMED CLOSER ─────────
--
-- `supabase-data.md`, gate *default sulle righe esistenti*. The tables are
-- already populated — measured on 2026-08-20 (plan 58-02, M1, and plan 58-06's
-- catalogue read): 2 plans, 63 pieces, 85 commitments, 5 import runs. So the
-- question this file MUST answer out loud is what happens to them.
--
-- The column is born NULLABLE, with the `CHECK` written as *null, or one of the
-- three*, and no backfill. The reason is honesty before technique: **the rows
-- that exist today came from imports run when the column did not exist, and they
-- are not attributable to a calendar.** Nobody can say which file wrote them
-- without inventing the answer.
--
-- The two alternatives were both considered and both refused:
--
--   * `NOT NULL DEFAULT '<one of the three>'` writes an INVENTED FACT into the
--     column that governs a `DELETE`. The first mirror run would then delete
--     rows on the strength of an attribution nobody made;
--   * a fourth member meaning *unknown* re-opens the vocabulary D-58-06 closed,
--     and an *unknown* scope in a deleting `WHERE` is the free-form string this
--     requirement exists to forbid, wearing a `CHECK` as a disguise.
--
-- WHO CLOSES IT, AND WHEN. Plan 58-09: the first mirror run collects the
-- key-less rows under an explicit, **one-off** argument, counts them in its
-- report, and a second migration then tightens the column to `NOT NULL` on the
-- THREE MIRRORED TABLES. A transition without a declared closer is a transition
-- that does not end, so the closer is named here rather than remembered.
--
-- ⚠ `production_import_run` KEEPS THE COLUMN NULLABLE FOREVER, and that is a
-- decision, not an oversight. **The register is never deleted** — it is the
-- domain's only diagnostic instrument, the one that made it possible to date the
-- 17 false absence stamps — so its historical rows will stay without a key. The
-- honest move is to SAY that rather than to tidy it: a register whose old rows
-- were back-filled to look complete is a register that has started lying about
-- the past it exists to preserve.
--
-- ── IDEMPOTENCE, item by item, with the one exception declared ───────────────
--
--   * `ADD COLUMN IF NOT EXISTS` for the column — and here the phase's usual
--     discipline is applied THE OTHER WAY ROUND, on purpose. For a constraint or
--     an index one writes `DROP … IF EXISTS` then `ADD`, because a re-created
--     constraint is the same constraint. For a column it is not: dropping it
--     before re-adding it would throw away the value on every re-run, i.e. the
--     data this column exists to hold. `ADD COLUMN IF NOT EXISTS` is idempotent
--     **and** loses nothing. The precedent, with the same sentence, is
--     `20260809004500_event_media_party_id.sql:54-63`;
--   * `DROP CONSTRAINT IF EXISTS` before each `ADD CONSTRAINT` — the four
--     `ADD CONSTRAINT`s cannot take `IF NOT EXISTS`, since no Postgres version
--     supports it for table constraints, so each is preceded by its own drop;
--   * `IF NOT EXISTS` on each index;
--   * **no backfill at all**, so there is no `WHERE` that could rewrite the same
--     rows twice — there is nothing to rewrite.
--
-- Re-running must be safe, or nobody re-runs when they should.
--
-- WHY THE CONSTRAINT NAMES ARE SPELLED OUT. Plan 58-02's measurement M4 read
-- twelve existing constraint names from `pg_constraint` precisely because a
-- DERIVED name that is wrong produces a silent no-op on `DROP … IF EXISTS`
-- followed by a duplicate-name error on the `ADD`
-- (`20260808000500_staff_role.sql:34-40`). These four constraints are **new**, so
-- there is no live name to read: what the discipline requires here is the other
-- half of it — the name is ESTABLISHED here, in writing, so that the next
-- migration that has to drop one of them can read it from this file instead of
-- guessing at Postgres's auto-naming.
--
-- WHY `NOT VALID` IS NEITHER NEEDED NOR WANTED. Every existing row will carry
-- `NULL` in a column that did not exist a statement ago, and the predicate
-- admits `NULL` explicitly. The validating scan Postgres runs on `ADD
-- CONSTRAINT` therefore cannot fail. `NOT VALID` belongs to a restriction over
-- rows that may already violate it; writing it here would be cargo-culting a
-- decision that belongs to a different constraint
-- (`20260808000500_staff_role.sql:52-64`).
--
-- ── CROSS-DOMAIN NOTE (`meta-gates.md`) ─────────────────────────────────────
--
--   * **RLS and policies: untouched, and the new column inherits them.** No
--     policy is created, dropped or redefined, no `GRANT` is altered and no
--     function is redefined. The four tables keep exactly the policies
--     `20260815120100_production_calendar_access.sql` gave them, and — this is
--     the part worth stating rather than assuming — a Postgres row-level policy
--     is a predicate over the ROW, not a per-column grant, so a column added to
--     a table under RLS is readable and writable by exactly whoever could
--     already read and write that row. **No existing policy needs to be
--     rewritten, and no new one is needed**: there is no reading of this column
--     that a caller could perform without already being allowed the row it sits
--     on. Widening who may see production rows is an access decision and would
--     belong to `access-gating.md`, not to a column;
--   * **No row is inserted, updated or deleted.** Adding a nullable column with
--     no default does not rewrite the table, and the proof that no row moved is
--     taken rather than assumed: row counts read from the live catalogue before
--     and after, plus a count of `calendar_key IS NOT NULL`, which must be ZERO
--     on all four tables;
--   * **The monotone guards are untouched.** No progressivo is assigned,
--     renumbered or read here; nothing in this file can advance a venue reveal
--     or a payment state. In particular `production_plan_refuse_renumber` is a
--     `BEFORE UPDATE OF number` trigger and this file performs no `UPDATE`;
--   * **The mirror's own guard arrives later.** This file gives the boundary a
--     place to live; validating the importer's `--calendar` argument against
--     this same vocabulary is plan 58-09's, and it already has its case in the
--     synthetic gate plan 58-01 wrote.

BEGIN;

-- =============================================================================
-- 1. public.production_plan
-- =============================================================================

ALTER TABLE public.production_plan
  ADD COLUMN IF NOT EXISTS calendar_key text;

ALTER TABLE public.production_plan
  DROP CONSTRAINT IF EXISTS production_plan_calendar_key_check;

ALTER TABLE public.production_plan
  ADD CONSTRAINT production_plan_calendar_key_check
  CHECK (calendar_key IS NULL OR calendar_key IN ('rsnt', 'rmdb', 'mtnlb'));

COMMENT ON COLUMN public.production_plan.calendar_key IS
  'Which calendar this row was mirrored from. DECLARED by the importer, never inferred from the '
  'file: the two snapshots share an X-WR-CALNAME and a filename carries a date, not a scope. '
  'NULLABLE ONLY IN TRANSITION — the rows that predate this column are not attributable to a '
  'calendar, and plan 58-09 tightens this table to NOT NULL after the first mirror run. '
  'Publishable: the three keys come from the format sigle, which are public, and no key may name a space.';

-- ⚠ The read this index exists for is NOT a surface read: it is the `WHERE` of a
-- `DELETE`. The mirror deletes every row of ONE calendar before rewriting it,
-- and without an index that statement is a sequential scan over the whole table
-- inside the window in which the calendar is empty. `supabase-data.md`, gate
-- *indici sulle colonne di lookup* — the justification is written above the
-- index the way the calendar's own migration writes it
-- (`20260815120000_production_calendar.sql:457-464`), and here the justification
-- is a cancellation.
CREATE INDEX IF NOT EXISTS idx_production_plan_calendar_key
  ON public.production_plan (calendar_key);

-- =============================================================================
-- 2. public.production_piece
-- =============================================================================

ALTER TABLE public.production_piece
  ADD COLUMN IF NOT EXISTS calendar_key text;

ALTER TABLE public.production_piece
  DROP CONSTRAINT IF EXISTS production_piece_calendar_key_check;

ALTER TABLE public.production_piece
  ADD CONSTRAINT production_piece_calendar_key_check
  CHECK (calendar_key IS NULL OR calendar_key IN ('rsnt', 'rmdb', 'mtnlb'));

COMMENT ON COLUMN public.production_piece.calendar_key IS
  'Which calendar this row was mirrored from. DECLARED by the importer, never inferred. '
  'NULLABLE ONLY IN TRANSITION — plan 58-09 tightens this table to NOT NULL after the first '
  'mirror run. Publishable: the keys are format sigle, and no key may name a space.';

-- ⚠ Again the `WHERE` of a `DELETE`, and on the largest of the three mirrored
-- tables. A piece is also the row a mis-scoped deletion costs most: it carries
-- the checklist through `ON DELETE CASCADE`.
CREATE INDEX IF NOT EXISTS idx_production_piece_calendar_key
  ON public.production_piece (calendar_key);

-- =============================================================================
-- 3. public.production_commitment
-- =============================================================================

ALTER TABLE public.production_commitment
  ADD COLUMN IF NOT EXISTS calendar_key text;

ALTER TABLE public.production_commitment
  DROP CONSTRAINT IF EXISTS production_commitment_calendar_key_check;

ALTER TABLE public.production_commitment
  ADD CONSTRAINT production_commitment_calendar_key_check
  CHECK (calendar_key IS NULL OR calendar_key IN ('rsnt', 'rmdb', 'mtnlb'));

COMMENT ON COLUMN public.production_commitment.calendar_key IS
  'Which calendar this row was mirrored from. DECLARED by the importer, never inferred. '
  'NULLABLE ONLY IN TRANSITION — plan 58-09 tightens this table to NOT NULL after the first '
  'mirror run. Publishable: the keys are format sigle, and no key may name a space.';

-- ⚠ The `WHERE` of a `DELETE` once more — and here the cost of getting it wrong
-- is a day the calendar shows as FREE while it is taken, which is the single
-- failure this table exists to prevent
-- (`20260815120000_production_calendar.sql:519-523`).
CREATE INDEX IF NOT EXISTS idx_production_commitment_calendar_key
  ON public.production_commitment (calendar_key);

-- =============================================================================
-- 4. public.production_import_run — the register, and the column it keeps
--    nullable forever
-- =============================================================================
--
-- This table is NOT mirrored and is never deleted. The column is here so that a
-- run's report can say WHICH calendar it wrote for; the header paragraph says
-- why the historical rows stay without a key, and why back-filling them would be
-- the register lying about the past it exists to preserve.

ALTER TABLE public.production_import_run
  ADD COLUMN IF NOT EXISTS calendar_key text;

ALTER TABLE public.production_import_run
  DROP CONSTRAINT IF EXISTS production_import_run_calendar_key_check;

ALTER TABLE public.production_import_run
  ADD CONSTRAINT production_import_run_calendar_key_check
  CHECK (calendar_key IS NULL OR calendar_key IN ('rsnt', 'rmdb', 'mtnlb'));

COMMENT ON COLUMN public.production_import_run.calendar_key IS
  'Which calendar this run mirrored. NULLABLE FOREVER, on purpose: the register is never deleted, '
  'so the runs that predate this column will always be key-less, and back-filling them would make '
  'the register lie about the past it exists to preserve. Plan 58-09 tightens the three mirrored '
  'tables and deliberately not this one.';

-- ⚠ The `WHERE` of a `DELETE` is what the other three indexes serve; this one
-- serves the read that FOLLOWS one — *what did the last run for THIS calendar
-- do?* — which is the report rendered at the foot of the calendar, i.e. the
-- observable effect this project requires in place of error tracking
-- (`meta-gates.md`). Same column, different read, and the difference is written
-- down instead of letting the next reader assume the four are identical.
CREATE INDEX IF NOT EXISTS idx_production_import_run_calendar_key
  ON public.production_import_run (calendar_key);

COMMIT;
