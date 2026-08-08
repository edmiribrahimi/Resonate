-- Per-night assignments — the table, and the two guarantees no application code
-- can provide
-- Phase 35, Plan 02: ASSIGN-01, ASSIGN-02, ASSIGN-03, ASSIGN-04, with decision
-- D-A (only staff roles are assignable) and its divergence D-B written beside
-- the lines that implement them
--
-- Changes:
-- 1. public.party_end_instant(date, time) — when a night is over, decided by the
--    database, under the same midnight rule that already lives in TypeScript at
--    `src/utils/datetime.ts`
-- 2. public.profiles — `profiles_id_role_unique UNIQUE (id, role)`, the unique
--    constraint the composite foreign key of change 3 requires in order to exist
-- 3. public.party_assignments — the temporal record, its five NAMED constraints,
--    its three indexes, and its RLS with two SELECT policies and deliberately no
--    write policy
--
-- Three changes, ONE transaction. A half-applied version of this file is worse
-- than none of it, and each half is bad in its own way:
--
--   * the function without the table is a SECOND implementation of the midnight
--     rule with no caller — a duplicate that can drift with nothing to hold it,
--     which is the exact defect commit `8f4e004` centralised `src/utils/datetime.ts`
--     to end;
--   * the table without the function has no single producer for `ends_at`. The
--     writer of `20260809002000_assignment_acts.sql` and the resolver of
--     `20260809001000_assignment_resolver.sql` both need "when is this night
--     over" answered once; two answers is the six-variant drift reopened on the
--     SQL side, and that drift never raised an error — it moved a window by an
--     hour;
--   * `profiles_id_role_unique` without the table is an extra unique constraint
--     on `public.profiles` that references nothing, reads as redundant with the
--     primary key, and gets removed as tidying by the next reader — which is
--     precisely the constraint change 3 cannot exist without;
--   * the table without `profiles_id_role_unique` CANNOT exist: a
--     `FOREIGN KEY (user_id, assignee_role) REFERENCES public.profiles (id, role)`
--     raises `42830` (there is no unique constraint matching given keys for
--     referenced table) and rolls the whole file back. It is named here not
--     because it is reachable but to say that the order INSIDE the transaction
--     is not free: 2 precedes 3;
--   * the table without its RLS is a list of who works which night, readable in
--     full by anyone holding the anonymous key through PostgREST. The middleware
--     decides where somebody may GO; this decides what they may READ, and only
--     this is the security boundary (`CLAUDE.md`, operating principle 2).
--
-- So `BEGIN; ... COMMIT;` is not decoration here either.
--
-- The template for this file is `20260808002000_membership_register.sql` — same
-- shape of work (a new table + its RLS + a function), written by the phase
-- immediately before this one, and it names phase 35 in two places. What is
-- copied from it: the numbered header, the explicitly named constraints, one
-- index per way the table is actually read, RLS enabled in the same migration
-- with the write-policy omission declared rather than left to be discovered.
-- The divergence is D-B and it is section 3b: this table carries a rule that
-- reads ANOTHER row of ANOTHER table, and no constraint in this repository has
-- ever done that.
--
-- Idempotence, item by item — and it is not cosmetic. This queue is applied BY
-- HAND, one row at a time (`.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md`),
-- and WR-04 of the 2026-08-08 code review recorded what a second run costs when
-- this is missing: `42710`, a rolled-back transaction, and the ENTIRE queue that
-- follows left unapplied.
--
--   * `CREATE OR REPLACE` for the function — the idempotent form for an object
--     that cannot take `IF NOT EXISTS`;
--   * `DROP CONSTRAINT IF EXISTS` before the `ADD CONSTRAINT` on
--     `public.profiles`;
--   * `CREATE TABLE IF NOT EXISTS` for `public.party_assignments`, with all five
--     constraints declared INSIDE it — so re-running this file against a
--     database that already holds the table is a no-op on the table, which is
--     the intended behaviour. A CHANGED constraint set is a new migration, never
--     an edit to this one (`supabase-data.md`, gate *migration in avanti*);
--   * `IF NOT EXISTS` on all three indexes;
--   * `DROP POLICY IF EXISTS` before each of the two policies.
--
-- Re-eseguire deve essere sicuro, o nessuno ri-esegue quando dovrebbe.

BEGIN;

-- =============================================================================
-- 1. public.party_end_instant — the midnight rule, in SQL, once
-- =============================================================================
--
-- WHAT IT ANSWERS: given the calendar date a night is filed under and the hour
-- it closes, what real instant is that. A night runs 22:00 → 06:00, so a closing
-- hour BEFORE NOON belongs to the NEXT calendar day. `event_parties.end_time` is
-- a `time` and `events.date` is a `date`, both without a zone: they mean
-- wall-clock time in Turin and nothing else says so.
--
-- ── THE COST, DECLARED RATHER THAN DISCOVERED ────────────────────────────────
--
-- This is a SECOND IMPLEMENTATION of a rule this repository already owns.
-- `src/utils/datetime.ts` holds the first, in `nightBoundaryInstant`, and that
-- module exists for a recorded reason (commit `8f4e004`): the same question —
-- *is this night over yet* — was answered in six slightly different places, each
-- parsing a stored `date` + `time` in the RUNTIME's zone, which is UTC on Vercel
-- and the visitor's own zone in a browser. That failure never raised an error.
-- It moved a window by an hour or two, and on a daily cron an hour can move an
-- item past the only window that would have caught it.
--
-- So writing it again is a DELIBERATE DEROGATION from *Don't Hand-Roll*, and the
-- reason is that the resolver's predicate runs inside RLS policy bodies, where
-- TypeScript does not reach. A policy cannot call a TypeScript function, and
-- passing a client-computed boundary into a policy would put the answer under
-- the control of the caller being checked.
--
-- THE MITIGATION IS THAT THE TWO HALVES NAME EACH OTHER. This comment names
-- `src/utils/datetime.ts`; the docblock of `partyEndInstant` there names
-- `public.party_end_instant(date, time)`. **Changing one without the other is
-- the defect**, and it is worth stating in both places because that divergence
-- would not fail loudly — no build breaks, no error is raised, no test exists to
-- run (`CLAUDE.md`, guardrail 1). It would move a window, in the direction
-- nobody looks.
--
-- ── WHY THE ZONE IS A NAME AND NEVER AN OFFSET ───────────────────────────────
--
-- `'Europe/Rome'`, always: a NAMED zone, never a numeric UTC offset and never a
-- hard-coded hour interval standing in for one. Turin's offset changes twice a
-- year and the production calendar runs August → July, so a daylight-saving
-- boundary is inside the window ALWAYS, not occasionally
-- (`time-and-scheduling.md`, gate *l'ora legale non e' costante*).
--
-- The forbidden forms are described here rather than written out, deliberately:
-- the plan's own check for this file greps for them, and a check that has to be
-- read around — because the only match is the sentence forbidding the thing —
-- is a check that gets ignored the third time it goes red.
--
-- The midnight rule is applied to the DECLARED TURIN HOUR, BEFORE the zone
-- conversion — exactly as `nightBoundaryInstant` does, and for the same reason:
-- applied after, it would be testing an hour that has already been shifted by
-- one or two, and the shift is largest precisely around midnight.
--
-- ── IMMUTABLE, AND THE ONE CAVEAT ────────────────────────────────────────────
--
-- `IMMUTABLE` is honest here: `timezone(text, timestamp)`, `extract`, `date + int`
-- and `date + time` are all immutable in Postgres itself, and this function reads
-- no table and no setting. The caveat, stated rather than assumed: a system tzdata
-- update could in principle change the answer for a historical instant. Postgres
-- makes the same trade for its own operator, and this function does not get to be
-- more careful than the operator it is built from.
--
-- ── NO SPECIAL GRANT, AND THAT IS A DECISION ─────────────────────────────────
--
-- Every other function this phase family adds carries `REVOKE ... FROM public,
-- anon, authenticated` followed by `GRANT EXECUTE ... TO service_role` — because
-- each of them is `SECURITY DEFINER` and each of them writes. This one is
-- neither: it takes two scalars, reads nothing, and returns arithmetic. The
-- default `EXECUTE` to `PUBLIC` is therefore left in place ON PURPOSE, and it is
-- said out loud so the next reader does not take the missing REVOKE/GRANT pair
-- for an oversight and "repair" it into a permission nobody needs.

CREATE OR REPLACE FUNCTION public.party_end_instant(
  p_date     date,
  p_end_time time
) RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    -- From noon onwards the closing hour belongs to the night's own date.
    WHEN extract(hour from p_end_time) >= 12
      THEN (p_date + p_end_time) AT TIME ZONE 'Europe/Rome'
    -- Before noon it belongs to the morning after — 06:00 on a night filed
    -- under the Saturday is the Sunday morning.
    ELSE ((p_date + 1) + p_end_time) AT TIME ZONE 'Europe/Rome'
  END;
$$;

COMMENT ON FUNCTION public.party_end_instant(date, time) IS
  'When a night filed under p_date and closing at p_end_time is over, as a real instant. '
  'A closing hour before noon belongs to the next calendar day (a night runs 22:00 -> 06:00). '
  'SECOND IMPLEMENTATION of the rule in src/utils/datetime.ts (nightBoundaryInstant / partyEndInstant): '
  'it exists because RLS policy bodies cannot call TypeScript. Changing one half without the other is the defect '
  'and it would not fail loudly - it would move a window.';

COMMIT;
