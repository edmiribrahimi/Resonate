-- Public credits for a night — the table whose guarantee is a MISSING COLUMN
-- Phase 35, Plan 05: ASSIGN-06, ASSIGN-07
--
-- Changes:
-- 1. public.party_credits — who is credited on a night, by relation to
--    `public.artists`, with NO column naming an account and NO write policy
-- 2. its RLS, which INHERITS the publication gate of `event_parties` and must
--    never be given the unconditional read its nearest neighbour carries
-- 3. the sentence that says which of `event_parties.lineup` and this table wins
--    for what — a deliverable of this migration, not a courtesy
--
-- Three changes, ONE transaction, and each half is bad in its own way:
--
--   * the table without its RLS is the LINE-UP OF EVERY NIGHT, announced or not,
--     readable in full by anyone holding the anonymous key through PostgREST.
--     `sound-manifesto.md`, gate *la line-up e' materiale, non manifesto*: who
--     plays a date that has not been communicated is exactly the class of fact
--     this project keeps closed until the moment it chooses;
--   * the RLS without the table is two `DROP POLICY IF EXISTS` against a
--     relation that does not exist — `42P01`, and the whole queue behind it
--     unapplied;
--   * the table without the paragraph on `lineup` is a SECOND source for the
--     same fact with nothing saying which one wins, which is the failure
--     `production-calendar.md` names *«il calendario batte il tracker»*: the
--     first question of every later reader becomes *which one is right*, and
--     until somebody answers it the answer is whichever query they opened first.
--
-- THE SHAPE IS COPIED FROM `20260226100000_artist_profiles.sql`. THE READ POLICY
-- IS NOT, AND THAT IS THE WHOLE POINT OF THIS FILE. See section 2.
--
-- AND ITS IDEMPOTENCE IS NOT A MODEL EITHER. That file carries none: `:18-19`
-- are bare `alter table … add constraint` and `:25`, `:30`, `:42`, `:54` are
-- bare `create policy`. A second run of it raises `42710`. This queue is applied
-- BY HAND, one row at a time
-- (`.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md`), so:
--
--   * `CREATE TABLE IF NOT EXISTS` for `public.party_credits`, with both named
--     constraints declared INSIDE it — re-running this file against a database
--     that already holds the table is a no-op on the table, which is the
--     intended behaviour. A CHANGED constraint set is a NEW migration, never an
--     edit to this one (`supabase-data.md`, gate *migration in avanti*);
--   * `IF NOT EXISTS` on the index;
--   * `DROP POLICY IF EXISTS` before each of the two policies.
--
-- Re-eseguire deve essere sicuro, o nessuno ri-esegue quando dovrebbe.

BEGIN;

-- =============================================================================
-- 1. public.party_credits — who is credited on a night
-- =============================================================================
--
-- WHAT A ROW IS: one artist, credited in one role, on one night, recorded by
-- somebody. It is an ATTRIBUTION and nothing else. It grants no tool, opens no
-- door, and — section 1a — cannot be turned into a grant without a migration.

CREATE TABLE IF NOT EXISTS public.party_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHICH NIGHT. `CASCADE`, the same choice `party_assignments.party_id` makes
  -- (`20260809000000:225-231`) and for the same reason: a credit on a night that
  -- no longer exists is not evidence of anything. The evidence of a published
  -- night is the material that went out, and that lives outside this database.
  party_id uuid NOT NULL REFERENCES public.event_parties ON DELETE CASCADE,

  -- WHO IS CREDITED — by RELATION to a catalogue row, never by name repeated
  -- here. `ON DELETE RESTRICT` and not `CASCADE`: deleting an artist who is
  -- credited on a night would silently rewrite what that night was, and the
  -- credit is the only structured record that the attribution was ever made.
  -- Detach the credit first, which is a deliberate act.
  artist_id uuid NOT NULL REFERENCES public.artists ON DELETE RESTRICT,

  -- IN WHICH ROLE. Four values, and the constraint is NAMED so that a refusal
  -- arrives as `party_credits_credit_check` and not as an anonymous `23514`
  -- somebody has to go looking for.
  --
  -- The four are ROLES AT A NIGHT, deliberately: they say what somebody did, not
  -- what they sound like. This repository holds no sonic identity for RamaDub,
  -- MotionLab or Resonate, and inventing an enumeration that implied one would
  -- be writing the brand on behalf of whoever owns it (`sound-manifesto.md`,
  -- gate *non-scritto e' una risposta, inventato non lo e'*).
  credit text NOT NULL,

  -- THE ORDER THE CREDITS ARE SHOWN IN. `smallint` with a default, exactly as
  -- `event_parties.sort_order` (`20260225150000:20`): a display concern, and it
  -- carries no meaning about seniority or fee.
  sort_order smallint NOT NULL DEFAULT 0,

  -- WHO RECORDED THE ROW — **never who the artist is**. This is `created_by` in
  -- the sense `public.artists` already uses it (`20260226100000:12`): the
  -- account that performed the insert. `ON DELETE SET NULL`, because no
  -- constraint on this table reads it, so losing it costs attribution and
  -- disarms nothing — and an author who later leaves the project has not
  -- un-performed their acts (`20260808002000:205-207`).
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,

  -- The server clock. A device clock is evidence, never authority.
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT party_credits_credit_check CHECK (
    credit IN ('dj', 'photographer', 'host', 'visual')
  ),

  -- The same artist, in the same role, twice on the same night is a duplicate
  -- and not a fact. Two DIFFERENT roles for the same artist on the same night —
  -- somebody who plays and also shoots — is legitimate and this key allows it.
  CONSTRAINT party_credits_unique UNIQUE (party_id, artist_id, credit)
);

-- -----------------------------------------------------------------------------
-- 1a. THE ABSENCE — ASSIGN-06 and ASSIGN-07, expressed as a column that is not
--     here
-- -----------------------------------------------------------------------------
--
-- THE REQUIREMENT, in one sentence: a person can be credited on a night WITHOUT
-- HAVING AN ACCOUNT, and a credit grants access to nothing.
--
-- THERE IS NO COLUMN ON THIS TABLE THAT NAMES AN ACCOUNT. Not `user_id`, not
-- `profile_id`, not `auth_user_id`, not a nullable one "for later". **The
-- absence IS the guarantee**, and it is worth more than any comment saying the
-- same thing, for a reason that can be written as the join nobody can write.
--
-- THE JOIN SOMEBODY WOULD WRITE IN GOOD FAITH. The capability resolver
-- (`20260807000000_capability_model.sql:209-216`, and the per-night arm added by
-- `20260809001000_assignment_resolver.sql`) starts from `auth.uid()` and asks
-- whether some row attaches a capability to it. A credit table carrying an
-- account column would be one arm away from being that row:
--
--     join public.party_credits pc on pc.user_id = auth.uid()
--
-- Nobody would need bad intent to write it. It reads as an obvious convenience —
-- *«the dj is credited on tonight, of course the dj may upload tonight's
-- media»* — and it converts a PUBLIC ATTRIBUTION into an ACCESS GRANT, on a
-- table whose rows are created by whoever curates the catalogue rather than by
-- whoever grants work permissions.
--
-- **That join is not writable against this table.** `pc.user_id` does not exist,
-- so the statement fails to parse. Adding it takes a migration — which is a
-- reviewed, dated, visible decision — and not an autocomplete.
--
-- This is the SAME reasoning as the `granted` column that does not exist on
-- `private.role_capabilities` (`20260808000500_staff_role.sql:154-171`): there, a
-- refusal is the absence of a row, and a `granted = false` column would have read
-- as a denial to a human and as a permission to Postgres. Here, a non-grant is
-- the absence of a column, and an account column would read as a convenience to
-- a human and as an authorisation surface to the resolver. In both cases the
-- structure carries the decision, because a comment can be ignored.
--
-- WHAT ENFORCES IT ON THE OTHER SIDE. `PartyCreditRow` in `src/types/database.ts`
-- has no account field either, so a credit that TRIED to carry one would not
-- compile — that is the second half of the guarantee, and `npm run build` holds
-- it. The third half is `npm run verify:no-credit-account`, which exits 1 if any
-- file of the credit path acquires the ability to CREATE an account: in a
-- community whose entry is by referral and approval, creating an account IS
-- granting membership (`community-membership.md`, gate *nessuna corsia grigia*),
-- so *«credit a photographer»* must never become *«admit a member»*.

-- The read this table actually serves is *"the credits of this night"*, and it
-- is already covered: `party_credits_unique` creates a btree index leading with
-- `party_id`, so no second index on that column is added here — a redundant
-- index is write cost with no read benefit, and the next reader would have to
-- work out which of the two the planner uses.
--
-- The index below serves the OTHER direction, *"which nights is this artist
-- credited on"*, and it is also what makes the `ON DELETE RESTRICT` above cheap:
-- without it, deleting an artist scans this table.
CREATE INDEX IF NOT EXISTS idx_party_credits_artist ON public.party_credits (artist_id);

-- =============================================================================
-- 2. RLS — the gate that is INHERITED, and the neighbour that must not be copied
-- =============================================================================
--
-- THE GATE THAT IS WRONG HERE IS LITERALLY NEXT DOOR, AND IT LOOKS LIKE THE
-- SYMMETRICAL CHOICE. `public.artists` — the table this one points at, written
-- in the same repository, with almost the same shape — is readable by everyone
-- unconditionally: `artists_select_public` (`20260226100000:25-27`) has a `USING`
-- clause whose predicate is the constant true, with no test at all.
--
-- (Described rather than quoted, deliberately, and the precedent is
-- `35-02-SUMMARY.md` deviation 3: the acceptance check for this file greps for
-- that literal, and the only match would be the sentence forbidding it. A check
-- one has to read around stops being read.)
--
-- COPYING IT HERE WOULD PUBLISH AN UNANNOUNCED LINE-UP THE INSTANT A ROW IS
-- INSERTED. Not when the night is announced — at insert. The catalogue surface
-- exists so that credits can be prepared BEFORE the announcement; an
-- unconditional read turns every preparation into a publication, and whoever
-- inserted the row would have no way of knowing.
--
-- AND THAT IS IRREVERSIBLE. It is `venue-secrecy.md` applied to the line-up
-- instead of the address: a `DELETE` afterwards does not un-publish anything,
-- because the screenshot exists and the scraper already ran. `meta-gates.md`
-- lists the venue reveal as a one-way switch; a line-up that has gone out is the
-- same switch under a different name, and this project's rule for those is that
-- a change may only ever make them HARDER to trip.
--
-- WHY THE SYMMETRY WITH `public.artists` IS FALSE ANYWAY. That table holds a
-- CATALOGUE — a name, a bio, links an artist publishes about themselves. This
-- table holds a RELATION between an artist and a NIGHT, and it is the night, not
-- the artist, that carries the secret. The right neighbour to copy is therefore
-- `event_parties_select_published` (`20260225150000:31-37`), which is the gate
-- the night is already behind.
--
-- THE CONSEQUENCE OF GETTING IT WRONG, MEASURED AGAINST WHAT ALREADY EXISTS.
-- `event_parties.lineup` — the communicated text, section 4 — is readable only
-- through `event_parties`, and therefore only for a published event. An
-- unconditional read here would have made the STRUCTURED attribution of a night
-- more public than its own communicated line-up, on the same night, through the
-- same anonymous key. The two now agree, and that agreement is the invariant.

ALTER TABLE public.party_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS party_credits_select_published ON public.party_credits;

-- The publication gate, inherited through the night. `ep.id = party_id` compares
-- the inner alias against THIS table's column — `event_parties` has no column of
-- that name, so the reference is unambiguous, the same shape
-- `event_parties_select_published` uses with `event_id`.
CREATE POLICY party_credits_select_published ON public.party_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.event_parties ep
        JOIN public.events e ON e.id = ep.event_id
       WHERE ep.id = party_id
         AND e.is_published = true
    )
  );

DROP POLICY IF EXISTS party_credits_select_catalogue_manage ON public.party_credits;

-- Whoever curates the catalogue sees what is not yet published — otherwise the
-- surface that prepares a line-up could not read back what it just wrote.
--
-- The `(select …)` wrapper is LOAD-BEARING and it is not `STABLE` that produces
-- it: it makes Postgres evaluate the call once per statement as an InitPlan
-- instead of once per row (`20260807000000_capability_model.sql:177-184`). A new
-- policy written in the older `public.is_admin_or_organizer()` shape would be
-- both a wrong predicate and a per-row call.
--
-- `catalogue.manage` and not a new key: it is the key that already governs
-- `public.artists` and `public.venues`
-- (`20260807010000_policies_to_capabilities.sql:79-85, 411-417`), it is held by
-- `master` and `organizer` alone, and `staff` was refused it on purpose
-- (`20260808000500_staff_role.sql:143-152`). A credit is catalogue work. Minting
-- a ninth key for it would create a permission nobody holds and a decision
-- nobody took.
CREATE POLICY party_credits_select_catalogue_manage ON public.party_credits
  FOR SELECT USING ((SELECT private.has_capability('catalogue.manage')));

-- =============================================================================
-- 3. No INSERT, UPDATE or DELETE policy — and the omission is DELIBERATE
-- =============================================================================
--
-- Writes arrive from the catalogue surface with the SERVICE client, which
-- bypasses every policy: a write policy here would therefore constrain nothing
-- on the only path that writes, while reading to the next person as though the
-- boundary were covered. With RLS enabled and no write policy, no session —
-- anonymous, authenticated, or a master's — can add, edit or remove a row
-- through PostgREST.
--
-- Two other tables in this repository omit their write policies on purpose
-- (`20260805120000_door_scan_events.sql:158-163`,
-- `20260808002000_membership_register.sql:337-343`), and
-- `20260809000000_party_assignments.sql` is the third. Without this paragraph
-- the next reader takes the gap for a bug and repairs it — and the repair is one
-- `CREATE POLICY` away from letting an authenticated session write the line-up
-- of a night.
--
-- WHAT THIS DOES NOT CLAIM. The service client is not a boundary; it is the
-- absence of one. Whatever the catalogue surface decides about WHO may write a
-- credit is decided in that surface's own guard, and it is `catalogue.manage`
-- that it must ask. Saying so here is not the same as enforcing it here, and
-- conflating the two is how a feature ends up protected by the middleware alone
-- (`CLAUDE.md`, operating principle 2).

-- =============================================================================
-- 4. `event_parties.lineup` and `public.party_credits` — which wins for what
-- =============================================================================
--
-- BOTH EXIST, AND BOTH KEEP EXISTING AFTER THIS MIGRATION. `event_parties.lineup
-- text[] NOT NULL DEFAULT '{}'` was added on 26 February 2026
-- (`20260226400000_party_lineup_venue_secret.sql:4-6`) and has no foreign key to
-- `public.artists`. This file adds a second place where the same night's names
-- can be found. **Two sources for one fact, with no sentence saying which wins,
-- is the failure `production-calendar.md` calls «il calendario batte il
-- tracker»** — where the damage was not that the two disagreed but that nobody
-- had said in advance which one to believe. So:
--
--   `event_parties.lineup` is THE COMMUNICATED TEXT.
--       Free text, in the spelling the night is communicated with — the artist's
--       name exactly as it goes on the material, `brand-visual-system.md` gate
--       *spelling degli artisti*. It is what a public surface RENDERS. It may
--       hold a name that has no catalogue row, and that is not a defect: it is
--       the reason the column stays.
--
--   `public.party_credits` is THE ATTRIBUTION.
--       A relation to a `public.artists` row, with a role and an order. It is
--       what a query JOINS — *"which nights is this artist credited on"*, *"who
--       shot this night"*. It is structured, and it is exactly as public as the
--       night is.
--
--   WHICH WINS: for anything DISPLAYED as the line-up of a night, `lineup` wins.
--   For anything that asks WHICH ARTIST ROW a name refers to, `party_credits`
--   wins. Neither is derived from the other, and **no code in this phase writes
--   one from the other**.
--
-- NO MIGRATION BETWEEN THEM IN THIS PHASE, and that is a decision rather than an
-- omission. Backfilling `lineup` into credits would demand matching free text to
-- catalogue rows — the class of operation that silently mis-attributes a night
-- and, once it has, leaves nothing saying it did. Whoever takes it on owns three
-- questions this file does not answer: what happens to a name with no artist
-- row, whether `lineup` becomes derived or stays authoritative, and what the
-- public surfaces read during the changeover. **It belongs to a later phase that
-- NAMES it** — until such a phase exists, the two coexist under the paragraph
-- above, and the paragraph is the deliverable.
--
-- WHAT NEITHER OF THEM IS. Neither holds an address, and neither may be used to
-- imply one. A credit says who was on a night; `event_parties.venue_secret` and
-- `20260226400000` decide whether the night's place may be shown at all, and
-- nothing here touches that switch.

-- =============================================================================
-- 5. THE NEW WAY TO REFUSE AN OPERATION, and it reaches nobody yet
-- =============================================================================
--
-- `ON DELETE RESTRICT` on `artist_id` means **an artist who is credited on any
-- night can no longer be deleted.** That is the intended behaviour — see the
-- column above — but it is a NEW REFUSAL on a path that already existed, and
-- this project's rule is that those are declared, not discovered.
--
-- MEASURED, not reasoned. `npm run baseline:compare --target=container
-- --before-point=35-02 --after-point=35-05` reports three cells moving:
--
--     master/approved × artists × delete   ok:1 → 23503
--     master/pending  × artists × delete   ok:1 → 23503
--     master/rejected × artists × delete   ok:1 → 23503
--
-- No policy changed — `artists_delete_master` is byte-identical across the two
-- captures. The comparator labels this NARROWING because it compares outcomes
-- and cannot see that a constraint, not a policy, produced it: in the harness
-- every seeded artist is credited, so every delete now hits the key. In
-- production only a CREDITED artist is protected.
--
-- WHY IT IS THE RIGHT DIRECTION ANYWAY. The alternatives are worse in a way that
-- is not recoverable: `CASCADE` would let one delete silently rewrite what a
-- night was, and `SET NULL` cannot exist on a `NOT NULL` column. A refusal is
-- reversible by detaching the credit; a rewritten night is not.
--
-- WHAT IS NOT DONE HERE, AND MUST BE. Today the deletion path at
-- `src/app/(organizer)/organizer/artists` would surface this as whatever a raw
-- PostgREST error looks like. This repository has NO ERROR TRACKING
-- (`meta-gates.md`), so an unexplained failure on that button reaches a human
-- only if that human is looking at it. The refusal must name the nights that
-- block it and offer detaching them — the same shape `20260809000000:
-- section 3c` demands for a demotion blocked by a live assignment, and the same
-- gate: a failure that matters needs an OBSERVABLE EFFECT, not a log line.
-- Recorded in `.planning/phases/35-per-night-assignments/deferred-items.md`; it
-- is NOT done in this plan, and saying so is the point.

COMMIT;
