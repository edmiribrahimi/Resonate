-- THE RULE IS VERSIONED HERE. THE VALUE IS NOT, AND NEVER WILL BE.
--
-- No address appears anywhere in this file, and that is a decision rather than
-- an oversight. `github.com/edmiribrahimi/Resonate` is a PUBLIC repository
-- (`CLAUDE.md` Guardrail 5): a commit is a publication, and a publication is
-- IRREVERSIBLE — a pushed file survives in forks, in mirror caches and in the
-- history long after it is removed. So the obvious shape for this repair — a
-- one-shot migration that names the account and fixes the rows — is refused.
-- What ships is the RULE, as a function taking the address as an argument; the
-- VALUE is supplied at call time, by the login path reading `MASTER_EMAIL` out
-- of the deployment environment.
--
-- The rule is dated and in the migration history. The address is in neither.
--
-- =============================================================================
-- Phase 43, Plan 12: ROLE-04 (D-12), with D-16 and D-22 written beside the lines
-- that implement them
-- =============================================================================
--
-- WHAT THIS REPLACES. `src/app/api/auth/callback/route.ts` promoted on every
-- login and never demoted. Every past master kept `master` forever, and nothing
-- anywhere declared that this was so — an UNDECLARED one-way switch, which is
-- the class of error this project treats as most dangerous.
--
-- ── THE MONOTONE-GUARD RULE, AND THE AUTHORISATION TO WORK AGAINST IT ────────
--
-- `.claude/rules/meta-gates.md`, section *Verifica delle guardie monotone*,
-- quoted in full because paraphrasing an authorisation is how an authorisation
-- stops meaning anything:
--
--   "re:sonate ha tre interruttori a senso unico. Per ognuno, una modifica puo'
--    solo renderli piu' difficili da far scattare, mai piu' facili — salvo
--    autorizzazione esplicita documentata nel commit."
--
-- The three named switches are `venue_reveal_sent`, a payment reaching
-- `completed`, and a format's series numbering. The promotion to `master` is a
-- FOURTH one-way switch that was never declared as such, and this file makes it
-- two-way.
--
-- **D-12 IS THAT EXPLICIT AUTHORISATION**, and the commit that carries this file
-- cites it. This is the single place in phase 43 where the monotone-guard rule
-- is deliberately worked against, and it is written down here so that a reader
-- who finds a demotion path does not have to guess whether somebody decided it.
--
-- ── D-16: WHERE THE REPAIR STOPS, SO IT DOES NOT BECOME A LOCKOUT ────────────
--
-- The thing being repaired IS the recovery path — the way back in when access is
-- lost. A reconciliation that can empty itself is not a recovery path, it is the
-- outage it was meant to prevent. So demotion is CONDITIONAL, three times over:
--
--   * an unset or malformed value demotes NOBODY. An absent environment
--     variable is a deployment accident — a Vercel value dropped in a redeploy —
--     not an instruction to remove every administrator;
--   * a value naming an account that does not exist demotes NOBODY. Demoting
--     before the new master exists is exactly the lockout D-12 exists to repair;
--   * and after every demotion, the count of accounts holding `master` must be
--     at least one, checked BEFORE the call commits.
--
-- ── D-22: THE ACTOR IS THE SYSTEM, AND SAYS SO ───────────────────────────────
--
-- This function runs from the login callback with no human behind it. Every act
-- it performs is written to `public.membership_acts` through
-- `public.record_membership_act` with `actor_kind = 'system'` and a null actor —
-- the combination 43-07's CHECK exists to permit, and the ONLY one it permits
-- without an actor. A register that attributed a machine reconciliation to a
-- person would be worse than a register that recorded nothing: it would read as
-- a human decision in every later review.
--
-- ── IDEMPOTENT BY CONSTRUCTION, NOT BY LUCK ──────────────────────────────────
--
-- The promotion this replaces was idempotent by LUCK: it re-wrote the same two
-- values on every login and nobody noticed because nothing read the result.
-- Luck is not a property. This function writes only where a predicate says
-- something is actually wrong:
--
--   * the promotion happens only if the named account's `role` is not already
--     `master` (or its `status` is not already `approved`);
--   * the demotion loop runs over `role = 'master' AND id <> <the named one>`,
--     which in the steady state is the EMPTY SET.
--
-- So a second call with the same argument finds nothing to change and writes NO
-- register row. That matters more here than in a one-shot: this runs on EVERY
-- login, and a register that gained two rows a day forever would become
-- unreadable — which is the same failure as it being empty.
--
-- Object idempotence, separately: `CREATE OR REPLACE FUNCTION` is the idempotent
-- form for an object that cannot take `IF NOT EXISTS`, and the REVOKE/GRANT pair
-- below is safe to re-run.
--
-- ── ONE TRANSACTION ──────────────────────────────────────────────────────────
--
-- One object, so an explicit transaction block buys less here than it did in
-- 43-07. It is written anyway because the GRANT is not separable from the
-- function: a committed `SECURITY DEFINER` writer of `public.profiles.role`
-- whose REVOKE did not land is a privilege-escalation primitive, not a partial
-- feature.

BEGIN;

-- =============================================================================
-- public.reconcile_master(text) — the guarded, idempotent reconciliation
-- =============================================================================
--
-- `SECURITY DEFINER` with `SET search_path = ''` and every reference
-- schema-qualified, per `20260807000000_capability_model.sql:166-171`: a definer
-- function with a mutable search_path lets the CALLER choose which `profiles`
-- the definer reads, and this one writes `role`.
--
-- ── THE RETURN IS A STRUCTURED OUTCOME, NOT A BOOLEAN ────────────────────────
--
-- Every branch returns a `jsonb` object the caller can act on, because the
-- caller has to tell four different silences apart:
--
--   {"outcome": "unset",           "promoted": false, "demoted": 0}
--   {"outcome": "malformed",       "promoted": false, "demoted": 0}
--   {"outcome": "ambiguous",       "promoted": false, "demoted": 0}
--   {"outcome": "no_such_account", "promoted": false, "demoted": 0}
--   {"outcome": "unchanged",       "promoted": false, "demoted": 0, "masters": n}
--   {"outcome": "reconciled",      "promoted": bool,  "demoted": k, "masters": n}
--
-- and one abort, `RS001`, described at the guard itself.
--
-- A bare boolean would collapse the first four into "it did nothing", which is
-- the newsletter anti-pattern this project has already recorded once
-- (`.planning/codebase/CONCERNS.md`): one message for a network fault, a missing
-- key and an address already subscribed. There is no error tracking in this
-- product, so the caller's ability to distinguish causes is the ONLY thing
-- standing between a broken configuration and nobody ever knowing.
--
-- **THE OUTCOME NEVER ECHOES THE ARGUMENT.** No branch returns `p_email`, and no
-- raised message contains it. The outcome names a CATEGORY. Same rule as
-- `membership_acts.subject_label` (a membership code, never an address): this
-- value can reach a log, and on this project a log reaches a screenshot.

CREATE OR REPLACE FUNCTION public.reconcile_master(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email     text;
  v_matches   int;
  v_target    record;
  v_act       text;
  v_promoted  boolean := false;
  v_others    uuid[];
  v_other     uuid;
  v_demoted   int := 0;
  v_masters   int;
BEGIN
  -- ───────────────────────────────────────────────────────────────────────────
  -- 1. Unset or malformed — do NOTHING, and say which
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- `coalesce` before `trim` so that null and '   ' and '' reach the same
  -- branch: they are the same deployment accident wearing three faces.
  v_email := lower(trim(coalesce(p_email, '')));

  IF v_email = '' THEN
    RETURN jsonb_build_object('outcome', 'unset', 'promoted', false, 'demoted', 0);
  END IF;

  -- Not an address validator, and deliberately not one. The question here is
  -- only *does this look like it was meant to be an address at all* — a
  -- trailing-newline or a half-pasted value. `MEMORY.md` records the precedent
  -- on a sibling variable: `NEXT_PUBLIC_APP_URL` once carried a trailing newline
  -- on Vercel and broke the SumUp webhook. The trim above absorbs that one; this
  -- check catches the value that is not an address at all.
  IF position('@' IN v_email) = 0 THEN
    RETURN jsonb_build_object('outcome', 'malformed', 'promoted', false, 'demoted', 0);
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 2. Resolve the named account — `lower(trim(...))` on BOTH sides
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- The house style: `handle_new_user`'s guest-list branch already compares with
  -- `LOWER()` on both sides (`20260310000000_guest_list.sql:116`). The promotion
  -- this replaces compared with `===` in JavaScript, exact and case-sensitive
  -- and untrimmed, which is the fourth of the five defects `43-RESEARCH.md`
  -- § E.1 lists.
  --
  -- `public.profiles.email` and not `auth.users.email`: this function reads and
  -- writes `role` and `status`, which live on `profiles`, and the two are kept
  -- in step by the `on_auth_user_updated` trigger
  -- (`20260225140000_sync_email_change.sql`). Resolving on one table and writing
  -- another would introduce a second truth for no benefit.
  --
  -- ── WHY THE COUNT COMES FIRST, AND IT IS NOT DEFENSIVE PROGRAMMING ─────────
  --
  -- `public.profiles.email` carries **no UNIQUE constraint** (`schema.sql:56`).
  -- Supabase Auth normally makes duplicates impossible upstream, but "normally"
  -- is not a constraint, and the failure mode of guessing here is specific and
  -- bad: with two matching rows, a `LIMIT 1` would pick one arbitrarily, promote
  -- it, and DEMOTE THE OTHER — which could be the incumbent master. An ambiguous
  -- configuration must refuse to act, not pick.
  SELECT count(*) INTO v_matches
    FROM public.profiles p
   WHERE lower(trim(p.email)) = v_email;

  IF v_matches = 0 THEN
    -- The incumbent KEEPS `master`. This is the branch D-16 exists for and the
    -- one `43-VALIDATION.md` calls the highest-consequence check in the phase:
    -- demoting before the new master exists is the lockout, not the repair.
    RETURN jsonb_build_object('outcome', 'no_such_account', 'promoted', false, 'demoted', 0);
  END IF;

  IF v_matches > 1 THEN
    RETURN jsonb_build_object('outcome', 'ambiguous', 'promoted', false, 'demoted', 0);
  END IF;

  SELECT p.id, p.role, p.status
    INTO v_target
    FROM public.profiles p
   WHERE lower(trim(p.email)) = v_email;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 3. Promote the named account, if and only if it is not already there
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- Two axes, two acts, and they are NOT the same word. `access-gating.md`, gate
  -- *due assi*: role and status are independent, and calling a status repair a
  -- "promotion" would put a false label in a register whose whole purpose is to
  -- be read a season later.
  IF v_target.role IS DISTINCT FROM 'master' THEN
    v_act := 'promoted';
  ELSIF v_target.status IS DISTINCT FROM 'approved' THEN
    v_act := 'approved';
  ELSE
    v_act := NULL;   -- the steady state, and the common case on every login
  END IF;

  IF v_act IS NOT NULL THEN
    -- ROLE AND STATUS TOGETHER, IN ONE STATEMENT. `record_membership_act`
    -- performs a single `UPDATE ... SET role = coalesce(...), status =
    -- coalesce(...)`, so both land in one statement and the
    -- `profiles_role_implies_approved` CHECK of 43-06 never sees an intermediate
    -- row where `role` is a staff role and `status` is not `approved`. Splitting
    -- these into two writes would raise `23514` on the first one.
    --
    -- Through the register's writer, never around it: the profile write and its
    -- register row are one transaction, which is the property 43-07 exists to
    -- provide.
    PERFORM public.record_membership_act(
      p_subject_id => v_target.id,
      p_act        => v_act,
      p_actor_id   => NULL,
      p_actor_kind => 'system',
      p_role       => 'master',
      p_status     => 'approved',
      p_note       => 'reconciliation from the deployment environment (D-12)',
      p_party_id   => NULL
    );
    v_promoted := true;
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 4. Demote every OTHER account holding `master`
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- Reached only once the named account holds `master` — either it already did,
  -- or step 3 just put it there. That ORDER is the primary defence against the
  -- zero-master state, and step 5 is the assertion that the order held.
  --
  -- Collected into an array rather than iterated over a `FOR UPDATE` cursor: the
  -- loop body updates the very rows the cursor would be holding, and one
  -- snapshot taken before the loop is both simpler and honest about what the set
  -- was when the decision was made.
  SELECT array_agg(p.id)
    INTO v_others
    FROM public.profiles p
   WHERE p.role = 'master'
     AND p.id <> v_target.id;

  FOREACH v_other IN ARRAY coalesce(v_others, '{}'::uuid[]) LOOP
    -- **`role` ONLY. NEVER `status`.** `member` and `approved` are different
    -- axes (`access-gating.md`, gate *due assi*), and the repository already
    -- says so at the point where a person does this by hand:
    --
    --   "Demotion does NOT revoke approval: `member` and `approved` are
    --    different axes, and someone who was approved stays approved when they
    --    stop being staff."
    --   — `src/app/(admin)/admin/members/actions.ts:133-135`
    --
    -- A null `p_status` means *leave this axis alone*; the function coalesces.
    --
    -- And `member`, not `staff`. Demoting to `staff` would acquire an obligation
    -- under 43-06's constraint — a staff role REQUIRES `status = 'approved'` in
    -- the same write — for no benefit, on the guess that a past master is
    -- "presumably still staff". `deactivateMember` and `rejectMember` both
    -- demote to `member`; so does this.
    PERFORM public.record_membership_act(
      p_subject_id => v_other,
      p_act        => 'demoted',
      p_actor_id   => NULL,
      p_actor_kind => 'system',
      p_role       => 'member',
      p_status     => NULL,
      p_note       => 'reconciliation from the deployment environment (D-12)',
      p_party_id   => NULL
    );
    v_demoted := v_demoted + 1;
  END LOOP;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 5. The zero-master guard — checked BEFORE this call commits, not after
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- A `RAISE` inside a function aborts the whole call, and with it every write
  -- above: the promotion, every demotion and every register row. There is no
  -- state in which some demotions landed and the guard then complained.
  --
  -- ── ITS REACHABILITY, STATED HONESTLY RATHER THAN IMPLIED ─────────────────
  --
  -- As written, this guard CANNOT FIRE. Step 3 leaves the named account holding
  -- `master`; step 4 excludes that account by id; so the count is at least one
  -- by construction, and the ordering — not this check — is what makes the
  -- lockout impossible.
  --
  -- It is here anyway, and not as decoration. It is a tripwire on a FUTURE EDIT:
  -- reorder steps 3 and 4, or widen the loop's predicate to "every master not
  -- matching the argument", and the count becomes reachable — at which point
  -- this raises instead of committing a product with no administrator. A
  -- recovery path that can empty itself is not a recovery path, and the edit
  -- that would empty it is a two-line one.
  --
  -- `RS001` is a custom SQLSTATE rather than a bare `raise_exception` (`P0001`),
  -- so the caller can distinguish this refusal from any other raise WITHOUT
  -- parsing a message. Branching on a message is forbidden across this phase:
  -- Next redacts a Server Action's message in a production build, and a message
  -- is not an interface.
  SELECT count(*) INTO v_masters
    FROM public.profiles p
   WHERE p.role = 'master';

  IF v_masters < 1 THEN
    RAISE EXCEPTION 'reconcile_master.zero_masters: the reconciliation would leave this product with no master'
      USING ERRCODE = 'RS001';
  END IF;

  RETURN jsonb_build_object(
    'outcome',  CASE WHEN v_promoted OR v_demoted > 0 THEN 'reconciled' ELSE 'unchanged' END,
    'promoted', v_promoted,
    'demoted',  v_demoted,
    'masters',  v_masters
  );
END;
$$;

-- ── THE LOCK-DOWN, AND IT IS NOT OPTIONAL ───────────────────────────────────
--
-- The same paragraph as `record_membership_act`'s, for the same reason and with
-- one addition. This function is `SECURITY DEFINER`, it writes
-- `public.profiles.role`, and PostgREST exposes functions in `public` by default
-- — the exposed-schema list on this project is `public, graphql_public`. Without
-- the REVOKE it is live at `/rest/v1/rpc/reconcile_master`.
--
-- The addition: its single argument is an ADDRESS, so an exposed version would
-- be worse than a self-promotion primitive. Any signed-in member could pass
-- their own address and become `master` while DEMOTING the incumbent in the same
-- call — a takeover, not an escalation.
--
-- REVOKE first and GRANT second, as two statements rather than assumed: Postgres
-- grants EXECUTE to PUBLIC by default on every new function, so the GRANT alone
-- would leave the default in place.

REVOKE ALL ON FUNCTION public.reconcile_master(text)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reconcile_master(text)
  TO service_role;

COMMENT ON FUNCTION public.reconcile_master(text) IS
  'ROLE-04 / D-12: reconciles who holds master against the address supplied by the deployment environment. '
  'Promotes the named account (role and status in ONE statement, per 43-06), demotes every other master to member without touching status, '
  'and writes each act to public.membership_acts with actor_kind = system (D-22). '
  'D-16: an unset, malformed, ambiguous or unmatched argument demotes nobody, and the call never leaves zero masters. '
  'The rule is versioned here; the address is an argument, because this repository is public. '
  'SECURITY DEFINER and it writes role: execute is revoked from public, anon and authenticated, and granted to service_role alone.';

COMMIT;
