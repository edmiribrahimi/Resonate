"use client";

import CountUp from "@/components/motion/CountUp";
import type { GrowthSummary } from "@/lib/analytics/member-queries";
import { Card } from "@/components/ui/Card";

/**
 * The summary above the growth chart.
 *
 * ── The figures take the data face, and not the display face ─────────────────
 *
 * §7.1's exclusion list names *any figure or count* by name, and
 * `40-UI-SPEC.md` §5.3 is where it comes from: no figure column renders in the
 * display face. The data face is what these take, and it carries tabular
 * figures from the token layer, so the two rates below line up under each other
 * without either of them asking — DS-05's second half.
 *
 * The headline figure was 30% larger than the page title. §7's ladder has four
 * sizes and that was not one of them; it is the largest step the ladder names
 * now, at the one weight above 400 this system has.
 *
 * ── Two colours lost, and both are losses rather than bugs ───────────────────
 *
 * The card was an accent-free gradient between the surface ground and a
 * translucent copy of itself, and the referral share was drawn in the accent.
 * Both are gone.
 *
 * §5.1's reserved-for list is a **positive enumeration** — the primary button
 * fill, the active navigation entry, a link inside prose, the lineup pills on
 * an event card — and neither a card wash nor a figure's ink is on it. The
 * obvious substitute, a semantic tone to distinguish *referred* from *organic*,
 * is refused for the reason D-41.1-25 upheld two waves ago: those four tokens
 * grade an outcome, and how somebody arrived in this community is not an
 * outcome to be graded. The words **referral** and **organic** are the channel,
 * they always were, and colour was never allowed to be the only one
 * (`40-UI-SPEC.md` §10).
 *
 * ── What is deliberately NOT added ───────────────────────────────────────────
 *
 * A capacity figure, a ratio against it, or any caption implying one.
 * `community-membership.md` reads growth against a hard fact — the venues in
 * target hold 150–300 people, and a member who never gets in is a former member
 * — and acting on that is a product decision, not a conversion. Raised in the
 * plan's SUMMARY instead.
 */
const FIGURE_LABEL =
  "font-mono text-xs font-semibold uppercase tracking-widest text-muted";

interface GrowthSummaryCardProps {
  summary: GrowthSummary;
}

export default function GrowthSummaryCard({ summary }: GrowthSummaryCardProps) {
  const organicRate = 100 - summary.referralRate;

  return (
    <Card>
      <p className={FIGURE_LABEL}>Total Members</p>
      <p className="mt-2 font-mono text-3xl font-semibold text-ink">
        <CountUp value={summary.totalMembers} />
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <span className="font-mono text-ink">
          <CountUp value={summary.referralRate} />% referral
        </span>
        <span className="font-mono text-muted">
          <CountUp value={organicRate} />% organic
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-line">
        <p className="text-sm text-muted">
          <span className="font-mono font-semibold text-ink">
            +<CountUp value={summary.growthThisPeriod} />
          </span>{" "}
          new this period
        </p>
      </div>
    </Card>
  );
}
