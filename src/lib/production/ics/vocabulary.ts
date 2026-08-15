/**
 * The production calendar's vocabularies, named once.
 *
 * Eight closed sets — piece kinds, date origins, unresolved reasons, entry
 * classes, naming conventions, venue stages, anchor kinds and anchor directions
 * — plus the two civil-time aliases every other module in this directory takes
 * its dates in.
 *
 * This module is the source. It imports nothing — not `@/types/database`, which
 * will import *from here* — so that a divergence between the two paths is a type
 * error at `npm run build`. In a repository with no test runner, that build is
 * the only automatic gate there is (`@/lib/door/outcome`, same discipline, same
 * reason).
 *
 * ── (a) The SQL mirror is REAL for this module ───────────────────────────────
 *
 * Six of the eight sets below are duplicated as SQL `CHECK` vocabularies by this
 * phase's migration (plan 44-02): the piece `kind`, the `origin`, the
 * `unresolved_reason`, the `naming_convention` and the `venue_stage` columns,
 * and the anchor kind + direction pair that stores a rule as
 * `(anchor kind, weekday, direction)` instead of a day count.
 *
 * That mirror changes what a green build proves, and the direction of the
 * difference matters. `@/lib/capabilities/keys` states the opposite case in as
 * many words — *a capability key has no such mirror*, so a misspelling there is
 * a runtime `false` rather than a compile error. Here the database physically
 * refuses a row whose `kind` is not one of the six: `next build` catches the
 * TypeScript side, the `CHECK` catches the SQL side, and the two agree **only
 * because they were written once here and copied**.
 *
 * **Editing either literal set means editing both, in the same commit.** A
 * changed constraint set is a new migration, never an edit to an applied one
 * (`supabase-data.md`, gate *migration in avanti*).
 *
 * ── (b) The seventh piece kind, and why this file does not spell its name ────
 *
 * `PIECE_KINDS` has six members and it is closed. There is exactly one word a
 * reader will be tempted to add as a seventh, and it names a **different thing
 * that does not exist yet** (D-44-22): a mix sent in by a selector who is not in
 * any line-up, as opposed to `livecut`, which is the recording of a set somebody
 * actually played at one of our nights. The distinction is not terminology. A
 * piece of the first kind, drawn on a production surface beside real dates and
 * real progressivi, reads as an announcement that the person will play — and it
 * is not one. `production-calendar.md` puts it as a gate: a calendar entry
 * carrying that word today is a naming error or a thing that should not be
 * there, and the measured file contains zero of them.
 *
 * **The word itself is deliberately not written anywhere in this directory**,
 * for the reason `src/app/(admin)/admin/formats/actions.ts:58-63` gives about
 * its own forbidden literal: *a grep whose only match is the sentence forbidding
 * the thing is a grep that gets ignored the third time it goes red.* The
 * prohibition is enforceable precisely because the grep has nothing to find.
 *
 * ── (c) No `Date` is constructed anywhere in this directory ──────────────────
 *
 * The anchors of this pipeline are **weekdays of a civil calendar** (D-44-25),
 * resolved as *"the Tuesday before"* or *"the Monday after"*, never as a day
 * count. Every `DTSTART` in the source file carries a `TZID` and no `Z`; a
 * conversion that moves a 22:00 entry across midnight moves its **weekday**, and
 * a weekday that moves turns a conforming night into a reported error. The night
 * itself falls Friday *or* Saturday, so the same Tuesday is −4 from one and −3
 * from the other: an offset sees two rules where there is one, and flags the
 * calendar rather than itself.
 *
 * So: no date object is ever constructed here, none of the platform's date
 * formatters or serialisers is called, and no timezone library is adopted.
 * {@link CivilDate} and {@link CivilTime} are strings taken verbatim off the
 * file, and they stay strings all the way to the column.
 *
 * **The four names one would reach for are deliberately not spelled anywhere in
 * this directory**, and the rule is narrower than a taste: a literal that a
 * mechanical check greps for is not written in prose, because a grep whose only
 * match is the sentence forbidding the thing is a grep that gets ignored the
 * third time it goes red (`src/app/(admin)/admin/formats/actions.ts:58-63`,
 * about its own forbidden literal). `Date.now()` is spelled, because nothing
 * greps for it and the purity sentence this directory inherits from
 * `src/lib/door/classify.ts:37-41` names it.
 */

/**
 * The six pieces the pipeline produces. Measured in the source file, in full —
 * these six and nothing else (`44-RESEARCH.md` §Entry Grammars, class A).
 *
 * `livecut` is the only audio member, and it is the only audio piece the
 * pipeline has. See claim (b) above before adding a seventh.
 */
export const PIECE_KINDS = [
  "listing",
  "tonight",
  "recap",
  "livecut",
  "timetable",
  "after_movie",
] as const;

/** One of the six pieces. Mirrored by the `kind` CHECK on `production_piece`. */
export type PieceKind = (typeof PIECE_KINDS)[number];

/**
 * Where a piece's date came from.
 *
 * `file` — a date written in the calendar. It always wins (D-44-09b part 1): an
 * override is not a remembered edit, it is simply a date that differs from what
 * the rule would have proposed, and a re-import re-reads it every time.
 *
 * `proposed` — computed from the rule because the file carries no such entry. A
 * proposal never carries a `source_uid`; the migration makes the combination
 * unrepresentable rather than merely discouraged.
 */
export const PIECE_DATE_ORIGINS = ["file", "proposed"] as const;

/** `file` or `proposed`. Mirrored by the `origin` CHECK on `production_piece`. */
export type PieceDateOrigin = (typeof PIECE_DATE_ORIGINS)[number];

/**
 * The three distinct reasons a piece has no date, and they must stay three.
 *
 * Collapsing them into one "unknown" is the collapsed-`catch` pattern this
 * project has already paid for once — the newsletter form that answers every
 * failure with one sentence (`meta-gates.md`). Each of these says a different
 * true thing and each has a different way out:
 *
 * - `awaiting_next_edition` — the anchor edition is not in the calendar yet, so
 *   the date is not computable *today*. The surface names what it is waiting for
 *   (D-44-12). One edition in the measured file is in exactly this state, and it
 *   is the rule behaving correctly rather than a gap to fill.
 * - `depends_on_lineup` — how many episodes exist descends from how many people
 *   played (D-44-13). Measured: one archived edition carries two rather than
 *   three, so three is not a constant.
 * - `not_derivable` — by rule, permanently. The night's and SunSet's listings
 *   fall on a Tuesday one to two and a half weeks ahead, and the anticipation is
 *   not a fixed number, so nothing may derive one (D-44-23, extended to the
 *   night by measurement). Only satellite and Perlone listings may be proposed.
 */
export const UNRESOLVED_REASONS = [
  "awaiting_next_edition",
  "depends_on_lineup",
  "not_derivable",
] as const;

/** Why a piece has no date. Mirrored by the `unresolved_reason` CHECK. */
export type UnresolvedReason = (typeof UNRESOLVED_REASONS)[number];

/**
 * What an entry in the file turned out to be.
 *
 * `unclassified` is a first-class member and not a failure state. Entries whose
 * title carries a format word but no recognisable kind and no progressivo are
 * **recorded with their UID and counted**, never guessed: guessing hands one of
 * them a format and a progressivo it does not have, and a progressivo is a
 * monotone guard — once assigned it is already on a poster (D-44-18, D-44-20).
 */
export const ENTRY_CLASSES = [
  "night",
  "piece",
  "commitment",
  "unclassified",
] as const;

/** What an entry turned out to be. */
export type EntryClass = (typeof ENTRY_CLASSES)[number];

/**
 * The two title grammars a piece can arrive in.
 *
 * `legacy` is not dead weight: the three entries written in the older, inverted
 * form are confined to the two earliest editions of the night and they carry
 * **both** of the file's genuine anchor overrides. A reader that handles one
 * grammar drops them, and with them the only live evidence that the override
 * rule is needed at all.
 */
export const NAMING_CONVENTIONS = ["canonical", "legacy"] as const;

/** Which title grammar a piece was written in. */
export type NamingConvention = (typeof NAMING_CONVENTIONS)[number];

/**
 * How far a space has got. Four different things, in order, and the vocabulary
 * is already public in `venue-acquisition.md` — *mapped ≠ verified ≠ contacted ≠
 * acquired*.
 *
 * The gate that makes this column worth having: **acquired means in writing**,
 * not "said yes on the phone", and a space that is not acquired does not get its
 * name into any material. The stage travels with the name for exactly that
 * reason (D-44-05).
 */
export const VENUE_STAGES = [
  "mapped",
  "verified",
  "contacted",
  "acquired",
] as const;

/** How far a space has got. Mirrored by the `venue_stage` CHECK. */
export type VenueStage = (typeof VENUE_STAGES)[number];

/**
 * What a piece's date is measured *from*. Three anchors, measured:
 *
 * - `self` — the night the piece belongs to. Timetable, tonight, recap, and the
 *   satellite and Perlone listings and LiveCuts.
 * - `next_edition` — the night **after** this one. The night's LiveCuts fall in
 *   the ISO week containing the next edition, not their own.
 * - `next_edition_listing` — the after movie lands the day before the *next*
 *   edition's listing. Anchored to that listing and never to a day count: moving
 *   the next date moves the after movie, and a piece computed as "+N days" ends
 *   up published in the wrong place every time the calendar shifts.
 */
export const ANCHOR_KINDS = ["self", "next_edition", "next_edition_listing"] as const;

/** What a rule measures from. Mirrored by the `anchor_kind` CHECK. */
export type AnchorKind = (typeof ANCHOR_KINDS)[number];

/**
 * Which way to look from the anchor for the rule's weekday.
 *
 * `on` — the anchor's own day. `before` — the nearest preceding one. `after` —
 * the nearest following one. Together with a weekday this is the whole storage
 * form of a rule, and it is stored this way *instead of* an offset because the
 * night falls Friday or Saturday and an offset would split one rule in two.
 */
export const ANCHOR_DIRECTIONS = ["on", "before", "after"] as const;

/** Which way to look from the anchor. Mirrored by the `anchor_direction` CHECK. */
export type AnchorDirection = (typeof ANCHOR_DIRECTIONS)[number];

/**
 * Production's own words for the six pieces, exactly as they are written on a
 * surface (`44-UI-SPEC.md` §13.4). `LiveCut` is CamelCase because that is how
 * production writes it, on all of its occurrences in the calendar.
 *
 * Typed as a **total** `Record` over the union on purpose, exactly as
 * `CAP_DESCRIPTIONS` is in `@/lib/capabilities/keys` and `DOOR_OUTCOME_KINDS` is
 * in `@/lib/door/outcome`: a seventh kind added to `PIECE_KINDS` without a label
 * here is a `npm run build` error, and a label for a kind that no longer exists
 * is an error too. It is the one part of this file's contract the compiler can
 * hold, and in a repository with no test runner that is worth saying rather than
 * assuming.
 */
export const PIECE_KIND_LABELS: Record<PieceKind, string> = {
  listing: "Listing",
  tonight: "Tonight",
  recap: "Recap",
  livecut: "LiveCut",
  timetable: "Timetable",
  after_movie: "After Movie",
};

/**
 * A civil date, `YYYY-MM-DD`. A plain `string`, deliberately unbranded.
 *
 * "Civil" is the load-bearing word: it is a day on the calendar hanging on a
 * wall, with no instant, no offset and no zone attached. It is produced by
 * slicing the `YYYYMMDD` prefix of a `DTSTART` and inserting two hyphens, and it
 * is consumed by comparing strings — which sorts correctly, because the format
 * is fixed-width and big-endian.
 *
 * Unbranded because a brand would have to be constructed, and the only honest
 * constructor would be one that validates; the validation that matters happens
 * once, at the parse boundary, and a brand here would suggest it happens
 * everywhere. See claim (c) above for why it is never a `Date`.
 */
export type CivilDate = string;

/**
 * A civil time of day, `HH:MM`, 24-hour. Same discipline as {@link CivilDate}:
 * the `HHMM` characters of a `DTSTART`, with a colon inserted, and no instant
 * anywhere.
 */
export type CivilTime = string;
