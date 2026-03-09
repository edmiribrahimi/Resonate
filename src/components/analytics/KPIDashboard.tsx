"use client";

import CountUp from "@/components/motion/CountUp";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

interface KPIDashboardProps {
  totalRevenue: number;
  totalMembers: number;
  upcomingEvents: number;
}

export default function KPIDashboard({
  totalRevenue,
  totalMembers,
  upcomingEvents,
}: KPIDashboardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total Revenue */}
      <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Total Revenue
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight">
          <CountUp value={totalRevenue} format={eur} />
        </p>
      </div>

      {/* Members */}
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Members
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight">
          <CountUp value={totalMembers} />
        </p>
      </div>

      {/* Upcoming Events */}
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Upcoming Events
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight">
          <CountUp value={upcomingEvents} />
        </p>
      </div>
    </div>
  );
}
