"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyVelocity } from "@/lib/analytics/event-queries";

export default function TicketVelocityChart({
  data,
}: {
  data: DailyVelocity[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted/60">
        No ticket sales yet
      </p>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            tickFormatter={(d: string) => {
              const dt = new Date(d + "T00:00:00");
              const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              return `${dt.getDate()} ${M[dt.getMonth()]}`;
            }}
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
          <Bar
            dataKey="count"
            fill="var(--color-accent)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
