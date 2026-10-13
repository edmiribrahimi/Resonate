import { entryUntilInstant } from "@/utils/datetime";

/**
 * The one place that decides whether the door is past a tier's entry-until
 * hour (D-52.4-02, D-52.4-05).
 *
 * Read by ALL THREE door readers, so they can never disagree:
 *   - the online check-in (`src/app/api/tickets/checkin/route.ts`), which calls
 *     `entryUntilRefused` and answers `not_valid` / `after_entry_until`;
 *   - the offline manifest (`src/app/api/tickets/attendance/route.ts`), which
 *     calls `entryUntilAt` and ships the instant as an ISO string, so the phone
 *     never computes a Turin hour;
 *   - the offline scanner (`ScannerClient`), which calls `entryUntilPassed` on
 *     that ISO string against its own clock — two instants compared, nothing
 *     converted.
 *
 * ── What a refusal means here ──────────────────────────────────────────────
 *
 * After the hour the ticket is refused (`after_entry_until`), and the door can
 * still let the person in through «Admit anyway» — an exception recorded as
 * `entry_until_overridden` with operator and instant, under `door.operate`.
 * This module only answers *is it past the hour*; the override lives with the
 * readers that record it.
 *
 * ── Default: admit ─────────────────────────────────────────────────────────
 *
 * Every branch that is not certain admits: no limit on the tier, a value that
 * does not have the shape of a Postgres `time`, an instant that does not parse,
 * or a manifest cached before this field existed (`entryUntil` absent = no
 * limit). Between the two door errors we pick the one that does not happen in
 * front of a queue (`checkin-offline.md`): refusing a valid guest because of a
 * malformed value is worse than admitting one late.
 *
 * ── `>=`, declared ─────────────────────────────────────────────────────────
 *
 * At the exact entry-until instant the door is already closed: «entry before
 * 00:00» means that at 00:00 nobody enters on that tier any more. The comparison
 * is `at >= until`, and the wording on the ticket says *before*.
 *
 * ── Why no server guard on this module ─────────────────────────────────────
 *
 * A deliberate difference from `refund-refusal.ts`, which opens with that guard
 * because it reads an environment switch. This module reads nothing from the environment and is
 * pure, so the offline scanner can import the same comparison instead of
 * writing a second one. The Turin conversion happens only in
 * `entryUntilInstant` (`src/utils/datetime.ts`); nothing here parses a date and
 * a time together.
 */

/** A Postgres `time` as PostgREST returns it, or the `HH:MM` the form saves. */
const TIME_SHAPE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * The instant at which a tier stops admitting on the night dated `nightDate`,
 * or `null` when there is no readable limit (which means: no limit).
 */
export function entryUntilAt(
  nightDate: string,
  entryUntil: string | null | undefined
): Date | null {
  if (typeof entryUntil !== "string") return null;
  const value = entryUntil.trim();
  if (value.length === 0) return null;
  if (!TIME_SHAPE.test(value)) return null;

  const until = entryUntilInstant(nightDate, value);
  if (Number.isNaN(until.getTime())) return null;
  return until;
}

/**
 * Whether `at` is at or past `until`. `until` may be the ISO string the
 * manifest ships; absent or unparsable means no limit, so never past.
 */
export function entryUntilPassed(
  until: Date | string | null | undefined,
  at: Date
): boolean {
  if (until === null || until === undefined) return false;
  const limit = typeof until === "string" ? Date.parse(until) : until.getTime();
  if (Number.isNaN(limit)) return false;
  if (Number.isNaN(at.getTime())) return false;
  return at.getTime() >= limit;
}

/** The online decision: the two functions above, composed. */
export function entryUntilRefused(input: {
  entryUntil: string | null | undefined;
  nightDate: string;
  scannedAt: Date;
}): { refused: false } | { refused: true; until: Date } {
  const until = entryUntilAt(input.nightDate, input.entryUntil);
  if (until === null) return { refused: false };
  if (!entryUntilPassed(until, input.scannedAt)) return { refused: false };
  return { refused: true, until };
}
