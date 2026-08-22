-- =============================================================================
-- production_lineup_slot — THE LINE-UP ENTERS THE MIRROR, BY THE SLOT
-- =============================================================================
--
-- Owner's decision, 2026-08-22: the line-up written in a calendar entry's note
-- stops being declared unread and gets a table. The same decision carried a
-- CORRECTION OF DOMAIN, and the correction is the reason this table exists in
-- the shape it has rather than as a list of names:
--
--     A LIVECUT IS COUNTED FROM THE SLOTS OF A TIMETABLE, NEVER FROM THE NAMES
--     IN IT. ARTISTS PLAY TOGETHER — A B2B IS ONE RECORDING, NOT TWO.
--
-- `production-calendar.md` says *un podcast per dj*, and read literally that
-- sentence counts names. Measured on the live feeds on 2026-08-22, counting
-- names OVER-COUNTS: one night carries SIX names in FIVE slots and another FOUR
-- names in TWO, and the calendar holds exactly five LiveCut entries for the
-- first. The name count would have planned a sixth episode that cannot exist —
-- and a piece planned that nobody owes is a hole discovered on the day it was
-- due, which is the failure this whole domain is built to avoid.
--
-- So the unit of this table is the SLOT. One row is one window of one night,
-- and `count(*)` over a night's rows is the number of LiveCuts that night owes.
-- There is deliberately NO table of artists with one row each: a schema in which
-- the obvious count is the wrong count is a schema that will produce the wrong
-- count.
--
-- ⚠ WHERE THE NAMES MAY LIVE, AND WHERE THEY MAY NOT.
--
-- `artists` holds people who play on dates that may not have been announced
-- (`sound-manifesto.md`: *chi suona a una data non ancora comunicata non si
-- scrive qui e non si scrive nel repo*). The name is authorised IN THE DATABASE
-- and stops there. It does not enter a PLAN, a SUMMARY, a VERIFICATION, a report
-- line, a log or anything else under `.planning/` — that directory is tracked
-- and `github.com/edmiribrahimi/Resonate` is PUBLIC, so a publication is
-- irreversible. It is the same rule `production_checklist_item.ticked_by_name`
-- already carries, applied to a larger population.
--
-- ⚠ THIS TABLE CARRIES NO `calendar_key`, AND THE ABSENCE IS A DECISION.
--
-- It is inside the mirror's scope THROUGH ITS PLAN ROW, exactly as
-- `production_checklist_item` is. A second copy of the scope on this table would
-- be a second condition that can disagree with the first, and a mirror whose
-- boundary is written twice has two boundaries. The importer removes these rows
-- by the same plan-id list it uses for the checklist, and the cascade below is
-- the belt behind that brace.
--
-- ⚠ THE CASCADE IS A WRITE PATH, AND IT IS DECLARED HERE.
--
-- `ON DELETE CASCADE` means the mirror's removal of a night takes its slots with
-- it, so the snapshot taken before that removal must cover THIS table too
-- (`ai-engineering.md`, gate *un'istantanea prima copre cio' che si tocca*). It
-- does, from this migration's own commit.
--
-- Unlike a tick, a slot is NOT human state: it is reconstructible from the feed
-- on the next run. That difference is why the restore path of `P-58-C` does not
-- put slots back and does not need to — and why it is written down instead of
-- being rediscovered by somebody who expects it to.

CREATE TABLE IF NOT EXISTS public.production_lineup_slot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_id uuid NOT NULL REFERENCES public.production_plan(id) ON DELETE CASCADE,

  -- WHICH ENTRY'S NOTE DECLARED THIS SLOT. Not a foreign key: the declaring
  -- entry may be the night itself, its timetable, or the LiveCut of the set —
  -- three different rows in two different tables — and a column that can point
  -- at either is a column that points at neither. It is kept because a slot two
  -- notes disagree about is a finding somebody has to be able to locate.
  source_uid text NOT NULL,

  -- THE WINDOW. `time`, not `timestamptz`: the calendar's own civil clock, taken
  -- verbatim off the note, with no instant and no zone attached — the same
  -- discipline `production_plan.start_time` follows and for the same reason.
  --
  -- ⚠ `end_time` MAY BE EARLIER THAN `start_time`, AND THERE IS DELIBERATELY NO
  -- CHECK FORBIDDING IT. A night runs 22:00 to 06:00. A constraint that read
  -- "the end is after the start" would reject the format this project's whole
  -- calendar is built around, and would reject it at the moment somebody was
  -- mirroring a real night.
  start_time time NOT NULL,
  end_time time NOT NULL,

  -- WHO PLAYS IT. One name, several — a b2b is ONE slot with TWO — or NONE.
  --
  -- ⚠ EMPTY IS A THIRD ANSWER AND NOT A ZERO. A LiveCut's own note declares its
  -- window with a part marker instead of a name (`pt2 19:30-22:00`): the slot is
  -- real, the names are simply not in THAT note. Dropping such a row would throw
  -- away the only line-up evidence a night without a timetable has; inventing a
  -- name for it is the thing the reader refuses to do. So the row exists, the
  -- array is empty, and the count of LiveCuts owed is still right.
  artists text[] NOT NULL DEFAULT '{}'::text[],

  sort_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- No NULL element, and no blank one. An array with a hole in it reads as a
  -- name nobody typed, and `array_position` answering NULL is the only way to
  -- ask PostgreSQL that question about an array.
  CONSTRAINT production_lineup_slot_artists_no_holes
    CHECK (array_position(artists, NULL) IS NULL),
  -- And no blank one. Written with `array_position` rather than a subquery,
  -- because a CHECK may not contain one — a `NOT EXISTS (SELECT ...)` here is
  -- rejected by the server, not merely discouraged. The reader trims before it
  -- writes, so a whitespace-only name never reaches this column; this constraint
  -- is the one that holds when a future writer forgets to.
  CONSTRAINT production_lineup_slot_artists_not_blank
    CHECK (array_position(artists, '') IS NULL),

  -- ONE SLOT PER NIGHT PER WINDOW. Two notes routinely declare the same window
  -- — a timetable naming who plays it and the LiveCut of that set naming only
  -- its part — and they are ONE slot. Without this, a re-import that read both
  -- would double a night's episode count, which is the direction that invents
  -- work rather than hiding it, and it would do it silently.
  CONSTRAINT production_lineup_slot_plan_window_unique
    UNIQUE (plan_id, start_time, end_time)
);

COMMENT ON TABLE public.production_lineup_slot IS
  'One slot of one night''s timetable: a civil window and the artists inside it. '
  'THE SLOT IS THE UNIT — a b2b is one slot with two names, and one LiveCut is '
  'owed per SLOT, never per name. Mirrored from the calendar; scoped through '
  'production_plan and never by a calendar_key of its own. The artist names are '
  'authorised in this column and nowhere else: not in .planning/, not in a '
  'report, not in a log — this repository is public.';

COMMENT ON COLUMN public.production_lineup_slot.artists IS
  'One name, several, or none. Empty means the note that declared this window '
  'carried no name — a third answer, not a zero. Never printed anywhere.';

-- The rule that reads this table, corrected in place. The column has carried no
-- comment since it was created; it gets one now because the sentence a future
-- reader would otherwise reach for — *un podcast per dj* — is the one that
-- over-counts.
COMMENT ON COLUMN public.production_pipeline_rule.episodes_from_lineup IS
  'TRUE where the number of pieces descends from the line-up. It descends from '
  'the number of SLOTS in production_lineup_slot, NEVER from the number of '
  'names: two artists playing back to back are one set and therefore one '
  'LiveCut. Measured 2026-08-22 — counting names planned six episodes for a '
  'night that has five.';

-- No separate index on `plan_id`. The only read this table serves is *this
-- night's line-up*, and the unique constraint above is backed by an index that
-- LEADS WITH `plan_id`, so that read is already served. A second index would be
-- write cost with no read benefit — the same reasoning
-- `production_checklist_item` writes down for the same situation.

ALTER TABLE public.production_lineup_slot ENABLE ROW LEVEL SECURITY;

-- SELECT ONLY, and behind the calendar's own capability — the same policy shape
-- the other five mirrored tables carry. There is no INSERT, UPDATE or DELETE
-- policy, so the only writer is the service client the importer runs under: a
-- line-up is mirrored from the calendar, and an edit made here would be silently
-- discarded by the next run (D-44-02).
DROP POLICY IF EXISTS production_lineup_slot_select_production_calendar_manage
  ON public.production_lineup_slot;

CREATE POLICY production_lineup_slot_select_production_calendar_manage
  ON public.production_lineup_slot
  FOR SELECT
  USING ((SELECT private.has_capability('production.calendar.manage')));
