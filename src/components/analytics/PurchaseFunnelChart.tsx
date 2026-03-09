"use client";

import {
  FunnelChart,
  Funnel,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { FunnelStep } from "@/lib/analytics/event-queries";

export default function PurchaseFunnelChart({
  data,
}: {
  data: FunnelStep[];
}) {
  const allZero = data.every((d) => d.value === 0);

  if (allZero) {
    return (
      <p className="py-8 text-center text-sm text-muted/60">
        No purchase data
      </p>
    );
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-card-border)",
              borderRadius: "0.75rem",
            }}
            labelStyle={{ color: "var(--color-foreground)" }}
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
