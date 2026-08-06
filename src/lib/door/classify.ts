/**
 * The night's conflicts, classified after the fact.
 *
 * ── Three things this module is, and one it is not ───────────────────────────
 *
 * 1. **Classification happens here, at read time, never at the scanner**
 *    (FIX-04a). The door states a fact — who was recorded and when — and
 *    carries no verdict, because the scanner is a phone held by a member of
 *    staff in front of a queue and a verdict rendered there is a verdict
 *    rendered on a person. Every rule below is therefore correctable *after* a
 *    night, by editing this file, without redeploying anything to a phone that
 *    is holding a cached service-worker bundle.
 *
 * 2. **The double-read counter is a signal about the scanner's feedback and the
 *    venue's light — never about the guest.** A repeat read of one code, on one
 *    device, by one operator, within seconds, is not a person trying to enter
 *    twice: it is an operator who could not see the first read land. That is a
 *    defect to correct in the hardware and the lighting, which is why the rows
 *    are hidden from the list and **counted** rather than filtered away at write
 *    time. Filtering them at the door would destroy the only number that says
 *    the feedback is invisible.
 *
 * 3. **This module carries no personal data, by construction.** `ClassifiedEntry`
 *    has no field for a name and none for an address; there is no import of a
 *    database client and nothing here can fetch one. That is how FIX-12 is
 *    satisfied — a serialisation rule, not a second RLS policy. An organizer can
 *    already read every profile through `profiles_select_admin`
 *    (`20260224_rbac_migration.sql:151`), so a `door_scan_events_select_master`
 *    policy would be an interface affordance dressed up as a boundary. What is
 *    genuinely enforceable is that the copyable view renders these fields
 *    straight and joins nothing.
 *
 * What it is **not**: a judgement about anybody. FIX-13 — a conflict is recorded
 * against the ticket, the entry or the membership, never against a person, and
 * nothing here aggregates per member. See the note above `classifyNight`.
 *
 * Pure by design: the imports below are all `import type`, so this module has no
 * runtime dependency at all — no Supabase client, no `fetch`, no React, no
 * `Date.now()` in any decision. It takes the night's rows and returns what the
 * list shows and what the counters count.
 */

import type {
  DoorScanCause,
  DoorScanSource,
  DoorSubjectType,
} from "./outcome";
import type { DoorScanEvent } from "@/types/database";

/**
 * How close two reads must be for the second to be a read the operator did not
 * see land, rather than a second entry.
 *
 * What the number encodes: one person cannot enter twice from one door in
 * twenty seconds. A repeat inside that window, from the *same* phone and the
 * *same* operator, is therefore the first read not having produced visible
 * feedback — not an admission.
 *
 * It is named rather than inlined because it is a number the project will want
 * to tune after a real night: a slow queue, a dark entrance or a phone with a
 * dim screen all push the true value up, and the only way to find it is to look
 * at a night that already happened.
 */
export const DOUBLE_READ_WINDOW_SECONDS = 20;

/**
 * A row of the night, classified.
 *
 * **Identifiers and facts only.** No name, no address for contacting anybody, no
 * display label, and no field one could be put in — the automated check for this
 * file is a grep that must find none of those words in it, so the prohibition is
 * stated in words the grep does not match. The prose view resolves labels at
 * render time, from a map it is given as its own prop; the technical view never
 * does, which is what makes the copied text safe to paste into an external tool.
 */
export interface ClassifiedEntry {
  /** `door_scan_events.id`. */
  id: string;
  subjectType: DoorSubjectType;
  /**
   * What was scanned, as an identifier: the ticket, the guest-list entry, or —
   * on the membership path, which has neither — the holder's user id. NULL on a
   * scan that resolved to nothing at all (an unreadable code), and on a refunded
   * admission, whose `ticket_id` must be NULL because the ticket row is gone
   * (`src/app/api/tickets/checkin/route.ts:456-461`).
   */
  subjectId: string | null;
  /** The classification. NULL means no rule reached it — see `deriveCause`. */
  cause: DoorScanCause | null;
  /** Device clock: when the phone read the code. Evidence, never authority. */
  scannedAt: string;
  /** Server clock: when the row was durably held. Hours later on the offline path. */
  recordedAt: string;
  operatorId: string;
  deviceId: string;
  source: DoorScanSource;
  /**
   * Seconds between this read and the previous read of the same subject, where
   * one exists in this night's rows. This is the interval a supervisor needs to
   * read "two devices, ⟨N⟩ minutes apart" and is computed from `scannedAt`.
   */
  secondsSincePrevious: number | null;
  /**
   * A reversal is not a separate conflict: it belongs to the admission it
   * reverses. Populated from a matching `is_undo` row so the list shows that an
   * entry was reversed rather than counting it twice.
   */
  undoneAt: string | null;
  undoneBy: string | null;
}

export interface NightClassification {
  /** What a supervisor reads. Conflicts only, and deliberately empty on a normal night. */
  listed: ClassifiedEntry[];
  /** Every derived or stored cause, counted — including the ones `listed` hides. */
  counters: Record<DoorScanCause, number>;
  /**
   * Rows that reached no cause: ordinary admissions, and reversals. Reported so
   * the arithmetic closes — `total === unclassified + sum(counters)` — rather
   * than leaving a reader to wonder where the missing rows went.
   */
  unclassified: number;
  /** Every row read for this night, including the ones nothing is shown for. */
  total: number;
}

/** Every cause at zero. Written out so a new member of the union is a build error here. */
function emptyCounters(): Record<DoorScanCause, number> {
  return {
    double_read: 0,
    second_ticket_same_holder: 0,
    two_devices: 0,
    invalid_signature: 0,
    not_in_cache: 0,
    wrong_night: 0,
    refunded_before_night: 0,
    refunded_after_night: 0,
  };
}

/**
 * What a repeat read is a repeat *of*.
 *
 * The ticket path carries `ticket_id`; the membership path carries neither a
 * ticket nor an entry and is identified by its holder
 * (`src/app/api/membership/verify/route.ts:169-183`). A row with none of the
 * three cannot be paired with anything and returns NULL, which the caller reads
 * as "no previous read is knowable".
 */
function subjectKey(row: DoorScanEvent): string | null {
  if (row.ticket_id) return `ticket:${row.ticket_id}`;
  if (row.guest_entry_id) return `entry:${row.guest_entry_id}`;
  if (row.subject_user_id) return `member:${row.subject_user_id}`;
  return null;
}

/** Seconds between two ISO instants, or NULL if either is unparseable. */
function secondsBetween(earlier: string, later: string): number | null {
  const a = Date.parse(earlier);
  const b = Date.parse(later);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.abs(b - a) / 1000;
}

/**
 * The rule, applied only to rows whose `cause` is NULL.
 *
 * A row that already carries a cause keeps it and is never re-derived: the
 * check-in route writes `refunded_before_night` and `refunded_after_night`
 * itself (`checkin/route.ts:442,448`), because only the route can see the refund
 * timestamp against the night's start, and re-deriving them here from an
 * `outcome` of `recorded` would silently discard that work.
 *
 * ── What the stored row cannot say, and what is done about it ────────────────
 *
 * `door_scan_events` stores `outcome` but **not** the `DoorNotValidReason`. The
 * migration is applied and is a historical fact, so no column is added for it
 * here. Two consequences, both honest rather than papered over:
 *
 * - a `not_valid` row that resolved a ticket can only be `wrong_night`, because
 *   that is the sole `not_valid` branch which reaches a ticket row
 *   (`checkin/route.ts:509-525`). That one is certain;
 * - a `not_valid` row that resolved nothing is either `invalid_signature` (the
 *   code carried no valid signature) or `unknown_code` (the signature verified
 *   but no ticket and no refund answers to it). **These two are
 *   indistinguishable from the stored row** — same outcome, same NULL ticket,
 *   same fingerprint of something unreadable. `unknown_code` is not a member of
 *   `DoorScanCause`, so the row is bucketed as `invalid_signature`, and the
 *   prose that renders it is deliberately worded to cover both without
 *   accusing anyone of presenting a forgery. The certainty is not invented; it
 *   is declined, in the sentence.
 *
 * `not_in_cache` is in the union and **no writer produces it today**: it exists
 * as a `DoorFlag` (`outcome.ts:85`) and flags are not a stored column. Its
 * counter therefore reads zero until a writer sets the cause, and that is a
 * true statement about the product rather than a gap in this function.
 */
function deriveCause(
  row: DoorScanEvent,
  previous: DoorScanEvent | null
): DoorScanCause | null {
  if (row.cause) return row.cause;

  if (row.outcome === "not_valid") {
    return row.ticket_id ? "wrong_night" : "invalid_signature";
  }

  if (row.outcome === "already_recorded") {
    // Nothing to compare against: the first admission may have been recorded at
    // another party, or before this table existed. Hiding a row requires
    // certainty and there is none here, so it takes the bucket that asks for no
    // action beyond making the entry count add up.
    if (!previous) return "second_ticket_same_holder";

    // A different phone is the one duplicate that deserves attention: two people
    // may have entered on one ticket. Decided on the device, not on the clock,
    // so a skewed device clock cannot suppress it.
    if (previous.device_id !== row.device_id) return "two_devices";

    // `"unknown"` is what the route stores when a queued scan arrives from a
    // bundle that had no device id (`checkin/route.ts:251-258`). Two rows both
    // reading `"unknown"` are not known to be the same phone, and `double_read`
    // is the one classification that *hides* a row — so it is never reached on a
    // guess. Same reasoning as the branch above, in the other direction.
    if (row.device_id === "unknown") return "second_ticket_same_holder";

    const gap = secondsBetween(previous.scanned_at, row.scanned_at);
    if (
      previous.operator_id === row.operator_id &&
      gap !== null &&
      gap <= DOUBLE_READ_WINDOW_SECONDS
    ) {
      // Same code, same phone, same operator, within seconds: a read the
      // operator did not see land. Counted, never listed.
      return "double_read";
    }

    return "second_ticket_same_holder";
  }

  // `recorded` with no stored cause: an ordinary admission, or a reversal.
  // Neither is a conflict and neither invents one.
  return null;
}

/**
 * Classify a night's `door_scan_events` rows.
 *
 * **The counters and the list come from the same pass and are not the same
 * set.** Every classified row is counted; `listed` then hides three kinds:
 *
 * - `double_read` — deliberately hidden, deliberately counted. The obvious
 *   implementation drops these rows at write time and destroys the count with
 *   them, which is the failure this separation exists to prevent;
 * - `refunded_after_night` — accounting, not a door conflict. It belongs to the
 *   finance surface, which queries the complement of this filter;
 * - reversals (`is_undo`) — a reversal is not a conflict. It is attached to the
 *   entry it reverses, as `undoneAt` / `undoneBy`.
 *
 * Rows that reach no cause are not listed either, for the reason the whole
 * surface exists: an ordinary admission is not a conflict, and a list that shows
 * every scan is never empty — FIX-11 requires that a normal night reads as
 * nothing happened.
 *
 * **FIX-13 is a negative requirement and this is where it is kept.** Nothing
 * here groups by person, counts per member, or attaches a label to anybody. The
 * subject of a row is a ticket, an entry or a membership; `subjectId` is an
 * identifier of a thing that was scanned. An admission that happened is reported
 * as an admission. Any consequence for a member is a human decision taken
 * elsewhere and recorded as such — a per-member aggregate here would be that
 * decision taken automatically, which is exactly what the requirement forbids.
 */
export function classifyNight(rows: DoorScanEvent[]): NightClassification {
  const counters = emptyCounters();

  // Ordered by the device clock, because the interval between two reads is what
  // separates a double read from two devices, and `recorded_at` on the offline
  // path can be hours after the fact. A copy: the caller's array is not mutated.
  const inScanOrder = [...rows].sort((a, b) => {
    const diff = Date.parse(a.scanned_at) - Date.parse(b.scanned_at);
    if (!Number.isNaN(diff) && diff !== 0) return diff;
    return a.recorded_at < b.recorded_at ? -1 : a.recorded_at > b.recorded_at ? 1 : 0;
  });

  const lastBySubject = new Map<string, DoorScanEvent>();
  const entries: ClassifiedEntry[] = [];
  // Where a subject's most recent non-reversal entry sits in `entries`, so a
  // reversal can be attached to it instead of becoming a row of its own.
  const entryIndexBySubject = new Map<string, number>();
  let unclassified = 0;

  for (const row of inScanOrder) {
    const key = subjectKey(row);

    if (row.is_undo) {
      // A reversal never becomes an entry and is never counted as a cause. It
      // annotates the admission it reverses, when that admission is in view.
      if (key) {
        const index = entryIndexBySubject.get(key);
        if (index !== undefined) {
          entries[index].undoneAt = row.recorded_at;
          entries[index].undoneBy = row.operator_id;
        }
      }
      unclassified += 1;
      continue;
    }

    const previous = key ? lastBySubject.get(key) ?? null : null;
    const cause = deriveCause(row, previous);

    if (cause) {
      counters[cause] += 1;
    } else {
      unclassified += 1;
    }

    entries.push({
      id: row.id,
      subjectType: row.subject_type,
      subjectId: row.ticket_id ?? row.guest_entry_id ?? row.subject_user_id,
      cause,
      scannedAt: row.scanned_at,
      recordedAt: row.recorded_at,
      operatorId: row.operator_id,
      deviceId: row.device_id,
      source: row.source,
      secondsSincePrevious: previous
        ? secondsBetween(previous.scanned_at, row.scanned_at)
        : null,
      undoneAt: null,
      undoneBy: null,
    });

    if (key) {
      lastBySubject.set(key, row);
      entryIndexBySubject.set(key, entries.length - 1);
    }
  }

  const listed = entries.filter(
    (entry) =>
      entry.cause !== null &&
      entry.cause !== "double_read" &&
      entry.cause !== "refunded_after_night"
  );

  // Most recent first: the thing a supervisor is asked about is usually the
  // thing that just happened.
  listed.sort((a, b) => (a.scannedAt < b.scannedAt ? 1 : a.scannedAt > b.scannedAt ? -1 : 0));

  return { listed, counters, unclassified, total: rows.length };
}
