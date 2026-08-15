import { isoWeekday } from "@/lib/production/ics/anchors";
import type { CivilDate, CivilTime } from "@/lib/production/ics/vocabulary";

/**
 * How a civil date, a civil time range and a progressivo are written on the
 * calendar surface — and the one rule this module exists to enforce.
 *
 * ── Weekday-first, and the weekday is never dropped ──────────────────────────
 *
 * `Tue 12 May 2026`. Three-letter weekday, two-digit day, three-letter month,
 * four-digit year, in the data face (`44-UI-SPEC.md` §6). At every tier: there
 * is no width at which the weekday is the thing that goes.
 *
 * **The weekday is load-bearing and not decoration.** The rule a reader of this
 * surface is checking is *the listing is a Tuesday* — the pipeline is expressed
 * in days of the week, never in day counts (`production-calendar.md`, §The
 * pipeline is expressed in DAYS OF THE WEEK; D-44-25). A surface that prints
 * `12/05/2026` makes the reader reconstruct the weekday, and that
 * reconstruction is exactly where the day-count mental model comes back — the
 * model that once reported a perfectly conforming night as out of rule, because
 * the night falls Friday *or* Saturday and the same Tuesday is four days from
 * one and three from the other. An offset sees two rules where there is one,
 * and flags the calendar rather than itself. So the surface draws the thing the
 * rule is actually about.
 *
 * ── Nothing here builds a point in time, and the cost is measurable ──────────
 *
 * Every value this module takes is a **civil** value: a day on a calendar
 * hanging on a wall, with no instant, no offset and no zone attached
 * ({@link CivilDate} in `@/lib/production/ics/vocabulary`). It is formatted from
 * its own characters, against the two fixed tables below, and on the way it
 * never becomes an object of the platform's time type, is never handed to one
 * of the platform's locale formatters or serialisers, and never meets a
 * timezone library — none of which is adopted anywhere under this surface.
 *
 * A conversion that crosses midnight moves the weekday, and a moved weekday
 * turns a conforming night into a reported error. That is the whole reason, and
 * it is also why the four names a reader would reach for are **not spelled in
 * this file, not even in order to forbid them**: a mechanical check greps for
 * them, and a grep whose only match is the sentence forbidding the thing is a
 * grep that gets ignored the third time it goes red
 * (`@/lib/production/ics/vocabulary` claim (c), and
 * `src/app/(admin)/admin/formats/actions.ts:58-63` before it).
 *
 * ── The weekday is computed ONCE in this phase, and not here ─────────────────
 *
 * {@link isoWeekday} is imported from `@/lib/production/ics/anchors`, where the
 * pipeline's anchor resolution needs it already. Two implementations of the
 * same arithmetic drift, and a drifted weekday is precisely the failure above
 * given a second place to hide. One weekday computation in the phase, not two.
 *
 * ── A value that cannot be read says so, and says it distinguishably ─────────
 *
 * Every formatter here answers input it cannot read with a **stable sentence**,
 * and every one of them has a companion predicate the caller may branch on
 * *before* it renders. Never a plausible-looking substitute, never `0`, never
 * an em-dash: a failed read drawn as a legitimate value is the shape OBS-03
 * exists to refuse, and this repository has already paid once for a single
 * message that covered every cause (`meta-gates.md`, the newsletter precedent).
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The two fixed tables
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Indexed by {@link isoWeekday}'s answer minus one — Monday is 1, Sunday is 7.
 *
 * Written in English to match the interface (`44-UI-SPEC.md` §13). The
 * British-English materials gate governs posters, not the app.
 */
const WEEKDAY_NAMES = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

/** Indexed by month number minus one. */
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Proleptic Gregorian, non-leap. February is corrected in {@link daysInMonth}. */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/* ────────────────────────────────────────────────────────────────────────────
 * The sentences a failed read gets, each distinct from the others
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What {@link formatCivilDate} returns for input it cannot read.
 *
 * A sentence and not a dash, because a dash is indistinguishable from a value
 * somebody chose to leave blank, and those are different facts with different
 * next steps.
 */
export const UNREADABLE_DATE = "We could not read this date";

/** What {@link formatCivilTimeRange} returns for input it cannot read. */
export const UNREADABLE_TIME = "We could not read this time";

/**
 * What {@link formatProgressivo} returns for a series that carries no number.
 *
 * Distinct from {@link UNREADABLE_PROGRESSIVO} on purpose: *this row has no
 * number* and *we could not read this row's number* are two different facts,
 * and collapsing them is the one-message shape this file's docblock names.
 */
export const NO_PROGRESSIVO = "no number";

/** What {@link formatProgressivo} returns for a value that is not a progressivo. */
export const UNREADABLE_PROGRESSIVO = "We could not read this number";

/* ────────────────────────────────────────────────────────────────────────────
 * Reading the parts, without ever leaving the characters
 * ──────────────────────────────────────────────────────────────────────────── */

/** A run of ASCII digits as a whole number, or `null` if it is anything else. */
function digitsToInt(chunk: string): number | null {
  if (chunk.length === 0) return null;
  let total = 0;
  for (const character of chunk) {
    const digit = character.codePointAt(0);
    if (digit === undefined || digit < 48 || digit > 57) return null;
    total = total * 10 + (digit - 48);
  }
  return total;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1] ?? 0;
}

interface CivilDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** The three numbers of a `YYYY-MM-DD`, or `null` if it is not one. */
function civilDateParts(date: string): CivilDateParts | null {
  if (date.length !== 10) return null;
  if (date[4] !== "-" || date[7] !== "-") return null;

  const year = digitsToInt(date.slice(0, 4));
  const month = digitsToInt(date.slice(5, 7));
  const day = digitsToInt(date.slice(8, 10));
  if (year === null || month === null || day === null) return null;

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return { year, month, day };
}

/**
 * Whether a string is a civil date this module can draw.
 *
 * Exported so a caller can decide **before** it renders — which is the half of
 * the refusal contract a returned sentence cannot cover, because a sentence is
 * already a rendering decision by the time the caller sees it.
 */
export function isCivilDate(date: CivilDate): boolean {
  return civilDateParts(date) !== null;
}

/**
 * Whether a string is an `HH:MM` civil time this module can draw.
 *
 * 24-hour, and there is no other clock on this surface: production writes its
 * hours that way and the file holds floating local times, so a 12-hour form
 * would be a translation and a zone suffix would be a precision claim the data
 * does not support (`44-UI-SPEC.md` §6).
 */
export function isCivilTime(time: CivilTime): boolean {
  if (time.length !== 5) return false;
  if (time[2] !== ":") return false;

  const hours = digitsToInt(time.slice(0, 2));
  const minutes = digitsToInt(time.slice(3, 5));
  if (hours === null || minutes === null) return false;

  return hours <= 23 && minutes <= 59;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The three formatters
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `Tue 12 May 2026` — weekday first, always.
 *
 * See the file docblock for why the weekday leads and why nothing here builds a
 * point in time. Returns {@link UNREADABLE_DATE} for input it cannot read;
 * {@link isCivilDate} is the branch a caller takes to avoid asking.
 */
export function formatCivilDate(date: CivilDate): string {
  const parts = civilDateParts(date);
  if (parts === null) return UNREADABLE_DATE;

  const weekdayName = WEEKDAY_NAMES[isoWeekday(date) - 1];
  const monthName = MONTH_NAMES[parts.month - 1];
  if (weekdayName === undefined || monthName === undefined) {
    return UNREADABLE_DATE;
  }

  const day = String(parts.day).padStart(2, "0");
  const year = String(parts.year).padStart(4, "0");
  return `${weekdayName} ${day} ${monthName} ${year}`;
}

/**
 * `22:00 → 06:00` — 24-hour, no zone suffix, in production's own form.
 *
 * The arrow is the character production writes between the two, and it carries
 * the crossing of midnight without a word: a range whose end reads lower than
 * its start is a night, and every reader of this surface already knows that.
 */
export function formatCivilTimeRange(start: CivilTime, end: CivilTime): string {
  if (!isCivilTime(start) || !isCivilTime(end)) return UNREADABLE_TIME;
  return `${start} → ${end}`;
}

/**
 * `001` — three digits, always.
 *
 * Never stripped to `1`, never localised, never given a thousands separator. A
 * progressivo is already on a poster by the time it reaches this surface, and
 * the app shows what is on the poster. A number past 999 keeps all of its
 * digits: `padStart` widens, it does not truncate.
 *
 * A progressivo is one of this project's three monotone guards — it is appended
 * to, never renumbered (`meta-gates.md`) — which is the reason a value that is
 * not a whole non-negative number gets {@link UNREADABLE_PROGRESSIVO} rather
 * than a rounded neighbour: a rounded progressivo names a different night.
 */
export function formatProgressivo(n: number | null): string {
  if (n === null) return NO_PROGRESSIVO;
  if (!Number.isInteger(n) || n < 0) return UNREADABLE_PROGRESSIVO;
  return String(n).padStart(3, "0");
}
