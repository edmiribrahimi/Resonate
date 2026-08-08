/**
 * Event time handling.
 *
 * `event_parties.date` is a DATE and `event_parties.time` is a TIME — both
 * without a time zone. They mean wall-clock time in Turin. Anything that
 * compares them with `now` must say so explicitly: `new Date("2026-10-10T22:00")`
 * is parsed in the *runtime's* zone, which is UTC on Vercel and the visitor's
 * own zone in the browser. That silently shifts every window by one or two
 * hours — and on a daily cron, a two-hour shift can move an item past the only
 * window that would have caught it.
 */

export const EVENT_TIME_ZONE = "Europe/Rome";

/** Milliseconds to add to a UTC instant to get the wall-clock reading in Turin. */
function zoneOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - instant.getTime();
}

/**
 * Turn a Turin wall-clock date and time into a real instant.
 *
 * The offset is resolved twice: the first pass guesses it from the naive
 * value, the second confirms it at the resulting instant. They differ only
 * across a DST boundary, and that is exactly when a single pass would be wrong.
 */
export function zonedInstant(date: string, time: string | null): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh = 0, mm = 0] = (time ?? "00:00").split(":").map(Number);

  const naiveUtc = Date.UTC(y, m - 1, d, hh, mm);
  const firstPass = zoneOffsetMs(new Date(naiveUtc));
  const instant = new Date(naiveUtc - firstPass);
  const secondPass = zoneOffsetMs(instant);

  return secondPass === firstPass ? instant : new Date(naiveUtc - secondPass);
}

/**
 * A Turin wall-clock hour that closes a night which *started* on `date`.
 *
 * A night runs 22:00 → 06:00, so an hour before noon belongs to the *next*
 * calendar day. The rule was previously repeated in five places, each reading
 * the hour in the runtime's zone; here it is applied to the declared Turin
 * hour, before the conversion, where it cannot drift.
 *
 * Private on purpose: the two closing times a night has — when the drink menu
 * shuts and when the party ends — are the same arithmetic under two names, and
 * they must not be allowed to become two implementations again.
 */
function nightBoundaryInstant(date: string, time: string): Date {
  const hour = Number(time.split(":")[0] ?? "0");
  if (hour >= 12) return zonedInstant(date, time);

  const [y, m, d] = date.split("-").map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const shifted = nextDay.toISOString().slice(0, 10);
  return zonedInstant(shifted, time);
}

/** When a party starts, as an instant. */
export function partyStartInstant(date: string, time: string | null): Date {
  return zonedInstant(date, time);
}

/**
 * When a party ends, as an instant.
 *
 * Same crossing-midnight rule as `menuCloseInstant`: an `endTime` of `06:00`
 * on a night dated the Saturday resolves to the Sunday morning.
 *
 * It lives here, beside its siblings, for the reason commit `8f4e004` exists:
 * these conversions were centralised to stop a six-variant drift, in which the
 * same "is this night over yet" question was answered six slightly different
 * ways, each parsing a stored `date` + `time` in the *runtime's* zone — UTC on
 * Vercel, the visitor's own zone in the browser. That failure never raised an
 * error; it just moved a window by an hour or two. **A variant of this
 * conversion inlined at a call site is the defect this module exists to
 * prevent**, so if a caller needs a boundary this file does not yet expose,
 * add it here rather than computing it there.
 *
 * ── The one variant that is allowed to exist, and why ────────────────────────
 *
 * There is a second implementation of this rule, on purpose:
 * **`public.party_end_instant(date, time)`**, created by
 * `supabase/migrations/20260809000000_party_assignments.sql`. It applies the
 * same crossing-midnight test to the same declared Turin hour, before the same
 * `Europe/Rome` conversion.
 *
 * It exists because phase 35 asks *"is this night over yet"* from inside RLS
 * policy bodies and from a `SECURITY DEFINER` writer — places where TypeScript
 * does not reach, and where accepting a boundary computed by the caller would
 * hand the answer to the session being checked.
 *
 * **Changing one of the two without the other is the defect**, and it is worth
 * naming because that divergence would not fail loudly: no build breaks, no
 * error is raised, and this repository has no test runner. It would move a
 * window — which is exactly the failure this module was centralised to end.
 */
export function partyEndInstant(date: string, endTime: string): Date {
  return nightBoundaryInstant(date, endTime);
}

/**
 * When the drink menu closes, as an instant.
 *
 * A night runs 22:00 → 06:00, so a closing time before noon belongs to the
 * *next* calendar day — see `nightBoundaryInstant`, which both this and
 * `partyEndInstant` delegate to so the rule has one implementation.
 */
export function menuCloseInstant(date: string, closeTime: string): Date {
  return nightBoundaryInstant(date, closeTime);
}

/** Start of the Turin day that contains `instant`, as `YYYY-MM-DD`. */
export function zonedDateString(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}
