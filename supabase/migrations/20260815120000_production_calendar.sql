-- The production calendar comes inside — the file whose deliverable is a SHAPE
-- WITH NOTHING IN IT
-- Phase 44, Plan 02: PROD-01
--
-- Changes:
-- 1. public.production_plan — one row per night the calendar holds, carrying the
--    space's ACQUISITION STAGE beside it and a nullable link to the announced
--    night (D-44-05, D-44-06, D-44-07)
-- 2. public.production_piece — one row per editorial piece, WRITTEN or
--    PROPOSED, with two CHECKs that make a proposal pretending to come from the
--    file unrepresentable (D-44-09b)
-- 3. public.production_commitment — the third kind of entry: a day taken by
--    something that is not our production (D-44-18). It is defined by what it
--    HAS NOT GOT as much as by what it has
-- 4. public.production_import_run — the OBSERVABLE EFFECT of an import, in a
--    repository with no error tracking at all
-- 5. public.production_checklist_item — what a night owes, editorial pieces AND
--    production steps (D-44-14), with lateness COMPUTED and never stored
--    (D-44-15)
-- 6. party_series.ics_alias — the one column that makes the join between a
--    piece's sigla and a night's venue word possible at all
-- 7. public.production_pipeline_rule and its seeded rows — which pieces a format
--    owes, stored as (anchor kind, WEEKDAY, direction) and never as a day offset
-- 8. RLS enabled on all six new tables, WITH NO POLICY AT ALL — see section 0
--
-- Eight changes, ONE transaction, and the halves are bad in the usual ways: the
-- pieces without the plan are foreign keys against a relation that does not
-- exist (`42P01`, and the whole queue behind it unapplied); the pipeline rules
-- without their table are `INSERT`s into nothing; and the tables without section
-- 0's `ENABLE ROW LEVEL SECURITY` are six relations any holder of the anonymous
-- key can `select=*` — one of which carries a VENUE WORD for a space that may be
-- under negotiation. That last one is not a tidiness argument. It is the reason
-- this file cannot be split at the `ENABLE`.
--
-- THE SHAPE IS COPIED FROM `20260810120000_formats_and_series.sql`, header
-- included: a numbered change list, why one transaction, a declared idempotence
-- list, and the publication paragraph. What is NOT copied is that file's seeded
-- catalogue — see the publication paragraph below.
--
-- IDEMPOTENCE, DECLARED. This queue is applied one row at a time, by hand, and
-- re-applying a file out of doubt is the natural reaction to a doubt. So:
--
--   * `CREATE TABLE IF NOT EXISTS`, with every constraint declared INSIDE the
--     table and NAMED, so a collision arrives as a name a caller can branch on
--     instead of an anonymous `23505`. A CHANGED constraint set is a NEW
--     migration, never an edit to this one (`supabase-data.md`, gate *migration
--     in avanti*);
--   * `IF NOT EXISTS` on every index and on every `ADD COLUMN`;
--   * `ON CONFLICT ... DO NOTHING` on every seeded row of section 7, inferred on
--     the unique index that governs that row's level;
--   * a `DO` block that creates the one added constraint only if `pg_constraint`
--     does not already hold it — and NOT `DROP CONSTRAINT IF EXISTS` + `ADD`,
--     for the reason measured at `20260809000000:200-226`: `IF EXISTS`
--     suppresses *"it does not exist"*, not *"something depends on it"*, so the
--     second run fails `2BP01` with the transaction in rollback;
--   * the seeds resolve a format and a series BY THEIR PUBLIC CODE, through a
--     subselect, and never by a hard-coded uuid. A code that has no row inserts
--     NOTHING — section 7 says so out loud rather than leaving a silent zero for
--     somebody to discover.
--
-- THIS FILE IS WRITTEN HERE AND APPLIED ELSEWHERE. Plan 44-07 applies it through
-- `POST https://api.supabase.com/v1/projects/{ref}/database/migrations` — the
-- MIGRATIONS endpoint and not `/database/query`, so the project's migration
-- history stays truthful. There is no `supabase` CLI on the machine that wrote
-- it, so `supabase db push` is not a step anybody can run here. NOTHING in this
-- file has been executed by the plan that wrote it, and no `grep` over it proves
-- the SQL is valid: validity is what the apply step's response and its read-back
-- establish.
--
-- ── AND THIS FILE IS A PUBLICATION, WHICH IS THE POINT OF IT ─────────────────
--
-- `supabase/migrations/` is tracked and `github.com/edmiribrahimi/Resonate` is
-- PUBLIC. A commit here is irreversible: a file pushed to a public repository
-- survives in forks, in mirrors and in the history after any removal.
--
-- SO THIS MIGRATION SEEDS ZERO ROWS OF PRODUCTION MATERIAL. Not one date, not
-- one venue word, not one line-up, not one name of the collective whose
-- commitments section 3 holds. Every date, every venue word and every line-up
-- arrives AT RUNTIME, through the import, from a file that lives in `docs/` and
-- is gitignored (D-44-04). There is no `INSERT` into `production_plan`, into
-- `production_piece` or into `production_commitment` anywhere below, and a `grep`
-- for one is the assertion.
--
-- ONE SEEDED SET DOES EXIST, and naming it is how this paragraph stays honest:
-- section 7 seeds SIXTEEN PIPELINE RULES — which piece kinds each format owes,
-- and on which weekday. Those are not material. Every one of them is already
-- published, in full, in `.claude/rules/production-calendar.md`'s weekday table,
-- and the four venue stages of section 1 are already published in
-- `.claude/rules/venue-acquisition.md`. It is the distinction that module draws
-- in its own opening line: **the criteria live in the repository, the candidates
-- never do**. A pipeline rule is a criterion — it says what a satellite owes,
-- not which satellite, where, or when.
--
-- The same test read the other way: nothing seeded below tells a reader WHEN a
-- night happens, WHERE it happens, or WHO plays. It tells them that a listing
-- goes out on a Tuesday, which has been on a public rules page for months.
--
-- ── WHAT THIS FILE DELIBERATELY DOES NOT DO ─────────────────────────────────
--
-- It grants NOBODY a read. Section 0 enables row-level security on all six
-- tables and stops there; the capability key, the `SELECT` arms, the checklist's
-- author-recording write function and the `BEFORE UPDATE` trigger that refuses a
-- change to a stored `number` are plan 44-04's, in their own migration.
--
-- The split is not a preference: a policy naming a capability key that does not
-- exist yet, or a column that does not exist yet, is refused by Postgres with
-- the transaction in rollback — the ordering `20260810120000:289-299` records
-- having measured the hard way.
--
-- AND IT DOES NOT RE-IMPLEMENT THE NUMBERING GUARD. `bump_series_watermark`
-- (`20260810120000:590-614`) already raises `party_series.highest_assigned` with
-- `GREATEST` and never lowers it. It fires on `event_parties`, which nothing in
-- this phase's import ever writes. There is no counter here, no `max()+1` and no
-- second watermark: a plan row's `number` is READ FROM THE FILE, never generated.

BEGIN;

-- =============================================================================
-- 0. ROW-LEVEL SECURITY — ENABLED HERE, GRANTED NOWHERE
-- =============================================================================
--
-- Every `ENABLE ROW LEVEL SECURITY` below sits directly under the table it
-- closes, so that a table ARRIVES CLOSED and is opened later by a deliberate
-- act. The reverse order — create now, close in the next migration — has a
-- window in it, and the window is one `select=*` wide.
--
-- WITH RLS ENABLED AND NO POLICY, NO SESSION READS ANYTHING. Not anonymous, not
-- authenticated, not a master's. `service_role` bypasses policies, which is how
-- the import writes and is the only path that does. This is the same posture
-- three tables in this repository already take on their WRITES on purpose
-- (`20260805120000_door_scan_events.sql:158-163`,
-- `20260808002000_membership_register.sql:337-343`,
-- `20260809000000_party_assignments.sql`), applied here to reads as well because
-- there is not yet a key to name.
--
-- ⚠ THIS IS A DEVIATION FROM THIS PLAN'S OWN BOUNDARY, AND IT IS THE
-- RESTRICTIVE DIRECTION. Plan 44-02 was written to be STRUCTURE ONLY, with all
-- access in plan 44-04. `supabase-data.md`'s gate *tabella nuova = policy nuova*
-- says a table holding non-public data is not created without RLS in the SAME
-- migration, and `meta-gates.md` resolves a conflict between two gates in favour
-- of the MORE RESTRICTIVE one. Enabling without granting satisfies both: it
-- takes nothing away from 44-04, which will `ENABLE` again (a no-op) and then
-- add its `SELECT` arms.
--
-- WHAT THIS DOES NOT CLAIM. `service_role` is not a boundary; it is the absence
-- of one. What decides WHO may run an import or read this calendar is the
-- capability check in front of it, and that check is 44-04's work. Saying so
-- here is not the same as enforcing it here, and conflating the two is how a
-- feature ends up protected by the middleware alone (`CLAUDE.md`, operating
-- principle 2).

-- =============================================================================
-- 1. public.production_plan — one row per NIGHT IN THE CALENDAR
-- =============================================================================
--
-- WHAT A ROW IS: one entry of the owner's calendar that the import classified as
-- a night of ours. It is NOT `public.event_parties`, and the separation is
-- D-44-06's whole reason: the file stays the source of truth (D-44-01), so a
-- re-import that reached the night directly could move a date that already has
-- tickets on sale. The announcement is an explicit act that bridges the two, and
-- `linked_party_id` below is the bridge's only trace here.
--
-- THE ARCHIVE IS IN HERE TOO (D-44-08), back to the file's earliest entry. The
-- table therefore holds numbers far below the current watermark, which is why
-- nothing here compares a `number` to `party_series.highest_assigned`: a
-- watermark comparison would refuse the entire past.

CREATE TABLE IF NOT EXISTS public.production_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- THE IDENTITY, AND IT IS THE FILE'S OWN. The calendar entry's `UID`. Unique
  -- across every entry measured, and maintained across edits by the application
  -- that writes the file — which is what an identity needs and what the
  -- alternatives do not have:
  --
  --   the title       changes when the owner renames a night;
  --   (date, title)   both change;
  --   a content hash  changes on EVERY edit, which is the opposite of identity.
  --
  -- The import writes `ON CONFLICT (source_uid) DO UPDATE`, so running it twice
  -- is a no-op BY CONSTRUCTION rather than by care (D-44-03).
  source_uid text NOT NULL,

  -- CHANGE DETECTION, both halves of it, stored and not interpreted here.
  -- A DECREASING sequence for a known uid is an anomaly to REPORT, never to
  -- accept silently — and the report is a row in `production_import_run`
  -- (section 4), because a log line is a place nobody looks.
  source_sequence integer,
  source_last_modified timestamptz,

  -- THE CIVIL DATE, taken verbatim from the file's `YYYYMMDD` prefix. Never the
  -- product of a timezone conversion: the whole pipeline resolves WEEKDAYS
  -- (section 6), and a conversion that moves a 22:00 entry across midnight moves
  -- its weekday, which turns a conforming night into a reported error (D-44-25).
  date date NOT NULL,

  -- `time` and not `timestamptz`, for the same reason. The night runs 22:00 to
  -- 06:00, so `end_time` is legitimately SMALLER than `start_time` and no CHECK
  -- forbids it — a constraint saying `end_time > start_time` would refuse the
  -- project's principal format.
  start_time time,
  end_time time,

  -- WHAT THE NIGHT IS, resolved by the import against the catalogue that has
  -- been in production since Phase 36. Nullable: an entry whose format the
  -- import could not resolve is a finding to report, not a row to refuse — and
  -- refusing it would lose the day, which is the one thing the calendar is for.
  -- `ON DELETE RESTRICT` is deliberately NOT used: this table is downstream of
  -- the catalogue, and no plan row may block a catalogue correction.
  format_id uuid REFERENCES public.formats(id),
  series_id uuid REFERENCES public.party_series(id),

  -- THE PROGRESSIVO, READ FROM THE FILE AND NEVER GENERATED.
  --
  -- NULLABLE, and the precedent is recorded: a night that is the OPENING ACT of
  -- another night has no progressivo of its own, because the code and the number
  -- COMPOSE a sigla and an act has no sigla. `20260810120000:807-842` carries
  -- the full reasoning and the production row it protects. Do not tighten this
  -- to NOT NULL.
  --
  -- There is no unique constraint on (series_id, number) here, and that is also
  -- deliberate: this table is a MIRROR of a file, not a register. Two rows
  -- disagreeing about a number is a DIVERGENCE TO REPORT (D-44-07), and a
  -- constraint would turn a report into a failed import that shows nothing.
  number integer,

  -- ⚠ INTERNAL, NEVER PUBLIC. The venue word exactly as the calendar writes it.
  --
  -- It is a COLUMN and not a string in a tracked file precisely because it may
  -- name a space that is under negotiation, and `venue-acquisition.md`'s gate
  -- *uno spazio non acquisito non si nomina* makes writing such a name into a
  -- public repository an act that cannot be undone. The column is public; the
  -- values arrive at runtime and stay behind section 0.
  --
  -- No surface that an unauthenticated visitor can reach may render it, and no
  -- diagnostic, log line, error message or `.planning/` document may echo it.
  venue_word text,

  -- The resolved venue, where one resolves. Nullable, and its absence is normal
  -- rather than exceptional: a space in the calendar is frequently a space
  -- nobody has called yet.
  venue_id uuid REFERENCES public.venues(id),

  -- HOW FAR THE SPACE ACTUALLY IS (D-44-05). Four stages, and they are four
  -- different things: mapped is a desk exercise, verified is a checked fact,
  -- contacted is a conversation, acquired means IN WRITING.
  --
  -- NULL MEANS NOT RECORDED, AND IT IS NEVER READ AS `acquired`. The calendar
  -- entry carries no stage, so the import must NOT infer one — an inferred
  -- *acquired* is exactly the harm `venue-acquisition.md` names, and it would
  -- arrive with the authority of a database column. A stage is filled by hand,
  -- or by Phase 45's scouting section.
  venue_stage text,

  -- THE BRIDGE TO THE ANNOUNCED NIGHT (D-44-06, D-44-07). Nullable, and null is
  -- the normal state: most plan rows are dates nobody has announced.
  --
  -- Nothing in this file writes `public.event_parties`. This column points at
  -- it; it does not reach into it.
  linked_party_id uuid REFERENCES public.event_parties(id),

  -- PRESENCE OVER TIME, and DISAPPEARANCE IS NOT DELETION.
  --
  -- An entry present in a previous run and absent now may be a changed uid, a
  -- partial export, or simply the wrong file. Deleting on absence would let one
  -- bad export wipe the archive — and could orphan a night that already has
  -- tickets on sale, which is the harm D-44-06 exists to prevent. So the import
  -- stamps `absent_since` and REPORTS the count. Deletion is a separate,
  -- deliberate act that this phase does not build.
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  absent_since timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- THE IDEMPOTENCE KEY. Named, so `ON CONFLICT ON CONSTRAINT` and a caller's
  -- error branch can both name the same thing.
  CONSTRAINT production_plan_source_uid_unique UNIQUE (source_uid),

  -- The vocabulary is `venue-acquisition.md`'s, member for member, and it is
  -- mirrored in TypeScript at `src/lib/production/ics/vocabulary.ts`
  -- (`VENUE_STAGES`). Editing either set means editing both, in the same commit:
  -- the build sees the TypeScript side, this CHECK sees the SQL side, and they
  -- agree only because they were written once and copied.
  CONSTRAINT production_plan_venue_stage_check
    CHECK (venue_stage IS NULL OR venue_stage IN ('mapped', 'verified', 'contacted', 'acquired'))
);

-- The calendar is read BY DATE, always — a range for the list, a day for the
-- collision check against a taken day.
CREATE INDEX IF NOT EXISTS idx_production_plan_date
  ON public.production_plan (date);

-- The rotation is checked by walking a series in order (D-44-08). This is the
-- index that makes *"the editions of this series, in sequence"* cheap, and it is
-- the read that turns a remembered claim about a rotation into one somebody can
-- settle by looking.
CREATE INDEX IF NOT EXISTS idx_production_plan_series_number
  ON public.production_plan (series_id, number);

-- There is NO uniqueness on `date`, and the absence is a decision: the tramonto
-- and the night are two entries on one day, communicated as a pair. A constraint
-- here would refuse the pairing the format is built on.
ALTER TABLE public.production_plan ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. public.production_piece — one row per PIECE, WRITTEN OR PROPOSED
-- =============================================================================
--
-- WHAT A ROW IS: one editorial piece — a listing, a tonight, a recap, a LiveCut,
-- a timetable, an after movie. Either one the file already carries, or one the
-- pipeline says a format OWES and the file does not carry yet.
--
-- THE PIECE IS CALLED `livecut`, AND THE WORD `podcast` APPEARS NOWHERE.
-- Production calls it a LiveCut on every occurrence, and the product uses the
-- word production uses (D-44-22). The two are not synonyms: a LiveCut is the
-- recording of OUR night, one per dj who played it; a Podcast is a mix sent in
-- by somebody who is NOT in a line-up, it does not descend from a date, and it
-- DOES NOT EXIST YET. Adding it to this vocabulary would let a surface draw a
-- candidate's name in a format's own voice, which reads as an announcement
-- whether or not it is one.
--
-- A ROW HERE IS NOT A TRUTH ABOUT THE WORLD; IT IS A ROW ABOUT A FILE. `origin`
-- says which of the two it is, and that column is the whole of D-44-09b: a date
-- written in the file WINS, always, and nothing recomputes it.

CREATE TABLE IF NOT EXISTS public.production_piece (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULLABLE, unlike the plan's. A PROPOSAL HAS NO UID, because it does not
  -- exist in the file. In Postgres two NULLs are DISTINCT, so the unique
  -- constraint below does not collapse every proposal into one row — that is the
  -- correct reading and not a hole, and the constraint's own comment repeats it
  -- so the next reader does not close it.
  source_uid text,

  -- THE NIGHT THIS PIECE BELONGS TO — NULLABLE, and the reason is measured
  -- rather than defensive: AN ORPHAN PIECE EXISTS. One after movie in the file
  -- announces a night that is not in the calendar at all. Refusing it would lose
  -- a real piece; attaching it to the wrong night would be worse.
  --
  -- So it is kept unattached, and `series_code` + `number` below are kept beside
  -- it so it JOINS LATER if that night is ever added.
  plan_id uuid REFERENCES public.production_plan(id),

  -- THE PIECE'S OWN COORDINATES, as the file writes them: the series code half
  -- of a sigla, and the progressivo. Text and not a foreign key, deliberately —
  -- this is what was WRITTEN, and an unresolvable code must survive as evidence
  -- instead of being dropped at the door.
  series_code text,
  number integer,

  -- Vocabulary mirrored member for member in `vocabulary.ts` (`PIECE_KINDS`).
  kind text NOT NULL,

  -- `PT1`, `PT2`, `PT3` and their kin — free text, because it is a label the
  -- file carries and not a fact the product decides. A night's LiveCuts are
  -- numbered by the line-up, not by this table.
  part_marker text,

  -- THE DATE, OR NOTHING — and if nothing, the reason is in the next column.
  -- Never a timezone conversion, for section 1's reason.
  date date,

  -- WHERE THE DATE CAME FROM. `file` or `proposed`. Mirrored in `vocabulary.ts`
  -- (`PIECE_DATE_ORIGINS`).
  --
  -- A proposed date is drawn differently and must NEVER read as settled: it is a
  -- date that does not exist in the owner's calendar, and the cost of showing it
  -- was read and accepted when D-44-09b part 3 was taken.
  origin text NOT NULL,

  -- WHY THERE IS NO DATE — and THERE ARE THREE REASONS, WHICH MUST STAY THREE.
  --
  --   `awaiting_next_edition` — the anchor edition is not in the calendar. The
  --      surface names it and shows no date (D-44-12). It covers the LiveCuts as
  --      well as the after movie;
  --   `depends_on_lineup` — how many LiveCuts a night owes is not knowable until
  --      the line-up is (D-44-13). Measured: one archived edition carries two
  --      rather than three, so three is NOT a constant;
  --   `not_derivable` — a night's listing and a SunSet's listing. The
  --      anticipation is a Tuesday one to two and a half weeks out and is NOT a
  --      fixed number, so nothing may derive it (D-44-23, extended to the night
  --      by measurement).
  --
  -- Collapsing them into one *"unknown"* is the collapsed-`catch` this project
  -- has already paid for once (`meta-gates.md`, the newsletter precedent): a
  -- reader who cannot tell *waiting for an edition* from *depends on the
  -- line-up* cannot act on either.
  unresolved_reason text,

  -- COMPUTED AT IMPORT, STORED, AND NEVER DRAWN. It feeds the divergence report
  -- (D-44-07); it does not feed a pixel (D-44-10 — the owner rejected the label,
  -- not the durability). Nullable, because *"we could not work it out"* is a
  -- third answer and must not arrive dressed as `false`.
  conforms_to_rule boolean,

  -- Which of the file's two naming conventions this piece was written in
  -- (D-44-21). Mirrored in `vocabulary.ts` (`NAMING_CONVENTIONS`). Kept because a
  -- join that fails is debugged by knowing which grammar it was reading — a
  -- first pass keyed on one form alone reported thirteen nights as missing, and
  -- the tool was wrong, not the calendar.
  naming_convention text NOT NULL,

  source_sequence integer,
  source_last_modified timestamptz,

  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  absent_since timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT production_piece_source_uid_unique UNIQUE (source_uid),

  CONSTRAINT production_piece_kind_check
    CHECK (kind IN ('listing', 'tonight', 'recap', 'livecut', 'timetable', 'after_movie')),

  CONSTRAINT production_piece_origin_check
    CHECK (origin IN ('file', 'proposed')),

  CONSTRAINT production_piece_unresolved_check
    CHECK (
      unresolved_reason IS NULL
      OR unresolved_reason IN ('awaiting_next_edition', 'depends_on_lineup', 'not_derivable')
    ),

  CONSTRAINT production_piece_naming_check
    CHECK (naming_convention IN ('canonical', 'legacy')),

  -- ── THE TWO THAT EARN THEIR PLACE ─────────────────────────────────────────
  --
  -- EXACTLY ONE of a date and a reason. A piece with neither is a row that says
  -- nothing; a piece with both is a row that says two things and lets the
  -- surface pick. `<>` on two booleans is XOR, and it is the shortest way to
  -- write *"one or the other, never both, never neither"*.
  CONSTRAINT production_piece_date_xor_reason
    CHECK ((date IS NULL) <> (unresolved_reason IS NULL)),

  -- A PROPOSAL CANNOT PRETEND TO COME FROM THE FILE. Together with the XOR
  -- above, this makes the dangerous row — a computed date wearing the file's
  -- authority — UNREPRESENTABLE rather than merely discouraged. That is the
  -- difference between a rule and a guarantee, and it matters here because the
  -- product draws these two states differently and a person acts on the
  -- difference.
  CONSTRAINT production_piece_proposal_has_no_source
    CHECK (origin <> 'proposed' OR source_uid IS NULL)
);

COMMENT ON CONSTRAINT production_piece_source_uid_unique ON public.production_piece IS
  'The idempotence key for a piece the file carries. NULLABLE ON PURPOSE: a proposal has no uid '
  'because it does not exist in the file, and in Postgres two NULLs are DISTINCT, so many '
  'proposals coexist. That is the correct reading, not a hole. See production_piece_proposal_has_no_source.';

-- The read that builds a night's checklist: every piece of this plan row.
CREATE INDEX IF NOT EXISTS idx_production_piece_plan
  ON public.production_piece (plan_id);

-- The read that lets an ORPHAN piece find its night on a later import, once that
-- night is added. Without it the orphan is a row nobody can rejoin.
CREATE INDEX IF NOT EXISTS idx_production_piece_series_number
  ON public.production_piece (series_code, number);

ALTER TABLE public.production_piece ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. public.production_commitment — A DAY THAT IS TAKEN, AND NOTHING MORE
-- =============================================================================
--
-- WHAT A ROW IS (D-44-18): an entry in the owner's calendar that belongs to
-- something which is NOT our production, and which occupies a day. It is in the
-- calendar for one reason — so that nobody schedules a night against it.
--
-- ⚠ THE TABLE BELOW HAS NO FORMAT COLUMN, NO SERIES COLUMN AND NO PROGRESSIVO,
-- AND THAT ABSENCE IS THE DELIVERABLE.
--
-- Importing one of these as a night would hand it an identity it does not have,
-- and those two values do not stay in the database: they reach surfaces that
-- NAME FORMATS and print sigle. A rule saying *"do not assign a format to a
-- commitment"* is a sentence somebody has to remember. A table with no such
-- column is a guarantee, and it survives the caller who never read the sentence.
-- It is the same device the piece table uses two sections up, and the same one
-- `20260810120000:452-461` uses on its missing write policies.
--
-- The corollary, for whoever builds the surface: the row component that draws a
-- commitment must receive NO such prop either. A guarantee that stops at the
-- database is a guarantee with a hole above it.
--
-- THE COLLECTIVE'S NAME IS NOT WRITTEN ANYWHERE IN THIS FILE. It is somebody
-- else's name, it is not ours to publish, and this repository is public. The
-- import reads it from the file at runtime; nothing here knows it.

CREATE TABLE IF NOT EXISTS public.production_commitment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  source_uid text NOT NULL,

  -- ONE DAY THIS COMMITMENT OCCUPIES. Not *the* day: a recurring commitment
  -- expands into one row per occurrence, which is why the key below is a PAIR.
  occurrence_date date NOT NULL,

  start_time time,
  end_time time,

  -- The entry's own title, as written. It is not ours, and it is not public: it
  -- lives behind section 0 with everything else here.
  title text,

  -- THE RECURRENCE RULE, VERBATIM AND UNINTERPRETED. Stored so that a rule the
  -- import refuses to expand is still VISIBLE afterwards rather than lost — a
  -- refusal that erases its own input cannot be diagnosed.
  --
  -- Exactly one weekly recurrence exists today, and that is precisely when
  -- writing the refusal is cheap. A recurrence that is recognised but not
  -- expanded is a day the calendar shows as FREE while it is taken, which
  -- defeats this table's only purpose.
  recurrence_raw text,

  -- WHICH PARENT THIS OCCURRENCE CAME FROM. Self-referential and nullable: null
  -- means the row is the entry itself.
  expanded_from uuid REFERENCES public.production_commitment(id),

  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  absent_since timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- THE KEY IS A PAIR, AND THE PAIR IS NOT DECORATION. One uid covers many days
  -- once a recurrence is expanded, so the uid alone is no longer unique across
  -- occupied days — and a single-column key would silently collapse a season of
  -- occupied Thursdays into one row, leaving every other Thursday looking free.
  CONSTRAINT production_commitment_uid_occurrence_unique UNIQUE (source_uid, occurrence_date)
);

-- The only read this table serves: *is this day taken?*
CREATE INDEX IF NOT EXISTS idx_production_commitment_date
  ON public.production_commitment (occurrence_date);

ALTER TABLE public.production_commitment ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. public.production_import_run — THE OBSERVABLE EFFECT
-- =============================================================================
--
-- WHAT A ROW IS: what one run of the import actually did.
--
-- THIS TABLE IS NOT BOOKKEEPING. It is this phase's answer to `meta-gates.md`:
-- there is NO ERROR TRACKING in this repository — `package.json` carries no
-- monitoring dependency — so no production failure reaches a human on its own.
-- Four crons already run at night and nobody is told when they fail. Under that
-- constraint, *"the error is logged"* is not a mitigation: a log is a place
-- nobody looks. A failure that counts needs an OBSERVABLE EFFECT.
--
-- A row here, rendered at the foot of the calendar — *last import: N entries, K
-- unclassified, one divergence* — is that effect. It is the difference between
-- an import that quietly did half its job and one a person can see did half its
-- job.
--
-- AND THE FINDINGS STAY THREE, NEVER ONE. Unclassified entries, unsupported
-- recurrences and divergent numbers are three different problems with three
-- different answers; a single `problems` count is the newsletter defect wearing
-- a jsonb hat.

CREATE TABLE IF NOT EXISTS public.production_import_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  started_at timestamptz NOT NULL DEFAULT now(),

  -- NULL means THE RUN DID NOT FINISH — which is itself the observation, and it
  -- must not be back-filled with `started_at` to make a table look tidy.
  finished_at timestamptz,

  -- WHICH FILE, WITHOUT NAMING IT. A byte size distinguishes *the owner sent a
  -- new export* from *the same file was imported twice*, and it says nothing
  -- about any date, any space or anybody's name. A filename would have said
  -- more than it needed to.
  file_byte_size integer,

  entries_seen integer,

  -- COUNTS BY CLASS — night, piece, commitment, unclassified. jsonb because the
  -- classes are a vocabulary that may gain a member, and a column per class
  -- would make that a migration.
  entries_by_class jsonb,

  -- COUNTED SEPARATELY FROM THE BREAKDOWN ABOVE, on purpose: this is the number
  -- a person is meant to look at, and a figure buried inside a jsonb blob is a
  -- figure nobody reads.
  unclassified_count integer,

  -- ⚠ A DIVERGENCE CARRIES A UID AND A REASON CODE. NEVER A TITLE, NEVER A DATE,
  -- NEVER A VENUE WORD.
  --
  -- These two columns are read by whoever is debugging an import, which means
  -- they end up in a terminal, in a screenshot, and — the irreversible one — in
  -- a document under `.planning/`, which is tracked and public. A uid names
  -- nothing to anybody outside the file. A title names an unannounced date.
  --
  -- The same discipline is already written into
  -- `20260810160000_manual_venue_reveal.sql:353-358` for its exception messages.
  divergences jsonb,
  unsupported_recurrences jsonb,

  -- A DRY RUN IS A REAL ROW. The import can produce its plan without applying
  -- it, and that run is recorded as one — otherwise the only evidence that
  -- somebody checked before writing is their memory of having checked.
  dry_run boolean NOT NULL DEFAULT false
);

ALTER TABLE public.production_import_run ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. public.production_checklist_item — WHAT A NIGHT OWES
-- =============================================================================
--
-- WHAT A ROW IS (D-44-14): one thing that has to happen before a night can
-- happen. Not only the editorial pieces — also the production steps: the space
-- confirmed in writing, the dj confirmed, the photo arrived, and, where the
-- space is an exhibition space, ITS APPROVAL of the material that names it.
--
-- THE CHECKLIST COVERS WHAT CAN MAKE A DATE FAIL, NOT ONLY WHAT CAN BE DRAWN.
-- A night with all four pieces designed and no signed space is not a night that
-- is nearly ready; it is a night that does not exist. A checklist that only
-- tracked artwork would report the first as green.
--
-- ⚠ A TICK IS WRITABLE, AND THAT IS NOT A CONTRADICTION OF D-44-02. The calendar
-- is read-only about DATES, because the file is the source and an edit here
-- would be silently discarded by the next import. A tick is about neither the
-- file nor a date: it is a person recording that something got done. Applying
-- *read-only* to it produces a checklist nobody can use.
--
-- The tick's write path — a `SECURITY DEFINER` function that records its author
-- from an ARGUMENT rather than from `auth.uid()`, because every path arrives via
-- the service client under which `auth.uid()` is null — is plan 44-04's, on the
-- shape of `record_venue_reveal_act` (`20260810160000:384-426`).
--
-- AND A TICK IS REVERSIBLE. It is NOT a monotone guard, and the nearest
-- precedents in this repository are all monotone — `venue_reveal_sent`, a
-- payment reaching `completed`, a series progressivo. None of their reasoning
-- travels here: nothing has left the building because somebody ticked a box, so
-- un-ticking a box that was ticked by mistake costs an audit line and nothing
-- else. Do not copy a one-way switch onto this table.

CREATE TABLE IF NOT EXISTS public.production_checklist_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- `ON DELETE CASCADE`, and it is the one cascade in this file. A checklist
  -- item is not a fact about the world; it is a fact about a plan row, and it
  -- means nothing without it. The other references here are `NO ACTION` for the
  -- opposite reason: they point at things that exist independently.
  --
  -- ⚠ A cascade is a write path nobody declared. It is declared here, and it is
  -- the reason a snapshot taken before touching `production_plan` must cover
  -- THIS table too (`ai-engineering.md`, gate *un'istantanea prima copre cio'
  -- che si tocca*, whose recorded incident is exactly a cascade nobody had
  -- enumerated).
  plan_id uuid NOT NULL REFERENCES public.production_plan(id) ON DELETE CASCADE,

  -- FIVE KINDS: the editorial pieces collapse into one — `piece` — and the four
  -- production steps each get their own, because they fail for different reasons
  -- and are chased by different people.
  --
  -- `space_approval` is not a courtesy step: an exhibition space that must
  -- approve the material naming it is a stage of production with its own
  -- duration, and it sits INSIDE the two days before the listing rather than
  -- after them (`brand-visual-system.md`, gate *lo spazio approva cio' che lo
  -- nomina*). Discovering it when the piece is finished is discovering it too
  -- late.
  kind text NOT NULL,

  -- WHAT THIS ITEM IS, in production's own words. Text and not a foreign key:
  -- the checklist has to be able to say *LiveCut PT2* and *the photo for the dj*
  -- without either becoming a schema change.
  label text NOT NULL,

  -- WHEN IT IS DUE. Nullable, because an item can be owed without a date being
  -- computable — the three unresolved reasons of section 2 reach here too.
  due_date date,

  sort_order integer NOT NULL DEFAULT 0,

  -- ⚠ LATE IS COMPUTED, NEVER STORED.
  --
  -- The predicate is exactly this and lives in the query (D-44-15):
  --
  --     ticked_at IS NULL AND due_date < current_date
  --
  -- THERE IS DELIBERATELY NO STORED LATENESS COLUMN OF ANY NAME, and the reason
  -- is the same one that governs the rest of this phase. A stored flag is only
  -- true at the moment it is written; keeping it true needs something to run
  -- every night.
  -- This project has four crons that run every night AND NOBODY IS TOLD WHEN
  -- THEY FAIL (`meta-gates.md`). A fifth would give the checklist a way to be
  -- quietly wrong — showing a night as on time while it is late, which is the
  -- one direction that matters, because the whole point of D-44-15 is that the
  -- lateness is visible from the LIST, without opening the night.
  --
  -- Computed, the answer cannot rot: it is recomputed by the act of asking.
  ticked_at timestamptz,

  -- WHO TICKED IT. `SET NULL`: somebody who later leaves the project has not
  -- un-performed their acts.
  --
  -- Both columns, and not just the id, for the reason
  -- `20260810160000:228-245` gives about the act it records: a trace that says
  -- *ticked by ORG-0042* answers nobody's question. The name is authorised IN
  -- THE DATABASE and stops there — it does not enter a PLAN, a SUMMARY, a
  -- VERIFICATION or anything else under `.planning/`, which is tracked and
  -- public. Artefacts name ROLES.
  ticked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ticked_by_name text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT production_checklist_item_kind_check
    CHECK (kind IN ('piece', 'venue_confirmed', 'dj_confirmed', 'photo_arrived', 'space_approval')),

  -- A RE-IMPORT CANNOT DUPLICATE AN ITEM. The import regenerates the owed set on
  -- every run, so without this the second run doubles every night's checklist —
  -- and a doubled checklist is not a cosmetic defect: it doubles the count of
  -- open items a person is asked to act on, which makes the number meaningless
  -- in the direction that hides work rather than invents it.
  CONSTRAINT production_checklist_item_plan_kind_label_unique UNIQUE (plan_id, kind, label)
);

-- THERE IS NO SEPARATE INDEX ON `plan_id`, AND THE ABSENCE IS A DECISION. The
-- read this table serves is always *this night's checklist*, and the unique
-- constraint above is backed by an index that LEADS WITH `plan_id`, so that read
-- is already served. A second index would be write cost with no read benefit,
-- and would leave the next reader working out which of the two the planner uses
-- — the reasoning `20260810120000:957-969` writes down for the same situation.

ALTER TABLE public.production_checklist_item ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 6. party_series.ics_alias — THE COLUMN THAT MAKES THE JOIN POSSIBLE
-- =============================================================================
--
-- THE PROBLEM, MEASURED RATHER THAN ANTICIPATED.
--
-- A PIECE names a SERIES CODE. A NIGHT names a FORMAT WORD and sometimes a
-- VENUE WORD. Neither string contains the other's key, so there is no
-- transformation from one to the other — and two facts make that more than an
-- inconvenience:
--
--   1. TWO SATELLITE NIGHTS LEGITIMATELY SHARE THE PROGRESSIVO 001, under
--      different series, distinguished ONLY by the venue word. A join keyed on
--      format plus number alone was tried and measured: it placed one
--      satellite's listing at a POSITIVE offset from its night — a piece
--      published AFTER the night it announces. The join was wrong; the calendar
--      was right. Any piece dated after the night it announces is that same
--      defect wearing a new face.
--   2. THE MAPPING IS AN ABBREVIATION, NOT A DERIVATION. Nothing computes a two-
--      or four-letter code from a venue word. It has to be DECLARED by somebody
--      who knows both halves.
--
-- ⚠ WHY IT IS A COLUMN AND NOT A TYPESCRIPT RECORD, WHICH IS THE OBVIOUS SHAPE.
--
-- Because the VALUES are venue words. A venue word for a space that has not been
-- acquired in writing cannot be written into a public repository
-- (`venue-acquisition.md`, gate *uno spazio non acquisito non si nomina*;
-- D-44-04), and a record in `src/` is exactly that publication with an extra
-- step. THE COLUMN IS PUBLIC — it is right here. THE VALUES ARRIVE AT RUNTIME,
-- behind the row-level security of section 0, and this migration writes NONE of
-- them: no statement below assigns this column a value, and a `grep` for a
-- write against the series table is the assertion.
--
-- (The forbidden statement is not spelled out in this comment on purpose. A grep
-- whose only match is the sentence forbidding the thing is a grep that gets
-- ignored the third time it goes red — the discipline `formats/actions.ts:58-63`
-- records, and it applies to a migration as much as to a server action.)
--
-- The alternative shape considered and not taken: resolving against
-- `public.venues.name` and reading the series already attached to that venue.
-- It works today and depends on venue naming staying stable, which is a thing
-- nobody has promised. An explicit alias does not.
--
-- ── ⚠ THIS COLUMN LANDS ON A TABLE THAT ALREADY HAS A PUBLIC READ ARM ───────
--
-- `party_series` is NOT one of the six new tables. It has RLS since Phase 36 and
-- TWO select policies, which are OR'd: `party_series_select_published`
-- (`20260810120000:433-442`) and `party_series_select_catalogue_manage`. RLS is
-- per ROW and never per column, so the first arm makes THIS COLUMN readable with
-- the anonymous key on any series that has at least one published night.
--
-- `supabase-data.md`, gate *no dato sensibile in colonna pubblica*, requires
-- that be answered before the column is added rather than after. The answer, in
-- two parts:
--
--   * FOR A SERIES WITH A PUBLISHED NIGHT the alias adds NOTHING. That series'
--     `name` is already readable through the same arm and already carries the
--     venue word — `party_series.name` is the one string of Phase 36 that
--     publishes, and its migration says so at `:196-199`. The alias is the same
--     word in the calendar's spelling. This is `20260810120000:1006-1023`'s
--     argument about `code`, unchanged.
--   * FOR A SERIES WITH NO PUBLISHED NIGHT — which is every series of a space
--     under negotiation, including the venue-named one MotionLab still does not
--     have — the published arm returns NO ROW, so the column is unreachable
--     without `catalogue.manage`. That is the case the gate is actually about,
--     and it is closed.
--
-- WHAT WOULD BREAK IT: giving a series a public name that does NOT contain its
-- venue while putting the venue in the alias. The row would then publish through
-- a column instead of through its name. Nothing enforces that today; it is
-- recorded here so that whoever considers it meets the reason first.

ALTER TABLE public.party_series
  ADD COLUMN IF NOT EXISTS ics_alias text;

COMMENT ON COLUMN public.party_series.ics_alias IS
  'The venue word this series is written as in the production calendar, so a piece naming a series '
  'code can be joined to a night naming a venue word. The mapping is an ABBREVIATION, not a '
  'derivation: it cannot be computed and must be declared. Two satellite series legitimately share '
  'the progressivo 001 and are told apart only by this word — a join on format plus number alone '
  'was measured placing a listing AFTER the night it announces. The COLUMN is public; the VALUES '
  'arrive at runtime and are never written into a migration, a seed or a fixture.';

-- UNIQUE, because two series claiming the same venue word re-create exactly the
-- ambiguity this column exists to remove — and would do it silently, by making
-- the join pick one.
--
-- The `DO` form, and NOT `DROP CONSTRAINT IF EXISTS` + `ADD`: measured at
-- `20260809000000:200-226`, `IF EXISTS` suppresses *"it does not exist"*, not
-- *"something depends on it"*, so a second run can fail `2BP01` with the
-- transaction in rollback. There is no `ADD CONSTRAINT IF NOT EXISTS` in
-- Postgres — hence the block.
--
-- NULLs are DISTINCT in a unique constraint, so every series that has no alias
-- yet coexists with every other. Today that is all of them.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'party_series_ics_alias_unique'
       AND conrelid = 'public.party_series'::regclass
  ) THEN
    ALTER TABLE public.party_series
      ADD CONSTRAINT party_series_ics_alias_unique UNIQUE (ics_alias);
  END IF;
END;
$$;

-- =============================================================================
-- 7. public.production_pipeline_rule — WHICH PIECES A FORMAT OWES
-- =============================================================================
--
-- WHAT A ROW IS: one obligation. *This format owes a piece of this kind, and it
-- falls on this weekday relative to this anchor.* Sixteen of them are seeded
-- below, and every one is already published in
-- `.claude/rules/production-calendar.md`'s weekday table.
--
-- ⚠ WHY THIS IS A ROW AND NOT A RULE IN CODE. The pipeline CHANGED TWICE inside
-- one month: the night's three anchors were re-measured and all three were wrong
-- in the module, and SunSet's LiveCut went from one episode to two. A rule in
-- code makes the next such change a DEPLOY. A row makes it an edit, which is
-- what a thing that moves twice a month has to be.
--
-- ═════════════════════════════════════════════════════════════════════════════
-- ⚠ THE STORAGE FORM IS (ANCHOR KIND, WEEKDAY, DIRECTION) AND NEVER A DAY OFFSET
-- ═════════════════════════════════════════════════════════════════════════════
--
-- THE NIGHT FALLS FRIDAY *OR* SATURDAY. So the same Tuesday sits FOUR days
-- before a Saturday and THREE before a Friday. A planner that stores offsets
-- therefore sees TWO RULES WHERE THERE IS ONE, and reports a perfectly correct
-- night as an error.
--
-- THIS HAS ALREADY HAPPENED, ONCE, AND IT IS WRITTEN HERE SO IT DOES NOT HAPPEN
-- AGAIN. A check written during this phase's own discussion reported one night
-- as out of rule on THREE pieces. The owner answered it in one sentence — *the
-- next night falls on a Friday* — and the re-measurement proved him right: the
-- LiveCuts come out on a Tuesday, a Wednesday and a Thursday, always. TWO
-- EARLIER PASSES HAD MEASURED CORRECTLY AND STILL WRITTEN THE CONSEQUENCE
-- INSTEAD OF THE RULE (D-44-25). A consequence written as a rule produces a
-- false alarm every time the calendar moves by one day, and a checker that cries
-- wolf is a checker that gets switched off.
--
-- The same lesson from the other side: measured FROM THE NIGHT, an after movie
-- looks irregular — spreads of nine, sixteen, eighty and a hundred and
-- forty-three days. Measured from the anchor the rule actually names, it is
-- MINUS ONE, always. The variability was in the point of observation, not in the
-- data.
--
-- There is no `offset` column below, of any name, and a `grep` for one is the
-- assertion.
--
-- ── HOW THE THREE COLUMNS RESOLVE, which is the contract the anchor module
--    implements ─────────────────────────────────────────────────────────────
--
--   `anchor_kind`  WHICH EVENT the weekday is counted from:
--       `self`                 — this night;
--       `next_edition`         — the next edition of the same series;
--       `next_edition_listing` — the next edition's own listing.
--
--   `anchor_weekday`  ISO-8601, MONDAY = 1 … SUNDAY = 7. NULL means *the
--       anchor's own day, whichever weekday that turns out to be* — which is the
--       only correct way to say it for a night that may be a Friday or a
--       Saturday.
--
--   `anchor_direction`  WHICH occurrence of that weekday:
--       `on`     — the anchor's own day when the weekday is NULL; otherwise that
--                  weekday INSIDE the anchor's own ISO week;
--       `before` — the nearest PRECEDING occurrence of that weekday;
--       `after`  — the nearest FOLLOWING occurrence of that weekday.
--
--   `episode_count`  the FIRST episode falls on `anchor_weekday`; any further
--       episodes fall on the following days. Two episodes anchored to a Monday
--       are the Monday and the Tuesday.
--
-- ── ⚠ A COLUMN THE PLAN DID NOT ASK FOR, AND WHY IT IS HERE ─────────────────
--
-- `series_id` is nullable and was ADDED during execution, because without it the
-- project's own published pipeline is NOT REPRESENTABLE.
--
-- THE MEASUREMENT: the Nizza series is a SERIES of the night's format, not a
-- fifth format — `production-calendar.md` says so in as many words, and Phase
-- 36's migration seeds it as a series under `RSNT`. But it runs the LIGHT
-- pipeline: its listing IS derivable from the nearest preceding Tuesday, where
-- the night's is not; and its LiveCut is a single episode anchored to ITSELF,
-- where the night's are anchored to the FOLLOWING edition. Two of its four rules
-- therefore contradict the night's on the same `(format, piece kind)` pair.
--
-- With a key of `(format_id, piece_kind)` alone and `DO NOTHING`, seeding both
-- would have DROPPED THE NIZZA ROWS IN SILENCE — and the surface would then have
-- read the night's rule for a Nizza date, waited for an edition that does not
-- apply, and reported a conforming series as diverging. That is the silent
-- failure `meta-gates.md` names, arriving through the very mechanism chosen for
-- idempotence.
--
-- SO THERE ARE TWO LEVELS, AND THE MORE SPECIFIC ONE WINS: a rule with a
-- `series_id` is that series' own; a rule with none is the format's default.
-- Two partial unique indexes keep each level honest on its own terms — the
-- partial-unique device this repository already uses at
-- `20260810120000:176-185`, for the same kind of reason.

CREATE TABLE IF NOT EXISTS public.production_pipeline_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- `ON DELETE CASCADE`: a rule about a format that no longer exists is not a
  -- rule about anything. Nothing depends on it downstream except a checklist
  -- that is regenerated on every import.
  format_id uuid NOT NULL REFERENCES public.formats(id) ON DELETE CASCADE,

  -- NULL means THE FORMAT'S DEFAULT. Set means this series overrides it.
  series_id uuid REFERENCES public.party_series(id) ON DELETE CASCADE,

  -- The same six kinds as `production_piece`, mirrored member for member in
  -- `src/lib/production/ics/vocabulary.ts` (`PIECE_KINDS`). Editing either set
  -- means editing both, in the same commit.
  piece_kind text NOT NULL,

  anchor_kind text NOT NULL,
  anchor_weekday integer,
  anchor_direction text NOT NULL,

  -- WHETHER A MISSING PIECE MAY BE PROPOSED AT ALL (D-44-09b part 3).
  --
  -- `false` is not *"we have not worked it out yet"*. It is a MEASURED REFUSAL:
  -- for two of the sixteen rules below the anticipation is not a fixed number,
  -- so no rule exists to derive one from, and a proposal would be a date roughly
  -- a week and a half wrong drawn beside real ones. Withholding is the correct
  -- behaviour, and a night that suddenly has a complete set of pieces is the
  -- warning sign that somebody removed it.
  derivable boolean NOT NULL DEFAULT true,

  -- WHETHER THE NUMBER OF EPISODES IS A PROPERTY OF THE LINE-UP RATHER THAN OF
  -- THE FORMAT (D-44-13). Where it is true the surface says *depends on the
  -- line-up* and prints NO FIGURE — a count that could not be determined does
  -- not print one (OBS-03).
  episodes_from_lineup boolean NOT NULL DEFAULT false,

  -- HOW MANY EPISODES, where that is a property of the format.
  --
  -- `production-calendar.md`'s gate *un podcast per dj* holds everywhere: the
  -- number of episodes descends from the line-up, and changing the line-up
  -- changes the plan of publication. Where a count is written below it is the
  -- MEASURED NORM for a format whose line-up has been stable, and THIS ROW is
  -- where a change lands — a row, not a deploy.
  episode_count integer,

  -- Free text, and it carries CRITERIA ONLY. No date, no space, no name.
  note text,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT production_pipeline_rule_kind_check
    CHECK (piece_kind IN ('listing', 'tonight', 'recap', 'livecut', 'timetable', 'after_movie')),

  CONSTRAINT production_pipeline_rule_anchor_kind_check
    CHECK (anchor_kind IN ('self', 'next_edition', 'next_edition_listing')),

  CONSTRAINT production_pipeline_rule_direction_check
    CHECK (anchor_direction IN ('on', 'before', 'after')),

  -- ISO-8601, Monday = 1. NULL is legal and means the anchor's own day.
  CONSTRAINT production_pipeline_rule_weekday_check
    CHECK (anchor_weekday IS NULL OR anchor_weekday BETWEEN 1 AND 7),

  -- *The nearest preceding NOTHING* is not a rule. A direction of `before` or
  -- `after` needs a weekday to count occurrences of; only `on` can stand without
  -- one. This makes the incoherent row unrepresentable rather than merely
  -- unlikely.
  CONSTRAINT production_pipeline_rule_weekday_required_check
    CHECK (anchor_direction = 'on' OR anchor_weekday IS NOT NULL),

  CONSTRAINT production_pipeline_rule_episode_count_positive
    CHECK (episode_count IS NULL OR episode_count > 0)
);

-- A SERIES-LEVEL RULE CANNOT NAME A SERIES OF ANOTHER FORMAT. The composite key
-- it points at — `party_series_id_format_unique` — exists in production for
-- exactly this purpose and its own comment says *do not remove as tidying*
-- (`20260810120000:279-283`).
--
-- `MATCH SIMPLE` is the default and is what makes this work alongside a nullable
-- `series_id`: with any referenced column NULL the constraint is satisfied, so a
-- format-level rule passes without a series, and a series-level one is checked
-- in full. Same device as `event_parties_series_format_fk`.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'production_pipeline_rule_series_format_fk'
       AND conrelid = 'public.production_pipeline_rule'::regclass
  ) THEN
    ALTER TABLE public.production_pipeline_rule
      ADD CONSTRAINT production_pipeline_rule_series_format_fk
      FOREIGN KEY (series_id, format_id)
      REFERENCES public.party_series (id, format_id);
  END IF;
END;
$$;

-- ONE DEFAULT PER (FORMAT, KIND), and one override per (SERIES, KIND). Two
-- partial indexes and not one plain constraint, because a plain
-- `UNIQUE (format_id, series_id, piece_kind)` would treat two NULL series as
-- DISTINCT and let the format-level defaults duplicate on every re-run — which
-- would break the idempotence these indexes exist to provide.

CREATE UNIQUE INDEX IF NOT EXISTS production_pipeline_rule_format_kind_unique
  ON public.production_pipeline_rule (format_id, piece_kind)
  WHERE series_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS production_pipeline_rule_series_kind_unique
  ON public.production_pipeline_rule (series_id, piece_kind)
  WHERE series_id IS NOT NULL;

ALTER TABLE public.production_pipeline_rule ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 7a. The format-level rules
-- -----------------------------------------------------------------------------
--
-- EVERY ROW BELOW IS ALREADY PUBLISHED, in `production-calendar.md`'s weekday
-- table. Nothing here is a new publication, and nothing here says WHEN a night
-- happens, WHERE it happens or WHO plays.
--
-- THE FORMAT IS RESOLVED BY ITS PUBLIC CODE, through a join, and never by a
-- hard-coded uuid: a uuid in a migration is a value copied from one database
-- into a file, and it is wrong the first time somebody rebuilds from the
-- baseline container.
--
-- ⚠ AND IF A CODE HAS NO ROW, THE JOIN INSERTS NOTHING. That is the correct
-- behaviour — a rule for a format that does not exist is not a rule — but it is
-- also a SILENT ZERO, so it is named here rather than discovered: after this
-- migration is applied, sixteen rules are expected. A smaller number means a
-- format code below is not in `public.formats`, and the thing to look at is the
-- catalogue, not this file.

INSERT INTO public.production_pipeline_rule
  (format_id, piece_kind, anchor_kind, anchor_weekday, anchor_direction,
   derivable, episodes_from_lineup, episode_count, note)
SELECT f.id, v.piece_kind, v.anchor_kind, v.anchor_weekday, v.anchor_direction,
       v.derivable, v.episodes_from_lineup, v.episode_count, v.note
  FROM (VALUES
    -- ── The satellite ────────────────────────────────────────────────────────
    -- Four pieces, not two. A satellite's editorial plan is listing, tonight,
    -- recap and LiveCut: delivering two of four is not being late on a detail,
    -- it is skipping the piece that catches whoever decides the evening in the
    -- afternoon, and the recap that feeds the highlight.
    ('RMDB',  'listing',     'self', 2::integer,   'before', true,  false, NULL::integer, NULL::text),
    ('RMDB',  'tonight',     'self', NULL,         'on',     true,  false, NULL,          NULL),
    ('RMDB',  'recap',       'self', 1,            'after',  true,  false, NULL,          NULL),
    ('RMDB',  'livecut',     'self', 1,            'after',  true,  false, 1,             NULL),

    -- ── MotionLab: the same four, and one thing that is NOT decided ──────────
    -- The rows exist so that the day this format has a date, the checklist knows
    -- what it owes. It has NONE today — zero entries in the calendar, because
    -- the space is not acquired. A format without a space does not have a
    -- cadence; it has a wait.
    ('MTNLB', 'listing',     'self', 2,            'before', true,  false, NULL,          'The weekday of the night itself is a SEGNAPOSTO and is NOT decided. Every material that states this format''s day is provisional and must be marked so. This rule anchors the piece to the night, so it stays correct whatever that day turns out to be.'),
    ('MTNLB', 'tonight',     'self', NULL,         'on',     true,  false, NULL,          NULL),
    ('MTNLB', 'recap',       'self', 1,            'after',  true,  false, NULL,          NULL),
    ('MTNLB', 'livecut',     'self', 1,            'after',  true,  false, 1,             'This format also owes a step the others do not: the exhibition space must APPROVE the material that names it, and that approval sits inside the two days before the listing, not after them. It is a checklist kind, not a piece.'),

    -- ── SunSet ───────────────────────────────────────────────────────────────
    -- Two episodes, on the Monday and the Tuesday after. Measured on three
    -- editions out of three.
    ('SNST',  'livecut',     'self', 1,            'after',  true,  false, 2,             'Two episodes because there are two djs, measured on three editions of three. The count descends from the line-up, so a line-up of a different size makes THIS ROW the thing to change.'),
    ('SNST',  'listing',     'self', 2,            'before', false, false, NULL,          'NOT DERIVABLE, and this is a measurement rather than a gap. The listing is a Tuesday, but eleven or eighteen days ahead — never the nearest preceding one. The anticipation is not a fixed number, so nothing may derive it: it is read from the file. A proposal here would be a date a week and a half wrong drawn beside real ones.'),

    -- ── The night ────────────────────────────────────────────────────────────
    ('RSNT',  'timetable',   'self', NULL,         'on',     true,  false, NULL,          'The night''s own day. Measured seven times out of seven, with no exception — which corrects an older reading of minus one that had generalised a single derogation into a rule.'),
    ('RSNT',  'livecut',     'next_edition', 2,    'on',     true,  true,  NULL,          'Tuesday, Wednesday and Thursday of the ISO week containing the NEXT edition — not its own. Anchored, never counted: expressed as an offset from the night, the same three days look like two different rules because the night falls on a Friday or a Saturday. The number of episodes is the line-up''s, not the format''s: three is the norm and one archived edition carries two.'),
    ('RSNT',  'after_movie', 'next_edition_listing', 1, 'before', true, false, NULL,       'The Monday before the NEXT edition''s listing. Anchored to that listing and never to a day count: moving the following edition moves this piece. Measured from its own night it looks irregular; measured from its anchor it is minus one, always. When the next edition is not in the calendar, this piece has NO date and the reason is that it is waiting for that edition — which is the rule behaving correctly, not an omission to be filled in.'),
    ('RSNT',  'listing',     'self', 2,            'before', false, false, NULL,          'NOT DERIVABLE, on the same measurement as SunSet''s and for the same reason. All of these listings fall on a Tuesday, but one to two and a half weeks ahead, with three distinct anticipations across six editions. Only the satellite and the Nizza series sit on the nearest preceding Tuesday and may be proposed.')
  ) AS v(format_code, piece_kind, anchor_kind, anchor_weekday, anchor_direction,
         derivable, episodes_from_lineup, episode_count, note)
  JOIN public.formats f ON f.code = v.format_code
ON CONFLICT (format_id, piece_kind) WHERE series_id IS NULL DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7b. The series-level rules — the light pipeline of the Nizza series
-- -----------------------------------------------------------------------------
--
-- It is a SERIES of the night's format and not a fifth format. Confusing the two
-- means inventing an identity that does not exist — and sooner or later drawing
-- it a palette. But it runs its own, lighter pipeline, and both of the rows
-- below CONTRADICT the format-level rules seeded above. That contradiction is
-- the whole reason `series_id` exists on this table.
--
-- Both the format code and the series code are already published.

INSERT INTO public.production_pipeline_rule
  (format_id, series_id, piece_kind, anchor_kind, anchor_weekday, anchor_direction,
   derivable, episodes_from_lineup, episode_count, note)
SELECT f.id, s.id, v.piece_kind, v.anchor_kind, v.anchor_weekday, v.anchor_direction,
       v.derivable, v.episodes_from_lineup, v.episode_count, v.note
  FROM (VALUES
    ('RSNT', 'PRLN', 'listing', 'self', 2::integer, 'before', true, false, NULL::integer, 'The light pipeline: unlike the night''s, THIS listing does sit on the nearest preceding Tuesday and may be proposed. Measured two of two.'),
    ('RSNT', 'PRLN', 'livecut', 'self', 1,          'after',  true, false, 1,             'One episode, anchored to ITS OWN night — where the night''s LiveCuts are anchored to the following edition. Measured two of two.')
  ) AS v(format_code, series_code, piece_kind, anchor_kind, anchor_weekday, anchor_direction,
         derivable, episodes_from_lineup, episode_count, note)
  JOIN public.formats f ON f.code = v.format_code
  JOIN public.party_series s ON s.format_id = f.id AND s.code = v.series_code
ON CONFLICT (series_id, piece_kind) WHERE series_id IS NOT NULL DO NOTHING;

COMMIT;
