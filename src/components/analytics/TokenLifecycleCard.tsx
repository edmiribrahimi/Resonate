"use client";

import CountUp from "@/components/motion/CountUp";
import type { TokenLifecycle } from "@/lib/analytics/event-queries";

export default function TokenLifecycleCard({
  lifecycle,
}: {
  lifecycle: TokenLifecycle;
}) {
  // Remaining percentage (purchased / pending tokens)
  const pendingRate = 100 - lifecycle.redeemedRate - lifecycle.wastedRate;

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        Token Lifecycle
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight">
        <CountUp
          value={lifecycle.redeemedRate}
          format={(n) => `${n}% redeemed`}
        />
      </p>
      <p className="mt-1 text-sm text-muted">
        <CountUp
          value={lifecycle.wastedRate}
          format={(n) => `${n}% refunded`}
        />
      </p>

      {/* Stacked progress bar */}
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-card-border/50">
        {lifecycle.redeemedRate > 0 && (
          <div
            className="h-full bg-green-500"
            style={{ width: `${lifecycle.redeemedRate}%` }}
          />
        )}
        {lifecycle.wastedRate > 0 && (
          <div
            className="h-full bg-red-500"
            style={{ width: `${lifecycle.wastedRate}%` }}
          />
        )}
        {pendingRate > 0 && (
          <div
            className="h-full bg-muted/30"
            style={{ width: `${pendingRate}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Redeemed: <CountUp value={lifecycle.redeemed} />
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          Refunded: <CountUp value={lifecycle.refunded} />
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-muted/30" />
          Pending: <CountUp value={lifecycle.purchased} />
        </span>
      </div>
    </div>
  );
}
