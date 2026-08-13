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

/**
 * The drinks ranked by how many were sold, as horizontal bars.
 *
 * Same colour construction as the ticket velocity chart beside it, and the same
 * two findings, restated because a reader arrives at one file and not at both:
 * every colour here is handed to the charting library through a prop or an
 * inline style, so **no class-string gate reads any of it** and the check is a
 * human reading this file; and the four legacy token aliases are now the current
 * names at identical values, while the bar fill is left on the interactive
 * accent because `41-UI-SPEC.md` §5.1 neither permits nor forbids a chart series
 * and inventing the missing clause at a call site is how a design system
 * acquires a rule nobody decided.
 *
 * One thing is specific to this file: the height is computed from the number of
 * rows and applied inline. That is a **geometry**, not a colour and not a
 * breakpoint — it exists because a fixed height would crush twelve drinks into
 * the space of three, and no tier expresses "as tall as its data".
 */
export default function DrinkPopularityChart({
  drinks,
}: {
  drinks: DrinkSalesItem[];
}) {
  if (drinks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">No drink sales data</p>
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
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: "0.75rem",
            }}
            labelStyle={{ color: "var(--color-ink)" }}
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
