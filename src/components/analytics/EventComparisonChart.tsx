"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { EventComparisonData } from "@/lib/analytics/comparison-queries";

const EVENT_COLORS = [
  "var(--color-accent)",
  "#6366f1",
  "#10b981",
  "#f59e0b",
];

interface EventComparisonChartProps {
  data: EventComparisonData[];
  mode: "absolute" | "per-attendee";
}

export default function EventComparisonChart({
  data,
  mode,
}: EventComparisonChartProps) {
  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted/60">
        Select 2+ events to compare
      </p>
    );
  }

  // Build chart data based on mode
  const chartData =
    mode === "absolute"
      ? buildAbsoluteData(data)
      : buildPerAttendeeData(data);

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
        {mode === "absolute" ? "Absolute Metrics" : "Per-Attendee Metrics"}
      </h2>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <XAxis
              dataKey="metric"
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
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
            <Legend />
            {data.map((event, i) => (
              <Bar
                key={event.eventId}
                dataKey={event.eventTitle}
                fill={EVENT_COLORS[i % EVENT_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function buildAbsoluteData(
  data: EventComparisonData[]
): Record<string, string | number>[] {
  const metrics = [
    { key: "Revenue", extract: (d: EventComparisonData) => d.revenue },
    { key: "Tickets Sold", extract: (d: EventComparisonData) => d.ticketsSold },
    { key: "Drink Tokens", extract: (d: EventComparisonData) => d.drinkTokens },
    { key: "Attendance", extract: (d: EventComparisonData) => d.attendance },
  ];

  return metrics.map(({ key, extract }) => {
    const row: Record<string, string | number> = { metric: key };
    for (const event of data) {
      row[event.eventTitle] = extract(event);
    }
    return row;
  });
}

function buildPerAttendeeData(
  data: EventComparisonData[]
): Record<string, string | number>[] {
  const metrics = [
    {
      key: "Revenue/Attendee",
      extract: (d: EventComparisonData) => d.avgSpendPerAttendee,
    },
    {
      key: "Drinks/Attendee",
      extract: (d: EventComparisonData) =>
        d.attendance > 0
          ? Math.round((d.drinkTokens / d.attendance) * 100) / 100
          : 0,
    },
    {
      key: "Attendance Rate %",
      extract: (d: EventComparisonData) => d.attendanceRate,
    },
  ];

  return metrics.map(({ key, extract }) => {
    const row: Record<string, string | number> = { metric: key };
    for (const event of data) {
      row[event.eventTitle] = extract(event);
    }
    return row;
  });
}
