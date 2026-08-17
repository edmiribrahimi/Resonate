-- The location section — the two tables that hold DESK WORK and must never let
-- it read as an availability
-- Phase 45, Plan 01: PROD-02
--
-- Changes:
-- 1. public.production_space — one row per scouted space, carrying its STAGE,
--    the four answers only a telephone closes, and an EXIT that is a state and
--    never a deletion (D-45-10, D-45-12, D-45-13, D-45-24)
-- 2. public.production_space_attribute — one row per (space, attribute), with
--    its value AND where that value came from, because a computed suitability
--    is only as verified as its weakest input (D-45-11 revised)
-- 3. RLS enabled on both, WITH NO POLICY AT ALL — see section 0
--
-- Three changes, ONE transaction. The halves are bad in the usual ways: the
-- attribute table without its parent is a foreign key against a relation that
-- does not exist (`42P01`, and the whole queue behind it unapplied), and either
-- table without the statement section 0 describes is a relation any holder of
-- the anonymous key can `select=*` — and this pair holds STREET ADDRESSES OF
-- SPACES UNDER NEGOTIATION. That is not a tidiness argument; it is the reason
-- this file cannot be split at the `ENABLE`.
--
-- THE SHAPE IS COPIED FROM `20260815120000_production_calendar.sql`, header
-- included: a numbered change list, why one transaction, a declared idempotence
-- list, and the publication paragraph.
--
-- IDEMPOTENCE, DECLARED. This queue is applied one row at a time, by hand, and
-- re-applying a file out of doubt is the natural reaction to a doubt. So:
--
--   * `CREATE TABLE IF NOT EXISTS`, with every constraint declared INSIDE the
--     table and NAMED, so a refused row arrives as a name a caller can branch
--     on instead of an anonymous `23514`. There is no `ALTER TABLE ... ADD
--     CONSTRAINT` anywhere below, and a `grep` for one is the assertion. A
--     CHANGED constraint set is a NEW migration, never an edit to this one
--     (`supabase-data.md`, gate *migration in avanti*);
--   * `IF NOT EXISTS` on every index;
--   * enabling row level security is idempotent in Postgres;
--   * ZERO `INSERT` statements. This file seeds nothing at all.
--
-- THIS FILE IS WRITTEN HERE AND APPLIED ELSEWHERE. Plan 45-08 applies it through
-- the Management API's MIGRATIONS endpoint and not `/database/query`, so the
-- project's migration history stays truthful. There is no `supabase` CLI on the
-- machine that wrote it. NOTHING here has been executed by the plan that wrote
-- it, and no `grep` over it proves the SQL is valid: validity is what the apply
-- step's response and its catalogue read-back establish.
--
-- ── NO MATERIAL, AND HERE IT IS THE WHOLE POINT ─────────────────────────────
--
-- `supabase/migrations/` is tracked and `github.com/edmiribrahimi/Resonate` is
-- PUBLIC. A commit here is irreversible: a file pushed to a public repository
-- survives in forks, in mirror caches and in the history after any removal.
--
-- SO THIS FILE CARRIES NO SPACE, NO ADDRESS AND NO CANDIDATE. Not one name, not
-- one street, not one contact, not one figure about a particular place. Every
-- one of those arrives AT RUNTIME, from a local file that is gitignored, through
-- the seeding script of plan 45-07 — and never through this repository.
--
-- What IS written below is structure and criteria: the name of a column, the
-- four acquisition stages (already published in full in
-- `.claude/rules/venue-acquisition.md`), and the vocabularies mirrored from
-- `src/lib/production/sections/vocabulary.ts`. It is the distinction that module
-- draws in its own opening line: **the criteria live in the repository, the
-- candidates never do.**
--
-- The same test read the other way: nothing below tells a reader WHICH space is
-- being considered, WHERE it is, or how well it scored. It tells them that a
-- space has a stage, which has been on a public rules page for months.
--
-- ── WHAT THIS FILE DELIBERATELY DOES NOT DO ─────────────────────────────────
--
-- It grants NOBODY a read. Section 0 enables row level security on both tables
-- and stops there; the section capability key and the `SELECT` arms are plan
-- 45-04's, in their own migration.
--
-- The split is not a preference. A policy naming a capability key that does not
-- exist yet is refused by Postgres with the transaction in rollback — the
-- ordering `20260810120000:289-299` records having measured the hard way, and
-- the ordering `20260815120000` + `20260815120100` already followed once.
--
-- It also means `supabase-data.md`'s gate *tabella nuova = policy nuova* is
-- deliberately met by its stricter half rather than its literal text, and the
-- conflict is recorded here rather than left for a reader to notice: RLS enabled
-- with ZERO policies refuses EVERYBODY, including the master, which is strictly
-- more closed than any policy this file could write. `meta-gates.md` settles
-- that case in as many words — where two gates disagree, the more restrictive
-- one wins, and the conflict is documented.

BEGIN;

-- =============================================================================
-- 0. ROW-LEVEL SECURITY — ENABLED HERE, GRANTED NOWHERE
-- =============================================================================
--
-- Both statements are at the foot of their table's section, so that a reader
-- walking the file top to bottom sees each table closed at the moment it is
-- created rather than at the end of a file they may not reach.

-- =============================================================================
-- 1. public.production_space — ONE SCOUTED SPACE, AND ITS STAGE TRAVELS WITH IT
-- =============================================================================
--
-- WHAT A ROW IS: a place somebody wrote down. That is all it is, and the table
-- is built to keep it from becoming anything more by accident.
--
-- ⚠ THE GOVERNING FACT, AND IT IS NOT A NUANCE: **NOBODY HAS BEEN CALLED.** The
-- entire body of scouting this table is seeded from is desk work — profiles
-- read, categories assigned, attributes inferred. `venue-acquisition.md` states
-- it as a gate: *una classifica non e' una disponibilita'*. A ranking says how
-- well a space WOULD suit a format; it says nothing about whether that space
-- would host us.
--
-- Everything unusual about this table follows from that one fact: why the stage
-- defaults to the LOWEST value and cannot be manufactured upward, why `acquired`
-- is refused without a written pointer, why the unanswered questions carry a
-- VALUE rather than a null, and why there is no column here that ranks anything.
--
-- ── WHY THIS LIST IS NOT `public.venues`, AND THE OBVIOUS REASON IS WRONG ────
--
-- The reason is NOT read exposure. Phase 37 dropped `venues_select_public`,
-- there is deliberately no `anon` SELECT policy on `public.venues`, and the one
-- remaining read arm asks a key held by master and organizer only — the same
-- audience this section is granted to.
--
-- The reason is THE WRITE SIDE. A scouted row inside `public.venues` would sit
-- in the same picker a night's venue is chosen from, and one wrong selection
-- puts a space under negotiation on a night — from where the public road serves
-- its name and its address TO ANYBODY. A negotiation made public is a
-- negotiation closed badly, and it does not un-publish. With a separate list
-- that selection does not exist: not discouraged, ABSENT.
--
-- `promoted_venue_id` below is the single bridge between the two, it points
-- outward and never inward, and the constraint on it is that the crossing may
-- happen from ONE stage only.

CREATE TABLE IF NOT EXISTS public.production_space (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ⚠ INTERNAL, NEVER PUBLIC. The name of the space, as the scouting wrote it.
  --
  -- It is a COLUMN and not a string in a tracked file precisely because it may
  -- name a space that is under negotiation, and `venue-acquisition.md`'s gate
  -- *uno spazio non acquisito non si nomina* makes writing such a name into a
  -- public repository an act that cannot be undone. The column is public — it is
  -- declared right here; the values arrive at runtime and stay behind section 0.
  --
  -- No surface an unauthenticated visitor can reach may render it, no material,
  -- caption or capitolato may carry it before the space is acquired IN WRITING,
  -- and no diagnostic, log line, error message or `.planning/` document may echo
  -- it.
  name text NOT NULL,

  -- ⚠ INTERNAL, NEVER PUBLIC — AND THIS ONE IS A STREET ADDRESS.
  --
  -- The distinction from the column above is the whole of this paragraph, and it
  -- is not a matter of degree. `production_plan.venue_word` holds a WORD: the
  -- shorthand a calendar entry uses for a place. This column holds a STREET
  -- ADDRESS, with a house number on a large minority of the rows it will carry.
  -- A word can be ambiguous to a reader who does not already know; an address
  -- cannot. It is the thing itself.
  --
  -- AND IT IS EXACTLY THE PAYLOAD `public.venue_for_parties` EXISTS TO RELEASE
  -- DELIBERATELY. That function is the one public road to an address in this
  -- product: it decides PER NIGHT, it never returns a partial row, and absence
  -- means no entitlement. Everything about it was built so that an address
  -- leaves the perimeter only when somebody decided it should.
  --
  -- This table must therefore have NO EDGE INTO THAT ROAD. There is no foreign
  -- key, no view and no function below that can carry a row of this table into
  -- `public.event_parties` or `public.venues` — `promoted_venue_id` points the
  -- other way and is not traversed by that function's `FROM` clause, which walks
  -- `event_parties` to `events` to `venues` and never arrives here. The absence
  -- is DEMONSTRATED by the closure walk of plan 45-06; this comment states the
  -- intent, and a comment is not evidence.
  --
  -- No surface an unauthenticated visitor can reach may render it. No export
  -- path may read this table at all: the export of D-45-17 covers the manifesto
  -- and the capitolato, and location is the one section whose content must not
  -- leave the perimeter. No log line may echo it — which is why every write path
  -- this phase creates logs `error.code` and `error.message` and never the whole
  -- error object, since a constraint violation returns THE FAILING ROW in its
  -- detail, and this project has no error tracking to notice.
  address text,

  -- What kind of place it is. Eleven categories, mirrored member for member from
  -- `SPACE_CATEGORIES`. Descriptive, and it ranks nothing: a space that is
  -- perfect for one format can be out of identity for another.
  category text,

  -- Where the record came from — a directory, a guide, a walk. Free text and not
  -- an enum: this is provenance of the RECORD, not of an answer, and a closed
  -- set here would push the next reader into misfiling rather than writing.
  source text,

  -- The scouting's own prose about the place. CRITERIA AND OBSERVATION ONLY —
  -- no contact, no name of a person, no price.
  short_description text,

  -- Which format the space was scouted FOR. Nullable, and null is ordinary: a
  -- space can be interesting without one format having claimed it.
  --
  -- `ON DELETE RESTRICT` is deliberately NOT used: this table is downstream of
  -- the catalogue, and no scouting row may block a catalogue correction.
  home_format_id uuid REFERENCES public.formats(id),

  -- HOW FAR THE SPACE HAS GOT. Four stages, four different things: mapped is a
  -- desk exercise, verified is a checked fact, contacted is a conversation,
  -- acquired means IN WRITING.
  --
  -- `NOT NULL DEFAULT 'mapped'`, AND THE DIFFERENCE FROM
  -- `production_plan.venue_stage` IS DELIBERATE — say why, or the next reader
  -- reads it as an accident and "fixes" one of the two.
  --
  --   * There, the column is NULLABLE and null means NOT RECORDED. A calendar
  --     entry carries no stage at all, so the import has nothing to read and
  --     MUST NOT INFER ONE: an inferred *acquired* would arrive with the
  --     authority of a database column.
  --   * Here, a row cannot exist without having been mapped, because THE ACT OF
  --     ENTERING THIS LIST IS THE MAPPING. There is no such thing as a scouted
  --     space at an unknown stage.
  --
  -- The default is the LOWEST member and that is what makes it safe: a default
  -- can never manufacture progress. Every seeded row lands at `mapped` — not
  -- because the seeder is careful, but because nothing else is reachable without
  -- somebody typing it.
  --
  -- The vocabulary is `venue-acquisition.md`'s, member for member, and it is
  -- mirrored in TypeScript by `VENUE_STAGES`, which
  -- `src/lib/production/sections/vocabulary.ts` re-exports rather than restates.
  -- Editing either set means editing both, in the same commit.
  stage text NOT NULL DEFAULT 'mapped',

  -- HOW BIG IT IS, AS A BAND — which is all the archive knows. Four members,
  -- mirrored from `SIZE_BANDS`, and the fourth is the unasked marker.
  --
  -- ⚠ A BAND IS NOT A CAPACITY. Nothing may infer the column below from this
  -- one: the target for a night is 150 to 300 people, and a band cannot answer
  -- whether a given room is inside it.
  size_band text,

  -- HOW MANY PEOPLE ACTUALLY FIT — the second of the four questions, and it is
  -- the one only somebody standing in the room can close.
  --
  -- Null wherever nobody has obtained the answer, and the surface must show it
  -- MISSING rather than deriving it from the band. Measured while writing this
  -- file: the archive carries a number on a minority of its records and nothing
  -- at all on the rest, so null is the ordinary state here and not the
  -- exceptional one.
  real_capacity integer,

  -- WHAT RIG IS THERE — the first of the four questions. Free text: the answer
  -- is a description somebody was given on a call, not a value from a set.
  --
  -- It weighs little in every format's weighting, for a stated reason: a rig can
  -- be brought. It still weighs something, because bringing one changes cost and
  -- timing — and inside a space that has works on its walls it changes them a
  -- lot.
  rig text,

  -- WHETHER A GUEST DJ MAY PLAY — the third of the four questions.
  --
  -- Nullable, and null means NOBODY HAS ASKED. It is a boolean rather than a
  -- three-member set only because `answers_source` below already carries the
  -- unasked case for the whole group of four; a surface reading this column
  -- alone and printing *no* for a null would be reporting ignorance as a
  -- refusal.
  guest_dj_allowed boolean,

  -- UNTIL WHAT HOUR ONE MAY PLAY — the fourth question, and `venue-acquisition.md`
  -- names it as the one that screens out the most candidates.
  --
  -- `time` and not `timestamptz`, for `production_plan:197-201`'s reason: a night
  -- runs 22:00 to 06:00, so this value is legitimately SMALLER than the hour the
  -- night starts, and a conversion that moves an entry across midnight moves its
  -- WEEKDAY — which turns a conforming answer into a wrong one.
  --
  -- Null means nobody has asked. A public listing that says *deejay and live
  -- music* answers the question a wedding reception asks, not this one.
  closing_time time,

  -- THE HOURS THE VENUE ACTUALLY KEEPS. A PUBLISHED FACT, so it may be
  -- researched — unlike the column immediately below, which may not.
  --
  -- `NOT NULL DEFAULT 'not_asked'` and free text otherwise: the sentinel is A
  -- VALUE, and the not-blank constraint below refuses the empty string, because
  -- a blank is not an answer and a surface cannot tell it from an unasked
  -- question. Absent from the source on every record measured, so every seeded
  -- row lands on the sentinel.
  published_hours text NOT NULL DEFAULT 'not_asked',

  -- WHETHER THEY WILL EVEN DISCUSS HOURS BEYOND THOSE.
  --
  -- ⚠ NO CRAWL, NO INFERENCE AND NO DEFAULT MAY EVER MOVE THIS OFF `not_asked`.
  -- It is the strongest prohibition in this file, and it is narrow on purpose:
  -- this is ABSENT FROM EVERY SOURCE BY NATURE, because it is not published
  -- anywhere — it is not a fact about the place, it is the answer to a phone
  -- call that has not happened.
  --
  -- A value derived here is *derivato non e' verificato* committed in the one
  -- column built to prevent it, and it would arrive with the authority of a
  -- database column on the single question that screens out the most candidates.
  -- The failure is concrete: a space marked *will discuss* by a scraper, a date
  -- planned on it, and the conversation happening for the first time in the week
  -- of the night.
  --
  -- Mirrored from `EXTENDED_HOURS_STANCE`.
  extended_hours_stance text NOT NULL DEFAULT 'not_asked',

  -- HOW THE FOUR ANSWERS WERE OBTAINED. Mirrored from `ANSWERS_SOURCE`.
  --
  -- *Until 01:00 according to the venue's public page* and *until 01:00 because
  -- they said so on the phone* are DIFFERENT FACTS, and only one of them can
  -- carry a night. The set says so, and it says the public listing answers the
  -- wrong question.
  answers_source text NOT NULL DEFAULT 'not_asked',

  -- WHERE THE AGREEMENT IS. A POINTER, NEVER AN ATTACHMENT — a mail of such a
  -- date, a signed contract, an agreement in writing and where it lives.
  --
  -- This is D-45-12 made structural. `acquired` means IN WRITING, not *they said
  -- yes on the phone*, and it is the stage that unlocks naming the space in a
  -- material. The constraint below is what makes the database the place that is
  -- TRUE rather than the place it is REMEMBERED: a form can be edited, a
  -- reviewer can be tired, and the stage that authorises a publication is not a
  -- good place for either.
  agreement_evidence text,

  -- LEAVING THE RACE IS A STATE, NEVER A DELETION (D-45-13).
  --
  -- A space discarded BECAUSE IT CONTRADICTS THE IDENTITY stays in the list, at
  -- zero, and is never removed — `venue-acquisition.md` puts it as a gate.
  -- Deleting loses the memory of the choice, and the choice then gets remade
  -- from scratch at the first difficulty, by somebody who was not in the room.
  --
  -- The XOR below makes the pair inseparable: an exit carries WHY and WHEN, or
  -- it is not an exit.
  exited_at timestamptz,
  exit_reason text,

  -- THE ONE CROSSING THAT EXISTS. When a space is acquired, an explicit act
  -- creates its `public.venues` row and records the link here.
  --
  -- It points OUTWARD. Nothing in `public.venues` points back, no view joins the
  -- two, and the public road to an address walks `event_parties` to `events` to
  -- `venues` — it never arrives at this table. This column is a trace of an act,
  -- not a path a query traverses.
  --
  -- The constraint below refuses the crossing from any stage but `acquired`,
  -- which is *ranking-is-not-availability* written as a rule the database holds.
  promoted_venue_id uuid REFERENCES public.venues(id),

  -- THE RE-RUNNABILITY KEY. The seeding script writes `ON CONFLICT` on this, so
  -- running it twice is a no-op BY CONSTRUCTION rather than by care — the same
  -- discipline the calendar import already follows, for the same reason.
  --
  -- Nullable, and the unique constraint's own comment explains why that is not a
  -- hole.
  source_key text,

  -- Two flags the archive already carries: whether the place has hosted one of
  -- our nights before, and whether it is in the rotation now. They are facts
  -- about US, not about the space, which is why they are not attributes.
  already_used boolean NOT NULL DEFAULT false,
  in_use boolean NOT NULL DEFAULT false,

  -- Free text, CRITERIA AND OBSERVATION ONLY. No contact, no person, no price.
  note text,

  first_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- `ON DELETE SET NULL` and not `CASCADE`: removing an account must never
  -- remove a scouted space. D-45-13 says no space is ever deleted, and a cascade
  -- is a deletion path nobody declared.
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- ── THE VOCABULARIES, EACH MIRRORING ONE TUPLE ────────────────────────────

  CONSTRAINT production_space_stage_check
    CHECK (stage IN ('mapped', 'verified', 'contacted', 'acquired')),

  CONSTRAINT production_space_category_check
    CHECK (category IS NULL OR category IN (
      'club', 'live_club', 'cocktail_bar', 'brewery', 'restaurant', 'wine_bar',
      'institution', 'gallery', 'project_space', 'hybrid', 'historic_house'
    )),

  CONSTRAINT production_space_size_band_check
    CHECK (size_band IS NULL OR size_band IN ('small', 'medium', 'large', 'not_asked')),

  CONSTRAINT production_space_answers_source_check
    CHECK (answers_source IN ('not_asked', 'phone', 'on_site', 'public_listing')),

  CONSTRAINT production_space_extended_hours_stance_check
    CHECK (extended_hours_stance IN ('not_asked', 'will_discuss', 'will_not_discuss')),

  CONSTRAINT production_space_exit_reason_check
    CHECK (exit_reason IS NULL OR exit_reason IN (
      'out_of_identity', 'refused', 'unreachable', 'other'
    )),

  -- ── THE FOUR THAT CARRY A DECISION ────────────────────────────────────────

  -- ACQUIRED MEANS IN WRITING (D-45-12).
  --
  -- The stage that authorises naming a space in a material cannot be reached by
  -- a row that does not say where the agreement is. `btrim` is load-bearing: a
  -- string of spaces is what a required field collects from somebody who is in a
  -- hurry, and it would satisfy a bare NOT NULL while saying nothing.
  CONSTRAINT production_space_acquired_needs_evidence
    CHECK (stage <> 'acquired' OR btrim(coalesce(agreement_evidence, '')) <> ''),

  -- AN EXIT CARRIES WHY AND WHEN, OR IT IS NOT AN EXIT (D-45-13).
  --
  -- `<>` on two booleans is XOR, and it is the shortest way to write *both or
  -- neither*. A date without a reason is a row that forgot the thing worth
  -- keeping; a reason without a date is a row nobody can place in the story.
  -- Note what is NOT here: no `DELETE` is forbidden by this constraint, because
  -- a constraint cannot forbid one. The refusal to delete is a rule of the
  -- surface and of the `ON DELETE RESTRICT` below, and it is stated in both.
  CONSTRAINT production_space_exit_xor_reason
    CHECK ((exited_at IS NULL) = (exit_reason IS NULL)),

  -- A RANKING IS NOT AN AVAILABILITY (D-45-10).
  --
  -- The crossing into `public.venues` — the list from which a night's venue is
  -- chosen, and from which the public road serves an address — is reachable from
  -- ONE stage. A promotion from `mapped` is a desk exercise turned into a place
  -- somebody can put on a poster.
  CONSTRAINT production_space_promotion_needs_acquired
    CHECK (promoted_venue_id IS NULL OR stage = 'acquired'),

  -- THE SENTINEL IS A VALUE; A BLANK IS NOT AN ANSWER.
  --
  -- Without this, `published_hours` collects the empty string from any form that
  -- submits an untouched field, and *nobody has asked* becomes indistinguishable
  -- from *somebody asked and wrote nothing down*. That is the distinction the
  -- whole unasked-marker family exists to preserve, defeated at the last step.
  CONSTRAINT production_space_published_hours_not_blank
    CHECK (btrim(published_hours) <> ''),

  -- A capacity of zero is not a small room; it is a field somebody cleared.
  CONSTRAINT production_space_real_capacity_positive
    CHECK (real_capacity IS NULL OR real_capacity > 0),

  CONSTRAINT production_space_source_key_unique UNIQUE (source_key)
);

COMMENT ON CONSTRAINT production_space_source_key_unique ON public.production_space IS
  'The idempotence key for a space that came from the local scouting export. NULLABLE ON PURPOSE: '
  'a space typed by hand on the page came from no import and has no such key, and in Postgres two '
  'NULLs are DISTINCT, so many hand-typed rows coexist. That is the correct reading, not a hole. '
  'Do not close it: making this NOT NULL would force the page to invent a key, and an invented '
  'key is one the next import can collide with.';

-- ── TWO ABSENCES, EACH A DECISION RATHER THAN A GAP ─────────────────────────
--
-- Written down for the reason `20260810161000:244-264` writes down its own: the
-- next reader would otherwise take each for an oversight and close it with the
-- obvious repair, and BOTH of these have a domain module arguing for them, which
-- is exactly why they will be proposed again.
--
-- 1. NO `regime` COLUMN, AND NO NEIGHBOURS COLUMN.
--
--    Offered while the phase was being decided and DECLINED. The legal regime of
--    a place — whether it holds a licence for public entertainment, or whether a
--    night there needs the members-club form — is real and it decides whether a
--    date can exist at all; the acoustic and residential constraints are the
--    other thing that stops an already-confirmed night. Both are named in
--    `legal-compliance.md` and `venue-acquisition.md` as blocking.
--
--    They stay out because the section that would own them is out: the legal
--    section is not part of this phase. Importing the field alone would put a
--    legal state in a product with nowhere to act on it, which is worse than not
--    holding it — a column that says `verifica` on a screen nobody is
--    responsible for is a check that looks done.
--
--    The cost is stated and REVERSIBLE: the field survives in the local export,
--    so recovering it later is a second import rather than new research. **They
--    come back as a decision, never as a planner's addition.**
--
-- 2. NO COLUMN THAT RANKS ANYTHING, ON EITHER TABLE.
--
--    How well a space suits a format is COMPUTED from the attributes of section
--    2 with that format's declared weights, and it is stored nowhere. Three
--    reasons, all from `venue-acquisition.md`:
--
--      * a stored figure detaches from its inputs at the first edit, and then it
--        is a number nobody can re-derive and everybody trusts;
--      * *si legge per format, mai come un giudizio assoluto* — a single column
--        would say one thing about a place across four formats that weigh the
--        same attributes differently, which is the opposite of that rule;
--      * a figure drawn beside a name reads as *this place is possible*, and it
--        would be saying it about desk work.
--
--    A space that is out of identity keeps its row and its exit reason. That is
--    the *stays listed at zero* gate, expressed without a zero to store.

-- The list is read BY STAGE, always: the surface groups by how far each space
-- has got, because the stage is what stops a name reading as an availability.
CREATE INDEX IF NOT EXISTS idx_production_space_stage
  ON public.production_space (stage);

-- The other read is by name — the search box, and the check for whether a place
-- somebody just found is already in the list under a different spelling.
CREATE INDEX IF NOT EXISTS idx_production_space_name
  ON public.production_space (name);

ALTER TABLE public.production_space ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. public.production_space_attribute — ONE VALUE, AND WHERE IT CAME FROM
-- =============================================================================
--
-- WHAT A ROW IS: one attribute of one space, its value, and whether that value
-- was read off a profile or checked on the ground.
--
-- ⚠ THE TABLE HAS NO COLUMN THAT RANKS ANYTHING, AND THE ABSENCE IS THE
-- DELIVERABLE — see the paragraph above section 1's indexes. What lives here are
-- INPUTS. The weighing happens in code, per format, at the moment somebody asks.
--
-- WHY `provenance` HAS NO DEFAULT. A value cannot exist without saying which it
-- is. This is where D-45-11's second mitigation ended up after the archive was
-- measured: that decision originally put derived-versus-verified on the RECORD,
-- and the measurement moved it to the INPUT, because a computed figure is only
-- as verified as its weakest input. One attribute checked on site beside nine
-- read off a website does not make the result a datum.
--
-- WHY THE VALUE SET HAS FIVE MEMBERS AND NOT FOUR. `not_asked` is A VALUE, NOT
-- AN ABSENCE. The archive already encodes *to verify* PER ATTRIBUTE rather than
-- per record — on the evening-viability attribute it is the value on a clear
-- majority of the rows — and a surface that rendered that as an empty cell would
-- be reporting IGNORANCE AS A NEGATIVE. A blank cell and an unasked question are
-- the same pixel unless the data distinguishes them, which is why the column is
-- `NOT NULL`.

CREATE TABLE IF NOT EXISTS public.production_space_attribute (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- `ON DELETE RESTRICT`, and it is the point rather than a precaution. D-45-13
  -- says no space is ever deleted, so a cascade here would be a deletion path
  -- that should not exist at all — and it is precisely the shape that took 63
  -- rows out of seven tables during phase 36, where a control matched more than
  -- it meant to and the foreign keys did the rest.
  space_id uuid NOT NULL REFERENCES public.production_space(id) ON DELETE RESTRICT,

  -- Mirrored member for member from `ATTRIBUTE_KEYS`.
  attribute text NOT NULL,

  -- Mirrored from `ATTRIBUTE_VALUES`. Five members; see the paragraph above.
  value text NOT NULL,

  -- Mirrored from `ATTRIBUTE_PROVENANCE`. NO DEFAULT, deliberately.
  provenance text NOT NULL,

  -- When the answer was obtained, where it was obtained at all. Null on a
  -- derived value is ordinary: nobody answered, somebody read.
  answered_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT production_space_attribute_attribute_check
    CHECK (attribute IN (
      'outdoor_sunset', 'artistic_frame', 'aperitivo_vocation', 'exclusivity',
      'evening_licence', 'events', 'music_at_home', 'audio', 'console',
      'partnership'
    )),

  CONSTRAINT production_space_attribute_value_check
    CHECK (value IN ('top', 'good', 'limited', 'no', 'not_asked')),

  CONSTRAINT production_space_attribute_provenance_check
    CHECK (provenance IN ('derived', 'field_verified')),

  -- One value per attribute per space. The seeding script writes `ON CONFLICT`
  -- on this pair, which is what makes a second run a no-op instead of a
  -- duplicate set of ten rows.
  CONSTRAINT production_space_attribute_unique UNIQUE (space_id, attribute)
);

-- The read is always *every attribute of this space* — the detail panel, and the
-- weighing that computes a suitability for one format at the moment of asking.
CREATE INDEX IF NOT EXISTS idx_production_space_attribute_space
  ON public.production_space_attribute (space_id);

ALTER TABLE public.production_space_attribute ENABLE ROW LEVEL SECURITY;

COMMIT;
