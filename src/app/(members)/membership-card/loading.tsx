import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { SkeletonLine, SkeletonTile } from "@/components/ui/Skeleton";

/**
 * The placeholder for the membership card surface — converted by plan 41.2-07.
 *
 * ── Why a route-adjacent file is in scope at all ─────────────────────────────
 *
 * This file is reached by the ROUTER, not by any import walk, so nothing in the
 * page's closure names it. Since plan 41.1-04 the conversion gate walks the
 * route-adjacent set anyway, which is why converting the page and leaving its
 * placeholder now reddens check B rather than passing quietly. Wave 0 measured
 * **15 legacy tokens and 5 hand-rolled pulses** in this file; both are zero
 * after this edit, and the pulse now belongs to the primitive.
 *
 * ── The three constraints that travel with the primitive ─────────────────────
 *
 *  1. **The width equals the page's** — `default`, the same string the page
 *     beside it declares. A placeholder at a different maximum makes the content
 *     jump sideways the moment the data lands, which is the defect a skeleton
 *     exists to prevent, achieved by a skeleton.
 *  2. **Every count and every measure here is a literal and stands for
 *     nothing.** No query runs before this file renders: no membership code is
 *     available to it, no status, no name. The three lines standing in for the
 *     instructions are three because the list has three items in the markup,
 *     not because anything was read.
 *  3. **No radius is appended to a line primitive.** `SkeletonLine` fixes its
 *     own, offers no opt-out, and — measured in the emitted stylesheet on
 *     2026-08-12 — the container radius is written after the pill one, so a
 *     caller appending one writes a line of code that does nothing. DEF-41-05,
 *     still open.
 *
 * ── The square is a tile, not a taller line ──────────────────────────────────
 *
 * The box standing in for the code is `SkeletonTile`: a square is a different
 * shape rather than a line with a height, and the tile carries the same radius
 * the rendered code carries, so the box the placeholder occupies is the box the
 * code will. **It stands in for the code and is not the code**: nothing here
 * renders, encodes or reduces anything a scanner reads.
 */
export default function MembershipCardLoading() {
  return (
    <PageShell width="default">
      <header className="mb-6">
        {/* The page title's box. */}
        <SkeletonLine className="h-9 w-48" />
      </header>

      {/* The card: the code's square, the name, the code's own line. */}
      <Card>
        <div className="flex flex-col items-center gap-4">
          <SkeletonTile className="w-48" />
          <SkeletonLine className="h-6 w-40" />
          <SkeletonLine className="h-4 w-28" />
        </div>
      </Card>

      {/* The referral control, which renders for an approved member only. The
          placeholder draws it unconditionally because it cannot know: no query
          has run. */}
      <SkeletonLine className="mt-6 h-12 w-full" />

      {/* The instructions card. */}
      <Card className="mt-6">
        <SkeletonLine className="mb-3 h-5 w-40" />
        <div className="space-y-2">
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-5/6" />
          <SkeletonLine className="h-4 w-4/5" />
        </div>
      </Card>

      {/* The wallet control, at the button rung's own height. */}
      <SkeletonLine className="mt-4 h-11 w-full" />
    </PageShell>
  );
}
