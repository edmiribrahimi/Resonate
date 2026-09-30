import "server-only";

/**
 * The one place that decides whether the door refuses a refunded ticket
 * (RFD-03, decided by the owner on 2026-09-30: «diventa un rifiuto, una volta
 * che il rimborsato riceve la mail»).
 *
 * Read by BOTH door paths, so they can never disagree:
 *   - the online check-in (`src/app/api/tickets/checkin/route.ts`), which
 *     answers `not_valid` / `refunded` through `respond()`;
 *   - the offline manifest (`src/app/api/tickets/attendance/route.ts`), which
 *     ships the answer as `refundedBeforeNight` so the phone never computes it.
 *
 * Two decisions live here (52.2-12):
 *
 * 1. **The switch `DOOR_REFUSE_REFUNDED_ENABLED`, server side.** Absent (or any
 *    value other than `"true"`) means OFF, and OFF is exactly the behaviour the
 *    door had before this phase: admitted with the `refunded_before_night`
 *    flag, online and offline. The order RFD-01 (the refund email) → RFD-03
 *    (the refusal) is therefore a configuration fact written under a dated
 *    act (plan 52.2-15), not an attention to what gets pushed: lab and
 *    production run the same code.
 *
 * 2. **The refusal requires `notified_email_id`.** A refund whose email did
 *    not leave (send failure, no recipient, historical refund) stays an
 *    admission with a flag: between the two door errors we pick the one that
 *    does not happen in front of a queue (`checkin-offline.md`). The id says
 *    the provider accepted the email, not that it was read — it is the
 *    strongest fact available, and it is said as such.
 *
 * A refund with no timestamp, or issued at/after the night's start, is never
 * refused here: those keep today's branches.
 */
export function doorRefusesRefunds(): boolean {
  return process.env.DOOR_REFUSE_REFUNDED_ENABLED === "true";
}

export function refundRefusedAtDoor(args: {
  refundedAt: Date | null;
  notifiedEmailId: string | null;
  nightStart: Date;
}): boolean {
  if (!doorRefusesRefunds()) return false;
  if (args.refundedAt === null) return false;
  if (Number.isNaN(args.refundedAt.getTime())) return false;
  if (!(args.refundedAt < args.nightStart)) return false;
  return (
    typeof args.notifiedEmailId === "string" &&
    args.notifiedEmailId.trim().length > 0
  );
}
