-- The register of acts on a member's role and status — the first one this
-- repository has
-- Phase 43, Plan 07: ACCT-04 (D-11), with D-18, D-19 and D-22 written beside the
-- lines that implement them
--
-- Changes:
-- 1. private.capabilities / private.role_capabilities — a NINTH capability,
--    `register.read`, granted to `master` and `organizer`, both with
--    `requires_approved = true`
-- 2. public.membership_acts — the register: append-only, one row per act, with
--    its author, its author's KIND, and the before/after values of both axes
-- 3. RLS on that table: enabled, one SELECT policy, and DELIBERATELY no write
--    policy
-- 4. public.record_membership_act(...) — the SECURITY DEFINER function that
--    performs the profile write and the register insert in ONE transaction, and
--    is executable by `service_role` alone
--
-- Four changes, ONE transaction. A half-applied version of this file is strictly
-- worse than none of it, and each half is bad in its own way:
--
--   * the table without its capability is a register nobody can read, so the
--     history D-11 exists to make readable is written and inaccessible;
--   * the capability without the table is a ninth key that
--     `scripts/verify-capabilities.mjs` compares against a catalogue that has it
--     and a `keys.ts` that has it, all agreeing about a permission over nothing;
--   * the table without the function is a register with no writer, and since the
--     table has no write policy at all it would be permanently empty — which
--     reads, to anybody who opens it, as *no act has ever been performed*;
--   * the function without its REVOKE is a `SECURITY DEFINER` writer of
--     `public.profiles.role` reachable by any authenticated session, which is a
--     privilege-escalation primitive and not a partial feature.
--
-- So `BEGIN; ... COMMIT;` is not decoration here either.
--
-- ACCT-04 IS NOT AN EXTENSION OF AN EXISTING REGISTER; IT IS THE FIRST ONE.
-- Measured (`43-RESEARCH.md` § D.1): the 20 public tables plus the two `private`
-- ones hold no audit, log or history of member acts; `public.profiles` has no
-- `approved_by`, no `approved_at` and no `promoted_by`. The trace today is the
-- mutated row and nothing else, and `updated_at` carries only the LAST write —
-- so a promotion followed by a demotion erases the promotion. That is the reason
-- this is a table and not two columns: a column holds the latest act, and D-11
-- asks for something a season can be read from.
--
-- WHAT THIS REGISTER IS, AND WHAT IT IS NOT. It is a register of ACTS performed
-- on an account's role and status inside this product. It is **not** the
-- association's *libro soci* — the membership register a members-only entry
-- model would require (`legal-compliance.md`, gate *un ingresso riservato ai
-- soci ha bisogno di soci veri*; `community-membership.md`, gate *socio e utente
-- non sono la stessa cosa*). Making the platform that register is a decision
-- that must be DECLARED, because it changes what `member` and `approved` mean
-- and what the offline scanner must be able to do at the door. No such decision
-- exists, and this file does not take one by implication. Anyone who later wants
-- this table to serve that purpose is adding a legal obligation to it, not a
-- column.
--
-- Idempotence: `IF NOT EXISTS` on the table and both indexes, `on conflict do
-- nothing` on both seed inserts, `DROP POLICY IF EXISTS` before the policy, and
-- `CREATE OR REPLACE` for the function — the idempotent form for an object that
-- cannot take `IF NOT EXISTS`.

BEGIN;

-- =============================================================================
-- 1. `register.read` — the ninth capability, and why it is a NEW key
-- =============================================================================
--
-- Named by the QUESTION it answers, not by the predicate it happens to resolve
-- to, which is the rule `src/lib/capabilities/keys.ts:38-45` states and the
-- reason `staff.manage`, `organizer.access` and `door.operate` are three keys
-- sharing one predicate rather than one key.
--
-- ── D-19: why a ninth key instead of gating on `staff.manage` ────────────────
--
-- THE REGISTER CONTAINS REJECTIONS. Gating it on `staff.manage` would admit an
-- organizer whose own access was never approved, because that key carries
-- `requires_approved = false` (`20260807000000_capability_model.sql:392-393`).
-- The obvious repair — flipping that flag — is the one thing this phase must not
-- do: the same `false` is what keeps `door.operate` open, and
-- `20260807000000_capability_model.sql:415` says of the two door rows *"These
-- two rows must not become true."* Refusing a valid member of staff at the door,
-- in front of a queue, at two in the morning, is worse than the alternative,
-- because the first error happens in front of people.
--
-- So neither flag is flipped and a ninth key is minted. `catalogue.manage` was
-- the other candidate — it is already shaped `requires_approved = true` — and it
-- is refused for the naming rule above: *may this subject create an artist or a
-- venue* is not *may this subject read who was rejected*, and reusing it would
-- make the two impossible to separate later.
--
-- ── Who is refused, and each refusal is a decision ───────────────────────────
--
--   `staff`   — refused. D-03: work permissions are not granted by the role;
--               they come from Phase 35's per-night assignment and expire with
--               the night. Reading a season of rejections is not a night's work.
--   `member`  — refused. Nothing grants it.
--   `anon`    — refused. `private.has_capability` answers false for a null
--               `auth.uid()` by construction
--               (`20260807000000_capability_model.sql:55-57`).
--   THE SUBJECT OF AN ACT, about themselves — refused, and this is the one that
--               looks unkind and is not. `attendances_select_own`
--               (`schema.sql:243-244`) sets a precedent for own-row reads, and
--               it is deliberately not followed here: a rejection row visible to
--               the rejected person turns `rejected` from a state into a
--               COMMUNICATION, and `community-membership.md` (gate *un rifiuto
--               è una comunicazione, non uno stato*) says that wording is chosen
--               once, with care, and *"non deve spiegare più di quanto si è
--               disposti a difendere"*. A table is not that wording, and leaking
--               it through a policy is choosing it by accident.
--
-- The two grants below carry `requires_approved = true` — that is D-19's actual
-- requirement, and it is what `staff.manage` could not have expressed.

INSERT INTO private.capabilities (key, description) VALUES
  (
    'register.read',
    'Read the register of acts on a member''s role and status: who was created, approved, rejected, promoted, demoted, deactivated or reactivated, by whom and when. Requires an APPROVED staff role on both grants (D-19) because the register contains rejections — staff.manage would have admitted a never-approved organizer, and its requires_approved = false is not flipped: the same false keeps the door open.'
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- `master.manage`'s own description already names *"changing another member's
  -- role or status"* (`keys.ts:88-89`), so the master reading the record of
  -- those changes needs no further justification.
  ('master',    'register.read', true),

  -- D-07 lets an organizer create and promote. An actor who cannot see the
  -- register cannot check their own work, and `community-membership.md`'s gate
  -- *chi decide è tracciato* is about VISIBILITY, not only about storage: a
  -- record nobody may read is a record that changes nothing.
  ('organizer', 'register.read', true)
ON CONFLICT (role, capability) DO NOTHING;

-- WHERE THE SIX REFUSALS OF THIS KEY ARE ASSERTED, so the paragraph above points
-- at a mechanism instead of standing in for one: `scripts/verify-capabilities.mjs`,
-- side 5. Its `ROLE_GRANTS` declares every (role × capability) pair — 36 after
-- this file, 20 grants and 16 refusals — and exits 1 naming the pair both when a
-- declared refusal acquires a row and when a declared grant loses one. A comment
-- can be ignored; that check cannot.

-- =============================================================================
-- 2. public.membership_acts — the register
-- =============================================================================
--
-- The template is `public.door_scan_events`
-- (`20260805120000_door_scan_events.sql:60-163`), the only append-only register
-- this repository owns, and the four properties copied from it each carry their
-- own reasoning there:
--
--   * `ON DELETE SET NULL`, never `CASCADE` (`:41-45`, `:73-81`) — the lesson of
--     the `ticket_refunds` cascade that destroyed the audit row written one
--     statement earlier, confirmed against a throwaway container on 2026-08-05.
--     Applied here: if an account is deleted, the register must still say an act
--     happened.
--   * one index per way the table is actually read (`:122-138`).
--   * RLS on with a SELECT policy and NO write policy (`:140-163`), with the
--     paragraph that says the omission is deliberate — section 3 below.
--   * text CHECKs mirroring a TypeScript union defined in a module that imports
--     nothing (`:55-58`), which here is `src/lib/membership/acts.ts`.
--
-- AND ONE DELIBERATE DIVERGENCE FROM IT, which is D-22 and is section 2b.

CREATE TABLE IF NOT EXISTS public.membership_acts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHAT WAS DONE. Mirrored literally from `MembershipAct` in
  -- `src/lib/membership/acts.ts`. The two sides were written once there and
  -- copied here: editing either means editing both, in the same commit, exactly
  -- as `src/lib/door/outcome.ts:16-21` states for its own CHECKs.
  --
  -- The seven values are the five acts D-11 names plus the two halves of
  -- deactivation, because `rejected` and `deactivated` are the same write today
  -- ({status:'rejected', role:'member'}) performed for two different reasons,
  -- and a register that cannot tell them apart cannot be read a season later.
  act text NOT NULL
    CHECK (act IN (
      'created',
      'approved',
      'rejected',
      'promoted',
      'demoted',
      'deactivated',
      'reactivated'
    )),

  -- WHO IT WAS DONE TO. SET NULL, per the note above: the act outlives its
  -- subject, and a register that vanished when an account was deleted would be
  -- most useful exactly where it is emptiest.
  subject_id uuid REFERENCES auth.users ON DELETE SET NULL,

  -- ...and who they were, denormalised, so a row whose `subject_id` has gone to
  -- NULL still says who it was about. Same reasoning as
  -- `ticket_refunds.refunded_ticket_id` (`20260805120000:188-193`), which is
  -- deliberately not a foreign key so that it can survive the row it names.
  --
  -- **A MEMBERSHIP CODE, NEVER AN EMAIL ADDRESS AND NEVER A FULL NAME.** This
  -- repository is PUBLIC and `.planning/` is tracked (`CLAUDE.md` Guardrail 5),
  -- so a register row can reach an artefact — a screenshot, a paste in an issue,
  -- a support thread. `scripts/rls-baseline.mjs:679-687` sets the precedent that
  -- a LABEL reaches an artefact and an IDENTIFIER does not. Section 4's function
  -- reads this value from `public.profiles.membership_code` and nothing else, so
  -- the rule is enforced by the only writer rather than by the caller
  -- remembering.
  subject_label text NOT NULL,

  -- WHO DID IT. SET NULL for the same reason as the subject: an author who later
  -- leaves the project does not un-perform their acts.
  actor_id uuid REFERENCES auth.users ON DELETE SET NULL,

  -- ── 2b. D-22 — the divergence from the analog, made deliberately ───────────
  --
  -- `door_scan_events.operator_id` is `NOT NULL REFERENCES auth.users`
  -- (`:107-108`) and has no room for a system actor. That is right for a door:
  -- somebody was holding the phone. It is wrong here, because D-16's
  -- reconciliation-driven demotion — the `MASTER_EMAIL` account that stops
  -- matching — has NO human author, and would be unrecordable under a NOT NULL
  -- actor.
  --
  -- The lazy repair is to make `actor_id` plainly nullable. That re-opens
  -- exactly what D-11 forbids: an unattributed act, indistinguishable from an
  -- act whose author was simply not written. So the KIND sits beside the actor,
  -- and the table refuses the two combinations that would mean "nobody".
  actor_kind text NOT NULL CHECK (actor_kind IN ('user', 'system')),

  -- BOTH DIRECTIONS, so neither can drift. A `user` act without an actor is the
  -- unattributed act; a `system` act WITH an actor is a human act wearing the
  -- system's name, which is worse — it is attribution laundering, and it would
  -- read as automation in every later review of the register.
  CONSTRAINT membership_acts_actor_attributed CHECK (
    (actor_kind = 'user'   AND actor_id IS NOT NULL) OR
    (actor_kind = 'system' AND actor_id IS NULL)
  ),

  -- WHAT CHANGED, on both axes, before and after.
  --
  -- All four are plain `text`, all four are nullable, and there is deliberately
  -- **no foreign key and no CHECK tying them to the current role or status
  -- list**. A stored role label is EVIDENCE OF WHAT WAS TRUE THEN, not a pointer
  -- to what is true now: constraining it would make this table a fourth
  -- enumeration to widen (after `profiles_role_check`,
  -- `role_capabilities_role_check` and `UserRole`), and — worse — the day a role
  -- is retired, the constraint would make the history of that role
  -- unrepresentable, which is the one thing a register may not become.
  --
  -- NULL means *this act did not touch that axis*. A promotion writes both role
  -- columns and leaves the status pair null when the status did not move; a
  -- `created` act has no before-values at all.
  role_before   text,
  role_after    text,
  status_before text,
  status_after  text,

  -- WHEN. The SERVER clock, always: `src/app/api/membership/verify/route.ts:343-345`
  -- — *"a device clock is evidence, never authority"*. There is no second clock
  -- here as there is on `door_scan_events` (`scanned_at` / `recorded_at`),
  -- because no act in this register originates on a phone that was offline; if
  -- one ever does, it brings its own column and its own paragraph.
  at timestamptz NOT NULL DEFAULT now(),

  -- WHICH NIGHT — nullable, unused by anything today, and present ON PURPOSE.
  --
  -- Phase 35's per-night assignment writes to this same register
  -- (`ACCESS-MODEL-DECISIONS.md` §5), and adding the column then would be an
  -- `ALTER TABLE` on a populated table (`supabase-data.md`, gate *default sulle
  -- righe esistenti*). The precedent is explicit and is quoted rather than
  -- paraphrased, from `20260807000000_capability_model.sql:206-208`:
  --
  --   "`p_party_id` is accepted and unused today, deliberately. Adding the
  --    parameter later would mean rewriting every policy body that calls this
  --    function; adding it now costs one ignored argument."
  --
  -- Here it costs one nullable column.
  party_id uuid REFERENCES public.event_parties ON DELETE SET NULL,

  -- Optional context, in the actor's own words.
  --
  -- **NEVER A PERSON'S NAME, AN ADDRESS OR A CONTACT.** Same reason as
  -- `subject_label`: this row can reach an artefact and this repository is
  -- public. A note that needs to name somebody is naming them by membership
  -- code, or it is not being written.
  note text
);

-- Two indexes, each named for the way the table is actually read. `at desc`
-- because both reads are "most recent first", and an index whose order does not
-- match the query's is an index the planner steps around.

-- One person's history, which is the read D-11 exists for: a season of acts on
-- one account, in order, so a promotion followed by a demotion still shows both.
CREATE INDEX IF NOT EXISTS idx_membership_acts_subject
  ON public.membership_acts (subject_id, at DESC);

-- One actor's history — and this one is not symmetry. `community-membership.md`,
-- gate *chi decide è tracciato*: **the simplest path to let somebody in is also
-- the one that must be made visible.** Without this index that read exists in
-- principle and is never performed.
CREATE INDEX IF NOT EXISTS idx_membership_acts_actor
  ON public.membership_acts (actor_id, at DESC);

-- ── D-18 · A DOOR OVERRIDE DOES NOT ENTER THIS REGISTER ─────────────────────
--
-- Recorded here because answering it now costs a sentence and answering it in
-- Phase 35 costs a migration or a second register (`43-RESEARCH.md` § D.4).
--
-- An override at the door stays in `public.door_scan_events`, which already
-- holds its outcome, its operator, its device and `is_undo` — a reversal being a
-- further event and not an erasure (`20260805120000:118-119`). It does not
-- belong here for a reason of MEANING and not of tidiness: an override does not
-- change who somebody IS. It admits one person, on one night, and expires with
-- that night; this register records changes to an account's role and status,
-- which persist. Two registers holding overlapping truths is worse than either
-- of them, because the first question of every later reader becomes *which one
-- is right*.

-- =============================================================================
-- 3. RLS — and the omission that is not an omission
-- =============================================================================
--
-- Without this, anyone holding the anonymous key reads the whole register
-- through PostgREST, rejections included. The middleware decides where somebody
-- may GO; this decides what they may READ, and only this is the security
-- boundary (`CLAUDE.md`, operating principle 2).

ALTER TABLE public.membership_acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membership_acts_select_register_read ON public.membership_acts;

-- The `(select …)` wrapper is LOAD-BEARING and it is not `STABLE` that produces
-- it: it makes Postgres evaluate the call once per statement as an InitPlan
-- instead of once per row, proved by `EXPLAIN` on this database and written up at
-- `20260807000000_capability_model.sql:177-184`. Phase 32 moved 45 of 67
-- policies to this form; a new policy written in the older
-- `public.is_admin_or_organizer()` shape would be both a wrong predicate and a
-- per-row call.
CREATE POLICY membership_acts_select_register_read ON public.membership_acts
  FOR SELECT USING ((SELECT private.has_capability('register.read')));

-- No INSERT, UPDATE or DELETE policy, and the omission is DELIBERATE. Writes
-- come only through `public.record_membership_act` below, which runs as its
-- definer and is executable by `service_role` alone; so with RLS enabled and no
-- write policy, no session — authenticated, anonymous, or a master's — can add,
-- edit or remove a row. That is what "append-only by construction" means here:
-- it is not a convention the writers observe, it is the absence of any granted
-- path to a write.
--
-- Only one other table in this repository omits its write policies on purpose
-- (`20260805120000_door_scan_events.sql:158-163`), so without this paragraph the
-- next reader would take the gap for a bug and repair it — and the repair would
-- be one `CREATE POLICY` away from making the register editable by the very
-- roles whose acts it records.

-- =============================================================================
-- 4. public.record_membership_act — the mutation and its record, one transaction
-- =============================================================================
--
-- WHY THIS FUNCTION EXISTS AT ALL. The five existing acts do a single
-- `.update()` on `public.profiles` through PostgREST. Two PostgREST calls cannot
-- be atomic, so a mutation that succeeded while its register row failed would
-- produce exactly the untraced act D-11 forbids — and it would do so silently,
-- because nothing reads the second call's error today. Putting both writes in
-- one function body puts them in one transaction: either both land or neither
-- does.
--
-- THE ALTERNATIVE, NAMED SO IT IS NOT ATTEMPTED. An `AFTER UPDATE` trigger on
-- `public.profiles` reading `auth.uid()` looks strictly better — it cannot be
-- forgotten by a caller. It does not work here: every one of the mutation paths
-- uses the SERVICE client, under which `auth.uid()` is **null** (measured,
-- `32-06-SUMMARY.md` § F1, quoted at `src/lib/capabilities/server.ts:26-29`). A
-- NOT NULL actor would then reject the register write AND the mutation with it,
-- on every act, which is a phase-stopping defect discovered in production. The
-- actor is therefore an ARGUMENT, resolved server-side from
-- `getAccessContext()`.
--
-- AND THAT ARGUMENT IS NOT THE ORACLE SHAPE THIS PROJECT REFUSES.
-- `20260807000000_capability_model.sql:231-237` refuses a
-- `has_capability(user_id, capability)` reachable over REST, because it answers
-- a question ABOUT an arbitrary identifier and this repository has no rate
-- limiting anywhere. `p_actor_id` here is *who is acting*, not *who to answer
-- about*, and the function is unreachable from any session but the service
-- role's — see the REVOKE below, which is the part that makes that true.
--
-- `SET search_path = ''` with every reference schema-qualified, per
-- `20260807000000_capability_model.sql:166-171`: a SECURITY DEFINER function
-- with a mutable search_path lets the CALLER choose which `profiles` the definer
-- reads. The analog this function is otherwise shaped after —
-- `20260508000000_drink_token_active_state.sql:90-124` — omits it, and that
-- omission is the one thing not copied from it.

CREATE OR REPLACE FUNCTION public.record_membership_act(
  p_subject_id  uuid,
  p_act         text,
  p_actor_id    uuid,
  p_actor_kind  text,
  p_role        text default null,
  p_status      text default null,
  p_note        text default null,
  p_party_id    uuid default null
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subject record;
  v_act_id  uuid;
BEGIN
  -- Lock and read the subject as it is NOW. `for update` and not a plain select:
  -- the before-values written into the register must be the ones this statement
  -- is about to overwrite, and without the lock a concurrent act could land
  -- between the read and the update, producing a register row that describes a
  -- transition that never happened.
  SELECT p.role, p.status, p.membership_code
    INTO v_subject
    FROM public.profiles p
   WHERE p.id = p_subject_id
     FOR UPDATE;

  IF NOT FOUND THEN
    -- The message names the SUBJECT IDENTIFIER and nothing else. Never the
    -- address, never the full name: a raised message reaches a log, and on this
    -- project a log reaches a screenshot. Same rule as `subject_label`.
    RAISE EXCEPTION 'membership_acts.subject_not_found: %', p_subject_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- The profile write, when the act moves an axis. `coalesce` so that a null
  -- argument means *leave this axis alone* rather than *set it to null* — which
  -- on two NOT NULL columns would raise, and would raise for the wrong reason.
  --
  -- THIS IS THE WRITE PLAN 43-06'S CONSTRAINT JUDGES. A `23514` from
  -- `profiles_role_implies_approved` raised here aborts the WHOLE call, register
  -- insert included, and that is the point rather than a hazard: the act and its
  -- record fail together, so the register never claims something the database
  -- refused. The caller branches on `error.code = '23514'` and never on a parsed
  -- message — Next redacts a Server Action's message in a production build — and
  -- never logs `error.details`, which on this table carries the ENTIRE failing
  -- row, membership code and address included (`43-MEASUREMENTS.md` measurement 5).
  IF p_role IS NOT NULL OR p_status IS NOT NULL THEN
    UPDATE public.profiles
       SET role   = coalesce(p_role, role),
           status = coalesce(p_status, status)
     WHERE id = p_subject_id;
  END IF;

  -- The register row: the before-values just read, the after-values just
  -- written, the author, the author's kind, and the subject's membership code as
  -- the label that survives the subject.
  --
  -- The after-values are `coalesce(argument, before)` rather than a re-read: a
  -- second SELECT would be a second truth, and the two would disagree the first
  -- time somebody added a trigger to `public.profiles`.
  INSERT INTO public.membership_acts (
    act, subject_id, subject_label,
    actor_id, actor_kind,
    role_before, role_after, status_before, status_after,
    party_id, note
  ) VALUES (
    p_act, p_subject_id, v_subject.membership_code,
    p_actor_id, p_actor_kind,
    v_subject.role, coalesce(p_role, v_subject.role),
    v_subject.status, coalesce(p_status, v_subject.status),
    p_party_id, p_note
  )
  RETURNING id INTO v_act_id;

  RETURN v_act_id;
END;
$$;

-- ── THE LOCK-DOWN, AND IT IS NOT OPTIONAL ───────────────────────────────────
--
-- This function is `SECURITY DEFINER` and it writes `public.profiles.role`. **A
-- SECURITY DEFINER role-writer reachable by an authenticated session is a
-- privilege-escalation primitive**, and PostgREST exposes functions in `public`
-- by default — the exposed-schema list on this project is `public,
-- graphql_public` (verified 2026-08-06), so without the two statements below
-- this function is live at `/rest/v1/rpc/record_membership_act` and any signed-in
-- member can promote themselves to `master` in one request.
--
-- REVOKE first and GRANT second, in that order and as two statements rather than
-- assumed: Postgres grants EXECUTE to PUBLIC by default on every new function,
-- so the GRANT alone would leave the default in place. Same shape as
-- `20260807000000_capability_model.sql:293-297`.

REVOKE ALL ON FUNCTION public.record_membership_act(uuid, text, uuid, text, text, text, text, uuid)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_membership_act(uuid, text, uuid, text, text, text, text, uuid)
  TO service_role;

COMMENT ON FUNCTION public.record_membership_act(uuid, text, uuid, text, text, text, text, uuid) IS
  'D-11 / ACCT-04: performs the profiles write and its register row in ONE transaction, so a mutation cannot succeed while its record fails. '
  'The actor is an argument because every mutation path uses the service client, under which auth.uid() is null — a trigger would record nobody. '
  'SECURITY DEFINER and it writes role: execute is revoked from public, anon and authenticated, and granted to service_role alone.';

COMMIT;
