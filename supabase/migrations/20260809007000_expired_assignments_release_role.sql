-- =============================================================================
-- CR-02 · An assignment that has ENDED must stop blocking its holder's role
-- =============================================================================
--
-- Code review of 2026-08-09, CR-02. **Row 16 of the hand-applied queue**, at the
-- end of block A2 — before the deploy, and after row 7, whose constraints this
-- file amends. Its filename sorts AFTER row 15's only because it was written
-- later: the queue is ordered by dependency and not by timestamp, the two rows
-- touch nothing in common, and a replay from empty in filename order composes
-- (measured against `postgres:17.6`, 54 migrations).
--
-- ── THE DEFECT, MEASURED IN `postgres:17.6` AND NOT DEDUCED ─────────────────
--
-- `20260809000000_party_assignments.sql` carries TWO definitions of *live* and
-- they do not coincide:
--
--   * the resolver, `liveAssignmentCapabilities`, `liveDoorAssignments` and the
--     drain all ask `revoked_at IS NULL AND now() < ends_at`;
--   * `party_assignments_live_role_present` and
--     `party_assignments_assignee_role_fk` ask `revoked_at IS NULL`, and nothing
--     else.
--
-- The composite key does not know `ends_at`. An assignment that finished at
-- 06:00 three weeks ago and that nobody revoked — **the normal state, not an
-- edge case: nothing in this product revokes automatically, and `vercel.json`
-- has four crons, none of which touches this table** — keeps carrying
-- `assignee_role = 'staff'` and keeps pointing at `public.profiles (id, role)`.
-- So every `UPDATE public.profiles SET role = …` on that account is refused
-- with `23503`, for ever:
--
--   ERROR:  update or delete on table "profiles" violates foreign key constraint
--           "party_assignments_assignee_role_fk" on table "party_assignments"
--   DETAIL:  Key (id, role)=(1111…, staff) is still referenced from table
--            "party_assignments".
--
-- The victim is `deactivateMember`, which writes `{role: 'member', status:
-- 'rejected'}` in ONE statement: refused, the account stays `staff` /
-- `approved`, that is to say **fully active**, on the path the code itself calls
-- *«the URGENT one of the three doors»*. It also contradicts ASSIGN-02, *«access
-- does not survive the night»*: here an EFFECT of the assignment survives every
-- night after it.
--
-- ── WHAT THIS MIGRATION CHANGES, IN ONE SENTENCE ────────────────────────────
--
-- A row that has ENDED is RETIRED — `expired_at` is stamped and `assignee_role`
-- is nulled — and a `MATCH SIMPLE` composite key stops being checked the moment
-- a referencing column is NULL. That is the same mechanism the revocation
-- already uses (`20260809002000_assignment_acts.sql:392-395`), extended to the
-- second way an assignment stops being about anything.
--
-- ── THE CHOICE, AND THE THREE ALTERNATIVES IT WAS MADE AGAINST ──────────────
--
-- **Postgres has no conditional foreign key.** A key cannot be declared "only
-- while `now() < ends_at`", there is no partial FK, and a `GENERATED ALWAYS AS`
-- column that would be NULL after the end is refused too — a generation
-- expression must be IMMUTABLE and `now()` is not. So *something has to write
-- the NULL*, and the whole question is **who, and when**. Said plainly instead
-- of reaching for a constraint that does not exist.
--
--   1. **A nightly cron that retires expired rows.** Refused. It leaves a window
--      of up to twenty-four hours in which the urgent path is still refused, and
--      the urgent path is the one whose own comment says *«often the same
--      evening»*. It would also be a fifth entry in `vercel.json` and a fifth
--      thing that fails silently in a product with no error tracking. A cron
--      would make the defect rarer; rarer is the worst property a defect on an
--      urgent path can have, because it is then met for the first time by
--      somebody in a hurry.
--
--   2. **The three role-writing acts retire the rows themselves, in TypeScript.**
--      Refused. `deactivateMember` is ONE `.rpc()` precisely so the profile write
--      and its register row are atomic; a preparatory PostgREST call would not
--      be inside that transaction, so a retirement could commit while the act
--      that needed it failed. It would also have to be repeated in three places
--      and would be forgotten in the fourth somebody adds.
--
--   3. **Recording the expiry as an act in `public.membership_acts`.** Refused,
--      and this one is a lexical decision rather than a technical one. An expiry
--      is not an act: nobody performed it, and `actor_kind = 'system'` exists for
--      a reconciliation that a system really carries out. An assignment ending
--      because time passed has no author, and inventing one would put a
--      statement into the member register that is not true. **The record of the
--      expiry is `expired_at` on the row itself**, which is durable, timestamped
--      and exactly parallel to `revoked_at`.
--
-- **What is done instead:** the retirement happens **inside the same statement
-- that changes the role**, in a `BEFORE UPDATE` trigger on `public.profiles`.
-- There is no window at all, it covers every writer including the service
-- client and any writer a later phase adds, and it lives in one place.
--
-- ── WHY A TRIGGER IS ALLOWED HERE WHEN 3b REFUSED ONE ───────────────────────
--
-- `20260809000000_party_assignments.sql` section 3b, and
-- `20260808001000_role_implies_approved.sql:85-95` before it, refused a trigger
-- and the reason was precise: a trigger has a one-line off switch
-- (`ALTER TABLE … DISABLE TRIGGER`, available to the table OWNER), so **a reader
-- would see enforcement that is not running**.
--
-- That argument is about a trigger that ENFORCES. This one RELEASES, and the
-- direction of its failure is the opposite:
--
--   * nothing here is enforcement — the rules stay the two constraints below,
--     and a constraint has no off switch;
--   * disabled, this trigger restores **today's behaviour**: the refusal. It
--     fails CLOSED. A reader who finds it disabled finds more refusals, never a
--     demotion that should have been blocked and was not.
--
-- Re-proposing the refused trigger without citing that paragraph would have been
-- re-taking a closed decision; this cites it and states why the case is the
-- other one.
--
-- ── WHAT STAYS TRUE ─────────────────────────────────────────────────────────
--
--   * **«Only a staff role may hold a LIVE assignment» is unchanged, and still
--     structural.** `party_assignments_live_role_present` below still forbids a
--     row that is neither revoked nor expired and carries no role, so the
--     composite key is still armed on every live row, on every write, by every
--     role, service client included.
--   * **A LIVE assignment still blocks a demotion, and that is correct.** The
--     way out is unchanged: revoke first, demote second, and the surface offers
--     both as one action.
--   * **A live row cannot be released by writing `expired_at`.**
--     `party_assignments_expiry_not_before_end` refuses any `expired_at` earlier
--     than the row's own `ends_at`, so the retirement cannot be back-dated into
--     a way of unlocking a demotion that should be refused. That is the
--     structural half of the rule, and it needs no clock inside a `CHECK`.
--   * **`revoked_at` is NOT touched.** The row stays un-revoked, so the offline
--     drain can still ask *«was this live at `scannedAt`?»* about 01:40 at 03:00,
--     which is the whole of ASSIGN-03. `judgeAtScanTime` reads `granted_at`,
--     `ends_at` and `revoked_at` and never `assignee_role`.
--   * **The resolver is untouched.** It filters `revoked_at IS NULL AND now() <
--     ends_at`; an expired row was already outside it before this file existed.
--
-- ── WHAT CHANGES FOR AN EXISTING ROW ────────────────────────────────────────
--
-- Nothing, on the day this is applied: `public.party_assignments` is created by
-- row 7 of the same hand-applied queue and the first write to it arrives from a
-- surface that ships with it, so the table is EMPTY in production. The new
-- column is nullable with no default and no backfill is performed — stated
-- rather than left implicit (`supabase-data.md`, gate *default sulle righe
-- esistenti*).
--
-- ── IDEMPOTENCY ─────────────────────────────────────────────────────────────
--
-- This file is applied BY HAND, one row of a queue at a time, and re-running a
-- row out of doubt is the natural reaction. Every statement below is therefore
-- `IF NOT EXISTS` / `DROP … IF EXISTS` first, and — the lesson of WR-01 in the
-- same review — **nothing here drops an object another object depends on.**
-- Proved by applying this file twice against a container.

BEGIN;

-- =============================================================================
-- 1. expired_at — the second way an assignment stops being about anything
-- =============================================================================

ALTER TABLE public.party_assignments
  ADD COLUMN IF NOT EXISTS expired_at timestamptz;

COMMENT ON COLUMN public.party_assignments.expired_at IS
  'When this row was RETIRED because its night had ended, and its assignee_role was released. '
  'NOT a revocation: revoked_at stays NULL, so the offline drain can still ask whether the assignment was live at scannedAt. '
  'Nobody performs an expiry, so there is no expired_by and no membership_acts row: time is not an actor.';

-- =============================================================================
-- 2. The two constraints — the rule, restated so it knows about expiry
-- =============================================================================
--
-- `party_assignments_live_role_present` is REPLACED rather than added to. The
-- shape it forbade is still forbidden: a row that is neither revoked nor expired
-- must carry one of the three staff roles, which is what keeps the composite key
-- armed on every live row. What it now also permits is the one shape the defect
-- needed and it refused: an EXPIRED row carrying no role.
--
-- ── AND IT CLOSES A HOLE THE SHIPPED PREDICATE HAD, FOUND BY MEASURING ──────
--
-- `assignee_role IS NOT NULL AND assignee_role IN (…)` looks redundant and is
-- not. **A `CHECK` passes when its expression evaluates to NULL**, and
-- three-valued logic makes that reachable here: with `assignee_role` NULL,
-- `assignee_role IN ('master','organizer','staff')` is NULL, `TRUE AND NULL` is
-- NULL, and `NULL OR FALSE` is NULL — so the row is accepted.
--
-- The predicate as shipped had exactly that shape, and the consequence was the
-- one thing section 3b says it exists to prevent: **a LIVE row carrying no role
-- was accepted**, the composite key was therefore not checked, and a `member`
-- could hold an assignment. Measured in `postgres:17.6` against the shipped
-- predicate on a scratch table — `INSERT 0 1` where a refusal was intended —
-- rather than deduced from the SQL standard.
--
-- The `IS NOT NULL` guard makes the second disjunct FALSE instead of NULL, so
-- the constraint refuses. Do not "simplify" it away.

ALTER TABLE public.party_assignments
  DROP CONSTRAINT IF EXISTS party_assignments_live_role_present;

ALTER TABLE public.party_assignments
  ADD CONSTRAINT party_assignments_live_role_present CHECK (
    (assignee_role IS NULL
       AND (revoked_at IS NOT NULL OR expired_at IS NOT NULL))
    OR
    (assignee_role IS NOT NULL
       AND assignee_role IN ('master', 'organizer', 'staff')
       AND revoked_at IS NULL
       AND expired_at IS NULL)
  );

COMMENT ON CONSTRAINT party_assignments_live_role_present ON public.party_assignments IS
  'A row that is neither revoked nor expired MUST name a staff role - that is what arms party_assignments_assignee_role_fk on every live row. '
  'A retired row (revoked or expired) MUST name none - that is what stops it from blocking its holder role for ever (CR-02).';

-- The structural half of «a LIVE assignment still blocks». Without it,
-- `expired_at = now()` on a night that has not happened yet would be a way to
-- unlock a demotion the database is supposed to refuse. With it, a retirement is
-- only expressible for a row whose own end has already passed — no clock inside
-- a `CHECK`, and no way to back-date the release.
ALTER TABLE public.party_assignments
  DROP CONSTRAINT IF EXISTS party_assignments_expiry_not_before_end;

ALTER TABLE public.party_assignments
  ADD CONSTRAINT party_assignments_expiry_not_before_end CHECK (
    expired_at IS NULL OR expired_at >= ends_at
  );

COMMENT ON CONSTRAINT party_assignments_expiry_not_before_end ON public.party_assignments IS
  'An assignment cannot be retired before it ends. This is what keeps «a LIVE assignment blocks a demotion» true (CR-02): '
  'the release is not a switch somebody can throw early, it is a fact about a night that is already over.';

-- =============================================================================
-- 3. The release, as a function — one place, callable, testable
-- =============================================================================
--
-- `SECURITY DEFINER` for the same reason `record_party_assignment_act` is:
-- `public.party_assignments` has RLS enabled and NO write policy at all
-- (`20260809000000:562-575`, deliberate), so the only writes are the ones a
-- definer-owned function performs. This function is one of them, and it is the
-- narrowest possible: it sets two columns, on rows that are already over, for
-- one subject.
--
-- It returns the count so that a caller — or a person at a psql prompt — can see
-- that something happened. In a product with no error tracking, a function that
-- returns `void` is a function nobody can check.

CREATE OR REPLACE FUNCTION public.release_expired_assignee_roles(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_released integer;
BEGIN
  -- Every clause is load-bearing:
  --   `revoked_at IS NULL`      — a revoked row released its role already;
  --   `expired_at IS NULL`      — idempotence, and it keeps the first
  --                               retirement instant instead of moving it;
  --   `assignee_role IS NOT NULL` — nothing to release otherwise;
  --   `now() >= ends_at`        — THE rule. A live assignment is not touched,
  --                               and the CHECK above would refuse it anyway.
  UPDATE public.party_assignments
     SET assignee_role = NULL,
         expired_at    = now()
   WHERE user_id = p_user_id
     AND revoked_at IS NULL
     AND expired_at IS NULL
     AND assignee_role IS NOT NULL
     AND now() >= ends_at;

  GET DIAGNOSTICS v_released = ROW_COUNT;
  RETURN v_released;
END;
$$;

COMMENT ON FUNCTION public.release_expired_assignee_roles(uuid) IS
  'Retire this subject assignments whose night is already over: stamp expired_at and null assignee_role, so the composite key stops blocking their role. '
  'Never touches revoked_at and never touches a live row. Idempotent. CR-02 of the 2026-08-09 review.';

REVOKE ALL ON FUNCTION public.release_expired_assignee_roles(uuid) FROM PUBLIC;

-- =============================================================================
-- 4. The trigger — the release happens inside the statement that needs it
-- =============================================================================
--
-- `BEFORE UPDATE OF role`, so it runs before the row is written and therefore
-- before the foreign key's own check on the referenced side, which happens at
-- the end of the statement (`NO ACTION`, undeferred). By then the referencing
-- rows that had ended carry a NULL and `MATCH SIMPLE` skips them.
--
-- `WHEN (OLD.role IS DISTINCT FROM NEW.role)` so that the ordinary `UPDATE
-- profiles SET status = …` — which `coalesce`s `role` to itself — costs nothing.

CREATE OR REPLACE FUNCTION public.profiles_release_expired_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.release_expired_assignee_roles(OLD.id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_release_expired_assignments() IS
  'BEFORE UPDATE OF role on public.profiles: retire the subject assignments that are already over, so a role change is not refused by a night that finished weeks ago (CR-02). '
  'It RELEASES, it does not enforce - disabled, the behaviour is the refusal it exists to remove, which is the fail-closed direction.';

DROP TRIGGER IF EXISTS profiles_release_expired_assignments ON public.profiles;

CREATE TRIGGER profiles_release_expired_assignments
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.profiles_release_expired_assignments();

-- =============================================================================
-- 5. The table comment, brought up to date
-- =============================================================================

COMMENT ON TABLE public.party_assignments IS
  'Per-night assignments (phase 35). A revocation UPDATES revoked_at/revoked_by and NULLS assignee_role; it is never a DELETE. '
  'An EXPIRY does the same with expired_at and leaves revoked_at NULL (CR-02, 2026-08-09), so the offline drain can still ask whether the row was live at scannedAt. '
  'assignee_role is nullable ON PURPOSE: a MATCH SIMPLE composite FK is not enforced when a referencing column is NULL, which is what stops a RETIRED row - revoked or expired - from blocking its holder demotion for ever. '
  'Demoting somebody with a LIVE assignment is still refused with 23503 - revoke first (plan 35-08 offers both as one action).';

COMMIT;
