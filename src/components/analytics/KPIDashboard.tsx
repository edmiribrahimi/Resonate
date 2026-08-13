"use client";

import CountUp from "@/components/motion/CountUp";
import { Card } from "@/components/ui/Card";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

/**
 * The KPI label, at the label/data role.
 *
 * Four axes, and three of them moved: the weight was 500, which is a weight
 * this system does not have (§7 fixes them at 400 and 600); the tracking is the
 * wider of the two, which is the more legible at 12px in caps; and the face is
 * the data face, which `40-UI-SPEC.md` §5.1 says renders *anything set in caps
 * with wide tracking* — until now these three were in the interface face by
 * default rather than by choice.
 *
 * The string is the section heading's, minus its bottom margin: the margin
 * belongs to a heading that sits above a group, and this label sits above one
 * figure inside a card that already carries the rhythm. D-41-11 — a surface
 * that writes the string is equally converted, and the component is a
 * convenience rather than a demand.
 */
const KPI_LABEL =
  "font-mono text-xs font-semibold uppercase tracking-widest text-muted";

/**
 * The figure.
 *
 * **The display face is not here and cannot be.** §7.1's exclusion list names
 * *any figure or count* explicitly, and `40-UI-SPEC.md` §5.3 is where it comes
 * from: no figure column renders in the display face. What a figure takes is
 * the **data** face, which carries tabular figures from the token layer — so
 * three cards of numbers line up down the grid without any of them asking, and
 * that alignment is DS-05's second half.
 *
 * The weight was 700 and is 600, which is the only weight above 400 this system
 * has.
 */
const KPI_FIGURE = "mt-2 font-mono text-3xl font-semibold text-ink";

interface KPIDashboardProps {
  totalRevenue: number;
  totalMembers: number;
  upcomingEvents: number;
}

/**
 * The three KPI cards.
 *
 * ── What the revenue card lost, and why it is a loss rather than a bug ───────
 *
 * It used to carry an accent-tinted gradient and an accent border, so it read
 * as the important one of the three. Both are gone, and neither was replaced by
 * an equivalent in another hue.
 *
 * §5.1's reserved-for list is a **positive enumeration** — the primary button
 * fill, the active navigation entry, a link inside prose, the lineup pills on
 * an event card — and a card wash is not on it. The accent is 10% of a 60/30/10
 * contract; a card-sized wash of it is not a tenth of anything.
 *
 * The obvious replacement, a semantic tone to mark *this is the money one*, is
 * refused for the reason `Chip.tsx` writes about its own missing outcome tones
 * and D-41.1-25 upheld: a fill that means *look here first* is not a fill that
 * grades. The word **Total Revenue** is the channel, it is first in the grid,
 * and colour was never allowed to be the only channel anyway (`40-UI-SPEC.md`
 * §10). Recorded rather than quietly re-tinted.
 */
export default function KPIDashboard({
  totalRevenue,
  totalMembers,
  upcomingEvents,
}: KPIDashboardProps) {
  return (
    /* The grid axis, and the one place in this file where §2.3 is a MAP and not
       a rename. The rule declared three columns from the small prefix, which put
       three columns into the 544px a portrait tablet actually leaves — pitfall
       P6. It opens at TWO columns on the tablet tier and reaches three on the
       desktop tier, which is the middle step the small-prefix rule skipped and
       the only genuinely three-tier axis §2.2 names. */
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <p className={KPI_LABEL}>Total Revenue</p>
        <p className={KPI_FIGURE}>
          <CountUp value={totalRevenue} format={eur} />
        </p>
      </Card>

      <Card>
        <p className={KPI_LABEL}>Members</p>
        <p className={KPI_FIGURE}>
          <CountUp value={totalMembers} />
        </p>
      </Card>

      <Card>
        <p className={KPI_LABEL}>Upcoming Events</p>
        <p className={KPI_FIGURE}>
          <CountUp value={upcomingEvents} />
        </p>
      </Card>
    </div>
  );
}
