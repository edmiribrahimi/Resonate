import { PageShell } from "@/components/ui/PageShell";
import { SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the analytics overview.
 *
 * ── The width is the page's width, and that is the whole point of it ─────────
 *
 * `wide`, because `/admin/analytics` is named on §4's closed wide list and the
 * page it precedes renders that width. A placeholder at a different maximum
 * from its page makes the content jump sideways the moment the data lands,
 * which is the defect a skeleton exists to prevent, achieved by a skeleton.
 * The pair is `(work)/analytics/page.tsx` and this file, converted in the same
 * commit so the pair cannot have been written from memory.
 *
 * ── Nothing here counts anything ─────────────────────────────────────────────
 *
 * Three tiles, two cards, five rows. Every one is a **literal**, unchanged from
 * the hand-rolled version this replaces. No query runs before a `loading.tsx`
 * renders — the router reaches it, not an import — so no length is available to
 * this file and none is passed in. It says *figures are coming*, never *this is
 * how much money was taken*.
 *
 * ── Eight hand-rolled pulsing blocks, deleted rather than restyled ───────────
 *
 * With the fill they used: a **line** colour being used as a **ground**, which
 * is a category error before it is a token error. The primitive's own fill is
 * the raised ground on the surface at 1.08 : 1, deliberately near-invisible,
 * because a placeholder must read as absent content rather than as content.
 *
 * A radius is **not** appended to a skeleton line here. The container radius is
 * written after the pill radius in the emitted sheet, so a caller's radius is a
 * line of code that does nothing — DEF-41-05, still open and not this phase's
 * to close.
 *
 * The revenue tile no longer draws an accent border and an accent-tinted
 * gradient, because the tile it stands in for no longer does either — the
 * reason is written where the loss was taken, in `KPIDashboard.tsx`.
 *
 * ── The card shell is written out, and the reason is box-match ───────────────
 *
 * `SkeletonCard` writes a title line and two body lines inside the card
 * contract, which is the right box for a list row and the wrong box for a KPI
 * tile (a label and a figure) or a feed (a heading and five rows). A
 * placeholder whose box differs from the loaded box is a placeholder that
 * causes the jump it exists to prevent, so each region below writes the card
 * contract's own three values — the container radius, a line token on the edge,
 * the surface ground — at the 24px padding, and fills it with the shapes that
 * are actually coming.
 *
 * ── What is NOT drawn, and why the omission survives ─────────────────────────
 *
 * The tab-bar skeleton this file once carried is still gone: `(work)/layout.tsx`
 * mounts the real tab bar OUTSIDE this boundary, so a skeleton here would draw
 * a second row of pills under a navigation that is already rendered.
 */

/** The card contract, matching `Card` and `SkeletonCard`'s own shell. */
const CARD_BOX = "rounded-2xl border border-line bg-surface p-6";

export default function AdminAnalyticsOverviewLoading() {
  return (
    <PageShell width="wide">
      <header className="mb-6">
        {/* The page title's box, and the one line of prose under it. */}
        <SkeletonLine className="h-9 w-32" />
        <SkeletonLine className="mt-2 h-4 w-20" />
      </header>

      <div className="space-y-6">
        {/* The KPI grid. The rule declared three columns from the small prefix,
            which is three columns inside the 544px a portrait tablet leaves —
            pitfall P6. It opens at two columns on the tablet tier and reaches
            three on the desktop tier, gaining §2.2's middle step. Three is a
            literal — see the docblock. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={CARD_BOX}>
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="mt-3 h-8 w-32" />
            </div>
          ))}
        </div>

        {/* The two sub-surface cards. A two-column rule opens at the tablet
            boundary and stops there — two columns is already §2.2's middle
            step, so nothing is added at the desktop tier. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={CARD_BOX}>
              <SkeletonLine className="h-4 w-28" />
              <SkeletonLine className="mt-2 h-3 w-40" />
            </div>
          ))}
        </div>

        {/* The activity feed: a section heading and five rows. Five is a
            literal — see the docblock. */}
        <div className={CARD_BOX}>
          <SkeletonLine className="mb-4 h-3 w-28" />
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 border-b border-line last:border-0"
              >
                <SkeletonLine className="h-7 w-7" />
                <div className="flex-1 space-y-1.5">
                  <SkeletonLine className="h-4 w-24" />
                  <SkeletonLine className="h-3 w-32" />
                </div>
                <div className="space-y-1.5">
                  <SkeletonLine className="h-4 w-16" />
                  <SkeletonLine className="h-3 w-10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
