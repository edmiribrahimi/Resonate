-- The four section keys — the additive half of the split, and the half that
-- refuses nobody anything
-- Phase 45, Plan 03: PROD-02
--
-- Changes:
-- 1. Four capability rows under one naming schema, `production.<section>.manage`
-- 2. Eight grants — four keys x {master, organizer}, `requires_approved = false`
-- 3. The declared refusals of `staff`, `member` and `anon`, one paragraph per key
-- 4. The four rejected reuses, restated for the section keys with the DIRECTION
--    of each mistake
-- 5. The six `production_*` SELECT arms rewritten to ask the CALENDAR section
--    key, with the `(SELECT ...)` wrapper intact
-- 6. The paragraph declaring the absent write policies a decision, and the
--    uniformity paragraph, carried across rather than dropped
--
-- ⚠ AND THE ONE THING THIS FILE DOES NOT DO: it leaves `production.read`, and
-- both of its grants, exactly where they are. That is not an oversight; it is
-- the entire reason the split has no window. Section 5 below is the paragraph
-- that justifies the file.
--
-- WHY ONE TRANSACTION. A half-applied version of this file is worse than none of
-- it. A capability row without its grants resolves FALSE for EVERYONE, the
-- master included — the resolver at `20260807000000_capability_model.sql:209-216`
-- is an `EXISTS` over `private.role_capabilities` and knows no special case for a
-- role. Six rewritten policies without their key would close the calendar. So
-- `BEGIN; ... COMMIT;` is not decoration.
--
-- IDEMPOTENCE, DECLARED. This queue is applied one row at a time, by hand, and
-- re-applying a file out of doubt is the natural reaction to a doubt. So:
--   * `ON CONFLICT (key) DO NOTHING` on the four capability rows and
--     `ON CONFLICT (role, capability) DO NOTHING` on the eight grants;
--   * enabling row level security is idempotent in Postgres, and on all six
--     tables the statement is ALREADY A NO-OP: it is repeated so that reading
--     this file alone tells the truth about the posture of the tables it writes
--     policies for;
--   * the six arms are dropped BY BOTH NAMES before being written — the
--     pre-split name and the post-split one. The policies are RENAMED here,
--     because a policy called `..._select_production_read` whose body asks
--     `production.calendar.manage` is a name that lies, and this file exists to
--     be read. Dropping only the pre-split name would make a second application
--     fail on an object that already exists, which `supabase-data.md`, *gate
--     idempotenza DDL*, refuses: a migration that fails on its second run blocks
--     a deploy at an inconvenient moment. That is why there are twelve drops for
--     six arms, and it is a decision rather than a doubling — six arms exist
--     before this file and six exist after it.
--
-- ⚠ THIS FILE IS A PUBLICATION. `supabase/migrations/` is tracked and
-- `github.com/edmiribrahimi/Resonate` is public, so a publication here is
-- irreversible: a file pushed to a public repository survives in forks, in
-- mirror caches and in the history after any removal. NO MATERIAL: nothing below
-- carries a date, a venue name, a street, a series name, a progressivo, a score
-- or a line-up. The only production vocabulary present is the NAME OF A SECTION,
-- which is structure. Neither `docs/` nor `.firecrawl/` was opened to write it.
--
-- ⚠ AND IT IS NOT APPLIED BY THIS PLAN. Plan 45-08 applies it, with its own
-- authorisation and its own recorded read-back of `pg_policies`. Everything
-- below is TEXT until then, and a green `npm run build` says nothing whatever
-- about it: no build in this repository reads a `.sql` file, and there is no
-- test runner.
--
-- ⚠ AND `verify:capabilities` GOES RED, ON PURPOSE, BETWEEN THIS FILE AND THE
-- DEPLOY. Its `EXPECTED_KEY_COUNT` is a pre-registered constant. Once this file
-- is applied the database holds eighteen keys while `src/lib/capabilities/keys.ts`
-- still declares fourteen. That red is the gate working, it is declared in
-- advance here so it does not arrive as a surprise mid-sequence, and it returns
-- green only after the retirement migration.

BEGIN;

-- =============================================================================
-- 1. The four section keys — one naming schema
-- =============================================================================
--
-- `production.<section>.manage`, three segments. The schema is chosen and not
-- inherited, and the two reasons are worth writing down because a key name
-- cannot be corrected once a policy body holds it:
--
--   * It keeps the `production.` prefix that GROUPS the four, so a later search
--     for the production surface finds four related strings rather than four
--     unrelated words.
--   * Three segments are precedented — `membership.card.view`
--     (`src/lib/capabilities/keys.ts:194`) is already a three-segment key.
--   * `manage` and not `read`, because D-45-06 says whoever reads a section
--     writes it: ONE key per section covers both directions, and `read` would
--     under-claim what the key actually opens. It is the verb three existing
--     keys already use for read-and-write over a surface — `staff.manage`,
--     `catalogue.manage`, `party.manage`.
--
-- NAMED BY THE QUESTION, NOT BY THE PREDICATE. All four resolve to the same
-- predicate today — role in {master, organizer}, status ignored — and they are
-- deliberately four keys. `keys.ts:38-45` states the rule and gives the reason:
-- a key named after its predicate cannot later be taken away on its own. The
-- concrete case is already written down as deferred — an external collaborator
-- who should hold one section and nothing else — and four keys are what make it
-- a grant change rather than a model change.
--
-- ⚠ THE FOUR DESCRIPTIONS BELOW ARE BYTE-IDENTICAL to the entries plan 45-05
-- writes into `CAP_DESCRIPTIONS` in `src/lib/capabilities/keys.ts`. That is the
-- rule `keys.ts:29-36` states for every key, and the reason it gives applies
-- here: a capability key has NO SQL mirror the compiler can hold. `npm run build`
-- proves neither the row nor the policy string. The only thing that compares
-- them is `scripts/verify-capabilities.mjs`, which needs a live database.

INSERT INTO private.capabilities (key, description) VALUES
  (
    'production.calendar.manage',
    'Read and write the production calendar section: the six production tables, whose rows are unannounced dates, spaces under negotiation and the shape of an internal plan. It is the calendar own section key, minted by the split of production.read into four section keys (D-45-04), and the grants are unchanged — master and organizer held the calendar before the split and hold it after. requires_approved is FALSE on both grants (D-44-27, the owner), which D-45-04 constraint 3 forbids changing here: organizer accounts are created inside the app by an admin or an organizer and nobody signs up any more, so pending is about to stop varying and gating on a value that no longer varies is debt rather than safety. That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit. It is NOT staff.manage ignoring status for the door reason — nobody is standing in a queue in front of a calendar.'
  ),
  (
    'production.manifesto.manage',
    'Read and write the sound manifesto section: which formats have a written manifesto, which carry declared coordinates without one, and which are not decided at all, together with the register of the questions still open. One key covers both directions (D-45-06), which is why the verb is manage and not read. Granted to master and organizer (D-45-03). requires_approved is FALSE (D-45-20, the owner) because organizer accounts are created inside the app by an admin or an organizer and nobody signs up any more, so pending is about to stop varying and gating on a value that no longer varies is debt rather than safety. That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit. It is NOT staff.manage ignoring status for the door reason — nobody is standing in a queue in front of a manifesto.'
  ),
  (
    'production.visual.manage',
    'Read and write the visual system section: the capitolato — palette, typography, the grid-safe zone, the publication order, what is fixed and what is variable — beside the produced pieces and the photo archive a listing is pulled from. One key covers both directions (D-45-06), which is why the verb is manage and not read. Granted to master and organizer (D-45-03). requires_approved is FALSE (D-45-20, the owner) because organizer accounts are created inside the app by an admin or an organizer and nobody signs up any more, so pending is about to stop varying and gating on a value that no longer varies is debt rather than safety. That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit. It is NOT staff.manage ignoring status for the door reason — nobody is standing in a queue in front of a capitolato.'
  ),
  (
    'production.location.manage',
    'Read and write the location section: scouted spaces with their stage, the attributes a per-format score is computed from, and the four answers that close a to-verify column. Every row is a space nobody has phoned, and one of its columns is a street address (D-45-24) — which makes this the narrowest-audience section of the four in intent, even though D-45-03 gives all four the same two roles. One key covers both directions (D-45-06), which is why the verb is manage and not read. requires_approved is FALSE (D-45-20, the owner) because organizer accounts are created inside the app by an admin or an organizer and nobody signs up any more, so pending is about to stop varying and gating on a value that no longer varies is debt rather than safety. That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit. It is NOT staff.manage ignoring status for the door reason — nobody is standing in a queue in front of a scouting list.'
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 2. The eight grants — four keys x two roles, and neither narrower nor wider
-- =============================================================================
--
-- ⚠ `requires_approved = false`, AND IT IS THE OWNER CALL, NOT THE PLANNER.
-- D-45-20 for the three new keys, D-44-27 for the calendar. Organizer accounts
-- are created inside the app by an admin or an organizer, nobody signs up any
-- more, so `pending` is about to stop varying — and a gate on a value that no
-- longer varies is debt, not safety. The research pass recommended the stricter
-- value and was right about the model as it stands; the owner is answering about
-- the model as it is becoming, and that is the owner question. For the calendar
-- key the value is not even open: D-45-04 constraint 3 forbids this file from
-- changing who can read the calendar, in either direction.
--
-- ⚠ AND IT IS A BET, written down here rather than left to be discovered: it
-- holds only while NO signup path can create a pending organizer. The day one is
-- reopened, a pending organizer reads every unannounced date, every space under
-- negotiation and the street address of each, and these eight rows are
-- reconsidered in the same commit that reopens it.
--
-- ⚠ IT MUST NOT BE DEFENDED BY POINTING AT `door.operate` OR `staff.manage`.
-- Those two carry the same value to keep a person from being refused IN FRONT OF
-- A QUEUE, and nobody is standing in a queue in front of a manifesto. Rows
-- agreeing on a value for different reasons must not be made to move together —
-- the day the door reason is revisited, these eight must not move with it. It is
-- the argument this repository has now written four times (`keys.ts:93-97`,
-- `:136-143`, `20260815120100_production_calendar_access.sql:104-108`, here).
--
-- ⚠ THE GRANTS DO NOT NARROW AND DO NOT WIDEN. Master and organizer hold the
-- calendar today and hold it after; the three new keys go to the same two roles
-- (D-45-03). A key rename that also changed who can read would be two changes in
-- one diff, auditable against neither question — and *who could read the calendar
-- before, and who can read it after* is exactly the question this split has to
-- stay answerable to.
--
-- ⚠ AND THE CONSEQUENCE THE OWNER READ BEFORE CHOOSING. With identical grants
-- across the four keys and two roles holding all of them, NO SUBJECT EXISTS in
-- production for whom *holds one section, refused another* happens. That
-- criterion is therefore closed by structural evidence — these rows, readable
-- from the catalogue — and never by observing a live refusal. No plan may
-- fabricate a role grant in production to make it observable (D-45-23).

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  ('master',    'production.calendar.manage',  false),
  ('organizer', 'production.calendar.manage',  false),
  ('master',    'production.manifesto.manage', false),
  ('organizer', 'production.manifesto.manage', false),
  ('master',    'production.visual.manage',    false),
  ('organizer', 'production.visual.manage',    false),
  ('master',    'production.location.manage',  false),
  ('organizer', 'production.location.manage',  false)
ON CONFLICT (role, capability) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2b. The refusals — an absence of a row, one paragraph per key
-- -----------------------------------------------------------------------------
--
-- Three subjects are refused all four keys, and each refusal has the same
-- mechanism and a different reason per section.
--
--   `member` — refused everywhere. Nothing grants it.
--   `anon`   — refused everywhere by construction: `private.has_capability`
--              answers false for a null `auth.uid()`
--              (`20260807000000_capability_model.sql:55-57`).
--   `staff`  — refused everywhere, and this is the one worth four paragraphs,
--              because it is the one somebody would be tempted to grant.
--
-- `production.calendar.manage` — `staff` refused. A member of staff rostered to
--   a night enters TO LET PEOPLE IN. Unannounced dates and open negotiations are
--   not a night work, and unlike a per-night assignment they would not expire
--   with the night. This key is also NOT one of the four a per-night assignment
--   may carry (`20260809000000_party_assignments.sql:340-342`), so the refusal is
--   not routed around by an assignment either.
--
-- `production.manifesto.manage` — `staff` refused. The manifesto is written for
--   whoever goes to the console, and it LEAVES THE PERIMETER when it does. The
--   question it answers is *how a format sounds*, which is not a question the
--   door asks; and a document built to be handed to a third party is not one to
--   widen the read of casually.
--
-- `production.visual.manage` — `staff` refused. The capitolato names spaces and
--   carries the rules a material must obey before it is published. A section
--   whose content becomes a publication is not a per-night surface.
--
-- `production.location.manage` — `staff` refused, and this is the refusal that
--   costs the most if it is ever loosened. Every row is a space nobody has
--   phoned, carrying a street address. A space under negotiation named outside
--   the people negotiating is a negotiation made public, and a publication does
--   not un-publish.
--
-- WHERE THOSE REFUSALS ARE ASSERTED rather than merely written here:
-- `scripts/verify-capabilities.mjs`, side 5, in plan 45-05 commit. Its
-- `ROLE_GRANTS` declares every (role x capability) pair and exits 1 naming the
-- pair both when a declared refusal acquires a row and when a declared grant
-- loses one. A comment can be ignored; that check cannot.

-- -----------------------------------------------------------------------------
-- 2c. The rejected reuses, restated for the section keys
-- -----------------------------------------------------------------------------
--
-- A rewrite that carries the policies and drops the reasons is how the next
-- reader "repairs" the gap with one policy statement. So the argument travels,
-- and each candidate is wrong in a DIFFERENT DIRECTION:
--
--   * `production.read` itself, kept for all four sections. This is the reuse
--     the phase exists to undo. One key for four sections cannot refuse ONE
--     section, and PROD-02 asks for entitlement per section. Keeping it would
--     make the four sections a naming exercise.
--   * `organizer.access` — a ROUTING question about the account: *may they reach
--     the organizer area*. Reusing it makes all four sections reachable by every
--     organizer PERMANENTLY and leaves nothing to take away the day one
--     collaborator should hold one section and no other. Un-widening later is the
--     direction `meta-gates.md` permits only with an explicit, documented
--     authorisation, so the reuse would not be a shortcut — it would be a
--     decision nobody took, taken irreversibly.
--   * `catalogue.manage` — right shape, wrong question. *May they create an
--     artist or a venue* is not *may they read what is planned, or the street of
--     a space under negotiation*. Merging them ties four sections to a catalogue
--     grant, and the day somebody wants a catalogue editor who may not read the
--     location section there is no key to take away.
--   * `admin.access` — master-only, so it is wrong in the OPPOSITE direction from
--     the other three: too narrow. D-45-03 wants the organizer as well, on all
--     four.
--   * `staff.manage` — it would inherit `requires_approved = false` for the DOOR
--     reason. These four keys ALSO carry that value, and the coincidence is the
--     trap: it arrives from D-45-20 and D-44-27 and from nothing else.

-- =============================================================================
-- 3. The six calendar arms, rewritten onto the calendar section key
-- =============================================================================
--
-- ⚠ NO PUBLIC READ ARM ON ANY OF THE SIX, and the asymmetry with `public.formats`
-- is the point rather than an omission. That table carries an arm keyed on its
-- `listed` flag, open to anybody, because a format chip is already public: it
-- says *this format
-- exists*, never *a night is coming*. Nothing here is a catalogue. Every row of
-- these six is an unannounced date, a space under negotiation, or the shape of an
-- internal plan. There is no subset of them safe to publish, so there is no
-- predicate to write a second arm with.
--
-- ⚠ THE `(SELECT ...)` WRAPPER IS LOAD-BEARING, AND IT IS NOT `STABLE` THAT
-- PRODUCES THE EFFECT. The wrapper makes Postgres evaluate the call once per
-- statement as an InitPlan instead of once per row
-- (`20260807000000_capability_model.sql:177-184`). The comment at
-- `20260224_rbac_migration.sql:97-98` credits `STABLE` with that, `EXPLAIN`
-- disproved it, and 26 policies in this repository were written unwrapped on the
-- strength of the wrong comment. These six were not, the wrapper survived into
-- `pg_policies`, and it survives this rewrite. A rewritten arm whose `qual` no
-- longer begins with a select has lost the InitPlan — and the read-back in plan
-- 45-08 is where that is caught.
--
-- ⚠ AND A POLICY IS THE BOUNDARY, WHICH THE MIDDLEWARE IS NOT. The entry in
-- `src/lib/routes/capability-routes.ts` decides where a REDIRECT happens; it
-- stops somebody arriving on a page and stops nobody reading a row (`CLAUDE.md`,
-- operating principle 2). These six arms are the boundary on the data, and they
-- are the boundary whether or not any page ever exists.
--
-- ⚠ THE ARMS ARE REPLACED, NOT DOUBLED. Postgres OR-s permissive policies, so a
-- second arm beside an existing one WIDENS rather than replaces
-- (`supabase-data.md`, *gate RLS contestuale*). Each table below is dropped by
-- both names — the pre-split one and the post-split one — before its single arm
-- is written, so at no point does a table carry two.

-- -----------------------------------------------------------------------------
-- 3a. public.production_plan
-- -----------------------------------------------------------------------------
--
-- The table this arm matters most for: its rows carry `venue_word`, which may
-- name a space under negotiation, and `date`, which may be a date nobody has
-- announced.

ALTER TABLE public.production_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_plan_select_production_read ON public.production_plan;
DROP POLICY IF EXISTS production_plan_select_production_calendar_manage ON public.production_plan;

CREATE POLICY production_plan_select_production_calendar_manage ON public.production_plan
  FOR SELECT USING ((SELECT private.has_capability('production.calendar.manage')));

-- -----------------------------------------------------------------------------
-- 3b. public.production_piece
-- -----------------------------------------------------------------------------

ALTER TABLE public.production_piece ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_piece_select_production_read ON public.production_piece;
DROP POLICY IF EXISTS production_piece_select_production_calendar_manage ON public.production_piece;

CREATE POLICY production_piece_select_production_calendar_manage ON public.production_piece
  FOR SELECT USING ((SELECT private.has_capability('production.calendar.manage')));

-- -----------------------------------------------------------------------------
-- 3c. public.production_commitment
-- -----------------------------------------------------------------------------

ALTER TABLE public.production_commitment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_commitment_select_production_read ON public.production_commitment;
DROP POLICY IF EXISTS production_commitment_select_production_calendar_manage ON public.production_commitment;

CREATE POLICY production_commitment_select_production_calendar_manage ON public.production_commitment
  FOR SELECT USING ((SELECT private.has_capability('production.calendar.manage')));

-- -----------------------------------------------------------------------------
-- 3d. public.production_checklist_item
-- -----------------------------------------------------------------------------
--
-- This one also carries a person name, in `ticked_by_name`. That name is
-- authorised IN THE DATABASE and stops there: it does not enter a PLAN, a
-- SUMMARY, a VERIFICATION or anything else under `.planning/`, which is tracked
-- and public. Artefacts name ROLES.

ALTER TABLE public.production_checklist_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_checklist_item_select_production_read ON public.production_checklist_item;
DROP POLICY IF EXISTS production_checklist_item_select_production_calendar_manage ON public.production_checklist_item;

CREATE POLICY production_checklist_item_select_production_calendar_manage ON public.production_checklist_item
  FOR SELECT USING ((SELECT private.has_capability('production.calendar.manage')));

-- -----------------------------------------------------------------------------
-- 3e. public.production_import_run
-- -----------------------------------------------------------------------------
--
-- Counts, not content — and it is still not public. A run row says how many
-- nights were seen and how many diverged, and a count of nights in a season is
-- itself an unannounced fact.

ALTER TABLE public.production_import_run ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_import_run_select_production_read ON public.production_import_run;
DROP POLICY IF EXISTS production_import_run_select_production_calendar_manage ON public.production_import_run;

CREATE POLICY production_import_run_select_production_calendar_manage ON public.production_import_run
  FOR SELECT USING ((SELECT private.has_capability('production.calendar.manage')));

-- -----------------------------------------------------------------------------
-- 3f. public.production_pipeline_rule
-- -----------------------------------------------------------------------------
--
-- ⚠ THE UNIFORMITY PARAGRAPH, CARRIED ACROSS BECAUSE DROPPING IT WOULD LOSE IT.
-- This is the one table of the six holding no material at all: sixteen rows
-- saying which pieces a format owes and on which weekday. It gets the SAME arm as
-- the other five anyway, and the uniformity is deliberate. A single table
-- readable without the key would be the one somebody joins the others onto — and
-- the reasoning *this table is harmless on its own* is how a read path is opened
-- by degrees.

ALTER TABLE public.production_pipeline_rule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_pipeline_rule_select_production_read ON public.production_pipeline_rule;
DROP POLICY IF EXISTS production_pipeline_rule_select_production_calendar_manage ON public.production_pipeline_rule;

CREATE POLICY production_pipeline_rule_select_production_calendar_manage ON public.production_pipeline_rule
  FOR SELECT USING ((SELECT private.has_capability('production.calendar.manage')));

-- =============================================================================
-- 4. THE SIX TABLES STILL HAVE READ ARMS AND NOTHING ELSE — DELIBERATE
-- =============================================================================
--
-- ⚠ THE SECOND PARAGRAPH CARRIED ACROSS, for the same reason as the first: the
-- three other policy commands are absent from this file on purpose, and the
-- absence is stated rather than left to be inferred. (The command words are not
-- spelled out here: `formats/actions.ts:58-63` records the reason — a search
-- whose only match is the sentence forbidding the thing is a search that gets
-- ignored the third time it goes red.)
--
-- Writes arrive from the import and from the checklist with the SERVICE client,
-- which bypasses every policy. A write arm here would therefore constrain nothing
-- on the only path that writes, while reading to the next person as though the
-- boundary were covered. With row level security enabled and the six read arms
-- above, no session — anonymous, authenticated, or a master — can add, edit or
-- remove a row on any of the six through PostgREST.
--
-- Five tables in this repository already omit their write policies on purpose
-- (`20260805120000_door_scan_events.sql:158-163`,
-- `20260808002000_membership_register.sql:337-343`,
-- `20260809000000_party_assignments.sql`, `20260809003000_party_credits.sql`,
-- `20260810120000_formats_and_series.sql:452-476`). Without this paragraph the
-- next reader takes the gap for a bug and repairs it — and the repair is one
-- permissive arm away from letting an authenticated session write an unannounced
-- date.
--
-- WHAT THIS DOES NOT CLAIM, and it is the sharpest sentence the old file had:
-- **the service client is not a boundary; it is the absence of one.** What
-- decides WHO may write a calendar row is the guard inside the server action —
-- which, from the deploy that follows this file, asks
-- `production.calendar.manage` instead of `production.read`. Saying so here is
-- not the same as enforcing it here, and conflating the two is how a feature ends
-- up protected by the middleware alone.

-- =============================================================================
-- 5. `production.read` STAYS. This is the paragraph that justifies the file.
-- =============================================================================
--
-- Both single-transaction orders leave a window in which an entitled master is
-- refused, and the window is the same shape in each:
--
--   * mint four, rewrite six, retire the old key, THEN deploy — between apply and
--     deploy the old bundle asks `production.read`, which is gone, so
--     `has_capability` answers false and the calendar page redirects. The
--     calendar is DOWN.
--   * deploy, THEN apply — between deploy and apply the new bundle asks four keys
--     that do not exist, and all four answer false. All four sections are DOWN.
--
-- A key that does not exist answers false with NO ERROR, no log line, and nothing
-- in this product that would report it — there is no error tracking here. A
-- surface that is down for the length of a deploy is a surface nobody would learn
-- was down except by opening it.
--
-- This file removes the window rather than shortening it, and it can do so
-- precisely because D-45-04 constraint 3 forbids the grants from narrowing or
-- widening. During the whole interval between this migration and the deploy:
--
--   * the old bundle guard asks `production.read`, whose row and whose two grants
--     are untouched here, so it still answers yes;
--   * the six rewritten arms ask `production.calendar.manage`, granted to the
--     same two roles above, so they also answer yes.
--
-- NOBODY IS REFUSED ANYTHING, at any instant of the sequence. The old key is
-- retired afterwards, by a separate file — `20260817120500_production_read_retire.sql`
-- — which carries its own precondition in its own header, and which is the file
-- an auditor reads to answer *did the reach change*.

COMMIT;
