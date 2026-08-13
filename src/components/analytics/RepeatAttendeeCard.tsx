"use client";

import CountUp from "@/components/motion/CountUp";
import { Card } from "@/components/ui/Card";
import type { RepeatAttendeeData } from "@/lib/analytics/cross-event-queries";

/**
 * The repeat-attendance figure, as a KPI tile.
 *
 * §8.11 declines to make a KPI tile a component and hands it the card shell
 * plus the data role for its figure, which is what this is. The shell is the
 * `Card` primitive: the hand-written radius, edge and ground it used to spell
 * were the legacy alias names, and the primitive owns all three now.
 *
 * **The figure is not in the display face.** §7.1 excludes every figure and
 * count from it by name. And the weight drops from 700 to 600 throughout,
 * because this system has two weights and 700 is not one of them — the same
 * reason the label above stops asking for 500.
 */
export default function RepeatAttendeeCard({
  data,
}: {
  data: RepeatAttendeeData;
}) {
  return (
    <Card>
      <p className="text-sm text-muted">Repeat Attendees</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        <CountUp value={data.repeatRate} />%
      </p>
      <p className="mt-2 text-sm text-muted">
        <span className="font-semibold text-ink">
          <CountUp value={data.repeatMembers} />
        </span>{" "}
        of{" "}
        <span className="font-semibold text-ink">
          <CountUp value={data.totalMembers} />
        </span>{" "}
        members attended 2+ events
      </p>
    </Card>
  );
}
