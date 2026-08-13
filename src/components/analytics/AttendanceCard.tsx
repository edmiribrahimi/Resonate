"use client";

import CountUp from "@/components/motion/CountUp";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";
import type { AttendanceRate } from "@/lib/analytics/event-queries";

/**
 * How many of the tickets sold walked through the door.
 *
 * ── The bar stopped grading, and that is a decision rather than a tidy ───────
 *
 * This card used to colour its meter in three steps: a green fill at or above
 * 70%, an amber one at or above 40%, a recessed one below. Both halves of that
 * are unavailable here, and neither can be fixed by picking a nearer hue.
 *
 *  - **There is no green.** `globals.css:169-173` says it in capitals: the
 *    semantic set contains none and Phase 40 did not invent one, because adding
 *    a colour to the semantic vocabulary is adding a colour to the brand, and
 *    that is the owner's.
 *  - **Amber cannot be a bare fill.** The warning semantic holds SunSet's
 *    identification value (`globals.css:161-163`), so an amber mark cannot tell
 *    a reader *caution* from *this is a SunSet night* by hue — which is why
 *    anything amber carries text. A bar carries none.
 *
 * And the thresholds themselves — 70 and 40 — are written nowhere: no document
 * in this project says what a good attendance rate is. A meter that grades
 * against numbers nobody declared, in colours the system does not have, is
 * asserting a judgement twice over.
 *
 * So the meter draws one fill and reports a **proportion**. The grade, if there
 * is one, is read off the percentage above it — which was always the primary
 * channel, since §10 never allowed colour to be the only one. **A vocabulary for
 * grading a rate is a question owed to the owner**, recorded in this plan's
 * summary rather than answered in this file.
 */
export default function AttendanceCard({
  attendance,
}: {
  attendance: AttendanceRate;
}) {
  return (
    <Card>
      <SectionHeading>Attendance</SectionHeading>

      <p className="font-mono text-3xl font-semibold tracking-tight text-ink">
        <CountUp value={attendance.rate} format={(n) => `${n}%`} />
      </p>

      {/* The meter. One fill, no grade — see the docblock. The track is a line
          weight because it is a boundary of nothing; the fill is the tertiary
          ink, which states an amount without claiming an outcome. */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-muted transition-all"
          style={{ width: `${attendance.rate}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>
          Sold:{" "}
          <span className="font-mono">
            <CountUp value={attendance.sold} />
          </span>
        </span>
        <span>
          Checked in:{" "}
          <span className="font-mono">
            <CountUp value={attendance.checkedIn} />
          </span>
        </span>
      </div>
    </Card>
  );
}
