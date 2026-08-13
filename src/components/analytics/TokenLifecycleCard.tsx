"use client";

import CountUp from "@/components/motion/CountUp";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";
import type { TokenLifecycle } from "@/lib/analytics/event-queries";

/**
 * What happened to the drink tokens this event sold.
 *
 * ── Three segments, and here the semantics genuinely fit ─────────────────────
 *
 * Unlike the attendance meter next to it, this bar is not a grade on one number:
 * it is three named states of the same population, and two of them are exactly
 * what the semantic set is for. A redeemed token is a completed act; a refunded
 * one is the critical outcome the drinks pipeline exists to avoid; a token still
 * in a member's hand is neither, and takes the tertiary ink.
 *
 * So the raw green and the raw red leave and the completion and critical
 * semantics arrive — a substitution the spec decides, not a match by eye. They
 * are used as **fills without ink**, so `globals.css:175-178`'s rule about a
 * semantic fill carrying the ground as its ink has nothing to bind here.
 *
 * ── The legend is the channel, and it always was ─────────────────────────────
 *
 * §10: colour is never the only channel. Each swatch below is followed by the
 * state's own word — `Redeemed`, `Refunded`, `Pending` — and by its count. With
 * the completion and critical semantics closer in hue than the green/red pair
 * they replace, those words carry more of the distinction than before, which is
 * why they are asserted here rather than assumed to have survived.
 */
export default function TokenLifecycleCard({
  lifecycle,
}: {
  lifecycle: TokenLifecycle;
}) {
  // Remaining percentage (purchased / pending tokens)
  const pendingRate = 100 - lifecycle.redeemedRate - lifecycle.wastedRate;

  return (
    <Card>
      <SectionHeading>Token Lifecycle</SectionHeading>

      <p className="font-mono text-3xl font-semibold tracking-tight text-ink">
        <CountUp
          value={lifecycle.redeemedRate}
          format={(n) => `${n}% redeemed`}
        />
      </p>
      <p className="mt-1 font-mono text-sm text-muted">
        <CountUp value={lifecycle.wastedRate} format={(n) => `${n}% refunded`} />
      </p>

      {/* Stacked meter — the track is a line weight, the segments are the two
          semantics and the tertiary ink. See the docblock. */}
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-line">
        {lifecycle.redeemedRate > 0 && (
          <div
            className="h-full bg-sem-done"
            style={{ width: `${lifecycle.redeemedRate}%` }}
          />
        )}
        {lifecycle.wastedRate > 0 && (
          <div
            className="h-full bg-sem-crit"
            style={{ width: `${lifecycle.wastedRate}%` }}
          />
        )}
        {pendingRate > 0 && (
          <div
            className="h-full bg-muted"
            style={{ width: `${pendingRate}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full bg-sem-done"
            aria-hidden="true"
          />
          Redeemed:{" "}
          <span className="font-mono">
            <CountUp value={lifecycle.redeemed} />
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full bg-sem-crit"
            aria-hidden="true"
          />
          Refunded:{" "}
          <span className="font-mono">
            <CountUp value={lifecycle.refunded} />
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full bg-muted"
            aria-hidden="true"
          />
          Pending:{" "}
          <span className="font-mono">
            <CountUp value={lifecycle.purchased} />
          </span>
        </span>
      </div>
    </Card>
  );
}
