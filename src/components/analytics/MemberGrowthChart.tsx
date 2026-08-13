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

/**
 * The growth series — **left exactly as they were, and that is a report, not an
 * oversight.**
 *
 * ── What they are ────────────────────────────────────────────────────────────
 *
 * Two stacked bands. The referred band is a design token read through the token
 * layer, at 60% fill; the organic band is a raw three-digit grey written here
 * and named nowhere else in this repository, at 30%. Both are set through a
 * rendering prop rather than a class attribute, so **no gate that counts class
 * strings can see either** — the trust boundary this plan's threat register
 * names, and the reason the instruction was to *read* a chart rather than scan
 * it.
 *
 * ── Why nothing was substituted ──────────────────────────────────────────────
 *
 * Neither value is a format's identity colour — those are data on a catalogue
 * row and never a CSS token — and neither is the sunset gradient, whose
 * four-stop signature exists once in the token file and has its own gate
 * asserting it exists nowhere else. Nothing here is a gradient at all. So rule
 * 7's halt does not fire.
 *
 * What remains is the thing to say out loud rather than solve at a call site:
 * **this design system has no series vocabulary.** A series is not a format, so
 * DS-02's format colours are out; it is not a state, so the four semantics are
 * out; and the accent's reserved-for list names four things, none of which is a
 * band on a chart — so the referred band is already outside it. Picking two
 * replacements in this file would be the system acquiring a rule nobody
 * decided. It is written up in the plan's SUMMARY as a question owed to the
 * owner, and it stays here until that question is answered.
 *
 * ── One thing this chart does NOT draw ───────────────────────────────────────
 *
 * A capacity line. `community-membership.md` reads growth against how many
 * seats a night has, and drawing that as a threshold would be this file
 * asserting a target nobody set. Raised in the SUMMARY, not added here.
 */
interface MemberGrowthChartProps {
  data: GrowthDataPoint[];
}

export default function MemberGrowthChart({ data }: MemberGrowthChartProps) {
  if (data.length === 0) {
    return (
      /* §8.11's empty-state contract, replacing one muted line at 60% opacity.
         An empty chart and a chart that has not loaded look identical, and the
         sentence is what distinguishes them. */
      <div className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">No members yet</p>
        <p className="mt-1 text-sm text-muted">
          The curve starts at the first approved account.
        </p>
      </div>
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
          {/* The chart's chrome reads the token layer, and the three names here
              moved off the legacy aliases onto the ones they already resolve to
              — the surface ground, a line token on the edge, the primary ink.
              Identical in value by construction, so nothing renders
              differently, and the file stops naming token names this system
              retired. */}
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: "0.75rem",
            }}
            labelStyle={{ color: "var(--color-ink)" }}
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
