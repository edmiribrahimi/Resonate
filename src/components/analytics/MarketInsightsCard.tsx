"use client";

import CountUp from "@/components/motion/CountUp";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/Typography";
import type { MarketInsights } from "@/lib/analytics/event-queries";

/**
 * Two readings of the same night: what an attendee spent, and when they bought.
 *
 * ── The peak-hour pills are badges, and the accent left them ────────────────
 *
 * Each hour used to be drawn as a hand-rolled pill with a second pill inside it
 * holding the count, and the inner one was filled and inked in the accent.
 * `41-UI-SPEC.md` §5.1 reserves the accent for four things and the badge
 * primitive's own docblock says the same in its own words — *"neither tone uses
 * `--accent`: §5.1 reserves it for four things and names a state signal among
 * the ones it is never for"*. A count is exactly that kind of signal, so the
 * shell becomes `Badge` and the count is a figure inside it.
 *
 * **They are badges and not chips, and the distinction is the whole of §8.5:** a
 * badge that is a link or a button is a chip, because a chip carries the 44px
 * target. Nothing here is pressable, so nothing here needs one.
 *
 * ── The count gained its unit ────────────────────────────────────────────────
 *
 * It used to render as a bare number in a coloured pill, which reads as a rank
 * as easily as a total. `comms-analytics.md`'s *gate metrica onesta* asks a
 * figure on a dashboard to carry its unit, and the unit here is a purchase — the
 * query counts ticket and drink-order timestamps together in that hour. Saying
 * so costs one word and removes the reading where `14` looks like a position.
 */
export default function MarketInsightsCard({
  insights,
}: {
  insights: MarketInsights;
}) {
  const formatEur = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(n);

  return (
    <Card className="space-y-6">
      {/* Average spend per attendee */}
      <div>
        <SectionHeading as="h3">Avg Spend / Attendee</SectionHeading>
        {insights.avgSpendPerAttendee > 0 ? (
          <p className="font-mono text-3xl font-semibold tracking-tight text-ink">
            <CountUp value={insights.avgSpendPerAttendee} format={formatEur} />
          </p>
        ) : (
          <p className="text-sm text-muted">No attendance data</p>
        )}
      </div>

      {/* Peak purchase hours */}
      <div>
        <SectionHeading as="h3">Peak Hours</SectionHeading>
        {insights.peakPurchaseHours.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {insights.peakPurchaseHours.map(({ hour, count }) => (
              <Badge key={hour}>
                <span className="font-mono">
                  {String(hour).padStart(2, "0")}:00
                </span>
                <span className="font-mono text-muted">{count} purchases</span>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No purchase data</p>
        )}
      </div>
    </Card>
  );
}
