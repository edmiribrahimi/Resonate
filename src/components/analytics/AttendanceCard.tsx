"use client";

import CountUp from "@/components/motion/CountUp";
import type { AttendanceRate } from "@/lib/analytics/event-queries";

function rateColor(rate: number) {
  if (rate >= 70) return "bg-green-500";
  if (rate >= 40) return "bg-yellow-500";
  return "bg-muted/40";
}

export default function AttendanceCard({
  attendance,
}: {
  attendance: AttendanceRate;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        Attendance
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight">
        <CountUp value={attendance.rate} format={(n) => `${n}%`} />
      </p>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-card-border/50">
        <div
          className={`h-full rounded-full transition-all ${rateColor(attendance.rate)}`}
          style={{ width: `${attendance.rate}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>
          Sold: <CountUp value={attendance.sold} />
        </span>
        <span>
          Checked in: <CountUp value={attendance.checkedIn} />
        </span>
      </div>
    </div>
  );
}
