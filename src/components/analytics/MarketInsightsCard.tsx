"use client";

import CountUp from "@/components/motion/CountUp";
import type { MarketInsights } from "@/lib/analytics/event-queries";

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
    <div className="rounded-2xl border border-card-border bg-card p-6 space-y-6">
      {/* Average spend per attendee */}
      <div>
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted">
          Avg Spend / Attendee
        </h3>
        {insights.avgSpendPerAttendee > 0 ? (
          <p className="mt-2 text-3xl font-bold tracking-tight">
            <CountUp
              value={insights.avgSpendPerAttendee}
              format={formatEur}
            />
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted/60">No attendance data</p>
        )}
      </div>

      {/* Peak purchase hours */}
      <div>
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted">
          Peak Hours
        </h3>
        {insights.peakPurchaseHours.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {insights.peakPurchaseHours.map(({ hour, count }) => (
              <span
                key={hour}
                className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-card px-3 py-1 text-sm"
              >
                <span className="font-medium">
                  {String(hour).padStart(2, "0")}:00
                </span>
                <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent">
                  {count}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted/60">No purchase data</p>
        )}
      </div>
    </div>
  );
}
