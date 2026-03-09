"use client";

import CountUp from "@/components/motion/CountUp";
import type { GuestConversionData } from "@/lib/analytics/cross-event-queries";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

export default function GuestConversionCard({
  data,
}: {
  data: GuestConversionData;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        Guest Conversions
      </p>
      {data.totalConversions === 0 ? (
        <p className="mt-4 text-sm text-muted/60">No guest conversions yet</p>
      ) : (
        <>
          <p className="mt-2 text-3xl font-bold tracking-tight">
            <CountUp value={data.totalConversions} />
          </p>
          <div className="mt-2 space-y-0.5 text-sm text-muted">
            <p>
              <CountUp value={data.totalGuestOrders} /> guest orders
            </p>
            <p>
              <CountUp value={data.convertedSpend} format={eur} /> total spend
            </p>
          </div>
        </>
      )}
    </div>
  );
}
