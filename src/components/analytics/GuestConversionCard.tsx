"use client";

import CountUp from "@/components/motion/CountUp";
import { Card } from "@/components/ui/Card";
import type { GuestConversionData } from "@/lib/analytics/cross-event-queries";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

/**
 * The guest-conversion figure, as a KPI tile — the same shape as its sibling.
 *
 * The shell is the `Card` primitive; the figure takes weight 600 and the
 * primary ink and stays out of the display face (§7.1 excludes every figure and
 * count from it by name).
 *
 * **The empty branch keeps its own sentence rather than borrowing a neutral
 * one.** Zero conversions is a fact about the data, not a failure, and it reads
 * differently from a tile that has not loaded — which is the distinction
 * `meta-gates.md` asks for and the reason the branch exists at all. Its ink
 * moves off the dimmed muted it used to carry: a sentence somebody is meant to
 * read is not drawn at partial opacity.
 */
export default function GuestConversionCard({
  data,
}: {
  data: GuestConversionData;
}) {
  return (
    <Card>
      <p className="text-sm text-muted">Guest Conversions</p>
      {data.totalConversions === 0 ? (
        <p className="mt-4 text-sm text-muted">No guest conversions yet</p>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
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
    </Card>
  );
}
