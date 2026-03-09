"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { GrowthDataPoint } from "@/lib/analytics/member-queries";

interface MemberGrowthChartProps {
  data: GrowthDataPoint[];
}

export default function MemberGrowthChart({ data }: MemberGrowthChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted/60 py-8 text-center">
        No member data yet
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-card-border)",
              borderRadius: "0.75rem",
            }}
            labelStyle={{ color: "var(--color-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="referral"
            stackId="1"
            fill="var(--color-accent)"
            stroke="var(--color-accent)"
            fillOpacity={0.6}
            name="Referral"
          />
          <Area
            type="monotone"
            dataKey="organic"
            stackId="1"
            fill="#666"
            stroke="#666"
            fillOpacity={0.3}
            name="Organic"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
