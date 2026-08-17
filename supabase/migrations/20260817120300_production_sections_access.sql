-- The five new tables get their read arms — one key per section, and two
-- absences declared rather than left
-- Phase 45, Plan 04: PROD-02
--
-- Changes:
-- 1. `public.production_space` and `public.production_space_attribute` — one arm
--    each, asking the LOCATION section key
-- 2. `public.production_section` — TWO arms, one per authored section, each
--    restricted by the `section` column
-- 3. `public.production_open_question` — FIVE arms: one per section the register
--    spans, plus one for the brand-wide entry that belongs to no section
-- 4. `public.production_visual_asset` — one arm, asking the VISUAL section key
-- 5. The absent write policies, declared as a decision
-- 6. The absent edge toward the one public road to an address, declared as a
--    decision and NOT claimed as proved
--
-- ⚠ WHAT STATE THIS FILE CORRECTS. `20260817120100_production_location.sql` and
-- `20260817120200_production_sections.sql` created these five tables with row
-- level security ENABLED AND ZERO POLICIES. That is not a gap they left for
-- somebody to notice: it is the more restrictive half of a conflict those two
-- files argue in their own headers. `supabase-data.md`, *gate tabella nuova =
-- policy nuova*, asks for security and at least one policy in the SAME
-- migration; a policy naming a capability key that did not exist yet would have
-- rolled the transaction back. Between the two, `meta-gates.md` takes the more
-- restrictive: zero policies refuse EVERYBODY, a master included. THIS is the
-- file that opens each of the five to exactly one section, and until it is
-- applied a surface built on top of them looks broken rather than refused.
--
-- ⚠ A POLICY IS THE BOUNDARY, WHICH THE MIDDLEWARE IS NOT. An entry in
-- `src/lib/routes/capability-routes.ts` decides where a REDIRECT happens. It
-- stops somebody arriving on a page; it stops nobody reading a row (`CLAUDE.md`,
-- operating principle 2). The ten arms below are the boundary on the data, and
-- they are the boundary whether or not any page ever exists.
--
-- ⚠ THE `(SELECT ...)` WRAPPER IS LOAD-BEARING, AND IT IS NOT `STABLE` THAT
-- PRODUCES THE EFFECT. The wrapper makes Postgres evaluate the call once per
-- statement as an InitPlan instead of once per row
-- (`20260807000000_capability_model.sql:177-184`, measured with EXPLAIN on this
-- database). The comment at `20260224_rbac_migration.sql:97-98` credits `STABLE`
-- with that, EXPLAIN disproved it, and 26 policies in this repository were
-- written unwrapped on the strength of the wrong comment. Every arm below is
-- wrapped, and an arm whose `qual` in `pg_policies` no longer begins with a
-- select has lost the InitPlan — which the read-back of plan 45-08 is where to
-- catch.
--
-- IDEMPOTENCE, DECLARED. This queue is applied one row at a time, by hand, and
-- re-applying a file out of doubt is the natural reaction to a doubt
-- (`supabase-data.md`, *gate idempotenza DDL*: a migration that fails on its
-- second run blocks a deploy at an inconvenient moment). So every arm is dropped
-- by name before it is written, and enabling row level security is repeated on
-- all five tables even though it is ALREADY A NO-OP — repeated so that reading
-- this file alone tells the truth about the posture of the tables it writes
-- policies for.
--
-- ⚠ ONE DROP PER ARM HERE, AND TWELVE FOR SIX IN `20260817120000`. The asymmetry
-- is not an inconsistency. That file RENAMED six existing policies, so the
-- complete list of names each had ever carried was two; these ten names have
-- never existed on any object, because the five tables carry zero policies today.
-- One drop each is therefore the COMPLETE list, not the short one.
--
-- ⚠ THIS FILE IS A PUBLICATION. `supabase/migrations/` is tracked and
-- `github.com/edmiribrahimi/Resonate` is public, so a publication here is
-- irreversible: a file pushed to a public repository survives in forks, in
-- mirror caches and in the history after any removal. NO MATERIAL: nothing below
-- carries a date, a venue name, a street, a series name, a progressivo, a score,
-- an artist or a line-up. The only production vocabulary present is the NAME OF A
-- SECTION, which is structure. Neither `docs/` nor `.firecrawl/` was opened to
-- write it.
--
-- ⚠ AND IT IS NOT APPLIED BY THIS PLAN. Plan 45-08 applies it, with its own
-- authorisation and its own recorded read-back of `pg_policies`. Everything below
-- is TEXT until then, and a green `npm run build` says nothing whatever about it:
-- no build in this repository reads a `.sql` file, and there is no test runner
-- for the product.

BEGIN;

-- =============================================================================
-- 0. `TO authenticated` ON EVERY ARM — chosen ONCE, for all five tables
-- =============================================================================
--
-- The six calendar arms of `20260817120000` carry no role clause. These ten do,
-- and the asymmetry is deliberate rather than accidental — which is the only
-- reason it is worth a paragraph.
--
-- The clause is FREE: for `anon` the predicate can only ever answer false, since
-- `auth.uid()` is null and the resolver finds no profile row
-- (`20260807000000_capability_model.sql:55-57`). It refuses nobody who would
-- otherwise have been admitted, and it narrows the set of roles the planner has
-- to reason about from all of them to one. `venues_select_staff` already chose it
-- for exactly this reason (`20260810161000_venues_read_narrowed.sql:236-242`),
-- and `service_role` bypasses row level security entirely and is unaffected.
--
-- It is chosen ONCE, FOR EVERY ONE OF THE FIVE TABLES, rather than table by
-- table — and the wording of that sentence is deliberate, because the shorter
-- phrasing collides with the acceptance grep that asserts this file writes no
-- policy for a command other than a read. A criterion that fires on correct work
-- is a criterion that gets ignored the third time it goes red. It is chosen once
-- rather than per table because a
-- clause present on four arms and absent on a fifth reads to the next person as a
-- decision about the fifth table — and it would not be one.

-- =============================================================================
-- 1. public.production_space — the LOCATION key
-- =============================================================================
--
-- The table this arm matters most for, and the reason the location section is
-- Critical rather than merely internal: every row is a space NOBODY HAS PHONED,
-- and one of its columns is a street address (D-45-24). A space under negotiation
-- named outside the people negotiating is a negotiation made public, and a
-- publication does not un-publish.
--
-- `staff` is refused, and this is the refusal that costs the most if it is ever
-- loosened. A member of staff rostered to a night enters TO LET PEOPLE IN; a
-- scouting list is not night work, and unlike a per-night assignment it would not
-- expire with the night.

ALTER TABLE public.production_space ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_space_select_location ON public.production_space;

CREATE POLICY production_space_select_location ON public.production_space
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((SELECT private.has_capability('production.location.manage')));

-- =============================================================================
-- 2. public.production_space_attribute — THE UNIFORMITY PARAGRAPH
-- =============================================================================
--
-- ⚠ CARRIED ACROSS FROM `20260815120100:240-244` AND `20260817120000:363-369`
-- BECAUSE DROPPING IT WOULD LOSE IT — and it is the paragraph that has to travel
-- furthest, since this is the table it was written for.
--
-- On its own this table looks harmless: an attribute key, a value out of a closed
-- vocabulary, and a word saying whether the value was verified or derived. No
-- address, no name, no date. It gets the SAME arm as the other four anyway.
--
-- The reason is the shape of the mistake, not the contents of the table. A single
-- table readable without the key is the one somebody JOINS THE OTHERS ONTO — and
-- the reasoning *this table is harmless on its own* is how a read path is opened
-- by degrees, one harmless table at a time, by people each of whom was right
-- about their own step.

ALTER TABLE public.production_space_attribute ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_space_attribute_select_location ON public.production_space_attribute;

CREATE POLICY production_space_attribute_select_location ON public.production_space_attribute
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((SELECT private.has_capability('production.location.manage')));

-- =============================================================================
-- 3. public.production_section — TWO arms, because one table holds two sections
-- =============================================================================
--
-- THE DECISION THIS FILE HAS TO TAKE, AND TAKES OUT LOUD. This one table holds
-- both the manifesto rules and the visual ones, distinguished by its `section`
-- column, and a single policy cannot ask two different keys without either
-- splitting the table or writing a predicate that admits a row on the wrong key.
--
-- So: TWO arms, each restricted by the column. Postgres OR-s permissive policies
-- (`supabase-data.md`, *gate RLS contestuale*), and here that OR is exactly the
-- semantics wanted rather than the hazard it usually is: the two arms are
-- DISJOINT on `section`, so their union admits each row to the holder of that
-- row's key and to nobody else. A holder of the manifesto key and not the visual
-- one reads the manifesto rules and is refused the visual ones — which is
-- PROD-02 in one sentence, on the one table where it is not free.
--
-- ⚠ AND ON THIS TABLE THE ARM SET IS PROVABLY EXHAUSTIVE, which is not true of
-- the register below and is the reason the two are treated differently.
-- `production_section_section_check` restricts the column to two values
-- (`20260817120200_production_sections.sql:151-152`), so two arms cover every row
-- that can exist. A third value cannot be inserted; it would be refused with an
-- error, which is visible. Compare section 4.

ALTER TABLE public.production_section ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_section_select_manifesto ON public.production_section;
DROP POLICY IF EXISTS production_section_select_visual ON public.production_section;

CREATE POLICY production_section_select_manifesto ON public.production_section
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.has_capability('production.manifesto.manage'))
    AND section = 'manifesto'
  );

CREATE POLICY production_section_select_visual ON public.production_section
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.has_capability('production.visual.manage'))
    AND section = 'visual'
  );

-- =============================================================================
-- 4. public.production_open_question — FIVE arms, and the count is the argument
-- =============================================================================
--
-- ⚠ THE NULL COLUMN, WHICH IS THE TRAP THIS SECTION EXISTS FOR. `section` is
-- nullable here, and `section = 'manifesto'` on a null column is NULL — not
-- false, and not true. A policy body that relied on the comparison alone would
-- admit nothing on a null row, so the register's MOST GENERAL entries — the ones
-- about the brand rather than about one body of rules — would be invisible to
-- everybody, WITH NO ERROR ANYWHERE. A register whose broadest questions are the
-- ones nobody can see is worse than no register, because the list looks complete.
-- So the brand-wide arm is written EXPLICITLY, with `IS NULL`, and never left to
-- fall out of a comparison.
--
-- ⚠ AND FOUR SECTION ARMS, NOT TWO — A DEVIATION FROM THE PLAN'S ARM TABLE,
-- TAKEN DELIBERATELY AND DECLARED HERE SO THE OWNER READS IT AT THE
-- AUTHORISATION CHECKPOINT OF PLAN 45-08.
--
-- The plan (`45-04-PLAN.md`, task 1) designs three arms on this table: manifesto,
-- visual, and the brand-wide one. Measured against the table as it was actually
-- built, three arms leave a hole of the same SHAPE as the null trap above, and
-- with the same silence:
--
--   * `section` here carries NO vocabulary CHECK, and the absence is itself a
--     decision with its reason written down
--     (`20260817120200_production_sections.sql:226-234`): the register spans ALL
--     FOUR sections — the two authored ones, the location and the calendar —
--     while `SECTION_KINDS` names only the two that hold authored prose. A CHECK
--     mirroring that tuple would refuse a legitimate question about a space or
--     about a date.
--   * Therefore a question tagged with the location or the calendar is a
--     PERFECTLY LEGITIMATE ROW that the three-arm design admits to nobody. It
--     inserts without complaint and then cannot be read, which on a register
--     whose entire function is to WARN — it never blocks (D-45-15) — means a
--     warning nobody can receive. `meta-gates.md`, *controllo zero fallimenti
--     silenziosi*: this product has no error tracking, so a row that is merely
--     invisible is a row nobody learns about.
--
-- The repair is one arm per section the register declares itself to span, each
-- asking that section's own key. It WIDENS NOTHING in practice — all four keys go
-- to `master` and `organizer` and to nobody else
-- (`20260817120000_production_section_keys.sql:165-174`) — and it is the only arm
-- design under which the policy set mirrors the table's declared scope instead of
-- silently re-imposing, in the access layer, the closed vocabulary the data layer
-- deliberately refused to impose.
--
-- ⚠ WHY THE CALENDAR KEY APPEARS IN THIS FILE AT ALL, since the plan assigns it
-- to `20260817120000`. That assignment is about the six CALENDAR TABLES, whose
-- arms belong to the file that renamed them. This is not a calendar table: it is
-- a register created by plan 45-01 that spans four sections, and the key a
-- calendar question must ask is the calendar's. Naming it here is narrower than
-- the alternatives, both of which were considered and rejected:
--
--   * a catch-all arm admitting any unrecognised `section` to a holder of any
--     section key — a wildcard read arm, which over-reads by construction and,
--     worse, is the shape that gets copied to the next table;
--   * leaving the two sections unarmed — the silent hole described above.
--
-- ⚠ AND THE RESIDUE, NAMED RATHER THAN LEFT. A `section` value outside the four
-- below — say a question filed against one of the sections D-45-01 defers — is
-- readable by NOBODY, and it inserts without error because there is no CHECK to
-- refuse it. That is fail-closed, which is the correct direction
-- (`venue-secrecy.md`, *gate default chiuso*; withholding costs visibility, which
-- is recoverable). It is NOT invisible-by-accident, because it is written here,
-- and the repair is one of two things and neither of them is a wildcard arm:
-- file the question with a null `section`, or mint that section's key and add its
-- arm in the migration that builds the section. Whoever writes the surface that
-- creates a register row should offer a CLOSED PICKER over the four values below
-- plus "no section", so the state is unreachable from the product rather than
-- merely documented.

ALTER TABLE public.production_open_question ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_open_question_select_manifesto ON public.production_open_question;
DROP POLICY IF EXISTS production_open_question_select_visual ON public.production_open_question;
DROP POLICY IF EXISTS production_open_question_select_location ON public.production_open_question;
DROP POLICY IF EXISTS production_open_question_select_calendar ON public.production_open_question;
DROP POLICY IF EXISTS production_open_question_select_brandwide ON public.production_open_question;

CREATE POLICY production_open_question_select_manifesto ON public.production_open_question
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.has_capability('production.manifesto.manage'))
    AND section = 'manifesto'
  );

CREATE POLICY production_open_question_select_visual ON public.production_open_question
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.has_capability('production.visual.manage'))
    AND section = 'visual'
  );

CREATE POLICY production_open_question_select_location ON public.production_open_question
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.has_capability('production.location.manage'))
    AND section = 'location'
  );

CREATE POLICY production_open_question_select_calendar ON public.production_open_question
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.has_capability('production.calendar.manage'))
    AND section = 'calendar'
  );

-- The brand-wide entry: a question that belongs to no single body of rules, so
-- any section holder may read it. `IS NULL` and not a comparison — see the
-- paragraph above, which is the reason this arm exists as its own statement.
CREATE POLICY production_open_question_select_brandwide ON public.production_open_question
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    section IS NULL
    AND (
      (SELECT private.has_capability('production.manifesto.manage'))
      OR (SELECT private.has_capability('production.visual.manage'))
      OR (SELECT private.has_capability('production.location.manage'))
      OR (SELECT private.has_capability('production.calendar.manage'))
    )
  );

-- =============================================================================
-- 5. public.production_visual_asset — the VISUAL key
-- =============================================================================
--
-- One arm and one key, because the table holds one section's material: the
-- produced pieces and the photograph archive a listing is pulled from.
--
-- The row carries an artist name, and that name is internal until the date is
-- announced — a person who has agreed to play on a date nobody has communicated
-- is material in exactly the sense a space under negotiation is
-- (`20260817120200_production_sections.sql:292-311`). This arm is what makes the
-- row unreachable to a session without the visual key; the BYTES it points at are
-- a separate question with a separate answer, and the answer is the private
-- bucket of `20260817120400_visual_archive_bucket.sql`. Neither one covers the
-- other: a policy on the row does not protect the object, and a private bucket
-- does not protect the row.

ALTER TABLE public.production_visual_asset ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_visual_asset_select_visual ON public.production_visual_asset;

CREATE POLICY production_visual_asset_select_visual ON public.production_visual_asset
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((SELECT private.has_capability('production.visual.manage')));

-- =============================================================================
-- 6. THE FIRST ABSENCE — THE FIVE TABLES HAVE READ ARMS AND NOTHING ELSE
-- =============================================================================
--
-- ⚠ DELIBERATE, AND STATED RATHER THAN LEFT TO BE INFERRED. The three other
-- policy commands are absent from this file on purpose. (The command words are
-- not spelled out here: `formats/actions.ts:58-63` records the reason — a search
-- whose only match is the sentence forbidding the thing is a search that gets
-- ignored the third time it goes red.)
--
-- Option A of `45-RESEARCH.md` §C4 is taken DELIBERATELY, and it is the shape the
-- calendar's six tables already have. Writes arrive with the SERVICE client,
-- which bypasses every policy, so a write arm here would constrain nothing on the
-- only path that writes — while reading to the next person as though the boundary
-- were covered. With row level security enabled and the ten read arms above, no
-- session — anonymous, authenticated, or a master's — can add, edit or remove a
-- row on any of the five through PostgREST.
--
-- D-45-06 is about WHICH KEY covers write, not about WHERE the check lives, and
-- criterion 4 of this phase asks about READ paths. Option B — a cookie-bound
-- client with write arms asking the section key — is the stronger boundary and
-- was not taken; it diverges from the house shape, and a refused write returns a
-- PostgREST error to a caller, which is the surface D-45-18 exists to keep from
-- being logged whole.
--
-- Six tables in this repository already omit their write policies on purpose
-- (`20260805120000_door_scan_events.sql:158-163`,
-- `20260808002000_membership_register.sql:337-343`,
-- `20260809000000_party_assignments.sql`, `20260809003000_party_credits.sql`,
-- `20260810120000_formats_and_series.sql:452-476`, and the six calendar tables of
-- `20260817120000`). Without this paragraph the next reader takes the gap for a
-- bug and repairs it — and the repair is one permissive arm away from letting an
-- authenticated session write the street address of a space nobody has phoned.
--
-- WHAT THIS DOES NOT CLAIM, and it is the sharpest sentence the calendar's file
-- had: **the service client is not a boundary; it is the absence of one.** What
-- decides WHO may write one of these rows is the guard inside the Server Action
-- of plans 45-13 and 45-15, asking that section's key. Saying so here is not the
-- same as enforcing it here, and conflating the two is how a feature ends up
-- protected by the middleware alone.

-- =============================================================================
-- 7. THE SECOND ABSENCE — NO EDGE TOWARD THE ONE PUBLIC ROAD TO AN ADDRESS
-- =============================================================================
--
-- ⚠ DECLARED HERE, DEMONSTRATED IN PLAN 45-06. The distinction is the whole point
-- of this paragraph, so it comes first: what follows is a STATEMENT ABOUT THIS
-- FILE, and a comment is not a proof. Plan 45-06 owns the closure walk and the
-- catalogue read that turn it into one, and this file does not claim to have done
-- that work.
--
-- The statement: no policy in this file, and no view or function created by it —
-- it creates neither — mentions `public.venues`, `public.event_parties` or
-- `public.events`. Nothing above joins a scouting row to a night.
--
-- WHY IT MATTERS ENOUGH TO WRITE DOWN. `public.venue_for_parties` is THE ONLY
-- PUBLIC ROAD TO AN ADDRESS in this product, and it is public by design: it
-- decides PER NIGHT whether this caller may be told this night's venue
-- (`20260810161000_venues_read_narrowed.sql:267-275`). A scouting row carries a
-- street address (D-45-24) for a space nobody has phoned. If any structure in
-- this phase gave `venue_for_parties` a path to a `production_space` row, an
-- anonymous visitor would reach the address of a space under negotiation through
-- a function built to answer a completely different question — and would reach it
-- without any policy above being wrong.
--
-- That is the structural half of D-45-21, and it is why the location section is
-- Critical rather than merely internal. The ONE crossing that is allowed to exist
-- is the promotion act of D-45-10, which is a deliberate write into `venues` from
-- a single acquisition stage and is subject to the reveal guard from the moment
-- it lands. `production_space.promoted_venue_id` points OUTWARD, from the
-- scouting row to the venue it became; it is not a road back.

COMMIT;
