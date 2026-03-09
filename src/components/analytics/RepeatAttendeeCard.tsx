"use client";

import CountUp from "@/components/motion/CountUp";
import type { RepeatAttendeeData } from "@/lib/analytics/cross-event-queries";

export default function RepeatAttendeeCard({
  data,
}: {
  data: RepeatAttendeeData;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        Repeat Attendees
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight">
        <CountUp value={data.repeatRate} />%
      </p>
      <p className="mt-2 text-sm text-muted">
        <span className="font-medium text-foreground">
          <CountUp value={data.repeatMembers} />
        </span>{" "}
        of{" "}
        <span className="font-medium text-foreground">
          <CountUp value={data.totalMembers} />
        </span>{" "}
        members attended 2+ events
      </p>
    </div>
  );
}
