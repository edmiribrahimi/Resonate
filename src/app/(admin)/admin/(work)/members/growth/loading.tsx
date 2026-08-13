import { PageShell } from "@/components/ui/PageShell";
import { SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the member growth surface.
 *
 * ── The width is the page's width, and that is the whole point of it ─────────
 *
 * `wide`, because `/admin/members/growth` is named on §4's closed wide list and
 * the page it precedes renders that width. A placeholder at a different maximum
 * from its page makes the content jump sideways the moment the data lands,
 * which is the defect a skeleton exists to prevent, achieved by a skeleton. The
 * pair is `(work)/members/growth/page.tsx` and this file, converted in the same
 * commit.
 *
 * ── Nothing here counts anything, and on THIS surface that is load-bearing ───
 *
 * Every box below is a **literal**. No query runs before a `loading.tsx`
 * renders, so no length is available to this file and none is passed in. The
 * page it precedes draws how many people are in this community and how they
 * arrived; a placeholder that appeared to know either would be stating a
 * membership figure it cannot have. It says *a figure is coming*, never a
 * figure.
 *
 * ── Ten hand-rolled pulsing blocks, the most of the seven, all deleted ───────
 *
 * With the fill every one of them used: a **line** colour being used as a
 * **ground**, which is a category error before it is a token error. The
 * primitive's own fill is the raised ground on the surface at 1.08 : 1,
 * deliberately near-invisible, because a placeholder must read as absent
 * content rather than as content. Ten blocks made that error ten times.
 *
 * A radius is **not** appended to a skeleton line here. The container radius is
 * written after the pill radius in the emitted sheet, so a caller's radius is a
 * line of code that does nothing — DEF-41-05, still open and not this phase's
 * to close. The two granularity pills are therefore drawn at the chip's 44px
 * height and not in the chip's shape.
 *
 * ── What is NOT drawn ────────────────────────────────────────────────────────
 *
 * The tab-bar skeleton this file once carried is still gone: `(work)/layout.tsx`
 * mounts the real tab bar OUTSIDE this boundary, so a skeleton here would draw
 * a second row of pills under a navigation that is already rendered.
 */

/** The card contract, matching `Card` and `SkeletonCard`'s own shell. */
const CARD_BOX = "rounded-2xl border border-line bg-surface p-6";

export default function MemberGrowthLoading() {
  return (
    <PageShell width="wide">
      <header className="mb-6">
        {/* The page title's box. */}
        <SkeletonLine className="h-9 w-24" />
      </header>

      <div className="space-y-4">
        {/* The two granularity chips, at the chip's own height. */}
        <div className="flex flex-wrap gap-2">
          <SkeletonLine className="h-11 w-24" />
          <SkeletonLine className="h-11 w-24" />
        </div>

        {/* The summary card: a label, the headline figure, the two rates, and
            the one line below the rule. */}
        <div className={CARD_BOX}>
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="mt-2 h-9 w-24" />
          <div className="mt-4 flex flex-wrap gap-4">
            <SkeletonLine className="h-5 w-24" />
            <SkeletonLine className="h-5 w-20" />
          </div>
          <div className="mt-3 pt-3 border-t border-line">
            <SkeletonLine className="h-5 w-32" />
          </div>
        </div>

        {/* The chart card: its section heading, then the plot area at the
            height the chart actually draws. */}
        <div className={CARD_BOX}>
          <SkeletonLine className="mb-4 h-3 w-32" />
          <SkeletonLine className="h-56 w-full" />
        </div>
      </div>
    </PageShell>
  );
}
