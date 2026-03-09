"use client";

import CountUp from "@/components/motion/CountUp";
import type { GrowthSummary } from "@/lib/analytics/member-queries";

interface GrowthSummaryCardProps {
  summary: GrowthSummary;
}

export default function GrowthSummaryCard({ summary }: GrowthSummaryCardProps) {
  const organicRate = 100 - summary.referralRate;

  return (
    <div className="rounded-2xl border border-card-border bg-gradient-to-br from-card to-card/80 p-6">
      <p className="text-sm text-muted mb-1">Total Members</p>
      <p className="text-4xl font-bold tracking-tight">
        <CountUp value={summary.totalMembers} />
      </p>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <span className="text-accent">
          <CountUp value={summary.referralRate} />% referral
        </span>
        <span className="text-muted">
          <CountUp value={organicRate} />% organic
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-card-border">
        <p className="text-sm text-muted">
          <span className="text-foreground font-medium">
            +<CountUp value={summary.growthThisPeriod} />
          </span>{" "}
          new this period
        </p>
      </div>
    </div>
  );
}
