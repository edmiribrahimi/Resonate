-- The authored sections — the file whose deliverable is a VOID THAT NAMES
-- ITSELF
-- Phase 45, Plan 01: PROD-02
--
-- Changes:
-- 1. public.production_section — one row per rule of the sound manifesto or of
--    the visual capitolato, in one of THREE states, where the middle one exists
--    because the domain names two opposite errors and not one (D-45-14)
-- 2. public.production_open_question — what has not been decided, and WHOSE
--    CALL it is. It warns; it never blocks (D-45-15)
-- 3. public.production_visual_asset — the produced pieces and the dj photo
--    archive the listing depends on (D-45-08)
-- 4. Row level security on all three, WITH NO POLICY AT ALL — see the note
--    under section 0
--
-- Four changes, ONE transaction, for the reason its sibling
-- `20260817120100_production_location.sql` gives: a half-applied version leaves
-- relations that any holder of the anonymous key can `select=*`, and one of
-- these carries the name of an artist in a line-up nobody has announced.
--
-- IDEMPOTENCE, DECLARED, in the same terms as the sibling:
--
--   * `CREATE TABLE IF NOT EXISTS`, every constraint declared INSIDE the table
--     and NAMED, so a refused row arrives as a name a caller can branch on. A
--     CHANGED constraint set is a NEW migration, never an edit to this one
--     (`supabase-data.md`, gate *migration in avanti*);
--   * `IF NOT EXISTS` on every index;
--   * enabling row level security is idempotent in Postgres;
--   * ZERO `INSERT` statements. This file seeds nothing at all.
--
-- THIS FILE IS WRITTEN HERE AND APPLIED ELSEWHERE, by plan 45-08, through the
-- Management API's MIGRATIONS endpoint. Nothing here has been executed by the
-- plan that wrote it, and no `grep` over it proves the SQL is valid.
--
-- NO MATERIAL. `supabase/migrations/` is tracked and the repository is PUBLIC,
-- so a commit here is irreversible. This file carries no manifesto text, no
-- palette value, no artist, no date and no space. It names COLUMNS. Every rule,
-- every piece and every name arrives at runtime, typed into the product by
-- somebody who holds the section's key.
--
-- ── SECTION 0, WHICH IS A SENTENCE RATHER THAN A BLOCK ──────────────────────
--
-- This file grants NOBODY a read. Each table is closed at the foot of its own
-- section and stops there; the section capability keys and the `SELECT` arms are
-- plan 45-04's, in their own migration. A policy naming a key that does not
-- exist yet is refused by Postgres with the transaction in rollback.
--
-- `supabase-data.md`'s gate *tabella nuova = policy nuova* is met by its
-- stricter half: closed with no arm at all refuses everybody, including the
-- master, which is more closed than any policy this file could write.
-- `meta-gates.md` settles the case — the more restrictive gate wins, and the
-- conflict is written down instead of being left for a reader to notice.

BEGIN;

-- =============================================================================
-- 1. public.production_section — A RULE, AND HOW SETTLED IT IS
-- =============================================================================
--
-- WHAT A ROW IS: one rule of one of the two authored sections — the sound
-- manifesto, or the visual capitolato — together with the state its content is
-- in.
--
-- ⚠ THREE STATES, AND THE MIDDLE ONE IS THE WHOLE REASON THIS TABLE IS SHAPED
-- LIKE THIS. The domain names TWO OPPOSITE ERRORS, and a two-state model can
-- only defend against one of them at a time:
--
--   * INVENTING where a rule already exists — writing strata, tempi and
--     reference artists for a format whose identity somebody else owns. Once
--     that reaches a brief or a piece of artwork it IS the brand, for whoever
--     reads it;
--   * ANSWERING *not decided* where a coordinate has already been declared,
--     which is an omission dressed as prudence.
--
-- All three states are live today and none is hypothetical: one format's
-- manifesto is written and closed, one is unwritten but carries declared
-- coordinates including an explicit negative, and one is unwritten with nothing
-- declared. Collapse the middle state into either neighbour and the second of
-- those becomes indistinguishable from the third — which makes it read as FREE,
-- and a format that reads as free gets written by whoever is under deadline.
--
-- ── THE EXPLICIT NEGATIVE IS NOT A COLUMN, AND THAT IS DELIBERATE ───────────
--
-- *Not techno*, *not lounge*: the exclusions are decisions as much as the
-- inclusions, and they exist because somebody had already assumed the opposite.
-- They belong in `body`, with the rest of the rule.
--
-- A `negatives` column would invite a surface that renders the positives and
-- drops them — which is the exact failure the exclusions were written to
-- prevent, rebuilt one layout at a time. One body, and whoever reads the rule
-- reads all of it.

CREATE TABLE IF NOT EXISTS public.production_section (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which authored section. Two members, mirrored from `SECTION_KINDS`.
  --
  -- Location has no row in this table: its content is a list of spaces, not a
  -- body of prose. The calendar is a fourth section KEY but not a fourth body of
  -- authored text.
  section text NOT NULL,

  -- WHICH FORMAT THE RULE BELONGS TO — NULLABLE, and null is not a gap.
  --
  -- A rule can belong to the whole brand rather than to one format: how the
  -- brand is spelled, the grid-safe square, the order of publication, the rule
  -- that a venue is named in typography and never with its logo. Those are not
  -- properties of a format and forcing one on them would file the same rule four
  -- times, which is four places for it to diverge.
  --
  -- `ON DELETE RESTRICT` is deliberately NOT used: this table is downstream of
  -- the catalogue, and no rule may block a catalogue correction.
  format_id uuid REFERENCES public.formats(id),

  title text NOT NULL,

  -- HOW SETTLED THE CONTENT IS. Three members, mirrored from `SECTION_STATES`.
  --
  -- ⚠ NO DEFAULT, AND THE ABSENCE IS THE DECISION. Both candidate defaults are
  -- wrong in opposite directions, which is why neither is here:
  --
  --   * a default of *written* fills the void — a row created and left alone
  --     would claim a rule exists where nobody wrote one;
  --   * a default of *not decided* answers for a coordinate that HAS been
  --     declared, which is the second of the two errors above.
  --
  -- So the author says which. A form that cannot submit without an answer is the
  -- cost, and it is the point.
  state text NOT NULL,

  -- The rule itself, exclusions included. See the paragraph above for why the
  -- explicit negatives live here and not in a column of their own.
  body text,

  -- WHAT IS MISSING, on a row that is not decided. Required by the constraint
  -- below in that state and in no other.
  missing text,

  -- WHOSE CALL IT IS. A ROLE, never a person: this project's artefacts name
  -- roles, and a decision attributed to a name ages badly the moment somebody
  -- leaves.
  decision_owner text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- `ON DELETE SET NULL` and not `CASCADE`: removing an account must never
  -- remove a rule of the brand.
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  CONSTRAINT production_section_section_check
    CHECK (section IN ('manifesto', 'visual')),

  CONSTRAINT production_section_state_check
    CHECK (state IN ('written', 'coordinates_declared', 'not_decided')),

  -- A VOID NAMES ITS GAP AND ITS OWNER.
  --
  -- Without this, *not decided* is a shrug — and a shrug reads as NOBODY'S JOB.
  -- The register exists to stop three real open questions from resolving
  -- themselves by habit, one material at a time; a row that says only *not
  -- decided* is how that happens with the register switched on.
  --
  -- `btrim` is load-bearing: a string of spaces is what a required field
  -- collects from somebody in a hurry, and it would satisfy a bare NOT NULL.
  CONSTRAINT production_section_not_decided_names_its_gap
    CHECK (
      state <> 'not_decided'
      OR (btrim(coalesce(missing, '')) <> '' AND btrim(coalesce(decision_owner, '')) <> '')
    ),

  -- A RULE THAT IS WRITTEN HAS SOMETHING WRITTEN IN IT.
  --
  -- An empty row in this state is the emptiness NOT declared — which is the one
  -- thing this whole section was built to make impossible, failing quietly.
  CONSTRAINT production_section_written_has_a_body
    CHECK (state <> 'written' OR btrim(coalesce(body, '')) <> '')

  -- ── AND THE THIRD CONSTRAINT THAT IS DELIBERATELY ABSENT ──────────────────
  --
  -- `coordinates_declared` requires NEITHER a body nor a gap, and the omission
  -- is a decision rather than an oversight.
  --
  -- Forcing a `missing` line on the middle state pushes the author into
  -- INVENTING the gap — writing what is absent from a rule nobody has written,
  -- which is the first of the two errors this table exists to keep apart. A
  -- declared coordinate is a true statement that stops short; the correct
  -- pressure on it is a person deciding, not a `CHECK`.
);

-- The read is always *this section's rules*, and within it *this format's* —
-- the page is a section at a time, never all of them at once.
CREATE INDEX IF NOT EXISTS idx_production_section_section_format
  ON public.production_section (section, format_id);

ALTER TABLE public.production_section ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. public.production_open_question — IT WARNS, AND IT NEVER BLOCKS
-- =============================================================================
--
-- WHAT A ROW IS: something that has not been decided, and whose call it is.
--
-- ⚠ NOTHING IN THIS TABLE REFUSES ANYTHING, AND NOTHING MAY BE ADDED THAT DOES.
-- An open question warns on the piece that depends on it and lets the work
-- proceed (D-45-15), which is the rule the checklist of the previous phase
-- already follows, for the reason that phase wrote down: **a block that fires
-- under deadline is a block somebody routes around**, and a routed-around block
-- is worse than a warning because it also teaches people to route around the
-- next one.
--
-- The one constraint below is not an exception to that. It refuses a
-- CONTRADICTORY ROW, not a piece of work: it says a question cannot be closed
-- without its answer.

CREATE TABLE IF NOT EXISTS public.production_open_question (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  question text NOT NULL,

  -- WHOSE CALL IT IS. `NOT NULL`, because a question with no owner is the state
  -- this register was built to abolish — it is the one thing that distinguishes
  -- a register from a list of complaints. A ROLE, never a person.
  decision_owner text NOT NULL,

  -- WHICH SECTION THE QUESTION BELONGS TO — free text, and there is deliberately
  -- no vocabulary CHECK on it.
  --
  -- The register spans all FOUR sections, including location and the calendar,
  -- while `SECTION_KINDS` names only the two that hold authored prose. A CHECK
  -- mirroring that tuple would refuse a perfectly legitimate question about a
  -- space or about a date — a constraint that fires on correct work, which is
  -- the shape this table is specifically not allowed to have.
  section text,

  format_id uuid REFERENCES public.formats(id),

  opened_at timestamptz NOT NULL DEFAULT now(),

  -- CLOSING ONE MEANS WRITING WHAT WAS DECIDED.
  closed_at timestamptz,
  resolution text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- A QUESTION CLOSED WITHOUT ITS ANSWER IS A QUESTION THAT WILL BE REOPENED.
  --
  -- `<>` on two booleans is XOR — both or neither. A closing date with no
  -- resolution loses the very thing the register was keeping; a resolution with
  -- no date leaves the question looking open to everybody reading the list.
  CONSTRAINT production_open_question_closed_xor_resolution
    CHECK ((closed_at IS NULL) = (resolution IS NULL))
);

-- The read is *what is still open*, always. Partial, because a closed question
-- is history and the surface asks for it by name when it asks at all.
CREATE INDEX IF NOT EXISTS idx_production_open_question_open
  ON public.production_open_question (opened_at)
  WHERE closed_at IS NULL;

ALTER TABLE public.production_open_question ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. public.production_visual_asset — THE ARCHIVE THAT MUST EXIST BEFORE THE
--    LISTING DOES
-- =============================================================================
--
-- WHAT A ROW IS: one produced piece, or one photograph of an artist.
--
-- WHY THE PHOTO ARCHIVE IS NOT A NICE-TO-HAVE. The listing goes out two days
-- before the night, so THAT NIGHT'S PHOTOGRAPH CANNOT EXIST YET. At an artist's
-- first date there is only their press photo; from the second, the piece is
-- pulled from an archive somebody has to have been building. Without this table
-- the format stays dependent on what an artist happens to send on the Monday
-- for the Tuesday — and the piece that goes out is the improvised one.
--
-- ⚠ THE BYTES ARE NOT HERE. `object_key` points at storage, and the upload path
-- is the one this product already has: a quarantine bucket with a server-only
-- write. A second upload mechanism beside it would be a second thing to secure.

CREATE TABLE IF NOT EXISTS public.production_visual_asset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What the asset is: a photograph of an artist, or a produced piece.
  kind text NOT NULL,

  -- The storage key. UNIQUE, because two rows pointing at one object is how a
  -- deletion of one takes the other's image away without touching its row.
  object_key text NOT NULL,

  -- ⚠ INTERNAL, NEVER PUBLIC — AND THE BANNER IS NARROWER THAN A VENUE'S,
  -- which is why it is written out rather than borrowed.
  --
  -- A venue word is internal until the space is acquired. A NAME IN A LINE-UP
  -- IS INTERNAL UNTIL THE DATE IS ANNOUNCED, and the two are the same kind of
  -- fact: a person who has agreed to play on a date nobody has communicated is
  -- material in exactly the sense a space under negotiation is. Publishing it
  -- early is not a leak of a secret so much as an announcement made by accident
  -- — and it is read as an announcement whether or not it was one.
  --
  -- So: no surface an unauthenticated visitor can reach may render it, and no
  -- log line may echo it. It is also why every write path this phase creates
  -- logs `error.code` and `error.message` and never the whole error object: a
  -- constraint violation returns THE FAILING ROW in its detail, and this project
  -- has no error tracking to notice that it did.
  --
  -- The spelling is verified at the source before anything is produced. A wrong
  -- spelling is irrecoverable once published and it is a discourtesy to whoever
  -- plays.
  artist_name text,

  format_id uuid REFERENCES public.formats(id),

  -- The caption, if the piece carries one. CRITERIA AND DESCRIPTION ONLY: no
  -- address, and no date that has not been communicated.
  caption text,

  -- When the photograph was taken, where that is known. A `date` and not a
  -- timestamp: nobody needs the hour, and an hour would drag a timezone into a
  -- column that has no use for one.
  taken_on date,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  CONSTRAINT production_visual_asset_kind_check
    CHECK (kind IN ('dj_photo', 'piece')),

  CONSTRAINT production_visual_asset_object_key_unique UNIQUE (object_key)
);

-- The read that builds the archive view: this artist's photographs, newest
-- first, which is the question asked on the Monday when a listing is due.
CREATE INDEX IF NOT EXISTS idx_production_visual_asset_artist
  ON public.production_visual_asset (artist_name, taken_on);

-- The other read: this format's produced pieces.
CREATE INDEX IF NOT EXISTS idx_production_visual_asset_format
  ON public.production_visual_asset (format_id, kind);

ALTER TABLE public.production_visual_asset ENABLE ROW LEVEL SECURITY;

COMMIT;
