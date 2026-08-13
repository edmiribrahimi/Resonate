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

/**
 * Tickets sold per day, as bars.
 *
 * ── A chart's colours are read, not scanned ──────────────────────────────────
 *
 * Every colour below is a custom property handed to the charting library through
 * a prop or an inline style, so **no class-string gate can see any of it**. That
 * is why this file is checked by reading it, and why the summary of the plan
 * that converted it lists this file's colour source explicitly rather than
 * inferring it from a green tick.
 *
 * Four of the five references were **legacy token names** — the aliases
 * `globals.css:365-399` keeps "for their consumers until Phase 41 empties them".
 * They are the current names now, at identical values: the aliases resolve to
 * exactly the tokens written here (`globals.css:247-250`), so this is a rename
 * and not a recolour.
 *
 * ── The fifth reference is left alone, on purpose ────────────────────────────
 *
 * The bar fill is the interactive accent. `41-UI-SPEC.md` §5.1 enumerates four
 * things the accent is reserved for and a chart series is not among them — nor
 * is it among the five it names the accent is never for. **A single-series bar
 * chart is a use nobody enumerated**, and the honest response to a gap in a
 * contract is to report it, not to close it at a call site: choosing a
 * replacement here would give this design system a chart vocabulary that no
 * document contains and nobody decided. It is recorded as a question owed to the
 * owner, and until it is answered the colour does not move.
 */
export default function TicketVelocityChart({
  data,
}: {
  data: DailyVelocity[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">No ticket sales yet</p>
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
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: "0.75rem",
            }}
            labelStyle={{ color: "var(--color-ink)" }}
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
