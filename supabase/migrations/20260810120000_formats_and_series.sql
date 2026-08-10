-- Formats, series and the stored number of a night — the file whose deliverable
-- is a REFUSAL
-- Phase 36, Plan 03: FMT-01, FMT-02, FMT-03, FMT-05, FMT-06
--
-- Changes:
-- 1. public.formats — the catalogue of formats, with a switch (`listed`) that
--    says WHICH PART of the catalogue is public catalogue
-- 2. public.party_series — the catalogue of series, whose public name may carry
--    a venue, and which therefore must NOT be given the unconditional read its
--    two catalogue neighbours carry
-- 3. three columns on public.event_parties — `format_id`, `series_id`,
--    `number` — nullable at birth, with NO default, then backfilled explicitly
-- 4. their RLS — TWO OPPOSITE READ ANSWERS, each argued where it is written.
--    It comes AFTER the columns, and section 3 says why that order is not
--    optional
-- 5. public.bump_series_watermark() and its trigger — the water level of a
--    series, which RISES and never falls
-- 6. the backfill, the guard that counts before anything is tightened, and the
--    named constraints that make FMT-03 a fact rather than a hope
--
-- Six changes, ONE transaction, and each half is bad in its own way:
--
--   * the catalogue WITHOUT its RLS is the SERIES CATALOGUE readable in full
--     through PostgREST — every series name, venue-bearing ones included, to
--     anyone holding the anonymous key. `venue-acquisition.md`, gate *uno spazio
--     non acquisito non si nomina*: a series is created BEFORE its first night,
--     so an unconditional read publishes a place at the moment somebody
--     prepares it, and a later DELETE un-publishes nothing;
--   * the RLS WITHOUT the tables is `DROP POLICY IF EXISTS` against relations
--     that do not exist — `42P01`, and the whole queue behind it unapplied;
--   * the columns WITHOUT the backfill is `SET NOT NULL` on a populated table:
--     `23502`, transaction in rollback, nothing applied;
--   * the backfill WITHOUT the guard is that same `23502` — raised by Postgres,
--     on a table, naming no row and giving no reason. The guard below turns it
--     into a sentence with a count in it.
--
-- THE SHAPE IS COPIED FROM `20260809003000_party_credits.sql`. Its join column
-- is NOT, and section 4b is the whole reason this file exists in the form it
-- does.
--
-- IDEMPOTENCE, DECLARED. This queue is applied one row at a time, by hand
-- (`36-RESEARCH.md` §6), and re-applying a file out of doubt is the natural
-- reaction to a doubt. So:
--
--   * `CREATE TABLE IF NOT EXISTS`, with every constraint declared INSIDE the
--     table. A CHANGED constraint set is a NEW migration, never an edit to this
--     one (`supabase-data.md`, gate *migration in avanti*);
--   * `IF NOT EXISTS` on every index and on every `ADD COLUMN`;
--   * `DROP POLICY IF EXISTS` before each of the four policies;
--   * `ON CONFLICT ... DO NOTHING`, on the NAMED unique constraint, for every
--     seeded row;
--   * a `DO` block that creates a constraint only if `pg_constraint` does not
--     already hold it — and NOT `DROP CONSTRAINT IF EXISTS` + `ADD`, for the
--     reason measured at `20260809000000:200-226`: `IF EXISTS` suppresses *"it
--     does not exist"*, not *"something depends on it"*, so the second run fails
--     `2BP01` with the transaction in rollback;
--   * the backfill fills only what is EMPTY (`AND format_id IS NULL`), so a
--     second run cannot overwrite a correction a person made after the first.
--
-- THIS FILE IS WRITTEN HERE AND APPLIED ELSEWHERE. Plan 36-04 exercises it in a
-- throwaway `postgres:17.6`; plan 36-05 applies it to production through
-- `POST https://api.supabase.com/v1/projects/{ref}/database/migrations`. There
-- is no `supabase` CLI on the machine that wrote it, so `supabase db push` is
-- not a step anybody can run here.
--
-- AND THIS FILE IS A PUBLICATION. `supabase/migrations/` is tracked and
-- `github.com/edmiribrahimi/Resonate` is public. Every name seeded below already
-- exists in a tracked rules file — the five series names were cleared one by
-- one, with the `file:line` where each was already published, in
-- `36-02-SUMMARY.md`. The three production nights are identified BY UUID and
-- never by title or venue, for the same reason. MotionLab ships with NO SERIES,
-- and that absence is the point rather than an omission: the series it needs is
-- a venue-named one, and that name cannot be written into a public file today.

BEGIN;

-- =============================================================================
-- 1. public.formats — what a night IS
-- =============================================================================
--
-- WHAT A ROW IS: one recurring identity a night can belong to — its name as a
-- visitor reads it, its internal code, and the colour that identifies it on a
-- surface. It says nothing about when that identity runs, and nothing about what
-- it sounds like.
--
-- IT SAYS NOTHING ABOUT WHAT IT SOUNDS LIKE, DELIBERATELY. This repository holds
-- no written sonic identity for three of the four formats seeded below, and a
-- column, a CHECK or a seeded adjective implying one would be writing the brand
-- on behalf of whoever owns it. The same refusal is already recorded at
-- `20260809003000:77-81` for the same reason (`sound-manifesto.md`, gate
-- *non-scritto e' una risposta, inventato non lo e'*).

CREATE TABLE IF NOT EXISTS public.formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- THE ADDRESS. `/events?format=<slug>` (D-36-15) — so this value travels in a
  -- link somebody may have sent to somebody else, and changing it breaks that
  -- link. Named unique, so the collision arrives as `formats_slug_unique`.
  slug text NOT NULL,

  -- THE STRING A VISITOR READS, stored verbatim. `re:sonate` with a normal e,
  -- `SunSet` / `RamaDub` / `MotionLab` in CamelCase — the reversed e lives only
  -- inside the drawn logo and is not a character anybody types
  -- (`brand-visual-system.md`, gate *grafia del brand*). No surface derives this
  -- from the slug or from the code: FMT-05 says the label comes from the data.
  name text NOT NULL,

  -- THE INTERNAL CODE — `RSNT`, `SNST`, `RMDB`, `MTNLB`. It is half of a sigla
  -- (FMT-02: the code and the number COMPOSE it) and it is NEVER a public
  -- surface on its own.
  code text NOT NULL,

  -- THE IDENTIFICATION COLOUR, as a seven-character hex string.
  --
  -- IN THE DATABASE AND NOT IN A COMPONENT, because D-36-12 says changing a
  -- colour must not need a deploy, and because Tailwind cannot generate a class
  -- from a runtime value — the value travels to an inline `style`, which is new
  -- to this codebase and is stated as new rather than implied as precedent.
  --
  -- THE FOUR VALUES ARE ADOPTED, NOT INVENTED (D-36-11): they were already
  -- decided and already public. This is the IDENTIFICATION colour — the dot on a
  -- chip, the marker on a card — and not the palette of the materials, which is
  -- a different thing that shares a word.
  color text NOT NULL,

  -- THE SWITCH — and it is the column a later reader would delete as redundant
  -- against `retired_at`. It is not. The two say different things:
  --
  --     `retired_at`  says NO NEW NIGHT MAY BE ASSIGNED TO THIS.
  --     `listed`      says A PERSON HAS DECIDED THIS MAY BE SEEN.
  --
  -- D-36-17: existing in the catalogue and appearing in the public filter are
  -- two separate acts. Without this column the only criterion would be the
  -- existence of the row — so a fifth format created in September for a series
  -- that starts in November would be ANNOUNCED BY THE PRODUCT, in the moment
  -- somebody pressed save, to anyone who opened `/events`.
  --
  -- It is the same separation `public.events` already has with `is_published`,
  -- applied to the catalogue. And it is what the read policy in section 4a asks,
  -- so the decision is enforced at the row and not at the page.
  listed boolean NOT NULL DEFAULT false,

  -- RETIREMENT IS NOT DELETION (D-36-10). Forward-looking surfaces — the chip
  -- row, the select for a new assignment — filter `retired_at IS NULL`; the
  -- archive keeps rendering what a night actually carried, because those nights
  -- went out under that name and the material exists. A timestamp and not a
  -- boolean, because WHEN a sigla was retired is itself a fact somebody needs.
  retired_at timestamptz,

  -- THE ORDER THE CATALOGUE IS SHOWN IN, and nothing else. Spaced by ten so a
  -- fifth format can be placed between two without touching the others.
  --
  -- This is a DISPLAY concern and has no relation to the series progressivo
  -- below: `sort_order` may be rewritten freely, `number` may not.
  sort_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- WHO RECORDED THE ROW. `public.profiles`, whose `id` IS `auth.users.id`
  -- (`schema.sql:55`), so this names the same account `party_credits.created_by`
  -- names through the other side. `ON DELETE SET NULL`: no constraint reads it,
  -- so losing it costs attribution and disarms nothing, and an author who later
  -- leaves has not un-performed their acts.
  created_by uuid REFERENCES public.profiles ON DELETE SET NULL,

  CONSTRAINT formats_slug_unique UNIQUE (slug),
  CONSTRAINT formats_code_unique UNIQUE (code),

  -- NAMED, so a bad value arrives as `formats_color_hex_check` and not as an
  -- anonymous `23514` somebody has to go looking for — the discipline of
  -- `20260809003000:73-75`, which D-36-08 asks for by name.
  CONSTRAINT formats_color_hex_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- AN ACTIVE FORMAT'S COLOUR IS ITS OWN — structural instead of remembered.
--
-- PARTIAL, on `retired_at IS NULL`, and the partiality is the whole design:
-- retiring a format RELEASES its colour for the next one, while the retired row
-- keeps the colour its nights actually carried. A total unique index would
-- forbid that, which would mean either rewriting an archived format's colour or
-- never reusing a value again.
CREATE UNIQUE INDEX IF NOT EXISTS formats_color_active_unique
  ON public.formats (color)
  WHERE retired_at IS NULL;

-- =============================================================================
-- 2. public.party_series — WHICH RUN of that format a night belongs to
-- =============================================================================
--
-- WHAT A ROW IS: one numbered run of one format. `re:sonate` has one; a format
-- that visits several venues has one per venue, and the progressivo restarts
-- inside each (D-36-07). The series is what carries the counter — the format
-- does not.
--
-- AND ITS `name` IS THE ONE STRING IN THIS PHASE THAT PUBLISHES. A series name
-- may contain a venue, and a venue that has not been acquired in writing may not
-- be named anywhere (`venue-acquisition.md`; `brand-visual-system.md` repeats
-- it). That single fact decides section 4b.

CREATE TABLE IF NOT EXISTS public.party_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHICH FORMAT THIS IS A RUN OF. `ON DELETE RESTRICT` and not `CASCADE`:
  -- deleting a format under which nights have already run would silently rewrite
  -- what those nights WERE, and D-36-10 says the archive stays as it is. Retire
  -- it instead — which is a deliberate act with a date on it, and which this
  -- table and `public.formats` both support.
  format_id uuid NOT NULL REFERENCES public.formats ON DELETE RESTRICT,

  -- THE PUBLIC NAME, verbatim. Same spelling rules as `formats.name`.
  name text NOT NULL,

  -- THE INTERNAL CODE — the venue-bearing half of a sigla where there is one
  -- (`BZ`, `MR`, `PRLN`), empty of a venue where the sigla has none (`RSNT`,
  -- `SNST`). Internal, never a public surface on its own.
  code text NOT NULL,

  -- Retirement, exactly as on `public.formats` above.
  retired_at timestamptz,

  -- THE WATER LEVEL. The highest progressivo this series has ever handed out —
  -- NOT the count of its nights, and NOT `max(number)`. Section 6 is why.
  highest_assigned integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles ON DELETE SET NULL,

  -- Two series of the SAME format cannot share a code — the code is what a sigla
  -- is built from, so two of them would produce two nights with the same sigla.
  -- Two series of DIFFERENT formats may: `SNST` under SunSet and `SNST` under
  -- something else are different sigle because the format code differs.
  CONSTRAINT party_series_format_code_unique UNIQUE (format_id, code)
);

-- The read this table actually serves is *"the series of this format"* — what
-- the work surface performs on every form render — and it is also what makes the
-- `ON DELETE RESTRICT` above cheap: without it, deleting a format scans this
-- table.
CREATE INDEX IF NOT EXISTS idx_party_series_format ON public.party_series (format_id);

-- -----------------------------------------------------------------------------
-- 2a. The constraint that exists ONLY to be pointed at
-- -----------------------------------------------------------------------------
--
-- `UNIQUE (id, format_id)` is redundant as a rule about data — `id` is already
-- the primary key, so the pair cannot repeat. It is NOT redundant as a
-- REFERENCED KEY: `event_parties_series_format_fk` (section 10) points at
-- exactly these two columns, and Postgres refuses a foreign key whose referenced
-- columns carry no unique constraint (`42830`).
--
-- The `DO` form, and NOT `DROP CONSTRAINT IF EXISTS` + `ADD`: measured at
-- `20260809000000:200-226`, `IF EXISTS` suppresses *"it does not exist"*, not
-- *"something depends on it"*. On a second run the DROP would meet the foreign
-- key that depends on this index and Postgres would answer
--
--     ERROR:  cannot drop constraint ... because other objects depend on it
--
-- which is `2BP01`, the transaction in rollback, and the rest of the queue
-- unapplied. The correct form is to NOT TOUCH a referenced constraint: create it
-- if it is missing, otherwise leave it exactly where it is. There is no
-- `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS` in Postgres — hence the block.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'party_series_id_format_unique'
       AND conrelid = 'public.party_series'::regclass
  ) THEN
    ALTER TABLE public.party_series
      ADD CONSTRAINT party_series_id_format_unique UNIQUE (id, format_id);
  END IF;
END;
$$;

COMMENT ON CONSTRAINT party_series_id_format_unique ON public.party_series IS
  'Redundant against the primary key as a rule about data; NOT redundant as a referenced key. '
  'event_parties_series_format_fk REFERENCES public.party_series (id, format_id) and Postgres '
  'refuses a foreign key whose referenced columns carry no unique constraint (42830). '
  'Do not remove as tidying.';

-- =============================================================================
-- 3. The three columns on the night — NULLABLE, AND WITH NO DEFAULT
-- =============================================================================
--
-- WHY THEY COME BEFORE THE RLS, which is not the order `36-RESEARCH.md` §6
-- proposes. MEASURED in `postgres:17.6` while writing this file: the read policy
-- of section 4b names `ep.series_id`, and Postgres refuses to create a policy
-- that references a column which does not exist yet —
--
--     ERROR:  column ep.series_id does not exist
--
-- with the transaction in rollback. The catalogue tables must exist before the
-- columns can point at them, and the columns must exist before a policy can read
-- one. That is the whole ordering, and it is written here because the research's
-- order looks correct and is not.
--
-- WHY NO DEFAULT, which is the first thing a reader would add. A format derives
-- from nothing: there is no parent row to copy it from, the way
-- `20260226400000_party_lineup_venue_secret.sql:4-16` could copy `lineup` from
-- the event. So a constant default would write THE SAME FORMAT ONTO EVERY NIGHT,
-- which is exactly what D-36-04 forbids — the three existing nights are assigned
-- EXPLICITLY, one statement each, in section 7a.
--
-- And it would be worse than wrong once: a default SURVIVES THE MIGRATION. A
-- night saved by any path that forgets the column would acquire that format
-- silently, with nothing anywhere saying it had happened. That is the failure
-- `meta-gates.md` names, and the absence of a default is what makes it
-- impossible rather than merely discouraged.
--
-- NULLABLE HERE AND TIGHTENED IN SECTION 9, not tightened here: the table is
-- populated, so `NOT NULL` at this point is `23502` on the spot.

ALTER TABLE public.event_parties
  ADD COLUMN IF NOT EXISTS format_id uuid REFERENCES public.formats ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.party_series ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS number integer;

-- =============================================================================
-- 4. RLS — TWO TABLES, TWO OPPOSITE ANSWERS, AND THE DIFFERENCE IS ARGUED
-- =============================================================================
--
-- These two tables look symmetrical and are not. One holds an IDENTITY that a
-- person has decided to announce; the other holds a RUN of that identity, whose
-- name may contain a place. The asymmetry is the same one `party_credits`
-- already argued about `public.artists` (`20260809003000:169-209`): a catalogue
-- of things somebody publishes about themselves is not a relation to a NIGHT,
-- and it is the night that carries the secret.

-- -----------------------------------------------------------------------------
-- 4a. public.formats — readable where, and only where, a person has said so
-- -----------------------------------------------------------------------------
--
-- WHY THIS IS NOT `USING (true)`, EVEN THOUGH ITS TWO NEAREST NEIGHBOURS ARE.
-- `public.venues` and `public.artists` both grant an unconditional read
-- (`20260226200000_venues.sql:25-27` and its twin at `20260226100000:25-27`),
-- and copying that here would look like the symmetrical choice.
--
-- It is not, because A ROW ANYONE CAN READ WITH THE ANONYMOUS KEY IS ANNOUNCED —
-- whether or not any page draws a chip for it. The UI is not in this path:
-- PostgREST is an exit, and `select=*` on this table with the anonymous key is
-- one request. So an unlisted format — a fifth identity created in September for
-- a series that starts in November — would be public from the moment somebody
-- pressed save, announced by the product instead of by a person (D-36-17).
--
-- WHAT THE PUBLIC ARM DOES GRANT is exactly the catalogue D-36-13 wants the chip
-- row built from: the same rows, in the same order, for an anonymous visitor and
-- for somebody who can see drafts (D-36-16). One construction path, for
-- everyone, and it needs no session — which is why the arm exists at all.
--
-- WHAT IT STILL DOES NOT SAY is WHEN anything runs, and this table holds no
-- count of anything (FMT-06, D-36-14). A chip says *"this format exists"*, which
-- is already public; it does not say a night is coming.

ALTER TABLE public.formats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS formats_select_listed ON public.formats;

CREATE POLICY formats_select_listed ON public.formats
  FOR SELECT USING (listed = true);

DROP POLICY IF EXISTS formats_select_catalogue_manage ON public.formats;

-- Whoever curates the catalogue sees what has not been listed yet — otherwise
-- the surface that PREPARES a format could not read back what it just wrote.
--
-- The `(select ...)` wrapper is LOAD-BEARING, and it is not `STABLE` that
-- produces the effect: it makes Postgres evaluate the call once per statement as
-- an InitPlan instead of once per row
-- (`20260807000000_capability_model.sql:177-184`). A policy written in the older
-- `public.is_admin_or_organizer()` shape would be both a wrong predicate and a
-- per-row call.
--
-- `catalogue.manage` and not a new key: it is the key that already governs
-- `public.artists` and `public.venues`, it is held by `master` and `organizer`
-- alone, and `staff` was refused it on purpose
-- (`20260808000500_staff_role.sql:143-152`). A format is catalogue work. Minting
-- a new key for it would create a permission nobody holds and a decision nobody
-- took.
CREATE POLICY formats_select_catalogue_manage ON public.formats
  FOR SELECT USING ((SELECT private.has_capability('catalogue.manage')));

-- -----------------------------------------------------------------------------
-- 4b. public.party_series — readable only THROUGH A PUBLISHED NIGHT
-- -----------------------------------------------------------------------------
--
-- WHY THE ANSWER HERE IS THE OPPOSITE OF 4a. The public name of a series may
-- carry a venue. An unconditional read would publish that name through PostgREST
-- to anyone holding the anonymous key, regardless of what any page decides to
-- draw — and a series is created BEFORE its first night, so the publication
-- would happen at the INSERT, performed by somebody who had no way of knowing.
-- It is `20260809003000:184-195` with a place instead of a line-up, and it is
-- irreversible for the same reason: a DELETE afterwards un-publishes nothing.
--
-- AND THE ARGUMENT THAT WOULD RELAX IT IS ALREADY REFUSED. *"The venues are
-- readable with the anonymous key anyway, so a series name that contains one may
-- be too"* is false. A door already open is not an argument for opening a second
-- one (D-36-18). See section 12b for what that open door is and whose it is.
--
-- ⚠ THE JOIN COLUMN IS QUALIFIED, AND THE QUALIFICATION IS THE ENTIRE POLICY.
--
-- `party_credits` writes `ep.id = party_id` and explains (`:215-218`) that the
-- reference is unambiguous because `event_parties` HAS NO COLUMN OF THAT NAME.
-- That sentence is true there and FALSE here: after section 3 of this very file,
-- `public.event_parties` HAS a column called `series_id`.
--
-- So the unqualified form `WHERE ep.series_id = series_id` resolves BOTH sides
-- to the inner alias. It becomes
--
--     ep.series_id = ep.series_id
--
-- which is true for every published night, which makes the `EXISTS` true for
-- every row of this table, which is `USING (true)` IN DISGUISE — the whole series
-- catalogue, venue-bearing names included, handed to the anonymous key. It
-- compiles. It never fails. Nothing in a test or a page would look wrong.
--
-- The next person to read `party_series.id` below will think the qualification is
-- redundant, because in the file this was copied from it would have been. It is
-- not redundant here. Do not simplify it.
--
-- Measured and recorded as `36-RESEARCH.md` Pitfall 3; plan 36-05 reads
-- `pg_policies.qual` back and asserts the rendered predicate names this table.

ALTER TABLE public.party_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS party_series_select_published ON public.party_series;

-- The publication gate, INHERITED through the night — the same gate the night is
-- already behind (`20260225150000:31-37`).
CREATE POLICY party_series_select_published ON public.party_series
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.event_parties ep
        JOIN public.events e ON e.id = ep.event_id
       WHERE ep.series_id = party_series.id
         AND e.is_published = true
    )
  );

DROP POLICY IF EXISTS party_series_select_catalogue_manage ON public.party_series;

-- The same capability arm as 4a, for the same reason and with the same wrapper:
-- the surface that prepares a series must be able to read back what it wrote,
-- and it must be able to do so BEFORE any night references it.
CREATE POLICY party_series_select_catalogue_manage ON public.party_series
  FOR SELECT USING ((SELECT private.has_capability('catalogue.manage')));

-- -----------------------------------------------------------------------------
-- 4c. No INSERT, UPDATE or DELETE policy on either table — DELIBERATE
-- -----------------------------------------------------------------------------
--
-- Writes arrive from the catalogue surface with the SERVICE client, which
-- bypasses every policy. A write policy here would therefore constrain nothing
-- on the only path that writes, while reading to the next person as though the
-- boundary were covered. With RLS enabled and no write policy, no session —
-- anonymous, authenticated, or a master's — can add, edit or remove a row on
-- either table through PostgREST.
--
-- Three tables in this repository already omit their write policies on purpose
-- (`20260805120000_door_scan_events.sql:158-163`,
-- `20260808002000_membership_register.sql:337-343`,
-- `20260809000000_party_assignments.sql`), and `20260809003000_party_credits.sql`
-- is the fourth. Without this paragraph the next reader takes the gap for a bug
-- and repairs it — and the repair is one `CREATE POLICY` away from letting an
-- authenticated session write the name of a series.
--
-- WHAT THIS DOES NOT CLAIM. The service client is not a boundary; it is the
-- absence of one. What decides WHO may write a catalogue row is the guard inside
-- the server action, and it is `catalogue.manage` that it must ask
-- (`src/app/(admin)/admin/venues/actions.ts:64-85` is the model). Saying so here
-- is not the same as enforcing it here, and conflating the two is how a feature
-- ends up protected by the middleware alone (`CLAUDE.md`, operating principle 2).

-- =============================================================================
-- 5. The catalogue rows — every name below is ALREADY PUBLISHED
-- =============================================================================
--
-- Confirmed by the owner on 2026-08-10 and transcribed from `36-02-SUMMARY.md`,
-- which carries the `file:line` where each name already existed in a tracked
-- rules file. Nothing here is a new publication. Nothing here says what any
-- format sounds like.
--
-- The colours are the identification colours fixed by D-36-11 — adopted, not
-- invented.

INSERT INTO public.formats (slug, name, code, color, listed, sort_order)
VALUES
  ('resonate',  're:sonate', 'RSNT',  '#A874E8', true, 10),
  ('sunset',    'SunSet',    'SNST',  '#FFB25E', true, 20),
  ('ramadub',   'RamaDub',   'RMDB',  '#FF7A2F', true, 30),
  ('motionlab', 'MotionLab', 'MTNLB', '#FF5C93', true, 40)
ON CONFLICT ON CONSTRAINT formats_slug_unique DO NOTHING;

-- THE FALLBACK FORMAT — RETIRED AT BIRTH, AND UNLISTED.
--
-- `retired_at = now()` so it appears in no chip and in no select for a new
-- assignment; `listed = false` so the anonymous read of section 4a never returns
-- it. It exists for ONE reason: the rows a development database or the baseline
-- container holds and production does not. Section 7b assigns those to it, and
-- section 8 PRINTS how many it found.
--
-- IN PRODUCTION IT IS EXPECTED TO HOLD ZERO NIGHTS. All three production nights
-- carry a real format (section 7a), so the count section 8 prints is the proof
-- rather than the claim. If it is ever non-zero in production, a night exists
-- that nobody classified, and that is a thing to go and look at.
--
-- Its colour is a neutral and is not part of any format's identity; the partial
-- unique index does not apply to it, because it is retired from the first
-- second of its life.
INSERT INTO public.formats (slug, name, code, color, listed, sort_order, retired_at)
VALUES
  ('unclassified', 'Unclassified', 'UNCL', '#262626', false, 1000, now())
ON CONFLICT ON CONSTRAINT formats_slug_unique DO NOTHING;

-- THE FIVE SERIES THE OWNER CLEARED FOR A PUBLIC FILE, and no others.
--
-- `re:sonate` and `SunSet` name no venue: their sigle are `RSNT` and `SNST`, with
-- no venue code in them. The other three name venues that are already written in
-- `.claude/rules/production-calendar.md` and, for one of them, in the venue's own
-- wording at `.claude/rules/brand-visual-system.md`.
--
-- MOTIONLAB GETS NO SERIES, AND THAT IS THE POINT. Its series is a venue-named
-- one, created through the catalogue surface by a person, on the day that venue
-- may be named. A file in a public repository is not that day, and seeding an
-- empty placeholder to make the table look complete would be the same
-- publication with an extra step.
INSERT INTO public.party_series (format_id, name, code)
SELECT f.id, v.name, v.code
  FROM (VALUES
    ('resonate', 're:sonate',           'RSNT'),
    ('resonate', 're:sonate x Perlone', 'PRLN'),
    ('ramadub',  'RamaDub x Booze',     'BZ'),
    ('ramadub',  'RamaDub x Muro',      'MR'),
    ('sunset',   'SunSet',              'SNST')
  ) AS v(format_slug, name, code)
  JOIN public.formats f ON f.slug = v.format_slug
ON CONFLICT ON CONSTRAINT party_series_format_code_unique DO NOTHING;

-- The fallback series, under the fallback format, retired at birth for the same
-- reason the format is.
INSERT INTO public.party_series (format_id, name, code, retired_at)
SELECT f.id, 'Unclassified', 'UNCL', now()
  FROM public.formats f
 WHERE f.slug = 'unclassified'
ON CONFLICT ON CONSTRAINT party_series_format_code_unique DO NOTHING;

-- =============================================================================
-- 6. The watermark — created BEFORE the backfill, so the backfill raises it
-- =============================================================================
--
-- WHAT IT IS FOR, because this is the part a later reader would replace with
-- `max(number)` and a shorter file.
--
-- `updateEvent` REALLY DELETES the nights removed from the form
-- (`src/app/(admin)/admin/events/actions.ts:363-372` — a genuine
-- `.delete().eq("id", partyId)`). So after night 18 of a series is deleted,
-- `max(number)` over that series is 17, and the next proposal is 18 AGAIN — a
-- number that is already on a poster.
--
-- `meta-gates.md` lists the series numbering among the three monotone guards:
-- *«un progressivo assegnato e' gia' su una locandina. Si aggiunge in coda, non
-- si rinumera.»* Re-proposing 18 is renumbering under another name, and a change
-- to this trigger may only ever make the level HARDER to lower, never easier.
--
-- So the level RISES and never falls: `GREATEST`, never a plain assignment. A
-- deletion cannot lower it, and neither can a downward correction of a number
-- that was typed wrong.
--
-- ON `NULL`: `GREATEST` IGNORES NULL ARGUMENTS in Postgres (the result is NULL
-- only if every argument is). A night that carries NO number — see section 9 —
-- therefore leaves the level exactly where it was, instead of erasing it. And
-- `highest_assigned` is `NOT NULL`, so if that behaviour ever changed the write
-- would fail loudly rather than quietly blank the counter.
--
-- `SECURITY DEFINER` IS REQUIRED, and here is why: `public.party_series` carries
-- NO WRITE POLICY (section 4c), so this `UPDATE` performed with the privileges of
-- an authenticated writer would be refused by RLS and the level would never move.
-- `SET search_path = ''` with every reference fully qualified is the mandatory
-- other half — without it the caller chooses which `party_series` the definer
-- writes, and Supabase's advisor reports `function_search_path_mutable`.
--
-- The function touches ONE column of ONE table and returns `NEW` unchanged. It
-- reads no capability, grants nothing, and cannot be reached except by the
-- trigger below.

CREATE OR REPLACE FUNCTION public.bump_series_watermark()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.party_series
     SET highest_assigned = GREATEST(highest_assigned, NEW.number)
   WHERE id = NEW.series_id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bump_series_watermark() IS
  'Raises party_series.highest_assigned to the number just written on a night. GREATEST, never an '
  'assignment: a deleted night or a downward correction must not lower a level that has already '
  'been handed out and printed. SECURITY DEFINER because party_series carries no write policy.';

DROP TRIGGER IF EXISTS event_parties_bump_series_watermark ON public.event_parties;

CREATE TRIGGER event_parties_bump_series_watermark
  AFTER INSERT OR UPDATE OF number ON public.event_parties
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_series_watermark();

-- =============================================================================
-- 7. The backfill
-- =============================================================================
--
-- IT FILLS WHAT IS EMPTY, AND ONLY WHAT IS EMPTY. Every statement below carries
-- `AND format_id IS NULL`, so a second application of this file changes nothing
-- and — more to the point — cannot overwrite a correction somebody made after the
-- first. A backfill fills; it does not re-assert.

-- -----------------------------------------------------------------------------
-- 7a. The three production nights — one statement each, by explicit uuid
-- -----------------------------------------------------------------------------
--
-- CONFIRMED BY THE OWNER on 2026-08-10 and transcribed from `36-02-SUMMARY.md`,
-- which is where the reasoning lives. It is NOT re-derived here.
--
-- The nights are identified BY UUID and never by title or venue: this file is
-- public, none of the three venues appears in any tracked rules file, and two of
-- the three nights carry `venue_secret = true`. A uuid names nothing, and for a
-- published event it is already readable with the anonymous key.

-- Night A — Sat 7 Feb 2026, the FIRST ACT of night B.
--
-- It takes B's format and B's series and carries NO NUMBER. It is not an edition
-- of the series; it is the opening half of one, and the calendar's table
-- describes editions. Giving it B's number would be refused by the uniqueness
-- constraint of section 10; giving it a number of its own would enter it into the
-- sequence AS IF it were an edition, which writes a false fact about what that
-- night was. Section 9 carries the full reasoning and the constraint change it
-- forces.
UPDATE public.event_parties
   SET format_id = (SELECT id FROM public.formats WHERE slug = 'resonate'),
       series_id = (
         SELECT s.id
           FROM public.party_series s
           JOIN public.formats f ON f.id = s.format_id
          WHERE f.slug = 'resonate' AND s.code = 'RSNT'
       ),
       number = NULL,
       updated_at = now()
 WHERE id = 'fd975999-95df-4402-bc82-03a95424831b'
   AND format_id IS NULL;

-- Night B — Sat 7 Feb 2026, the second act, and the first edition: `RSNT-001`.
UPDATE public.event_parties
   SET format_id = (SELECT id FROM public.formats WHERE slug = 'resonate'),
       series_id = (
         SELECT s.id
           FROM public.party_series s
           JOIN public.formats f ON f.id = s.format_id
          WHERE f.slug = 'resonate' AND s.code = 'RSNT'
       ),
       number = 1,
       updated_at = now()
 WHERE id = '11e43718-2e37-42b1-91b7-cc2d0754474e'
   AND format_id IS NULL;

-- Night C — Fri 8 May 2026, its own event, the second edition: `RSNT-002`.
--
-- One archive fact, flagged in `36-02-SUMMARY.md` and deliberately NOT corrected
-- here: this night's hours do not match the coordinates the calendar declares for
-- the format. That is what that night WAS. This migration records it; it does not
-- tidy it (D-36-10).
UPDATE public.event_parties
   SET format_id = (SELECT id FROM public.formats WHERE slug = 'resonate'),
       series_id = (
         SELECT s.id
           FROM public.party_series s
           JOIN public.formats f ON f.id = s.format_id
          WHERE f.slug = 'resonate' AND s.code = 'RSNT'
       ),
       number = 2,
       updated_at = now()
 WHERE id = '3db716af-8ce3-446e-a327-62b110bfe7ce'
   AND format_id IS NULL;

-- -----------------------------------------------------------------------------
-- 7b. Everything else — the rows production does not have
-- -----------------------------------------------------------------------------
--
-- THE PROBLEM THIS SOLVES, and it is not hypothetical. The three statements above
-- name three uuids. The baseline container seeds its OWN nights
-- (`scripts/container/seed.mjs`), and any development database holds others. On
-- those rows section 7a touches nothing, section 8 raises, and the container stops
-- being able to build the schema — which would take one of this project's four
-- verification tools offline.
--
-- WHAT THIS IS NOT: `UPDATE ... SET format_id = <some format> WHERE format_id IS
-- NULL` with a real format. That is the constant default of section 3 wearing a
-- different hat — it would assign an identity to nights nobody classified, and
-- D-36-04 says explicitly.
--
-- SO THE FALLBACK IS DECLARED AS A FALLBACK: a format retired at birth, unlisted,
-- selectable for nothing.
--
-- AND THE NUMBER IS REAL. `row_number()` inside the fallback series, offset by
-- the level that series has already handed out — not the constant `0`. The
-- research example places `number = 0` next to `CHECK (number > 0)` deliberately,
-- to show the mistake a plan would make: zero as a special value is a null in
-- disguise, and it would force the `CHECK` to be weakened to accommodate a row
-- that means "we do not know". The number stays real and the `CHECK` stays strict.
--
-- The offset by `highest_assigned` is what makes a SECOND run safe: rows that
-- appear later continue the sequence instead of restarting at 1 and colliding
-- with the rows the first run numbered.

WITH fallback AS (
  SELECT f.id AS format_id,
         s.id AS series_id,
         s.highest_assigned AS base
    FROM public.formats f
    JOIN public.party_series s
      ON s.format_id = f.id
     AND s.code = 'UNCL'
   WHERE f.slug = 'unclassified'
),
residual AS (
  SELECT ep.id,
         row_number() OVER (ORDER BY ep.date, ep.sort_order, ep.id) AS n
    FROM public.event_parties ep
   WHERE ep.format_id IS NULL
)
UPDATE public.event_parties ep
   SET format_id = fallback.format_id,
       series_id = fallback.series_id,
       number = fallback.base + residual.n,
       updated_at = now()
  FROM residual, fallback
 WHERE ep.id = residual.id;

-- =============================================================================
-- 8. THE GUARD — a deliverable of this migration, not a courtesy
-- =============================================================================
--
-- Without it, the `SET NOT NULL` of section 9 still fails on a row that was
-- missed — but it fails with `23502` on a table, naming no row, giving no reason,
-- and leaving whoever is applying the queue to work out which of six statements
-- above did not do its job.
--
-- With it, the failure is a sentence with a COUNT in it, and it says in the same
-- breath that nothing was tightened and the transaction is rolling back.
--
-- IT COUNTS `format_id`, AND IT MUST NOT COUNT `number`. Under the decision
-- recorded in section 9, a night with no number is legitimate — night A is one.
-- A guard that raised on a null `number` would refuse the very row this file
-- exists to write correctly.
--
-- There is no SQL analog for this block anywhere in `supabase/migrations/`. Its
-- nearest sibling in discipline is not SQL at all: `scripts/rls-baseline-container.mjs:243-251`
-- refuses to report *"a migration failed"* without naming the file, for the same
-- reason `meta-gates.md` gives — a failure nobody can act on is a silent one.

DO $$
DECLARE
  n_missing integer;
  n_fallback integer;
BEGIN
  SELECT count(*) INTO n_missing
    FROM public.event_parties
   WHERE format_id IS NULL;

  IF n_missing > 0 THEN
    RAISE EXCEPTION
      'formats backfill left % event_parties row(s) without a format. Nothing has been set NOT NULL and this transaction is rolling back. Assign those nights explicitly, or extend the fallback in section 7b.',
      n_missing;
  END IF;

  SELECT count(*) INTO n_fallback
    FROM public.event_parties ep
    JOIN public.formats f ON f.id = ep.format_id
   WHERE f.slug = 'unclassified';

  RAISE NOTICE 'formats backfill: every event_parties row carries a format.';
  RAISE NOTICE 'formats backfill: % row(s) landed on the retired fallback format. In production this number is expected to be 0.', n_fallback;
END;
$$;

-- =============================================================================
-- 9. NOT NULL — on two columns of three
-- =============================================================================
--
-- FMT-01: a night cannot be saved without saying what format it is. `format_id`
-- and `series_id` become `NOT NULL` here, and that is the database half of it —
-- the form's own validation is the sentence a person reads, and the two halves do
-- not substitute for each other.

ALTER TABLE public.event_parties
  ALTER COLUMN format_id SET NOT NULL,
  ALTER COLUMN series_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 9a. `number` STAYS NULLABLE — read this before "correcting" it
-- -----------------------------------------------------------------------------
--
-- Amendment of 2026-08-10, after the checkpoint of plan 36-02, on the owner's
-- answer. This is the column a later reader would tighten to `NOT NULL` as
-- tidying, and doing so would make an existing production row UNWRITABLE.
--
-- THE FACT: night A is THE FIRST ACT of night B, not an edition of its own. It
-- carries that night's format and that night's series and NO NUMBER.
--
-- WHY `NOT NULL` BREAKS IT, both ways round:
--
--   * give it B's number  → refused by `event_parties_format_series_number_unique`;
--   * give it its own     → it enters the sequence AS AN EDITION, which writes a
--                           false fact about what that night was, and the series
--                           numbering is monotone, so the false fact stays.
--
-- A NIGHT WITHOUT A NUMBER IS A NIGHT THAT IS THE ACT OF ANOTHER NIGHT, and it
-- has no sigla of its own. This is not a compromise, it is true: FMT-02 says the
-- code and the number COMPOSE a sigla — it does not say every night has one.
--
-- AND THE UNIQUENESS CONSTRAINT KEEPS WORKING. In Postgres two `NULL`s are
-- DISTINCT, so two numberless acts are not a duplicate. That is the correct
-- reading rather than a loophole: two acts of two different nights are two
-- different things, and neither is an edition. The same sentence is written into
-- the constraint's own comment in section 10, because without it the next reader
-- takes the nullability for a hole and closes it.
--
-- WHAT THIS NARROWS, deliberately: FMT-03 refuses two EDITIONS sharing a triple,
-- and says nothing about two acts that are not editions.

COMMENT ON COLUMN public.event_parties.number IS
  'The progressivo of this night inside its series. NULLABLE ON PURPOSE: a night that is an ACT of '
  'another night carries its format and its series but no number of its own, because the code and '
  'the number compose a sigla and an act has no sigla. Do not tighten to NOT NULL — see section 9a '
  'of 20260810120000_formats_and_series.sql.';

-- =============================================================================
-- 10. The constraints that make FMT-03 a fact
-- =============================================================================
--
-- All three go through the `DO` form of section 2a, for the same measured reason:
-- these are referenced or long-lived constraints, and a second run must leave
-- them exactly where they are instead of dropping and rebuilding them.

-- -----------------------------------------------------------------------------
-- 10a. The composite key — divergence is NOT WRITABLE
-- -----------------------------------------------------------------------------
--
-- Without it, `event_parties.format_id` and the format of `event_parties`'s own
-- series are TWO SOURCES FOR ONE FACT with no sentence saying which wins — the
-- failure `production-calendar.md` calls *«il calendario batte il tracker»*, where
-- the damage was not that the two disagreed but that nobody had said in advance
-- which one to believe. Concretely: the marker on a card and the chip in the
-- filter could answer the same question differently, on the same night, on the
-- same page.
--
-- With it, there is nothing to reconcile, because the contradiction cannot be
-- stored. That is the difference between a rule and a convention.
--
-- The pattern is already in this repository: `party_assignments_assignee_role_fk`
-- against `public.profiles (id, role)` (`20260809000000:200-245`) keeps a
-- denormalised pair honest in exactly this way.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'event_parties_series_format_fk'
       AND conrelid = 'public.event_parties'::regclass
  ) THEN
    ALTER TABLE public.event_parties
      ADD CONSTRAINT event_parties_series_format_fk
      FOREIGN KEY (series_id, format_id)
      REFERENCES public.party_series (id, format_id);
  END IF;
END;
$$;

COMMENT ON CONSTRAINT event_parties_series_format_fk ON public.event_parties IS
  'A night whose format contradicts the format of its own series is not writable. Points at '
  'party_series_id_format_unique, which exists only to be pointed at. ON UPDATE NO ACTION by '
  'default: changing the format of a series that already has nights is refused, and that is the '
  'intended behaviour — a series does not change format, and if it did it would rewrite the archive.';

-- -----------------------------------------------------------------------------
-- 10b. FMT-03 — two nights cannot share a triple
-- -----------------------------------------------------------------------------
--
-- IN THE DATABASE AND NOT IN THE APPLICATION (D-36-08). Two people with two tabs
-- open receive the same proposal from the watermark; the second insert has to be
-- refused by something that both of them are behind, and no application-level
-- check is that thing.
--
-- NAMED, so the refusal arrives as a sentence somebody can read instead of an
-- anonymous `23505` — the discipline of `20260809003000:73-75`. The name is what
-- the server action branches on to say *"that number is already taken in this
-- series"*, which is the half of the guarantee a person actually meets.
--
-- ON THE CHOICE OF COLUMNS: given the composite key of 10a, this rejects exactly
-- the same rows as `UNIQUE (series_id, number)` would — a series belongs to one
-- format, so the format column adds no discrimination. The choice between the two
-- is about the MESSAGE, not correctness: a constraint that names all three axes
-- tells the reader of the error which three things collided.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'event_parties_format_series_number_unique'
       AND conrelid = 'public.event_parties'::regclass
  ) THEN
    ALTER TABLE public.event_parties
      ADD CONSTRAINT event_parties_format_series_number_unique
      UNIQUE (format_id, series_id, number);
  END IF;
END;
$$;

COMMENT ON CONSTRAINT event_parties_format_series_number_unique ON public.event_parties IS
  'FMT-03: two nights cannot share a format, a series and a number. In Postgres two NULLs are '
  'DISTINCT, so two nights carrying NO number are not a duplicate — that is the correct reading, '
  'not a hole: a night without a number is an ACT of another night and has no sigla of its own. '
  'See section 9a of 20260810120000_formats_and_series.sql before changing anything here.';

-- -----------------------------------------------------------------------------
-- 10c. A progressivo starts at one
-- -----------------------------------------------------------------------------
--
-- Strict, and it stays strict: zero as a special value is a null in disguise, and
-- this table already has a real null with a real meaning (section 9a). A `CHECK`
-- is not violated by a null, so a numberless act passes this constraint without
-- it needing to know anything about acts.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'event_parties_number_positive'
       AND conrelid = 'public.event_parties'::regclass
  ) THEN
    ALTER TABLE public.event_parties
      ADD CONSTRAINT event_parties_number_positive CHECK (number > 0);
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 10d. One index, and one that is deliberately absent
-- -----------------------------------------------------------------------------
--
-- This one makes the `ON DELETE RESTRICT` on `series_id` cheap: without it,
-- deleting a series scans `event_parties`.
--
-- There is NO index on `format_id`, and the absence is a decision: the
-- three-column unique key of 10b already leads with that column, so a second
-- index would be write cost with no read benefit — and the next reader would have
-- to work out which of the two the planner uses
-- (`20260809003000:158-167`).
CREATE INDEX IF NOT EXISTS idx_event_parties_series ON public.event_parties (series_id);

-- =============================================================================
-- 11. THE NEW WAY TO REFUSE AN OPERATION, declared instead of discovered
-- =============================================================================
--
-- The composite key of 10a carries `ON UPDATE NO ACTION` — the default — which
-- means CHANGING THE FORMAT OF A SERIES THAT ALREADY HAS NIGHTS IS REFUSED.
--
-- That is the intended behaviour: a series does not change format, and if it did
-- it would rewrite what its past nights were, which D-36-10 forbids. But it is a
-- NEW REFUSAL ON AN EXISTING PATH, and this repository declares those rather than
-- letting somebody find them at the wrong moment.
--
-- Two more refusals arrive with it, from the two `ON DELETE RESTRICT` of section
-- 3: a format that any night carries can no longer be deleted, and neither can a
-- series. Retirement is the operation that exists instead, and it is reversible
-- in a way a deletion is not.
--
-- MEASURED, NOT REASONED — by plan 36-05, with
-- `npm run baseline:compare`. Note in advance what that comparator will report:
-- it compares OUTCOMES and cannot see that a CONSTRAINT, rather than a policy,
-- produced the movement, so it will label these cells NARROWING even though no
-- policy changed. The same thing happened at `20260809003000:323-343` and the
-- label was correct about the outcome and misleading about the cause.
--
-- WHAT IS NOT DONE HERE, AND MUST BE. Nothing in this file makes any of those
-- three refusals reach a human as a sentence. This repository has NO ERROR
-- TRACKING (`meta-gates.md`), so a refused delete on a catalogue surface reaches
-- somebody only if that somebody is looking at it. Naming the nights that block
-- the operation, and offering to detach them, belongs to the plans that build the
-- catalogue surface — it is not done here, and saying so is the point.

-- =============================================================================
-- 12. WHAT IS NOT DEFENDED HERE — two things, both deliberate
-- =============================================================================
--
-- 12a. `code` AND `number` HAVE NO ROW-LEVEL DEFENCE, ONLY A QUERY-LEVEL ONE.
--
-- RLS is per ROW, not per column. So anyone holding the anonymous key may ask for
-- `select=*` on the rows section 4 grants them, and that includes `formats.code`
-- for a listed format and `party_series.code` plus `event_parties.number` for a
-- night that is already published.
--
-- ACCEPTED DELIBERATELY. The four format codes are already written in a tracked
-- rules file of a public repository, and a series code and a number are exposed
-- only for nights that have already been announced — for those, the sigla is on
-- the material.
--
-- A COLUMN-LEVEL `REVOKE` WOULD WORK, and it is not used: there is no precedent
-- for one anywhere in this repository, and it would turn an innocuous `select=*`
-- into a `42501` for the application's own code, which is a failure mode nobody
-- would connect to a permission. Written down because without this paragraph the
-- next reader takes it for an oversight and either "fixes" it or assumes it was
-- never considered.
--
-- 12b. THE SECRET VENUE ADDRESS IS READABLE WITH THE ANONYMOUS KEY TODAY, AND
-- THIS FILE DOES NOT FIX IT.
--
-- `venues_select_public` (`20260226200000_venues.sql:25-27`) grants an
-- unconditional read of `public.venues`, and `event_parties.venue_id` is readable
-- for a published event — so the address of a night marked secret is one join
-- away from the anonymous key. It is recorded in
-- `.planning/todos/pending/secret-venue-address-readable-by-anon.md` and assigned
-- BY THE OWNER TO PHASE 37. It is not this phase's work and is not touched here.
--
-- IT IS NAMED HERE FOR ONE REASON, and it is the reasoning this file has to
-- refuse in advance: *"venues are already public, so a series name that contains
-- one may be too"*. That is false. A DOOR ALREADY OPEN IS NOT AN ARGUMENT FOR
-- OPENING A SECOND ONE — the second one is a second exit, it is chosen rather
-- than inherited, and it would still be there after phase 37 closes the first.
-- That is why section 4b does not grant `public.party_series` the unconditional
-- read both of its catalogue neighbours carry.

COMMIT;
