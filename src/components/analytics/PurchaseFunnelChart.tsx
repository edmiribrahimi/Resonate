"use client";

import {
  FunnelChart,
  Funnel,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { FunnelStep } from "@/lib/analytics/event-queries";

/**
 * The drink purchase funnel: checkouts, payments, tokens, redeemed.
 *
 * ── This file does not own its colours, and that is the finding ──────────────
 *
 * The three chart files on this surface were each read for inline styles and
 * colour constants. Two of them name their series colour here. **This one does
 * not:** each step's fill arrives as a field on the row, so the series palette
 * lives in the query module that builds the rows, not in this component.
 *
 * That module is **not on the authorized file list** for the plan that converted
 * this surface (D-41.1-19, whose list grows by owner decision or not at all), so
 * the four values it holds — one token reference and three literal hexes — were
 * measured and reported rather than edited. None of them is a format
 * identification colour and none is the sunset gradient, which is what a
 * conversion is required to establish before it leaves a colour where it found
 * it; beyond that, a four-step categorical palette is a vocabulary this design
 * system does not have, and a plan converting a page is not where one gets
 * invented.
 *
 * The tooltip's own colours, which this file does own, were legacy token aliases
 * and are the current names now — identical values, a rename and not a recolour.
 */
export default function PurchaseFunnelChart({
  data,
}: {
  data: FunnelStep[];
}) {
  const allZero = data.every((d) => d.value === 0);

  if (allZero) {
    return (
      <p className="py-8 text-center text-sm text-muted">No purchase data</p>
    );
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: "0.75rem",
            }}
            labelStyle={{ color: "var(--color-ink)" }}
          />
          <Funnel dataKey="value" data={data} isAnimationActive>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}
