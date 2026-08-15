/**
 * The iCalendar reader: unfolded lines in, typed `VEVENT` records out.
 *
 * ── Why this tracks nesting instead of scanning lines ────────────────────────
 *
 * The measured file holds `VCALENDAR` ×1, `VTIMEZONE` ×2 (each with a `STANDARD`
 * and a `DAYLIGHT` child), `VEVENT` ×92 and `VALARM` ×40. A flat line scanner —
 * one that reads every `DTSTART:` it meets — therefore finds **96 `DTSTART`s for
 * 92 events**, because a `VTIMEZONE`'s two children each carry one, and it also
 * lands a `VALARM`'s `TRIGGER` on whichever event happens to enclose it. Ninety-
 * six for ninety-two is the warning sign `44-RESEARCH.md` Pitfall 3 names, and
 * it is a warning sign nobody sees unless something is counting.
 *
 * So this reads `BEGIN:` / `END:` as a stack and collects properties **only at
 * `VEVENT` depth directly inside `VCALENDAR`**. A `VALARM` is entered and its
 * properties are discarded; a `VTIMEZONE` and its children never produce an
 * event at all.
 *
 * ── The civil-date rule, which is the module's whole point ───────────────────
 *
 * Every `DTSTART` and `DTEND` in the file has the form `YYYYMMDDTHHMMSS` with a
 * `TZID` parameter — no `Z` suffix, no all-day entries. This reader takes
 * characters 0 through 7 as a civil `YYYYMMDD` and characters 9 through 12 as a
 * civil `HHMM`, **by slicing**, and stops there. It constructs no date object,
 * calls none of the platform's date formatters or serialisers, and adopts no
 * timezone library. `durationMinutes` comes from the civil parts and a fixed
 * days-in-month table, not from subtracting two instants.
 *
 * The four names one would reach for are **deliberately not written anywhere in
 * this directory**, for the reason
 * `src/app/(admin)/admin/formats/actions.ts:58-63` gives about its own forbidden
 * literal: a grep whose only match is the sentence forbidding the thing is a
 * grep that gets ignored the third time it goes red. The prohibition is
 * enforceable exactly because the grep has nothing to find.
 *
 * The reason, stated once here and honoured everywhere below: the anchors of
 * this pipeline are **weekdays of a local calendar**. A conversion that moves a
 * 22:00 entry across midnight moves its weekday, and a weekday that moves turns
 * a conforming night into a reported error. The night falls Friday *or*
 * Saturday, so the very same Tuesday sits four days before one and three before
 * the other — which is exactly why the rule is stored as a weekday and not as a
 * count, and why a reader that quietly normalises to UTC would break the rule
 * before the rule was ever applied (D-44-25, `44-RESEARCH.md` Pitfall 6).
 *
 * `TZID` is parsed and kept reachable in {@link IcsEvent.tzid}, and it is
 * **deliberately unused for classification**: two identifiers appear, in the
 * same offset family, mixed across every kind of entry. It records where an
 * entry was authored and nothing else.
 *
 * ── Three finding lists, never one ──────────────────────────────────────────
 *
 * {@link ParseResult} keeps `malformed`, `unsupportedRecurrences` and
 * `refusedProperties` apart. They are three different facts with three different
 * ways out, and collapsing them is the pattern this project has already paid for
 * once — the newsletter form that answers a network failure, a missing key and a
 * duplicate address with one sentence (`meta-gates.md`). There is no error
 * tracking in this product, so a finding that loses its category loses it for
 * good.
 *
 * **A finding carries a `uid` or a line index and a reason code, and never a
 * `SUMMARY`.** A summary is an unannounced date, a space under negotiation or a
 * line-up; the same text in a log, a toast or — worst — a tracked document is
 * irreversible (`44-RESEARCH.md` Pitfall 10). Every field of every finding below
 * is an identifier, a property name or a code.
 *
 * ── Pure by design ──────────────────────────────────────────────────────────
 *
 * The only import is `./unfold`, and the type-only import of `./vocabulary`.
 * There is no Supabase client, no HTTP call, no React, no `fs`, and no
 * `Date.now()` in any decision: the same text yields the same result on any
 * machine, in any zone, at any hour.
 *
 * Text from the file is **data, never instruction** (`ai-engineering.md`, gate
 * *prompt security*). An entry whose title reads like a command is content to
 * report to a human, and nothing here can act on it: no dynamic evaluation, no
 * dynamic import, no indirect call built from a string.
 *
 * ── What a green build does NOT prove ───────────────────────────────────────
 *
 * Nothing here says this reader reads the real file correctly. The counts — 92
 * events, 92 distinct UIDs, 3 folded lines, 1 event-level `RRULE` — are asserted
 * by `scripts/verify-ics-import.mjs`, which plan 44-08 creates and which is the
 * only reason writing a reader by hand is defensible instead of being dependency
 * avoidance.
 */

import { unescapeText, unfold } from "./unfold";
import type { CivilDate, CivilTime } from "./vocabulary";

/**
 * The largest input this reader will look at, in UTF-8 bytes.
 *
 * One mebibyte, chosen to match the default body limit of a Next.js Server
 * Action, so an oversize file fails **here**, with a named reason a person can
 * read, instead of somewhere inside a framework with a message about a payload.
 * The measured file is a small fraction of this; the bound exists so that
 * growth, or the wrong file entirely, is refused rather than parsed (ASVS V5,
 * threat T-44-06).
 */
export const MAX_INPUT_BYTES = 1_048_576;

/**
 * The largest number of physical lines this reader will look at.
 *
 * A second, independent bound: a pathological file can stay under the byte limit
 * and still be millions of one-character lines. Both are asserted **before any
 * work**, because a bound checked halfway through is a bound that has already
 * paid for the work it was meant to prevent.
 */
export const MAX_INPUT_LINES = 60_000;

/**
 * The ceiling on how far a recurrence expansion will ever walk, in days.
 *
 * Ten years. The caller's `cap` bounds the number of occurrences; this bounds
 * the number of days examined to find them, so a rule with a distant `UNTIL` and
 * a large `INTERVAL` cannot turn a bounded occurrence count into an unbounded
 * loop.
 */
const MAX_EXPANSION_DAYS = 3_660;

/**
 * The largest span, in days, between an entry's start and its end.
 *
 * Generous on purpose — the longest thing in this calendar is an eight-hour
 * night — because the bound is here to catch a date that parsed into nonsense,
 * not to express an opinion about how long an entry may last.
 */
const MAX_EVENT_SPAN_DAYS = 366;

/** One `VEVENT`, with its civil dates taken verbatim off the file. */
export interface IcsEvent {
  /** The file's own key. Opaque: compared, never parsed. */
  uid: string;
  /** The title, with its RFC 5545 escapes resolved. Never logged, never echoed. */
  summary: string;
  /** `YYYY-MM-DD`, sliced from `DTSTART`. No instant, no zone. */
  startDate: CivilDate;
  /** `HH:MM`, sliced from `DTSTART`. */
  startTime: CivilTime;
  /** `YYYY-MM-DD`, sliced from `DTEND`. */
  endDate: CivilDate;
  /** `HH:MM`, sliced from `DTEND`. */
  endTime: CivilTime;
  /** End minus start, computed from the civil parts. */
  durationMinutes: number;
  /** `SEQUENCE`, when present. Moves in the real file, so it is a change signal. */
  sequence: number | null;
  /** `LAST-MODIFIED`, raw. A second change signal; not turned into an instant. */
  lastModified: string | null;
  /** The `RRULE` value, raw and unexpanded. See {@link expandWeeklyRecurrence}. */
  rrule: string | null;
  /** The `TZID` parameter of `DTSTART`. Reachable, and not a classification signal. */
  tzid: string | null;
}

/** A line this reader could not make sense of. Position and code, no text. */
export interface MalformedLine {
  /** 1-based index into the unfolded lines — not a physical file line. */
  line: number;
  /** A code, from a closed set spelled out in the module's branches. */
  reason: string;
}

/** A recurrence rule outside the narrow shape this reader expands. */
export interface UnsupportedRecurrence {
  uid: string;
  reason: string;
}

/** A property that is recognised, refused, and reported rather than ignored. */
export interface RefusedProperty {
  uid: string;
  property: string;
}

/** Why the whole input was refused before any parsing happened. */
export interface ParseRefusal {
  reason: "input_too_large" | "too_many_lines";
  /** The measured magnitude, and the limit it crossed. Counts only. */
  measured: number;
  limit: number;
}

/**
 * Everything one pass produces.
 *
 * `refusal` is a **returned value, never a thrown message**. Next redacts the
 * message of an error thrown out of a Server Action in a production build, so a
 * cause carried in a message works in `next dev` and reaches the person as a
 * blank exactly where it counts (`src/app/(admin)/admin/formats/actions.ts:41-51`
 * states the same divergence for the same reason).
 */
export interface ParseResult {
  events: IcsEvent[];
  malformed: MalformedLine[];
  unsupportedRecurrences: UnsupportedRecurrence[];
  refusedProperties: RefusedProperty[];
  refusal: ParseRefusal | null;
}

/**
 * The three properties this reader recognises and refuses.
 *
 * They appear **zero** times in the file today, which is precisely why the
 * refusal is cheap to write now: each of them changes what a `UID` means. A
 * `RECURRENCE-ID` makes one `UID` cover several distinct instances; `EXDATE` and
 * `RDATE` edit an expansion this reader deliberately performs narrowly. Ignoring
 * them would produce a calendar that looks complete and is not — a day shown
 * free while it is taken.
 */
const REFUSED_PROPERTIES = ["RECURRENCE-ID", "EXDATE", "RDATE"] as const;

/** Days per month, index 0 = January. February is corrected by the leap rule. */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** The proleptic Gregorian leap rule, written out rather than inferred. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** How many days a civil month has. `month` is 1-based. */
function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

/** A civil date as three integers, so the arithmetic below never needs a parse. */
interface CivilParts {
  year: number;
  month: number;
  day: number;
}

/**
 * The weekday of a civil date. `0` is Sunday.
 *
 * Sakamoto's method: integer arithmetic on the year, the month and the day, with
 * no epoch and no instant anywhere. It is used to answer *is this a Tuesday*,
 * which is the only temporal question this pipeline ever asks.
 */
const SAKAMOTO_OFFSETS = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4] as const;

function civilWeekday(parts: CivilParts): number {
  const shifted = parts.month < 3 ? parts.year - 1 : parts.year;
  const sum =
    shifted +
    Math.floor(shifted / 4) -
    Math.floor(shifted / 100) +
    Math.floor(shifted / 400) +
    SAKAMOTO_OFFSETS[parts.month - 1] +
    parts.day;
  return ((sum % 7) + 7) % 7;
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

/** Two digits, zero-padded. */
function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/** `YYYY-MM-DD` from the three integers. Fixed width, so string order is date order. */
function formatCivilDate(parts: CivilParts): CivilDate {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/** `YYYY-MM-DD` back to three integers. Only ever called on a value we produced. */
function partsFromCivilDate(date: CivilDate): CivilParts | null {
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
 * How many days from `from` to `to`, walking the table one day at a time.
 *
 * `null` when `to` precedes `from`, or when the two are further apart than
 * `limit`. Walking is honest at this scale — the spans this is asked about are
 * hours, occasionally a night that ends the next morning — and it keeps the
 * whole module on one arithmetic instead of introducing an epoch that would
 * quietly reintroduce the thing the module docblock refuses.
 */
function daysBetween(from: CivilParts, to: CivilParts, limit: number): number | null {
  let cursor = from;
  for (let elapsed = 0; elapsed <= limit; elapsed += 1) {
    if (cursor.year === to.year && cursor.month === to.month && cursor.day === to.day) {
      return elapsed;
    }
    cursor = nextCivilDay(cursor);
  }
  return null;
}

/**
 * UTF-8 byte length, counted without allocating a copy of the input.
 *
 * `text.length` counts UTF-16 code units, which is neither bytes nor characters;
 * a bound expressed in bytes has to be measured in bytes or it is a bound on
 * something else.
 */
function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const character of text) {
    const point = character.codePointAt(0) ?? 0;
    if (point < 0x80) bytes += 1;
    else if (point < 0x800) bytes += 2;
    else if (point < 0x10000) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

/** A property line, taken apart but not interpreted. */
interface PropertyLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

/**
 * Split `NAME[;PARAM=VALUE...]:VALUE` at the first colon that ends the name.
 *
 * "First unescaped colon" in RFC 5545 §3.2 means the first colon that is not
 * inside a **quoted parameter value**: a parameter such as `ALTREP="cid:x"`
 * legitimately contains one. So the scan below tracks double quotes and stops at
 * the first colon outside them. Parameter names are upper-cased for lookup, and
 * a quoted parameter value is unquoted; neither the name nor the value is
 * interpreted here.
 *
 * `null` when there is no such colon — a line that is not a property at all.
 */
function splitPropertyLine(line: string): PropertyLine | null {
  let inQuotes = false;
  let colon = -1;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (character === ":" && !inQuotes) {
      colon = index;
      break;
    }
  }

  if (colon < 1) return null;

  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);

  const segments: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < head.length; index += 1) {
    const character = head[index];
    if (character === '"') {
      quoted = !quoted;
      current += character;
      continue;
    }
    if (character === ";" && !quoted) {
      segments.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  segments.push(current);

  const name = segments[0].toUpperCase();
  if (name.length === 0) return null;

  const params: Record<string, string> = {};
  for (const segment of segments.slice(1)) {
    const equals = segment.indexOf("=");
    if (equals < 1) continue;
    const key = segment.slice(0, equals).toUpperCase();
    let raw = segment.slice(equals + 1);
    if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
      raw = raw.slice(1, raw.length - 1);
    }
    params[key] = raw;
  }

  return { name, params, value };
}

/** A `DTSTART` or `DTEND`, reduced to civil parts and nothing more. */
interface CivilStamp {
  date: CivilDate;
  time: CivilTime;
  parts: CivilParts;
  /** Minutes since midnight, for the duration arithmetic. */
  minutesOfDay: number;
}

/** Whether every character in a slice is an ASCII digit. */
function allDigits(text: string): boolean {
  for (const character of text) {
    if (character < "0" || character > "9") return false;
  }
  return text.length > 0;
}

/**
 * Take a `YYYYMMDDTHHMMSS` value apart by slicing, and refuse anything else.
 *
 * The date is characters 0 through 7; the time is characters 9 through 12. A
 * trailing `Z`, a `VALUE=DATE` form with no time, or any other shape returns
 * `null` and becomes a `malformed` finding — never a silent midnight, which is a
 * date the file did not contain.
 */
function parseCivilStamp(raw: string): CivilStamp | null {
  if (raw.length < 13) return null;

  const datePart = raw.slice(0, 8);
  if (!allDigits(datePart)) return null;
  if (raw[8] !== "T") return null;

  const timePart = raw.slice(9, 13);
  if (!allDigits(timePart)) return null;

  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6));
  const day = Number(datePart.slice(6, 8));
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  const hour = Number(timePart.slice(0, 2));
  const minute = Number(timePart.slice(2, 4));
  if (hour > 23 || minute > 59) return null;

  return {
    date: `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`,
    time: `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`,
    parts: { year, month, day },
    minutesOfDay: hour * 60 + minute,
  };
}

/** What one `VEVENT` has accumulated while its lines are being read. */
interface EventDraft {
  /** 1-based index of the `BEGIN:VEVENT` line, for a finding that has no uid yet. */
  beganAt: number;
  uid: string | null;
  summary: string | null;
  dtstart: string | null;
  dtstartTzid: string | null;
  dtend: string | null;
  sequence: string | null;
  lastModified: string | null;
  rrule: string | null;
  /** Property names refused inside this event, held until the uid is known. */
  refused: string[];
}

function emptyDraft(beganAt: number): EventDraft {
  return {
    beganAt,
    uid: null,
    summary: null,
    dtstart: null,
    dtstartTzid: null,
    dtend: null,
    sequence: null,
    lastModified: null,
    rrule: null,
    refused: [],
  };
}

/**
 * Read a whole `.ics` text into typed records.
 *
 * The input is bounded before anything else happens; see {@link MAX_INPUT_BYTES}
 * and {@link MAX_INPUT_LINES}. A refusal comes back in
 * {@link ParseResult.refusal} with a code and two counts, and nothing is parsed.
 */
export function parseIcs(text: string): ParseResult {
  const result: ParseResult = {
    events: [],
    malformed: [],
    unsupportedRecurrences: [],
    refusedProperties: [],
    refusal: null,
  };

  const byteSize = utf8ByteLength(text);
  if (byteSize > MAX_INPUT_BYTES) {
    result.refusal = {
      reason: "input_too_large",
      measured: byteSize,
      limit: MAX_INPUT_BYTES,
    };
    return result;
  }

  const lines = unfold(text);
  if (lines.length > MAX_INPUT_LINES) {
    result.refusal = {
      reason: "too_many_lines",
      measured: lines.length,
      limit: MAX_INPUT_LINES,
    };
    return result;
  }

  /** The open components, outermost first. Depth is what decides everything. */
  const stack: string[] = [];
  let draft: EventDraft | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const property = splitPropertyLine(line);

    if (property === null) {
      result.malformed.push({ line: lineNumber, reason: "not_a_property_line" });
      continue;
    }

    if (property.name === "BEGIN") {
      const component = property.value.toUpperCase();
      stack.push(component);
      if (component === "VEVENT" && stack.length === 2 && stack[0] === "VCALENDAR") {
        draft = emptyDraft(lineNumber);
      }
      continue;
    }

    if (property.name === "END") {
      const component = property.value.toUpperCase();
      const open = stack.pop();
      if (open !== component) {
        result.malformed.push({ line: lineNumber, reason: "component_end_mismatch" });
        continue;
      }
      if (component === "VEVENT" && stack.length === 1 && stack[0] === "VCALENDAR") {
        if (draft !== null) finishEvent(draft, result);
        draft = null;
      }
      continue;
    }

    // Everything below this point is a property, and it is collected only at
    // `VEVENT` depth directly inside `VCALENDAR`. A `VALARM` open on top of the
    // event, or a `VTIMEZONE` with its `STANDARD` and `DAYLIGHT` children, sends
    // execution down the discard branch — which is the whole difference from a
    // flat scanner and the reason 96 `DTSTART`s do not become 96 events.
    const atEventDepth =
      draft !== null &&
      stack.length === 2 &&
      stack[0] === "VCALENDAR" &&
      stack[1] === "VEVENT";

    if (!atEventDepth || draft === null) continue;

    if ((REFUSED_PROPERTIES as readonly string[]).includes(property.name)) {
      draft.refused.push(property.name);
      continue;
    }

    switch (property.name) {
      case "UID":
        draft.uid = property.value;
        break;
      case "SUMMARY":
        draft.summary = unescapeText(property.value);
        break;
      case "DTSTART":
        draft.dtstart = property.value;
        draft.dtstartTzid = property.params.TZID ?? null;
        break;
      case "DTEND":
        draft.dtend = property.value;
        break;
      case "SEQUENCE":
        draft.sequence = property.value;
        break;
      case "LAST-MODIFIED":
        draft.lastModified = property.value;
        break;
      case "RRULE":
        draft.rrule = property.value;
        break;
      default:
        // Every other property — `DTSTAMP`, `DESCRIPTION`, `CREATED`, and the
        // rest — is not read. Not reading a property this pipeline has no
        // question for is not a silent failure: nothing downstream asks for it,
        // so nothing downstream can quietly get a wrong answer.
        break;
    }
  }

  if (stack.length > 0) {
    result.malformed.push({ line: lines.length, reason: "component_not_closed" });
  }

  return result;
}

/**
 * Turn a finished draft into a record, or into findings.
 *
 * An event that cannot produce a well-formed record is **not** emitted with a
 * placeholder. A zero duration or a midnight invented for a missing `DTSTART`
 * would be a number standing in for *we could not read this*, which is the one
 * thing a tally in this project may never do (OBS-03). It becomes a finding
 * instead, located by its line, and the import run's summary carries the count.
 */
function finishEvent(draft: EventDraft, result: ParseResult): void {
  if (draft.uid === null || draft.uid.length === 0) {
    result.malformed.push({ line: draft.beganAt, reason: "vevent_missing_uid" });
    return;
  }

  for (const property of draft.refused) {
    result.refusedProperties.push({ uid: draft.uid, property });
  }

  if (draft.dtstart === null) {
    result.malformed.push({ line: draft.beganAt, reason: "vevent_missing_dtstart" });
    return;
  }
  if (draft.dtend === null) {
    result.malformed.push({ line: draft.beganAt, reason: "vevent_missing_dtend" });
    return;
  }

  const start = parseCivilStamp(draft.dtstart);
  if (start === null) {
    result.malformed.push({ line: draft.beganAt, reason: "dtstart_not_civil_datetime" });
    return;
  }

  const end = parseCivilStamp(draft.dtend);
  if (end === null) {
    result.malformed.push({ line: draft.beganAt, reason: "dtend_not_civil_datetime" });
    return;
  }

  const spanDays = daysBetween(start.parts, end.parts, MAX_EVENT_SPAN_DAYS);
  if (spanDays === null) {
    result.malformed.push({ line: draft.beganAt, reason: "dtend_before_dtstart_or_too_far" });
    return;
  }

  const durationMinutes = spanDays * 1440 + (end.minutesOfDay - start.minutesOfDay);
  if (durationMinutes < 0) {
    result.malformed.push({ line: draft.beganAt, reason: "negative_duration" });
    return;
  }

  if (draft.rrule !== null) {
    const unsupported = describeUnsupportedRecurrence(draft.rrule);
    if (unsupported !== null) {
      result.unsupportedRecurrences.push({ uid: draft.uid, reason: unsupported });
    }
  }

  let sequence: number | null = null;
  if (draft.sequence !== null && allDigits(draft.sequence)) {
    sequence = Number(draft.sequence);
  }

  result.events.push({
    uid: draft.uid,
    summary: draft.summary ?? "",
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    durationMinutes,
    sequence,
    lastModified: draft.lastModified,
    rrule: draft.rrule,
    tzid: draft.dtstartTzid,
  });
}

/** `RRULE` taken apart into upper-cased keys. No interpretation yet. */
function ruleParts(rrule: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const segment of rrule.split(";")) {
    const equals = segment.indexOf("=");
    if (equals < 1) continue;
    parts[segment.slice(0, equals).toUpperCase()] = segment.slice(equals + 1).toUpperCase();
  }
  return parts;
}

/** The two-letter weekday codes RFC 5545 uses, in `civilWeekday` order. */
const BYDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

/**
 * Why a rule is outside the shape {@link expandWeeklyRecurrence} expands, or
 * `null` when it is inside it.
 *
 * One code per reason, and the codes are distinct on purpose: *another
 * frequency* and *a positional modifier* are two different pieces of work for
 * whoever reads the import summary, and one shared "unsupported" would hide
 * which.
 */
function describeUnsupportedRecurrence(rrule: string): string | null {
  const parts = ruleParts(rrule);

  if (parts.FREQ !== "WEEKLY") return "freq_not_weekly";
  if (parts.COUNT !== undefined) return "count_not_supported";
  if (parts.BYSETPOS !== undefined) return "bysetpos_not_supported";
  if (parts.BYMONTHDAY !== undefined) return "bymonthday_not_supported";
  if (parts.BYMONTH !== undefined) return "bymonth_not_supported";
  if (parts.BYYEARDAY !== undefined) return "byyearday_not_supported";
  if (parts.BYWEEKNO !== undefined) return "byweekno_not_supported";
  if (parts.UNTIL === undefined) return "until_required";
  if (parts.BYDAY === undefined) return "byday_required";

  for (const code of parts.BYDAY.split(",")) {
    if (!(BYDAY_CODES as readonly string[]).includes(code)) {
      // A code with a numeric prefix — `2MO`, "the second Monday" — lands here.
      return "byday_positional_not_supported";
    }
  }

  if (parts.INTERVAL !== undefined) {
    if (!allDigits(parts.INTERVAL) || Number(parts.INTERVAL) < 1) {
      return "interval_not_a_positive_integer";
    }
  }

  const until = untilAsCivilDate(parts.UNTIL);
  if (until === null) return "until_not_a_civil_date";

  return null;
}

/**
 * The `UNTIL` value reduced to a civil date, by slicing its `YYYYMMDD` prefix.
 *
 * `UNTIL` is normally a UTC instant with a `Z`. The `Z` is dropped rather than
 * honoured, and that is a decision worth naming: honouring it means converting,
 * converting means an instant, and an instant is what moves a weekday. The
 * window this bounds is measured in whole days on the same calendar the rest of
 * this module reads, and being one evening generous at the end of a closed
 * window is not a failure mode this pipeline has.
 */
function untilAsCivilDate(until: string): CivilDate | null {
  if (until.length < 8) return null;
  const datePart = until.slice(0, 8);
  if (!allDigits(datePart)) return null;

  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6));
  const day = Number(datePart.slice(6, 8));
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
}

/**
 * Expand a weekly recurrence over civil dates.
 *
 * **Exactly** `FREQ=WEEKLY` with `BYDAY`, `UNTIL` and optionally `INTERVAL`.
 * Anything else — another `FREQ`, a `COUNT`, a `BYSETPOS`, a `BYMONTHDAY`, a
 * positional `BYDAY` — returns an **empty array**, and the caller reports it
 * through {@link ParseResult.unsupportedRecurrences}. Never a silent skip, and
 * never a partial expansion: half an expansion is a calendar that shows some of
 * a taken week as free, which is worse than showing none of it, because it looks
 * answered.
 *
 * Exactly one entry in the measured file recurs, it is an external commitment,
 * and its window has already closed — so this has no forward value today. That
 * is the argument for writing it now rather than against: the week the owner
 * adds a recurring commitment for next season, a day that is taken must not
 * appear free.
 *
 * Week numbering starts from the Monday on or before `start` (`WKST` defaults to
 * `MO` and is not read), and occurrences before `start` are not generated.
 *
 * @param rrule the raw `RRULE` value
 * @param start the parent entry's civil start date
 * @param cap the largest number of occurrences to return — a bound the caller
 *   owns, so trust never decides how much work this does (threat T-44-06)
 * @returns the occurrence dates, `start` included when its weekday matches
 */
export function expandWeeklyRecurrence(
  rrule: string,
  start: CivilDate,
  cap: number
): CivilDate[] {
  if (!Number.isInteger(cap) || cap < 1) return [];
  if (describeUnsupportedRecurrence(rrule) !== null) return [];

  const parts = ruleParts(rrule);
  const until = untilAsCivilDate(parts.UNTIL);
  const startParts = partsFromCivilDate(start);
  if (until === null || startParts === null) return [];
  if (until < start) return [];

  const interval =
    parts.INTERVAL === undefined ? 1 : Math.max(1, Number(parts.INTERVAL));

  const wanted = new Set<number>();
  for (const code of parts.BYDAY.split(",")) {
    wanted.add((BYDAY_CODES as readonly string[]).indexOf(code));
  }

  // Back up to the Monday on or before `start`, so that "every other week"
  // counts weeks and not seven-day blocks measured from an arbitrary weekday.
  let cursor = startParts;
  let stepsBack = (civilWeekday(cursor) + 6) % 7;
  while (stepsBack > 0) {
    cursor = previousCivilDay(cursor);
    stepsBack -= 1;
  }

  const occurrences: CivilDate[] = [];
  const walkLimit = Math.min(cap * 7 * interval + 7, MAX_EXPANSION_DAYS);

  for (let dayIndex = 0; dayIndex <= walkLimit; dayIndex += 1) {
    const date = formatCivilDate(cursor);

    if (date > until) break;
    if (occurrences.length >= cap) break;

    if (date >= start && Math.floor(dayIndex / 7) % interval === 0) {
      if (wanted.has(civilWeekday(cursor))) occurrences.push(date);
    }

    cursor = nextCivilDay(cursor);
  }

  return occurrences;
}
