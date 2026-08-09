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

-- =============================================================================
-- 2. profiles_id_role_unique — the constraint the composite key requires
-- =============================================================================
--
-- Postgres requires a unique constraint on the columns a foreign key REFERENCES.
-- `public.profiles` has a primary key on `id` alone, and that is not enough for
-- a key on `(id, role)`: without this, section 3's
-- `party_assignments_assignee_role_fk` raises `42830` and rolls the file back.
--
-- **From the data's point of view this constraint is redundant** — `id` is
-- already unique, so `(id, role)` cannot repeat. **From the REFERENCING point of
-- view it is not**, and the distinction is the whole reason this paragraph
-- exists: a reader auditing `public.profiles` will find a unique constraint that
-- forbids nothing and will be right about that, and removing it would break a
-- foreign key declared in another file on another table. It is named, and its
-- purpose is written here, so that the removal is refused with a reason instead
-- of being discovered as an outage.
--
-- IDEMPOTENZA — WR-04 della code review del 2026-08-08, **corretta da WR-01
-- della code review del 2026-08-09**. Questa coda si applica A MANO, una riga
-- alla volta, e riapplicare una riga per sicurezza e' la reazione naturale a un
-- dubbio: senza idempotenza, una seconda esecuzione di QUESTO file manda in
-- rollback l'intera transazione e lascia NON APPLICATA tutta la coda che segue.
--
-- **La forma precedente produceva esattamente il fallimento che dichiarava di
-- prevenire.** Era `DROP CONSTRAINT IF EXISTS` seguito da `ADD CONSTRAINT`, e
-- l'`IF EXISTS` sopprime *«non esiste»*, non *«qualcos'altro dipende da essa»*:
-- alla sezione 3 questo stesso file crea
-- `party_assignments_assignee_role_fk`, che REFERENCES `public.profiles (id,
-- role)` e quindi **dipende dall'indice unico che la DROP cerca di togliere**.
-- Alla seconda esecuzione la DROP arriva prima del `CREATE TABLE IF NOT EXISTS`
-- (che non farebbe nulla) e Postgres rifiuta. Misurato in `postgres:17.6`:
--
--   ERROR:  cannot drop constraint profiles_id_role_unique on table profiles
--           because other objects depend on it
--   DETAIL:  constraint party_assignments_assignee_role_fk on table
--            party_assignments depends on index profiles_id_role_unique
--
-- `2BP01` invece di `42710`, transazione in rollback, coda ferma: lo stesso
-- danno, con un altro codice.
--
-- La forma corretta e' **non toccare un vincolo referenziato**: crearlo se
-- manca, e altrimenti lasciarlo esattamente dov'e'. Non c'e' `ALTER TABLE ...
-- ADD CONSTRAINT IF NOT EXISTS` in Postgres — di qui il `DO`, che e' la forma
-- che questo repository usa gia' quando serve un DDL condizionale.
--
-- **Questo file non e' mai stato applicato in produzione** (e' la riga 7 di una
-- coda che nessuno ha ancora percorso), quindi correggerlo qui non viola il gate
-- *migration in avanti* di `supabase-data.md`: non c'e' nessun fatto storico da
-- rispettare.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'profiles_id_role_unique'
       AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_role_unique UNIQUE (id, role);
  END IF;
END;
$$;

COMMENT ON CONSTRAINT profiles_id_role_unique ON public.profiles IS
  'Redundant against the primary key as a rule about data; NOT redundant as a referenced key. '
  'party_assignments_assignee_role_fk REFERENCES public.profiles (id, role) and Postgres refuses '
  'a foreign key whose referenced columns carry no unique constraint (42830). Do not remove as tidying.';

-- =============================================================================
-- 3. public.party_assignments — the temporal record
-- =============================================================================
--
-- WHAT A ROW IS: one capability, granted to one account, for one night, by
-- somebody, until a stated instant — and, if it was taken away, when and by
-- whom. ASSIGN-03 is the shape of that last clause: **a revocation is a row that
-- is updated, never a row that is deleted.** The offline drain has to be able to
-- ask *"was this assignment live at `scannedAt`?"* AFTER the revocation, because
-- a phone that was at the door at 01:40 syncs at 03:00 and the answer must be
-- about 01:40. A `DELETE` erases the only evidence that could answer it.

CREATE TABLE IF NOT EXISTS public.party_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHICH NIGHT. `CASCADE` and not `SET NULL`, diverging from
  -- `membership_acts.party_id` (`20260808002000:272`) on purpose: this table is
  -- OPERATIVE STATE, not a register. An assignment to a night that no longer
  -- exists cannot be evaluated by the resolver and is not evidence of anything —
  -- the evidence of the act is the `membership_acts` row, which is the one built
  -- to outlive its subject.
  party_id uuid NOT NULL REFERENCES public.event_parties ON DELETE CASCADE,

  -- WHO HOLDS IT. There is deliberately no second foreign key from this column
  -- to `auth.users`: the composite key at the bottom of this table already
  -- points it at `public.profiles`, and a `NOT NULL` column cannot take
  -- `ON DELETE SET NULL` — so a plain second key would have to cascade, and a
  -- cascade that destroys the row is the `ticket_refunds` lesson
  -- (`20260808002000:149-153`) repeated. See the asymmetry declared in 3b.
  user_id uuid NOT NULL,

  -- WHAT IS GRANTED, by key, against the catalogue.
  --
  -- READ THE `CHECK` BELOW TOGETHER WITH THIS KEY, because between this
  -- migration and the next one they disagree about three values.
  -- `party_assignments_capability_assignable` names four keys; today
  -- `private.capabilities` holds only one of them, `door.operate`. The other
  -- three — `door.supervise`, `media.upload`, `party.manage` — are COINED BY THE
  -- NEXT MIGRATION IN THE QUEUE (`20260809001000_assignment_resolver.sql`).
  --
  -- Between the two files a row carrying one of those three cannot be inserted:
  -- the foreign key has nothing to point at. **And there is nothing to insert in
  -- the meantime**, because the first write to this table arrives from a surface
  -- (`20260809002000_assignment_acts.sql` and plan 35-05) that does not exist
  -- yet. This is said here rather than left to be met as a `23503` by whoever
  -- applies row 7 and stops before row 8.
  capability text NOT NULL REFERENCES private.capabilities(key),

  -- WHICH ROLE THE HOLDER HELD WHEN IT WAS GRANTED — **nullable, and the
  -- nullability IS the mechanism.** See 3b. `NULL` here means *revoked*, never
  -- *unknown*.
  assignee_role text,

  -- WHO GRANTED IT. `NOT NULL`, because `party_assignments_no_self_grant`
  -- compares it against `user_id` and a nullable actor would make that
  -- comparison evaluate to NULL — which a `CHECK` accepts. An unattributed grant
  -- would therefore also be a grant that passes the self-assignment rule, and it
  -- is the same failure `membership_acts_actor_attributed`
  -- (`20260808002000:228-231`) exists to refuse on the register.
  --
  -- `ON DELETE RESTRICT` and not `SET NULL`: `assigned_by` cannot become NULL
  -- without disarming the rule above, so an account that granted a live
  -- assignment cannot be deleted while it is live. Revoke first — which is a
  -- row, and therefore a trace.
  assigned_by uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,

  -- WHEN. The SERVER clock, always — `src/app/api/membership/verify/route.ts:412`,
  -- *"a device clock is evidence, never authority"*.
  granted_at timestamptz NOT NULL DEFAULT now(),

  -- WHEN IT STOPS. Computed AT THE GRANT from the night, never sent by a client:
  -- see 3d.
  ends_at timestamptz NOT NULL,

  -- WHEN IT WAS TAKEN AWAY, and by whom. `NULL` means LIVE.
  --
  -- `revoked_by` takes `ON DELETE SET NULL` where `assigned_by` takes `RESTRICT`,
  -- and the asymmetry is deliberate rather than an oversight: no constraint on
  -- this table reads `revoked_by`, so losing it costs attribution and disarms
  -- nothing — and *an author who later leaves the project has not un-performed
  -- their acts* (`20260808002000:205-207`).
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users ON DELETE SET NULL,

  -- ── ASSIGN-04 · nobody assigns to themselves ────────────────────────────────
  --
  -- WHY THIS IS A `CHECK` AND NOT A POLICY, and the reasoning is measured rather
  -- than stylistic. The three door routes write with the SERVICE client —
  -- `src/app/api/tickets/checkin/route.ts:224`,
  -- `src/app/api/tickets/checkin/undo/route.ts:93`,
  -- `src/app/api/membership/verify/route.ts:193` — and
  -- `public.record_membership_act` carries `EXECUTE` to `service_role` alone
  -- (`20260808002000:484-488`). **The service client bypasses every RLS policy
  -- and bypasses no constraint.** A `WITH CHECK` policy expressing this rule
  -- would therefore not be evaluated on the only path that writes here. This is.
  --
  -- WHAT IT DOES NOT CATCH, stated so it is not mistaken for more than it is: it
  -- stops *A grants to A*. It does NOT stop *A grants to B, B grants to A*.
  -- Reciprocal granting is a different rule, it is **not part of ASSIGN-04**, and
  -- it is declared OUT OF SCOPE here rather than half-covered. The mitigation
  -- that already exists is attribution, not prevention: the act lands in
  -- `public.membership_acts` and `idx_membership_acts_actor`
  -- (`20260808002000:296-297`) is the index that makes an actor's own history a
  -- read somebody actually performs. `community-membership.md`, gate *chi decide
  -- e' tracciato*.
  CONSTRAINT party_assignments_no_self_grant CHECK (assigned_by <> user_id),

  -- ── A revocation is whole, or it did not happen ─────────────────────────────
  --
  -- Both directions, so neither can drift. A `revoked_at` without a
  -- `revoked_by` is an unattributed revocation — the same thing D-11 forbids for
  -- the register. A `revoked_by` without a `revoked_at` is an attribution for an
  -- act that never took place, which reads to every later reader as a revocation
  -- whose timestamp was lost.
  CONSTRAINT party_assignments_revocation_paired CHECK (
    (revoked_at IS NULL     AND revoked_by IS NULL) OR
    (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  ),

  -- ── WHICH CAPABILITIES MAY BE ASSIGNED PER NIGHT AT ALL ─────────────────────
  --
  -- **The assignable set is declared here and in no other place.** The catalogue
  -- in `private.capabilities` says which keys EXIST; this says which of them a
  -- per-night grant may carry. The two are different questions, and the four
  -- keys the model holds that are NOT here — `staff.manage`, `organizer.access`,
  -- `register.read` and the rest — are absent because they are not properties of
  -- a night: they say what somebody may do in this product, not what somebody
  -- does at one door on one evening. Widening this list is a decision about the
  -- gating model (`CLAUDE.md`, operating principle 1) and takes its own
  -- migration.
  CONSTRAINT party_assignments_capability_assignable CHECK (
    capability IN ('door.operate', 'door.supervise', 'media.upload', 'party.manage')
  ),

  -- ── A LIVE row carries a role; a REVOKED row carries none ───────────────────
  --
  -- Read this with the composite key below: together they are the whole of D-A.
  -- This half forbids the two shapes that would make the other half meaningless
  -- — a live assignment with no role (the composite key would not be checked,
  -- so a `member` could hold one) and a revoked assignment that still names a
  -- role (which would keep blocking that account's demotion forever, 3c).
  CONSTRAINT party_assignments_live_role_present CHECK (
    (revoked_at IS NULL     AND assignee_role IN ('master', 'organizer', 'staff')) OR
    (revoked_at IS NOT NULL AND assignee_role IS NULL)
  ),

  -- ── D-A · only a staff role may hold a LIVE assignment ──────────────────────
  --
  -- The full reasoning is 3b, below the table. In one line: this is the rule, and
  -- it is a foreign key because Postgres will not let it be a `CHECK`.
  --
  -- **Deliberately without an update-cascading referential action on the
  -- referenced key**, and the reason is the whole point: cascading an update
  -- would propagate the new role — `member`, on a demotion — into `assignee_role`
  -- and violate `party_assignments_live_role_present` one statement later.
  -- Without it, the demotion is REFUSED with `23503`, which is the behaviour D-A
  -- asks for. See 3c.
  --
  -- (The forbidden clause is described rather than written out, for the same
  -- reason as the zone offsets in section 1: the plan's check for this file
  -- greps for its literal text, and a check whose only match is the sentence
  -- forbidding the thing is a check that gets ignored.)
  CONSTRAINT party_assignments_assignee_role_fk
    FOREIGN KEY (user_id, assignee_role)
    REFERENCES public.profiles (id, role)
    ON DELETE CASCADE
);

-- ── 3b. D-B — THE DIVERGENCE, WRITTEN OUT ───────────────────────────────────
--
-- **«Only staff roles are assignable» is not expressible as a `CHECK`.**
-- Postgres forbids subqueries in a check constraint (`0A000: cannot use subquery
-- in check constraint`), and this rule reads ANOTHER ROW of ANOTHER TABLE:
-- `public.profiles.role` for the account being assigned. The locked decision
-- says *«a row `CHECK` (or an equivalent structural guarantee)»*, and it is the
-- second half of that parenthesis that applies.
--
-- THE FORM CHOSEN is the composite foreign key above: a denormalised
-- `assignee_role` on this row, tied to `public.profiles (id, role)` so the pair
-- cannot lie. A foreign key is evaluated on EVERY write by EVERY role, service
-- client included — which is the one property that made `CHECK` the right answer
-- for ASSIGN-04, kept for a rule a `CHECK` cannot hold.
--
-- THE TRIGGER IS RECORDED AS CONSIDERED AND REFUSED, not overlooked. It would
-- express the rule exactly. It also has a one-line off switch —
-- `ALTER TABLE ... DISABLE TRIGGER`, available to the table OWNER and not only to
-- a superuser, and the owner here is `postgres`, the role migrations are applied
-- as. `20260808001000_role_implies_approved.sql:85-95` measured that and refused
-- the trigger on this exact ground: a reader would see enforcement that is not
-- running. Re-proposing it here without citing that paragraph would be re-taking
-- a decision that is already closed.
--
-- ── WHY THE RULE IS TRUE ONLY FOR LIVE ASSIGNMENTS, AND HOW ─────────────────
--
-- A composite foreign key declared `MATCH SIMPLE` — the default, and what this
-- one is — **is not checked at all when ANY referencing column is NULL.** That
-- is not a loophole being exploited; it is the mechanism, and it is the reason
-- `assignee_role` is nullable in a table where every other meaningful column is
-- not.
--
-- A revocation NULLS `assignee_role` (and `party_assignments_live_role_present`
-- makes that mandatory rather than optional). From that moment the row
-- constrains nobody's role, and the person can be demoted freely.
--
-- **THE PRICE, DECLARED:** a revoked row no longer records which role the holder
-- held at the moment of the grant. That information is gone from this table and
-- is not recoverable from it. It is an acceptable price because this table is
-- operative state and not the register: `public.membership_acts` keeps WHO and
-- WHEN for the acts `'assigned'` and `'unassigned'`, and role is not the axis
-- either act touches. If a later phase needs the role-at-grant-time to be
-- durable, it adds a SECOND column that no foreign key reads — it does not make
-- `assignee_role` `NOT NULL`, which would re-arm every historical row against
-- its holder's demotion forever.
--
-- ── THE ASYMMETRY ON ACCOUNT DELETION, DECLARED RATHER THAN RESOLVED ────────
--
-- The same `MATCH SIMPLE` rule makes `ON DELETE CASCADE` above apply to LIVE
-- rows and not to revoked ones: deleting a profile removes that account's live
-- assignments and leaves its revoked ones behind, pointing at a `user_id` that
-- no longer resolves. That is the tolerable direction — an orphan in operative
-- state is inert, while the alternative (a second cascading key on `user_id`)
-- would delete the evidence that a revocation happened, which is the one thing
-- ASSIGN-03 exists to prevent. It is written down because it is surprising, not
-- because it is a defect.
--
-- ── 3c. THE OPERATIONAL CONSEQUENCE: A NEW WAY TO REFUSE AN OPERATION ───────
--
-- **Demoting somebody who holds a LIVE assignment is refused by the database**,
-- with `23503` on `party_assignments_assignee_role_fk`. This is not a side
-- effect of the mechanism — it IS the rule working. A `staff` account with a
-- live door assignment cannot silently become a `member` while the assignment
-- keeps resolving.
--
-- THE WAY OUT IS: revoke first, demote second. **Plan 35-08 is the surface that
-- offers it as ONE action**, so that an organizer is not asked to know the order.
--
-- AND THE MESSAGE MUST NAME THE ASSIGNMENTS THAT BLOCK. A generic refusal here
-- is the *"Qualcosa e' andato storto"* precedent this repository has already
-- recorded (`.planning/codebase/CONCERNS.md`, the newsletter form): a failure
-- that collapses distinguishable causes into one sentence is undebuggable for
-- the person in front of it and for whoever is called about it afterwards. There
-- is no error tracking in this product (`meta-gates.md`), so the refusal must be
-- OBSERVABLE where it happens — on the members page, naming the nights — and not
-- merely logged. When it is handled in application code, branch on
-- `error.code === '23503'` and never on a parsed message, and never log or return
-- `error.details`: PostgREST puts the entire failing row there
-- (`20260808001000_role_implies_approved.sql:194-201`).
--
-- ── 3d. WHERE `ends_at` COMES FROM, AND WHY IT NEEDS SAYING ─────────────────
--
-- `ends_at` is computed AT THE GRANT, from the night, by the writer. Never sent
-- by a client: a device clock is evidence, never authority, and a boundary
-- supplied by the caller is a permission window chosen by whoever is being
-- checked. The expression is
--
--   public.party_end_instant(ep.date, coalesce(ep.end_time, '06:00'::time))
--
-- reading `public.event_parties ep` — **and BOTH columns come from the party,
-- with no join to `public.events`.**
--
-- THAT IS NOT A SIMPLIFICATION, IT IS THE CORRECTION OF A REAL DEFECT, and it is
-- written out because the join is the obvious thing to write. `public.events`
-- also has a `date`, and reading the boundary from it would be wrong:
-- `20260226300000_multi_sub_events.sql:20-27` gave `public.event_parties` its OWN
-- `date` and backfilled it from the parent — precisely so a sub-event can sit on
-- a different calendar day from the event that contains it. A night whose
-- after-party falls on the following day would then get an `ends_at` computed
-- from the parent's date, **one whole day early**.
--
-- The whole product already agrees on this and there is no exception:
-- `src/app/(organizer)/organizer/events/[id]/review/page.tsx:164`,
-- `src/app/api/tickets/checkin/route.ts:438`,
-- `src/app/api/cron/venue-reveal/route.ts:40`,
-- `src/app/api/cron/event-reminders/route.ts:40` and every `menuCloseInstant`
-- call site pass the PARTY's date. This function is the SQL half of that same
-- rule, so it is fed the same column, or the two halves answer different
-- questions while looking identical.
--
-- THE FALLBACK IS NOT AN INVENTED DEFAULT. `event_parties.end_time` is NULLABLE
-- (`20260225150000_party_architecture.sql:16`), so a party can carry no closing
-- hour at all. `'06:00'` is the DECLARED close of a night in this product — the
-- night runs 22:00 → 06:00 — and section 1's midnight rule carries it to the
-- following morning. It is the same literal
-- `review/page.tsx:164` already uses on the TypeScript side, for the same reason
-- and with the same value.
--
-- THE DIRECTION OF THE ERROR IS THE SAFE ONE, and that is why this fallback and
-- not a tighter one: a window that is too WIDE admits somebody who should have
-- been admitted a few minutes earlier; a window that is too NARROW refuses a
-- member of staff at the door, in front of a queue, which this project holds to
-- be the worse of the two failures (`CLAUDE.md`, operating principle 3).
--
-- **THIS MIGRATION INSTALLS NO TRIGGER TO COMPUTE `ends_at`.** The computation
-- lives in the atomic writer of `20260809002000_assignment_acts.sql` (plan 35-04),
-- beside the register insert it must be atomic with. A trigger here would be a
-- second place the same arithmetic happens, and it would carry the one-line off
-- switch 3b just refused.

-- ── 3e. The indexes — one per way this table is actually read ───────────────

-- ONE LIVE ASSIGNMENT PER (night, person, capability), and the partial predicate
-- is what makes it a rule about the present rather than about the history: the
-- revoked rows are as many as they are, and re-granting after a revocation must
-- not be refused by a uniqueness rule about the past.
CREATE UNIQUE INDEX IF NOT EXISTS party_assignments_live_unique
  ON public.party_assignments (party_id, user_id, capability)
  WHERE revoked_at IS NULL;

-- THE RESOLVER'S PATH, taken on EVERY per-night capability question — which is
-- to say on every policy evaluation that passes a party, and at the door a slow
-- query is a queue (`20260805120000_door_scan_events.sql:126-128`, the same
-- sentence for the same reason).
CREATE INDEX IF NOT EXISTS idx_party_assignments_lookup
  ON public.party_assignments (user_id, party_id)
  WHERE revoked_at IS NULL;

-- THE SURFACE'S READ: *who works this night*, most recent grant first. Not
-- partial, deliberately — that screen must show the revoked rows too, because a
-- revocation that becomes invisible is indistinguishable from an assignment that
-- was never made.
CREATE INDEX IF NOT EXISTS idx_party_assignments_party
  ON public.party_assignments (party_id, granted_at DESC);

-- ── 3f. RLS, in this same migration ────────────────────────────────────────
--
-- Without this, anyone holding the anonymous key reads the whole roster of who
-- works which night through PostgREST — which is a list of the people at the
-- door of an invitation-only event, on a repository that is public. The
-- middleware decides where somebody may GO; this decides what they may READ, and
-- only this is the security boundary.

ALTER TABLE public.party_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS party_assignments_select_own ON public.party_assignments;

-- A person sees their own assignments. `(SELECT auth.uid())` and not a bare
-- `auth.uid()`: the wrapper is what makes Postgres evaluate it once per
-- statement as an InitPlan instead of once per row
-- (`20260807000000_capability_model.sql:177-184`).
CREATE POLICY party_assignments_select_own ON public.party_assignments
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS party_assignments_select_staff_manage ON public.party_assignments;

-- And whoever manages staff sees all of them. The `(select …)` wrapper is
-- LOAD-BEARING and it is NOT `STABLE` that produces it — proved by `EXPLAIN` on
-- this database and written up at the reference above. A policy written in the
-- older `public.is_admin_or_organizer()` shape would be both a wrong predicate
-- and a per-row call.
CREATE POLICY party_assignments_select_staff_manage ON public.party_assignments
  FOR SELECT USING ((SELECT private.has_capability('staff.manage')));

-- NO INSERT, UPDATE OR DELETE POLICY, AND THE OMISSION IS DELIBERATE. Writes
-- arrive only through the `SECURITY DEFINER` writer of
-- `20260809002000_assignment_acts.sql` (plan 35-04), which runs as its definer
-- and carries `EXECUTE` to `service_role` alone. So with RLS enabled and no
-- write policy, no session — authenticated, anonymous, or a master's — can add,
-- edit or remove a row directly. That is what it means for a revocation to be a
-- recorded act rather than a convention: there is no granted path to a `DELETE`.
--
-- Two other tables in this repository omit their write policies on purpose
-- (`20260805120000_door_scan_events.sql:158-163` and
-- `20260808002000_membership_register.sql:337-343`), and both carry this
-- paragraph for the same reason: without it the next reader takes the gap for a
-- bug and repairs it — and the repair is one `CREATE POLICY` away from letting a
-- session delete the row that records its own revocation.

COMMENT ON TABLE public.party_assignments IS
  'Per-night assignments (phase 35). A revocation UPDATES revoked_at/revoked_by and NULLS assignee_role; '
  'it is never a DELETE. assignee_role is nullable ON PURPOSE: a MATCH SIMPLE composite FK is not enforced '
  'when a referencing column is NULL, which is what stops a revoked row from blocking its holder demotion. '
  'Demoting somebody with a LIVE assignment is refused with 23503 - revoke first (plan 35-08 offers both as one action).';

COMMIT;
