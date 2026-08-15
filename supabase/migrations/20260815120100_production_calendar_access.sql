-- The production calendar's access: one key, two grants, six read policies, and
-- two guards — the file whose deliverable is a REFUSAL
-- Phase 44, Plan 04: PROD-01
--
-- Changes:
-- 1. The fourteenth capability row, `production.read`, and its two grants
-- 2. Row level security on the six `production_*` tables, with ONE read policy
--    each and no arm of any other kind
-- 3. The paragraph declaring that the absent write policies are a decision
-- 4. `public.refuse_production_plan_renumber()` — a progressivo already written
--    on a plan row cannot be changed by any caller, including one that forgot
-- 5. `public.record_checklist_tick()` — a tick is an act with an author, and it
--    is reversible
-- 6. The execute grant, on one function and deliberately not on the other
--
-- WHY ONE TRANSACTION. A half-applied version of this file is worse than none of
-- it. The capability row without its grants resolves FALSE for everyone
-- (including the master), so six tables that have carried RLS-without-policies
-- since `20260815120000_production_calendar.sql` would stay unreadable and the
-- surface built on them would look broken rather than refused. The grants
-- without the policies would be a permission nothing consults. So
-- `BEGIN; ... COMMIT;` is not decoration.
--
-- IDEMPOTENCE, DECLARED. This queue is applied one row at a time, by hand, and
-- re-applying a file out of doubt is the natural reaction to a doubt. So:
--   * `ON CONFLICT (key) DO NOTHING` on the capability row and
--     `ON CONFLICT (role, capability) DO NOTHING` on both grants;
--   * enabling row level security is idempotent in Postgres, and on all six
--     tables the statement is ALREADY A NO-OP: the structural migration ran it
--     with zero policies, deliberately, so that the tables were closed from the
--     moment they existed rather than from the moment this file lands. It is
--     repeated here so that reading this file alone tells the truth about the
--     posture of the tables it writes policies for;
--   * `DROP POLICY IF EXISTS` before each of the six policies;
--   * `CREATE OR REPLACE FUNCTION` for both functions — the idempotent form, as
--     functions take no `IF NOT EXISTS`;
--   * `DROP TRIGGER IF EXISTS` before the one trigger.
--
-- ⚠ THIS FILE IS A PUBLICATION. `supabase/migrations/` is tracked and
-- `github.com/edmiribrahimi/Resonate` is public, so a publication here is
-- irreversible: a file pushed to a public repository survives in forks, in
-- mirror caches and in the history after any removal. Nothing below carries a
-- date, a venue word, a series name, a progressivo or a line-up. The only
-- production vocabulary present is the NAME OF A COLUMN, which is structure.
-- `docs/Music-*.ics` was not opened to write this file.
--
-- ⚠ AND IT IS NOT APPLIED BY THIS PLAN. Plan 44-07 applies it, together with
-- `20260815120000_production_calendar.sql`, with its own authorisation and its
-- own recorded read-back. The policies below exist as TEXT until then, and a
-- green `npm run build` says nothing whatever about them.

BEGIN;

-- =============================================================================
-- 1. `production.read` — the fourteenth key, and its two grants
-- =============================================================================
--
-- THE DESCRIPTION BELOW IS BYTE-IDENTICAL to `CAP_DESCRIPTIONS["production.read"]`
-- in `src/lib/capabilities/keys.ts`, and the two were written in one commit.
-- That is the rule `keys.ts:29-36` states for every key and the reason it gives
-- is the one that applies here: a capability key has NO SQL mirror the compiler
-- can hold. `npm run build` proves neither the row nor the policy string. The
-- only thing that compares them is `scripts/verify-capabilities.mjs`, which
-- needs a live database and is therefore RED between the commit adding the key
-- and the deploy applying this file.
--
-- WHY A NEW KEY AND NOT ONE OF THE FOUR OBVIOUS REUSES. The argument is written
-- out in full at `keys.ts`, one bullet per rejected candidate, each naming the
-- DIRECTION of the mistake. The shortest form of it: `organizer.access` is a
-- routing question about the account and would leave Phase 45 nothing to take
-- away (PROD-02); `catalogue.manage` is the wrong question; `admin.access` is
-- master-only where D-44-17 wants the organizer too; and `staff.manage` carries
-- `requires_approved = false` for the DOOR's reason, which does not travel to a
-- surface nobody is queueing in front of.

INSERT INTO private.capabilities (key, description) VALUES
  (
    'production.read',
    'Read the production calendar: the six production tables, whose rows are unannounced dates, spaces under negotiation and the shape of an internal plan. requires_approved is FALSE on both grants (D-44-27, the owner) because organizer accounts are created inside the app by an admin or an organizer and nobody signs up any more, so pending is about to stop varying and gating on a value that no longer varies is debt rather than safety. That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit. It is NOT staff.manage ignoring status for the door reason — nobody is standing in a queue in front of a calendar.'
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- The master already holds every surface this calendar will be read from. The
  -- row exists so the key is not silently master-by-absence: a capability nobody
  -- is granted resolves false for everyone, including the master, because the
  -- resolver at `20260807000000_capability_model.sql:209-216` is an `EXISTS`
  -- over `private.role_capabilities` and knows no special case for a role.
  --
  -- ⚠ `requires_approved = false`, AND IT IS THE OWNER'S CALL, NOT THE
  -- PLANNER'S. D-44-27: organizer accounts are created inside the app by an
  -- admin or an organizer, nobody signs up any more, so `pending` is about to
  -- stop varying — and a gate on a value that no longer varies is debt, not
  -- safety. `44-RESEARCH.md` recommended `true` and was right about the model as
  -- it stands; the owner is answering about the model as it is becoming, and
  -- that is the owner's question.
  --
  -- ⚠ AND IT IS A BET, written down here rather than left to be discovered: it
  -- holds only while NO signup path can create a pending organizer. The day one
  -- is reopened, a pending organizer reads every unannounced date and every
  -- space under negotiation, and this pair is reconsidered in the same commit
  -- that reopens it.
  --
  -- ⚠ It must NOT be defended by pointing at `door.operate` or `staff.manage`.
  -- Those two carry `false` to keep a person from being refused IN FRONT OF A
  -- QUEUE, and nobody is standing in a queue in front of a production calendar.
  -- Two rows agreeing on a value for different reasons must not be made to move
  -- together.
  ('master',    'production.read', false),

  -- D-44-17: the organizer as well as the master. This is the row the key exists
  -- for — on `admin.access` there would be no organizer arm at all, and on
  -- `organizer.access` there would be nothing left for Phase 45 to take away.
  ('organizer', 'production.read', false)
ON CONFLICT (role, capability) DO NOTHING;

-- ⚠ TWO ROLES ARE REFUSED, AND THE REFUSAL IS AN ABSENCE OF A ROW.
--
--   `staff`  — refused. A member of staff rostered to a night enters to LET
--              PEOPLE IN. Unannounced dates and open negotiations are not a
--              night's work, and unlike a per-night assignment they would not
--              expire with the night. This key is also NOT one of the four a
--              per-night assignment may carry
--              (`20260809000000_party_assignments.sql:340-342`), so the refusal
--              is not routed around by an assignment either.
--   `member` — refused. Nothing grants it.
--   `anon`   — refused by construction: `private.has_capability` answers false
--              for a null `auth.uid()`
--              (`20260807000000_capability_model.sql:55-57`).
--
-- WHERE THOSE REFUSALS ARE ASSERTED rather than merely written here:
-- `scripts/verify-capabilities.mjs`, side 5. Its `ROLE_GRANTS` declares every
-- (role × capability) pair — 56 after this file, 30 grants and 26 refusals — and
-- exits 1 naming the pair both when a declared refusal acquires a row and when a
-- declared grant loses one. A comment can be ignored; that check cannot. The
-- `staff` pair added there by plan 44-04 is the ONLY place in this repository
-- where *a door-assigned staff session stays out of the calendar* is machine-
-- asserted rather than described.

-- =============================================================================
-- 2. The six tables, one read arm each
-- =============================================================================
--
-- ⚠ NO PUBLIC READ ARM ON ANY OF THE SIX, and the asymmetry with the analog is
-- the point rather than an omission. `public.formats` carries TWO arms — a
-- `listed = true` arm for anybody and a capability arm for whoever curates the
-- catalogue — because a format chip is already public: it says *this format
-- exists*, never *a night is coming*. Nothing here is a catalogue. Every row of
-- these six is an unannounced date, a space under negotiation, or the shape of
-- an internal plan. There is no subset of them that is safe to publish, so there
-- is no predicate to write a second arm with. The next reader who notices the
-- analog has two arms and this has one has now met the reason.
--
-- THE `(SELECT ...)` WRAPPER IS LOAD-BEARING, and it is not `STABLE` that
-- produces the effect: it makes Postgres evaluate the call once per statement as
-- an InitPlan instead of once per row
-- (`20260807000000_capability_model.sql:177-184`). The comment at
-- `20260224_rbac_migration.sql:97-98` credits `STABLE` with that, `EXPLAIN`
-- proved otherwise, and 26 policies were written unwrapped on the strength of
-- it. Six more are not.
--
-- ⚠ AND A POLICY IS THE BOUNDARY, WHICH THE MIDDLEWARE IS NOT. The entry in
-- `src/lib/routes/capability-routes.ts` decides where a REDIRECT happens; it
-- stops somebody arriving on a page and stops nobody reading a row
-- (`CLAUDE.md`, operating principle 2). These six policies are the boundary on
-- the data, and they are the boundary whether or not any page ever exists.

-- -----------------------------------------------------------------------------
-- 2a. public.production_plan
-- -----------------------------------------------------------------------------
--
-- The table this arm matters most for: its rows carry `venue_word`, which may
-- name a space under negotiation, and `date`, which may be a date nobody has
-- announced.

ALTER TABLE public.production_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_plan_select_production_read ON public.production_plan;

CREATE POLICY production_plan_select_production_read ON public.production_plan
  FOR SELECT USING ((SELECT private.has_capability('production.read')));

-- -----------------------------------------------------------------------------
-- 2b. public.production_piece
-- -----------------------------------------------------------------------------

ALTER TABLE public.production_piece ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_piece_select_production_read ON public.production_piece;

CREATE POLICY production_piece_select_production_read ON public.production_piece
  FOR SELECT USING ((SELECT private.has_capability('production.read')));

-- -----------------------------------------------------------------------------
-- 2c. public.production_commitment
-- -----------------------------------------------------------------------------

ALTER TABLE public.production_commitment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_commitment_select_production_read ON public.production_commitment;

CREATE POLICY production_commitment_select_production_read ON public.production_commitment
  FOR SELECT USING ((SELECT private.has_capability('production.read')));

-- -----------------------------------------------------------------------------
-- 2d. public.production_checklist_item
-- -----------------------------------------------------------------------------
--
-- This one also carries a person's name, in `ticked_by_name`. That name is
-- authorised IN THE DATABASE and stops there: it does not enter a PLAN, a
-- SUMMARY, a VERIFICATION or anything else under `.planning/`, which is tracked
-- and public. Artefacts name ROLES.

ALTER TABLE public.production_checklist_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_checklist_item_select_production_read ON public.production_checklist_item;

CREATE POLICY production_checklist_item_select_production_read ON public.production_checklist_item
  FOR SELECT USING ((SELECT private.has_capability('production.read')));

-- -----------------------------------------------------------------------------
-- 2e. public.production_import_run
-- -----------------------------------------------------------------------------
--
-- Counts, not content — and it is still not public. A run row says how many
-- nights were seen and how many diverged, and a count of nights in a season is
-- itself an unannounced fact.

ALTER TABLE public.production_import_run ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_import_run_select_production_read ON public.production_import_run;

CREATE POLICY production_import_run_select_production_read ON public.production_import_run
  FOR SELECT USING ((SELECT private.has_capability('production.read')));

-- -----------------------------------------------------------------------------
-- 2f. public.production_pipeline_rule
-- -----------------------------------------------------------------------------
--
-- The one table of the six holding no material at all: sixteen rows saying which
-- pieces a format owes and on which weekday. It gets the SAME arm as the other
-- five anyway, and the uniformity is deliberate. A single table readable without
-- the key would be the one somebody joins the others onto — and the reasoning
-- *this table is harmless on its own* is how a read path is opened by degrees.

ALTER TABLE public.production_pipeline_rule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_pipeline_rule_select_production_read ON public.production_pipeline_rule;

CREATE POLICY production_pipeline_rule_select_production_read ON public.production_pipeline_rule
  FOR SELECT USING ((SELECT private.has_capability('production.read')));

-- =============================================================================
-- 3. THE SIX TABLES HAVE READ POLICIES AND NOTHING ELSE — DELIBERATE
-- =============================================================================
--
-- The three other policy commands are absent from this file on purpose, and the
-- absence is stated rather than left to be inferred. (The command words are not
-- spelled out here: `formats/actions.ts:58-63` records the reason — a grep whose
-- only match is the sentence forbidding the thing is a grep that gets ignored
-- the third time it goes red.)
--
-- Writes arrive from the import and from the checklist with the SERVICE client,
-- which bypasses every policy. A write policy here would therefore constrain
-- nothing on the only path that writes, while reading to the next person as
-- though the boundary were covered. With RLS enabled and the six read arms
-- above, no session — anonymous, authenticated, or a master's — can add, edit or
-- remove a row on any of the six through PostgREST.
--
-- Four tables in this repository already omit their write policies on purpose
-- (`20260805120000_door_scan_events.sql:158-163`,
-- `20260808002000_membership_register.sql:337-343`,
-- `20260809000000_party_assignments.sql`, `20260809003000_party_credits.sql`),
-- and `20260810120000_formats_and_series.sql:452-476` is the fifth. Without this
-- paragraph the next reader takes the gap for a bug and repairs it — and the
-- repair is one `CREATE POLICY` away from letting an authenticated session write
-- an unannounced date.
--
-- WHAT THIS DOES NOT CLAIM. **The service client is not a boundary; it is the
-- absence of one.** What decides WHO may write a calendar row is the guard
-- inside the server action, and it is `production.read` that it must ask —
-- plans 44-11 and 44-12 own those two paths. Saying so here is not the same as
-- enforcing it here, and conflating the two is how a feature ends up protected
-- by the middleware alone.

-- =============================================================================
-- 4. public.refuse_production_plan_renumber — the monotone guard
-- =============================================================================
--
-- WHAT IT REFUSES: any change to a `number` that already has one. Setting a
-- number on a row that had none is allowed; changing it is not; ERASING it is
-- not either, because `IS DISTINCT FROM` treats a null as a different value and
-- an erased progressivo is a renumbering with an extra step.
--
-- ⚠ WHAT IT DELIBERATELY IS NOT: it is *a number never changes*, and NOT *a
-- number must exceed the watermark*. The archive is in `production_plan` back to
-- the file's earliest entry (D-44-08), so the table legitimately holds numbers
-- far below `party_series.highest_assigned` — and a watermark comparison would
-- refuse the entire past on the first import. That is the one mention of the
-- watermark in this file, and it is here to say what is NOT being done.
--
-- ⚠ AND IT DOES NOT RE-IMPLEMENT `bump_series_watermark`. That trigger fires on
-- `public.event_parties`, a table this phase never writes. There is no counter
-- here, no `max()+1`, and no second watermark.
--
-- WHY A TRIGGER AND NOT A CHECK IN THE IMPORTER. A plan row's `number` is READ
-- FROM THE FILE and never generated, so a re-import that reads a DIFFERENT
-- number for a known `source_uid` is a divergence to REPORT (D-44-07), not an
-- update to perform. The importer is therefore expected to leave `number` out of
-- its conflict update and record the disagreement in `production_import_run`.
-- This trigger is the backstop for the caller that forgets: a guard in the
-- database survives the caller that forgot it, and a guard in application code
-- does not. It is `meta-gates.md`'s third one-way switch — *a progressivo
-- assigned is already on a poster; append, never renumber* — made structural.
--
-- WHAT THE MESSAGE CARRIES: the plan's `id`, and nothing else. Never
-- `venue_word`, never the title, never the date. A raised message reaches a log,
-- and a log reaches a screenshot, on a repository that is public. This is the
-- one genuine `RAISE` in this file, and it names an identifier.
--
-- The search_path is pinned empty below, with every reference schema-qualified,
-- per `20260807000000_capability_model.sql:166-171`: a SECURITY DEFINER function
-- with a mutable search_path lets the CALLER choose which table the definer
-- reads, and Supabase's advisor raises `function_search_path_mutable` on the
-- four helpers that omit it. `SECURITY DEFINER` itself, like
-- `bump_series_watermark`, because the table carries no write policy.

CREATE OR REPLACE FUNCTION public.refuse_production_plan_renumber()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.number IS NOT NULL AND NEW.number IS DISTINCT FROM OLD.number THEN
    RAISE EXCEPTION 'production_plan.renumber_refused: %', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.refuse_production_plan_renumber() IS
  'Refuses any change to a production_plan.number that is already set — including erasing it, since IS DISTINCT FROM counts a null as a different value. '
  'A progressivo is READ FROM THE FILE and never generated here, so a re-import reading a different number for a known source_uid is a divergence to REPORT (D-44-07), not an update: the importer leaves number out of its conflict update and records the disagreement. '
  'This is the backstop for the caller that forgets, because a guard in the database survives that caller and a guard in application code does not. '
  'It is NOT a watermark comparison: the archive holds numbers far below party_series.highest_assigned (D-44-08) and a watermark test would refuse the entire past. It does not re-implement bump_series_watermark, which fires on event_parties and is untouched by this phase. '
  'The message names the plan id and nothing else — no venue word, no title, no date — because a raised message reaches a log and this repository is public.';

DROP TRIGGER IF EXISTS production_plan_refuse_renumber ON public.production_plan;

CREATE TRIGGER production_plan_refuse_renumber
  BEFORE UPDATE OF number ON public.production_plan
  FOR EACH ROW
  EXECUTE FUNCTION public.refuse_production_plan_renumber();

-- =============================================================================
-- 5. public.record_checklist_tick — the tick, and who performed it
-- =============================================================================
--
-- ── WHY THE ACTOR IS AN ARGUMENT AND NOT `auth.uid()` ───────────────────────
--
-- Every path that reaches this function goes through the SERVICE client, under
-- which `auth.uid()` is **null** (measured, `32-06-SUMMARY.md` § F1, quoted at
-- `src/lib/capabilities/server.ts:26-29`). A trigger, or an internal
-- `auth.uid()`, would record NOBODY on every tick. Both columns and not just the
-- id, for the reason `20260810160000:228-245` gives about the act it records: a
-- trace that says *ticked by ORG-0042* answers nobody's question.
--
-- ── WHY THE REFUSALS ARE RETURNED VALUES AND NOT EXCEPTIONS ─────────────────
--
-- On a constraint violation PostgREST returns the ENTIRE failing row in
-- `error.details`. That is not a hypothesis: plan 44-02 measured it in a
-- throwaway container against these very tables, and every `CHECK` refusal
-- printed a `DETAIL:` line containing the whole row. On `production_plan` that
-- row carries `venue_word`. A refusal that hands back a space under negotiation
-- is a self-inflicted disclosure by the function written to control the reading
-- of it, and it is one careless `console.error(error)` away from a log. So the
-- guards below are `RETURN`s, and there is no `error` object for anybody to log
-- by mistake.
--
-- ── WHAT IS DELIBERATELY NOT READ HERE ──────────────────────────────────────
--
-- The item's `label`, its plan's `venue_word`, its `date` and the actor's email.
-- Any of them would be one interpolation away from a message. The refusals below
-- carry a REASON CODE and an identifier, and the caller turns the code into a
-- sentence — one sentence per reason, never a shared *something went wrong*
-- (`meta-gates.md`, the newsletter precedent).
--
-- ── ⚠ THE TICK IS REVERSIBLE, AND THE NEAREST PRECEDENTS ARE NOT ────────────
--
-- Unticking is a supported call — `p_ticked = false` — and it RE-RECORDS the
-- author, so the trace answers *who last decided this*, in both directions. This
-- is **not** a monotone guard, and the three one-way switches of `meta-gates.md`
-- (`venue_reveal_sent`, a payment reaching `completed`, a series progressivo)
-- are untouched by this function. Nothing has left the building because somebody
-- ticked a box, so un-ticking one ticked by mistake costs a trace line and
-- nothing else. The wrong precedent is one file away — section 4 above is a
-- one-way guard, and it is a different kind of thing.
--
-- ── ⚠ WHY THERE IS NO ROW LOCK, WHERE THE ANALOG HAS ONE ────────────────────
--
-- `record_venue_reveal_act` takes a lock because two presses within a second
-- would mail an address twice and an address cannot be un-mailed. Two ticks
-- within a second write the same column twice and the second one wins, which is
-- the correct answer to the question *who last decided this*. A lock here would
-- be caution copied without its reason.
--
-- ── ⚠ WHAT THIS FUNCTION DOES NOT CHECK, AND WHO DOES ───────────────────────
--
-- It does NOT ask `private.has_capability('production.read')`. That resolver
-- answers about `auth.uid()`, which is null on every path that reaches here, so
-- the call could only ever return false and refuse every legitimate tick. The
-- alternative — re-deriving the profiles-to-grants join for `p_actor_id` — is
-- refused for two written reasons: `20260807000000_capability_model.sql`
-- (CAP-01) puts that join in exactly one place because two implementations of
-- one table-driven rule drift, and D-04 refuses any function that answers a
-- yes/no question about an arbitrary identifier, since this repository has no
-- rate limiting anywhere.
--
-- **So the entitlement gate is the CALLER's, and it is plan 44-12's server
-- action, which asks `production.read` before constructing the service client.**
-- What makes that the only reachable path is section 6's grant: `service_role`
-- and nothing wider. Saying so here is not the same as enforcing it here.
--
-- What IS checked here is the trace's own integrity: an anonymous tick and a
-- tick attributed to somebody who does not exist are both refused by name, so
-- the author column cannot quietly hold a value nobody can resolve.
--
-- The search_path is pinned empty below, with every reference schema-qualified,
-- and `SECURITY DEFINER` because the table carries no write policy.
--
-- THE RETURN CONTRACT, which plan 44-12's server action and plan 44-11's surface
-- read:
--
--   success  {"ok": true,  "item_id": "<uuid>", "ticked": <boolean>,
--             "ticked_at": <timestamptz|null>}
--   refusal  {"ok": false, "reason": "<code>", "item_id": "<uuid|null>"}
--
--   reasons  arguments_required · actor_required · actor_unknown · item_not_found

CREATE OR REPLACE FUNCTION public.record_checklist_tick(
  p_item_id    uuid,
  p_ticked     boolean,
  p_actor_id   uuid,
  p_actor_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_exists boolean;
  v_ticked_at    timestamptz;
BEGIN
  -- ── 1. The argumental refusals, each with its own name ────────────────────
  --
  -- These are RETURNED and not raised, unlike the analog's two: the analog can
  -- raise them because neither of its argumental checks touches a row, but a
  -- caller cannot branch on a cause Next has redacted out of a Server Action
  -- error in a production build (`src/lib/capabilities/server.ts:59-63`). A
  -- refusal nobody can read is a silent failure.

  IF p_item_id IS NULL OR p_ticked IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'arguments_required',
      'item_id', p_item_id
    );
  END IF;

  -- An unattributed tick is refused HERE, with its own name. `ticked_by_name`
  -- is nullable on the table, so without this the anonymous tick would SUCCEED
  -- and leave a trace that answers nobody's question — which is the shape of
  -- failure `community-membership.md` names for a privileged act: *chi decide è
  -- tracciato*.
  IF p_actor_id IS NULL OR btrim(coalesce(p_actor_name, '')) = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'actor_required',
      'item_id', p_item_id
    );
  END IF;

  -- And an actor who does not exist is refused separately from one who was not
  -- supplied. Two causes, two codes, never one: a stale id in a caller and a
  -- missing id in a caller are different defects, and collapsing them is the
  -- recorded newsletter pattern (`meta-gates.md`).
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_actor_id
  ) INTO v_actor_exists;

  IF NOT v_actor_exists THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'actor_unknown',
      'item_id', p_item_id
    );
  END IF;

  -- ── 2. The write, in ONE statement for both directions ────────────────────
  --
  -- One statement and not two branches, for the reason the analog gives about
  -- its three acts: two statements of the same shape diverge, and the day
  -- somebody adds a check they add it to the one they were looking at. The
  -- author is re-recorded in BOTH directions, which is what makes the untick an
  -- act rather than an erasure.

  UPDATE public.production_checklist_item
     SET ticked_at      = CASE WHEN p_ticked THEN now() ELSE NULL END,
         ticked_by      = p_actor_id,
         ticked_by_name = p_actor_name,
         updated_at     = now()
   WHERE id = p_item_id
  RETURNING ticked_at INTO v_ticked_at;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'item_not_found',
      'item_id', p_item_id
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'item_id', p_item_id,
    'ticked', p_ticked,
    'ticked_at', v_ticked_at
  );
END;
$$;

COMMENT ON FUNCTION public.record_checklist_tick(uuid, boolean, uuid, text) IS
  'Records a production checklist tick together with WHO performed it. The actor is an ARGUMENT because every path arrives via the service client, under which auth.uid() is null and a trigger would record nobody. '
  'THE TICK IS REVERSIBLE: p_ticked = false clears ticked_at and re-records the author, so the trace answers who last decided, in both directions. It is NOT a monotone guard and borrows nothing from venue_reveal_sent, a completed payment or a series progressivo. '
  'Refusals are RETURNED VALUES and not exceptions: plan 44-02 measured that a constraint refusal on these tables prints the entire failing row, and PostgREST exposes that as error.details — on production_plan the row carries venue_word. No refusal here carries the item label, the plan venue word or a date; each carries a reason code and an identifier. '
  'It does NOT check production.read: has_capability answers about auth.uid(), which is null here, and re-deriving the join would duplicate the one definition CAP-01 keeps single. The entitlement gate is the server action, and the execute grant on service_role alone is what makes that the only reachable path.';

-- =============================================================================
-- 6. The execute grants — one function, and deliberately not the other
-- =============================================================================
--
-- `record_checklist_tick` is granted to `service_role` AND NOTHING WIDER, which
-- is the analog's posture (`20260810160000:606-607`) and is narrower than a
-- first reading of this plan suggested. `authenticated` is refused for a reason
-- that is this function's own: **the actor is an argument.** A function
-- reachable with a user JWT would let any caller attribute a tick to anybody
-- they can name, which turns the author column from a trace into a claim — and
-- the whole point of recording an author is that it cannot be chosen by whoever
-- benefits from it. The analog closes the same hole the same way, and resolves
-- the actor server-side in the caller instead.
--
-- The corollary, stated so it is not discovered: with no grant to
-- `authenticated`, the function is unreachable at `/rest/v1/rpc/...` for a user
-- session — refused by the privilege system before any policy is consulted,
-- which is a stronger answer than a policy because it cannot be widened by
-- adding a second permissive one beside it.
--
-- `refuse_production_plan_renumber` gets NO grant, and the omission is a
-- decision. It is a `RETURNS trigger` function: it cannot be called directly,
-- it is executed by the trigger with the trigger's own privileges, and granting
-- EXECUTE on it would hand out a permission that buys nothing and reads as
-- though the function were an entry point. `bump_series_watermark` carries no
-- grant either, for the same reason.

GRANT EXECUTE ON FUNCTION public.record_checklist_tick(uuid, boolean, uuid, text)
  TO service_role;

COMMIT;
