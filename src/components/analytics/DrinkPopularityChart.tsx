"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DrinkSalesItem } from "@/lib/analytics/event-queries";

export default function DrinkPopularityChart({
  drinks,
}: {
  drinks: DrinkSalesItem[];
}) {
  if (drinks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted/60">
        No drink sales data
      </p>
    );
  }

  // Sort by quantity descending for ranking
  const sorted = [...drinks].sort((a, b) => b.quantity - a.quantity);
  const chartHeight = Math.max(200, sorted.length * 40);

  return (
    <div style={{ height: chartHeight }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={sorted}>
          <XAxis
            type="number"
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="drinkName"
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            width={100}
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
            dataKey="quantity"
            fill="var(--color-accent)"
            radius={[0, 4, 4, 0]}
            name="Sold"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
