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
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";

/**
 * The series colours — **left exactly as they were, and that is a report, not
 * an oversight.**
 *
 * ── What they are ────────────────────────────────────────────────────────────
 *
 * The first is a design token read through the token layer. The other three are
 * raw values written here and named nowhere else in this repository: an indigo,
 * an emerald and an amber, from a palette this product does not use. They are
 * set through a rendering prop rather than a class attribute, so **no gate that
 * counts class strings can see them** — which is the trust boundary this plan's
 * threat register names, and the reason the instruction was to *read* a chart
 * rather than scan it.
 *
 * ── Why nothing was substituted ──────────────────────────────────────────────
 *
 * Two questions were asked of every value, and both came back clean:
 *
 *  - **Is any of them a format's identity colour?** No. A format identification
 *    colour is data on a catalogue row and never a CSS token (§5, inherited),
 *    and none of these four is one of the values a format carries.
 *  - **Is any of them the sunset gradient?** No. That signature is four stops at
 *    a declared angle, it exists once in the token file, and its own gate
 *    asserts it appears nowhere else. Nothing here is a gradient at all.
 *
 * So rule 7's halt does not fire. What remains is the thing that has to be said
 * out loud instead of solved at a call site: **the design system has no series
 * vocabulary.** §5.1 assigns four grounds, four inks, three line weights, one
 * accent with a closed reserved-for list, and four semantics with literal
 * values — and a chart series is none of those things. It is not a format, so
 * DS-02's format colours are out; it is not a state, so the semantics are out;
 * and the accent's list names the primary button fill, the active navigation
 * entry, a link inside prose and the lineup pills on an event card, so the
 * first entry here is already outside it.
 *
 * Picking four replacements in this file would be a design system acquiring a
 * rule nobody decided — the exact failure §3.1 describes about a spacing step
 * and §7.3 about a heading weight. It is written up in the plan's SUMMARY as a
 * question owed to the owner, and it stays here until that question is answered.
 */
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
      /* §8.11's empty-state contract, replacing one muted line at 60% opacity.
         The opacity was a contrast reduction applied to the only sentence that
         says what to do next, on a component whose whole job is to be read. */
      <div className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">
          Nothing to compare yet
        </p>
        <p className="mt-1 text-sm text-muted">
          Two nights are the minimum a comparison can be drawn from.
        </p>
      </div>
    );
  }

  // Build chart data based on mode
  const chartData =
    mode === "absolute"
      ? buildAbsoluteData(data)
      : buildPerAttendeeData(data);

  return (
    <Card>
      <SectionHeading>
        {mode === "absolute" ? "Absolute Metrics" : "Per-Attendee Metrics"}
      </SectionHeading>
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
            {/* The chart's own chrome reads the token layer, and the three
                names below moved off the legacy aliases onto the ones they
                already resolve to: the surface ground, a line token on the
                edge, the primary ink. Identical in value by construction — the
                aliases are declared as those very tokens — so nothing renders
                differently, and the file stops naming four token names this
                system retired. */}
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-line)",
                borderRadius: "0.75rem",
              }}
              labelStyle={{ color: "var(--color-ink)" }}
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
    </Card>
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
