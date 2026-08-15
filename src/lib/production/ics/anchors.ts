/**
 * When a piece falls — resolved as a **weekday relative to an anchor event**,
 * and never as a count of days.
 *
 * ── ⚠ THE ONE THING THIS MODULE EXISTS TO GET RIGHT ─────────────────────────
 *
 * The night falls **Friday or Saturday**. So the very same Tuesday sits four days
 * before one and three before the other. A module that stored the distance as a
 * number therefore sees **two rules where there is one**, and reports a perfectly
 * conforming night as an error.
 *
 * That is not a hypothesis. A check written during this phase's own discussion
 * reported one night as out of rule on three pieces; the owner answered it in a
 * sentence — *the next night falls on a Friday* — and the re-measurement proved
 * him right. **Two earlier passes had measured correctly and still written the
 * consequence instead of the rule** (D-44-25). A consequence written as a rule
 * produces a false alarm every time the calendar moves by one day, and a checker
 * that cries wolf is a checker somebody switches off.
 *
 * The same lesson from the other side: measured from its own night, the after
 * movie looks irregular — spreads of nine, sixteen, eighty and a hundred and
 * forty-three days. Measured from the anchor its rule actually names, it is the
 * day before, always. **The variability was in the point of observation, not in
 * the data.**
 *
 * So there is no stored distance in this module, under any name, and a `grep` for
 * one is the assertion.
 *
 * ── ⚠ WHY THE CIVIL ARITHMETIC IS WRITTEN HERE INSTEAD OF DELEGATED ─────────
 *
 * Because the whole failure above is a **weekday moving**. Every `DTSTART` in the
 * source file carries a zone parameter and no UTC marker; a conversion that moves
 * a 22:00 entry across midnight moves its weekday, and a weekday that moves turns
 * a conforming night into a reported error *before any rule is ever applied*.
 *
 * So no date object is constructed here, none of the platform's date formatters
 * or serialisers is called, and no timezone library is adopted — the same claim
 * `./vocabulary` makes for this whole directory, honoured by writing the four
 * primitives below on integers: {@link isoWeekday} from Sakamoto's method with no
 * epoch, {@link addDays} from a fixed days-in-month table with the proleptic
 * Gregorian leap rule, {@link isoWeekStart} and {@link nearestWeekday} from those
 * two.
 *
 * The four names one would otherwise reach for are deliberately **not spelled
 * anywhere in this directory**, for the reason
 * `src/app/(admin)/admin/formats/actions.ts:58-63` gives about its own forbidden
 * literal: a grep whose only match is the sentence forbidding the thing is a grep
 * that gets ignored the third time it goes red.
 *
 * ── The rule is a row, and it is passed in ──────────────────────────────────
 *
 * {@link PipelineRule} is read from `production_pipeline_rule` and handed to this
 * module as a plain object. Nothing here hard-codes which piece a format owes:
 * the pipeline changed twice inside one month — the night's three anchors were
 * re-measured and all three were wrong in the persona module, and SunSet's
 * LiveCut went from one episode to two. A rule in code makes the next such change
 * a deploy. A row makes it an edit, which is what a thing that moves twice a
 * month has to be.
 *
 * `anchor_kind` is one of 'self', 'next_edition' or 'next_edition_listing';
 * `anchor_weekday` is ISO-8601 with Monday as 1, and `null` means *the anchor's
 * own day, whichever weekday that turns out to be* — the only correct way to say
 * it about a night that may be a Friday or a Saturday.
 *
 * ── ⚠ THE THREE REFUSALS STAY THREE ─────────────────────────────────────────
 *
 * `awaiting_next_edition`, `depends_on_lineup` and `not_derivable` say three
 * different true things and each has a different way out. Collapsing them into
 * one "unknown" is the collapsed-`catch` pattern this project has already paid
 * for once — the newsletter form answering a network failure, a missing key and a
 * duplicate address with one sentence (`meta-gates.md`). There is no error
 * tracking in this product, so a reason that loses its category loses it for good.
 *
 * ── ⚠ A DATE WRITTEN IN THE FILE ALWAYS WINS ────────────────────────────────
 *
 * This module is **never consulted for a piece that exists in the file**
 * (D-44-09b part 1). An override is not a remembered edit; it is simply a date
 * that differs from what the rule would have proposed, and the re-import re-reads
 * it every time. What comes out of {@link proposePieceDate} is a proposal, and the
 * call site marks it as one — it must never read as settled (D-44-09b part 3).
 *
 * ── ⚠ `conformsToRule` REACHES NO PIXEL ─────────────────────────────────────
 *
 * Its value feeds the divergence report and nothing else. The owner chose that a
 * moved date is **not** surfaced as a label (D-44-10), and read the stated cost:
 * after three months nobody can tell rule from exception on screen. Drawing this
 * boolean would quietly reverse that decision, so it is stated here rather than
 * left for the next reader to work out.
 *
 * ── Pure by design ──────────────────────────────────────────────────────────
 *
 * The only import is a type-only `./vocabulary`, so this module has no runtime
 * dependency at all — no Supabase client, no HTTP call, no React, and no
 * `Date.now()` in any decision. The same rule and the same context yield the same
 * answer on any machine, in any zone, at any hour.
 *
 * ── What a green build does NOT prove ───────────────────────────────────────
 *
 * That these rules describe the real calendar. The conformance figures —
 * timetable on the night's own day seven times of seven, the night's LiveCuts in
 * the ISO week of the following edition six of six, the after movie the day
 * before the following edition's listing six of seven, SunSet's two LiveCuts on
 * the Monday and the Tuesday six of six, and **both** of the non-derivable
 * listings withheld — are asserted by plan 44-08's golden-file check. Nothing
 * here claims criterion 3 is satisfied.
 */

import { ANCHOR_DIRECTIONS, ANCHOR_KINDS } from "./vocabulary";
import type {
  AnchorDirection,
  AnchorKind,
  CivilDate,
  UnresolvedReason,
} from "./vocabulary";

// ── The civil-date primitives ───────────────────────────────────────────────

/** Days per month, index 0 = January. February is corrected by the leap rule. */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Sakamoto's per-month offsets, in the order the method wants them. */
const SAKAMOTO_OFFSETS = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4] as const;

/** Monday. Named because it is the start of an ISO week and reads as noise as a digit. */
const MONDAY = 1;

/** Sunday, ISO-8601. The last legal weekday, and the bound every check uses. */
const SUNDAY = 7;

/** A civil date as three integers, so nothing below ever needs to re-parse one. */
interface CivilParts {
  year: number;
  month: number;
  day: number;
}

/** The proleptic Gregorian leap rule, written out rather than inferred. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** How many days a civil month has. `month` is 1-based. */
function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

/** Two digits, zero-padded. */
function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/** `YYYY-MM-DD` from three integers. Fixed width, so string order is date order. */
function formatCivilDate(parts: CivilParts): CivilDate {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/** `YYYY-MM-DD` back to three integers, or `null` when it is not one. */
function partsOf(date: CivilDate): CivilParts | null {
  if (date.length !== 10 || date[4] !== "-" || date[7] !== "-") return null;

  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return { year, month, day };
}

/**
 * A malformed civil date is a programming error here, not a data condition.
 *
 * The parser already refused every unreadable stamp as a finding of its own, so a
 * value that reaches this module has been validated once. The message carries
 * **no value**: a date in this pipeline is an unannounced date, and a date that
 * escapes into a log or a screen is the thing `venue-secrecy.md` exists to
 * prevent — an error message is a perfectly ordinary way for one to get out.
 */
function refuseMalformed(argument: string): never {
  throw new RangeError(
    `production/ics/anchors: ${argument} is not a YYYY-MM-DD civil date. The value ` +
      "is deliberately not echoed here — a date in this calendar may be an " +
      "unannounced one, and an error message is an ordinary way for one to reach a " +
      "log. Look at the caller, which is passing something the parser did not produce."
  );
}

/**
 * The ISO-8601 weekday of a civil date. **Monday is 1, Sunday is 7.**
 *
 * Sakamoto's method: integer arithmetic on the year, the month and the day, with
 * no epoch and no instant anywhere. It answers the only temporal question this
 * pipeline ever asks — *is this a Tuesday* — and it answers it identically on
 * every machine, which is the entire reason it is written out instead of
 * delegated.
 */
export function isoWeekday(date: CivilDate): number {
  const parts = partsOf(date);
  if (parts === null) refuseMalformed("the date");

  const shifted = parts.month < 3 ? parts.year - 1 : parts.year;
  const sum =
    shifted +
    Math.floor(shifted / 4) -
    Math.floor(shifted / 100) +
    Math.floor(shifted / 400) +
    SAKAMOTO_OFFSETS[parts.month - 1] +
    parts.day;

  // Sakamoto counts Sunday as 0; ISO-8601 counts Monday as 1 and Sunday as 7,
  // and the rule rows are written in ISO-8601 because that is what the migration
  // stores. Converting here, once, keeps the two from ever disagreeing.
  const sundayZero = ((sum % 7) + 7) % 7;
  return ((sundayZero + 6) % 7) + 1;
}

/**
 * The civil date `n` days from `date`, forwards or backwards.
 *
 * Walked one day at a time on the days-in-month table. Walking is honest at this
 * scale — the spans this is asked about are a handful of days inside one week —
 * and it keeps the whole module on one arithmetic instead of introducing an epoch,
 * which is the thing the module docblock refuses.
 */
export function addDays(date: CivilDate, n: number): CivilDate {
  const parts = partsOf(date);
  if (parts === null) refuseMalformed("the date");
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(
      "production/ics/anchors: addDays takes a whole number of days. A fractional " +
        "one is an instant creeping back into a calendar that has none."
    );
  }

  let cursor = parts;

  for (let step = 0; step < Math.abs(n); step += 1) {
    cursor = n > 0 ? nextCivilDay(cursor) : previousCivilDay(cursor);
  }

  return formatCivilDate(cursor);
}

/** The next civil day, by the table. Rolls the month, then the year. */
function nextCivilDay(parts: CivilParts): CivilParts {
  if (parts.day < daysInMonth(parts.year, parts.month)) {
    return { year: parts.year, month: parts.month, day: parts.day + 1 };
  }
  if (parts.month < 12) {
    return { year: parts.year, month: parts.month + 1, day: 1 };
  }
  return { year: parts.year + 1, month: 1, day: 1 };
}

/** The previous civil day, by the table. */
function previousCivilDay(parts: CivilParts): CivilParts {
  if (parts.day > 1) {
    return { year: parts.year, month: parts.month, day: parts.day - 1 };
  }
  if (parts.month > 1) {
    const month = parts.month - 1;
    return { year: parts.year, month, day: daysInMonth(parts.year, month) };
  }
  return { year: parts.year - 1, month: 12, day: 31 };
}

/**
 * The Monday of the ISO week containing `date` — itself, when it is a Monday.
 *
 * The night's LiveCuts are *"the Tuesday, the Wednesday and the Thursday of the
 * week containing the next edition"*, and a week has to start somewhere for that
 * sentence to mean anything. It starts on Monday, per ISO-8601, which is also
 * what the calendar's own recurrence handling defaults to.
 */
export function isoWeekStart(date: CivilDate): CivilDate {
  return addDays(date, MONDAY - isoWeekday(date));
}

/**
 * The occurrence of `weekday` that a rule's direction names, relative to `from`.
 *
 * - `on` — that weekday **inside the anchor's own ISO week**. This is what makes
 *   the night's LiveCuts one rule instead of two: the Tuesday of the week
 *   containing the next edition is the same Tuesday whether that edition falls on
 *   the Friday or on the Saturday.
 * - `before` — the nearest **strictly** preceding occurrence.
 * - `after` — the nearest **strictly** following occurrence.
 *
 * Strictly, in both directions, and that is a decision rather than an oversight:
 * *the nearest preceding Tuesday* of a Tuesday is the one a week earlier, because
 * a piece that announces a night cannot be the night itself. If a rule ever needs
 * the other reading, the row is the thing to change — that is why it is a row.
 */
export function nearestWeekday(
  from: CivilDate,
  weekday: number,
  direction: AnchorDirection
): CivilDate {
  if (!Number.isInteger(weekday) || weekday < MONDAY || weekday > SUNDAY) {
    throw new RangeError(
      "production/ics/anchors: a weekday is ISO-8601 — Monday is 1 and Sunday is 7. " +
        "The rule rows store it that way, and a value outside that range is a row " +
        "the database would have refused."
    );
  }

  const here = isoWeekday(from);

  if (direction === "on") {
    return addDays(isoWeekStart(from), weekday - MONDAY);
  }

  if (direction === "before") {
    return addDays(from, -(((here - weekday + 6) % 7) + 1));
  }

  return addDays(from, ((weekday - here + 6) % 7) + 1);
}

// ── The rule, the context, and the three refusals ───────────────────────────

/**
 * One obligation, read from `production_pipeline_rule`.
 *
 * *This format owes a piece of this kind, and it falls on this weekday relative
 * to this anchor.* Passed in as a plain object and **never hard-coded here**; see
 * the module docblock for why a row and not a branch.
 */
export interface PipelineRule {
  /** What the weekday is counted from. */
  anchorKind: AnchorKind;
  /** ISO-8601, Monday as 1. `null` means the anchor's own day, whatever it is. */
  anchorWeekday: number | null;
  /** Which occurrence of that weekday. */
  anchorDirection: AnchorDirection;
  /**
   * Whether a missing piece may be proposed at all (D-44-09b part 3).
   *
   * `false` is a **measured refusal**, not an unfinished thought: for the night's
   * listing and for SunSet's the anticipation is not a fixed number, so there is
   * no rule to derive one from.
   */
  derivable: boolean;
  /** Whether how many episodes exist is a property of the line-up (D-44-13). */
  episodesFromLineup: boolean;
  /** How many episodes, where that is a property of the format. */
  episodeCount: number | null;
}

/**
 * What the caller knows about the night this piece belongs to.
 *
 * Every date here is civil and comes from the parser or from a column. `null` is
 * a first-class answer for each of the three optional ones, and each `null`
 * produces a *different* refusal — which is the point.
 */
export interface AnchorContext {
  /** The night's own civil date. */
  nightDate: CivilDate;
  /** The following edition's date, or `null` when it is not in the calendar. */
  nextEditionDate: CivilDate | null;
  /** The following edition's listing date, or `null` when there is none. */
  nextEditionListingDate: CivilDate | null;
  /**
   * What the surface names while it waits (D-44-12) — a series code and a
   * progressivo, supplied by the caller.
   *
   * **Never a title.** A series code and a number are already public; a title
   * from this calendar is an unannounced date, a space under negotiation or a
   * line-up.
   */
  nextEditionLabel: string | null;
  /**
   * How many artists are credited on the night, or `null` when that is not yet
   * knowable.
   *
   * Measured, and the reason no constant will do: one archived edition of the
   * night carries two LiveCuts rather than three. The count descends from the
   * line-up, so changing the line-up changes the plan of publication.
   */
  creditedArtistCount: number | null;
}

/** A resolved anchor, or the named reason it could not be resolved. */
export type AnchorResolution =
  | { resolved: true; date: CivilDate }
  | { resolved: false; unresolved: UnresolvedReason; edition: string | null };

/** What {@link proposePieceDate} hands back to the reconciler. */
export type PieceDateProposal =
  | { date: CivilDate }
  | { unresolved: UnresolvedReason; edition?: string };

// ── The load-time assertions, which are this repository's substitute for a test
//    (`src/lib/routes/staff-tabs.ts:150-175`, same device, same reason) ───────
//
// Two failures, two sentences. An anchor kind with no branch and a direction with
// no branch are different mistakes with different repairs, and one message
// covering both would be the collapsed-catch pattern the module docblock names.

const RESOLVED_KINDS = new Set<string>(["self", "next_edition", "next_edition_listing"]);
const RESOLVED_DIRECTIONS = new Set<string>(["on", "before", "after"]);

for (const kind of ANCHOR_KINDS) {
  if (!RESOLVED_KINDS.has(kind)) {
    throw new Error(
      `production/ics/anchors: the anchor kind "${kind}" is declared in the ` +
        "vocabulary and the migration's CHECK will accept a row carrying it, but " +
        "nothing here resolves it. A rule the database stores and the resolver " +
        "cannot read is a piece with no date and no reason for having none."
    );
  }
}

for (const direction of ANCHOR_DIRECTIONS) {
  if (!RESOLVED_DIRECTIONS.has(direction)) {
    throw new Error(
      `production/ics/anchors: the anchor direction "${direction}" is declared in ` +
        "the vocabulary but nearestWeekday has no branch for it, so it would fall " +
        "through to the branch for the following occurrence — a date silently " +
        "resolved by the wrong rule, which is worse than no date at all."
    );
  }
}

/**
 * Resolve the anchor a rule names, then the weekday it wants from it.
 *
 * The three kinds, and why each is measured the way it is:
 *
 * - `self` — relative to the night's own date. Where the direction is `on` and
 *   the rule carries no weekday, the answer is the night's own day: the
 *   timetable, measured seven times of seven with no exception.
 * - `next_edition` — resolved inside the **ISO week containing the following
 *   night**, which is where a night's LiveCuts fall in six of six measured
 *   editions. From its own night those same pieces look wildly irregular —
 *   spreads from the low twenties to over a hundred and fifty days — and that
 *   variability is in the point of observation, not in the data.
 * - `next_edition_listing` — relative to the following edition's **listing**, not
 *   to the following night. Measured from its own night the after movie looked
 *   irregular; measured from its true anchor it is the day before, always.
 *
 * The refusal, when the anchor edition is not in the calendar, is
 * `awaiting_next_edition` and it names what it waits for. **It covers the
 * LiveCuts as well as the after movie:** an edition in the archive that has a
 * listing and a timetable but neither is the rule behaving correctly, and it must
 * never be "fixed" — filling that gap invents dates for an edition that does not
 * exist.
 */
export function resolveAnchor(
  rule: PipelineRule,
  context: AnchorContext
): AnchorResolution {
  const anchorDate = anchorDateFor(rule.anchorKind, context);

  if (anchorDate === null) {
    return {
      resolved: false,
      unresolved: "awaiting_next_edition",
      edition: context.nextEditionLabel,
    };
  }

  if (rule.anchorWeekday === null) {
    // No weekday means *the anchor's own day, whichever weekday that turns out
    // to be* — the only correct way to say it about a night that may be a Friday
    // or a Saturday. The migration makes the incoherent combination
    // unrepresentable: a direction other than `on` requires a weekday to count
    // occurrences of, so this branch can only be the anchor's own day.
    return { resolved: true, date: anchorDate };
  }

  return {
    resolved: true,
    date: nearestWeekday(anchorDate, rule.anchorWeekday, rule.anchorDirection),
  };
}

/** Which date a rule's anchor kind points at, or `null` when it is not known yet. */
function anchorDateFor(kind: AnchorKind, context: AnchorContext): CivilDate | null {
  switch (kind) {
    case "self":
      return context.nightDate;
    case "next_edition":
      return context.nextEditionDate;
    case "next_edition_listing":
      return context.nextEditionListingDate;
  }
}

/**
 * The single entry point the reconciler calls for a piece the file does not have.
 *
 * The three refusals come back as **three distinct reasons**, checked in this
 * order:
 *
 * 1. `not_derivable` — by rule, permanently. This is the night's listing and
 *    SunSet's: both fall on a Tuesday, one to two and a half weeks ahead, with no
 *    fixed anticipation. D-44-23 withholds proposals for SunSet's; the
 *    measurement says the identical sentence is true of the night's. **Nothing
 *    may compute either.** A night that suddenly has a complete set of pieces is
 *    the warning sign that somebody removed this branch.
 * 2. `awaiting_next_edition` — the anchor edition is not in the calendar. The
 *    reason names the edition it is waiting for.
 * 3. `depends_on_lineup` — the number of episodes descends from how many people
 *    played, and that is not knowable yet. **No figure is returned**, because a
 *    count that could not be determined does not print one.
 *
 * **The order of the last two is a decision and not an accident.** Both are true
 * at once for the archive's final edition, whose LiveCuts have neither a
 * following night to sit beside nor a settled line-up to count. The anchor
 * decides whether there is a *place* at all; the line-up only decides how many
 * pieces go in it — so the surface says it is waiting for the edition, which is
 * the fact D-44-12 asks it to name and the one the calendar itself already
 * records.
 *
 * A date that comes back from here is a **proposal**, and the call site marks it
 * as one (D-44-09b part 3). This module is never consulted for a piece that
 * exists in the file: a written date always wins.
 *
 * @param episodeIndex which episode, zero-based. The first falls on the rule's
 *   weekday and any further ones on the days that follow — the storage contract
 *   `production_pipeline_rule` writes down. Two episodes anchored to a Monday are
 *   the Monday and the Tuesday.
 */
export function proposePieceDate(
  rule: PipelineRule,
  context: AnchorContext,
  episodeIndex: number = 0
): PieceDateProposal {
  if (!rule.derivable) {
    return { unresolved: "not_derivable" };
  }

  const anchor = resolveAnchor(rule, context);

  if (!anchor.resolved) {
    return anchor.edition === null
      ? { unresolved: anchor.unresolved }
      : { unresolved: anchor.unresolved, edition: anchor.edition };
  }

  const episodes = knownEpisodeCount(rule, context);

  if (episodes === null) {
    return { unresolved: "depends_on_lineup" };
  }

  if (!Number.isInteger(episodeIndex) || episodeIndex < 0 || episodeIndex >= episodes) {
    throw new RangeError(
      `production/ics/anchors: episode ${episodeIndex} was asked for where the rule ` +
        `has ${episodes}. Asking for an episode that does not exist would produce a ` +
        "date for a piece nobody owes — and a date drawn beside real ones is read as " +
        "settled."
    );
  }

  return { date: addDays(anchor.date, episodeIndex) };
}

/**
 * How many episodes a rule produces, or `null` when only the line-up knows.
 *
 * A rule that does not take its count from the line-up and carries none produces
 * one piece — the ordinary case, and the only place in this module where a
 * missing number has a default rather than a refusal.
 */
function knownEpisodeCount(rule: PipelineRule, context: AnchorContext): number | null {
  if (rule.episodesFromLineup) {
    if (rule.episodeCount !== null) return rule.episodeCount;
    return context.creditedArtistCount;
  }
  return rule.episodeCount ?? 1;
}

/**
 * Whether a date written in the file sits where the rule says it would.
 *
 * `null` when the rule cannot be resolved at all — a rule marked non-derivable,
 * or an anchor edition that is not in the calendar. `null` is *we cannot say*,
 * and it is deliberately not `false`: a piece is not diverging because nothing
 * was there to compare it against.
 *
 * **⚠ This value reaches no pixel** (D-44-10). It is stored for the divergence
 * report and drawn nowhere; see the module docblock for the decision it would
 * quietly reverse.
 *
 * Where a rule produces several episodes, the conforming answer is a **window**
 * and not a day: the rule's weekday and the days that follow it. Where the count
 * is the line-up's and the line-up is not known, a rule anchored with the `on`
 * direction still has a testable claim — *inside the anchor's ISO week, on or
 * after the rule's weekday* — which is exactly the claim measured six times of
 * six for the night's LiveCuts. Any other shape returns `null` rather than a
 * guess.
 */
export function conformsToRule(
  actualDate: CivilDate,
  rule: PipelineRule,
  context: AnchorContext
): boolean | null {
  if (!rule.derivable) return null;

  const anchor = resolveAnchor(rule, context);
  if (!anchor.resolved) return null;

  const episodes = knownEpisodeCount(rule, context);

  if (episodes === null) {
    // The count is the line-up's and the line-up is not known. A rule anchored
    // `on` a weekday still claims a week, so the week is what gets checked.
    if (rule.anchorDirection !== "on" || rule.anchorWeekday === null) return null;

    if (isoWeekStart(actualDate) !== isoWeekStart(anchor.date)) return false;
    return isoWeekday(actualDate) >= rule.anchorWeekday;
  }

  for (let episode = 0; episode < episodes; episode += 1) {
    if (addDays(anchor.date, episode) === actualDate) return true;
  }

  return false;
}
