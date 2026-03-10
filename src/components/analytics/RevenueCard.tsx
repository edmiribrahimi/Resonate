"use client";

import CountUp from "@/components/motion/CountUp";
import type { EventRevenue } from "@/lib/analytics/event-queries";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

export default function RevenueCard({ revenue }: { revenue: EventRevenue }) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-6">
      {/* Primary total */}
      <p className="text-sm text-muted">Net Revenue</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">
        <CountUp value={revenue.totalNet} format={eur} />
      </p>
      <p className="mt-1 text-xs text-muted">
        Gross: <CountUp value={revenue.totalGross} format={eur} />
      </p>

      {/* Breakdown columns */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        {/* Tickets */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Tickets
          </p>
          <p className="mt-2 text-lg font-semibold">
            <CountUp value={revenue.netTickets} format={eur} />
          </p>
          <div className="mt-1 space-y-0.5 text-xs text-muted">
            <p>
              Gross: <CountUp value={revenue.grossTickets} format={eur} />
            </p>
            <p>
              Refunds:{" "}
              <CountUp
                value={revenue.grossTickets - revenue.netTickets}
                format={eur}
              />
            </p>
            {revenue.discountedTickets > 0 && (
              <p className="text-purple-400">
                Discounts ({revenue.discountedTickets}): −<CountUp value={revenue.totalDiscount} format={eur} />
              </p>
            )}
          </div>
        </div>

        {/* Drinks */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Drinks
          </p>
          <p className="mt-2 text-lg font-semibold">
            <CountUp value={revenue.netDrinks} format={eur} />
          </p>
          <div className="mt-1 space-y-0.5 text-xs text-muted">
            <p>
              Gross: <CountUp value={revenue.grossDrinks} format={eur} />
            </p>
            <p>
              Refunds:{" "}
              <CountUp
                value={revenue.grossDrinks - revenue.netDrinks}
                format={eur}
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
