import { PageShell } from "@/components/ui/PageShell";
import { SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the event comparison surface.
 *
 * ── The width is the page's width, and that is the whole point of it ─────────
 *
 * `wide`, because `/admin/analytics/compare` is named on §4's closed wide list
 * and the page it precedes renders that width. A placeholder at a different
 * maximum from its page makes the content jump sideways the moment the data
 * lands, which is the defect a skeleton exists to prevent, achieved by a
 * skeleton. The pair is `(work)/analytics/compare/page.tsx` and this file,
 * converted in the same commit.
 *
 * ── Nothing here counts anything ─────────────────────────────────────────────
 *
 * Five rows in the picker and two mode pills. Both are **literals**, unchanged
 * from the hand-rolled version this replaces. No query runs before a
 * `loading.tsx` renders, so no length is available to this file and none is
 * passed in. It says *a list of nights is coming*, never *this many nights
 * exist* — and on a surface that compares takings, never anything about how
 * much any of them took.
 *
 * ── Six hand-rolled pulsing blocks, deleted rather than restyled ─────────────
 *
 * With the fill they used: a **line** colour being used as a **ground**, which
 * is a category error before it is a token error. The primitive's own fill is
 * the raised ground on the surface at 1.08 : 1, deliberately near-invisible,
 * because a placeholder must read as absent content rather than as content.
 * The chart well used the same name at a weaker alpha, so it was the same error
 * twice over, once faintly.
 *
 * A radius is **not** appended to a skeleton line here — DEF-41-05, still open.
 *
 * ── The pills are drawn at the chip's height ─────────────────────────────────
 *
 * 44px, because that is what the two mode chips became. They are not drawn as
 * pills: `SkeletonLine` fixes its own radius and offers no opt-out, and writing
 * a pill radius anyway would be a line of code that does nothing — the same
 * measurement `(work)/members/loading.tsx` records.
 *
 * ── What is NOT drawn ────────────────────────────────────────────────────────
 *
 * The tab-bar skeleton this file once carried is still gone: `(work)/layout.tsx`
 * mounts the real tab bar OUTSIDE this boundary.
 */

/** The card contract, matching `Card` and `SkeletonCard`'s own shell. */
const CARD_BOX = "rounded-2xl border border-line bg-surface p-6";

export default function EventComparisonLoading() {
  return (
    <PageShell width="wide">
      <header className="mb-6">
        {/* The way back up, then the page title's box. */}
        <SkeletonLine className="h-11 w-32" />
        <SkeletonLine className="mt-2 h-9 w-56" />
      </header>

      <div className="space-y-6">
        {/* The picker: its label row, then five rows at the checkbox's own
            44px hit area. Five is a literal — see the docblock. */}
        <div className={CARD_BOX}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-3 w-16" />
          </div>
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3">
                <SkeletonLine className="h-11 w-40" />
                <SkeletonLine className="ml-auto h-6 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* The two mode chips, at the chip's own height. */}
        <div className="flex flex-wrap gap-2">
          <SkeletonLine className="h-11 w-28" />
          <SkeletonLine className="h-11 w-24" />
        </div>

        {/* The chart card: its section heading, then the plot area. */}
        <div className={CARD_BOX}>
          <SkeletonLine className="mb-4 h-3 w-32" />
          <SkeletonLine className="h-[300px] w-full" />
        </div>
      </div>
    </PageShell>
  );
}
