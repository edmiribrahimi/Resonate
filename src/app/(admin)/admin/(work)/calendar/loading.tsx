import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the production calendar.
 *
 * ── What a loading state on THIS surface may not do ─────────────────────────
 *
 * The list it stands in for renders **unannounced dates and the words for spaces
 * that may be under negotiation**, and it is gated: what a session may read is
 * decided by the six row-level policies, and the page redirects anybody without
 * `production.calendar.manage` before it renders at all. (That key was
 * `production.read` until plan 45-05 split it into four section keys, D-45-04.
 * The name here is a description of the gate, not the gate: what refuses is the
 * page's own guard and the six policies, and this file has neither.)
 *
 * So this placeholder **must not leak a count or a name**. The seven cards below
 * are a **literal**, read from nothing: no query runs before this file renders,
 * no length is available to it, and none is passed in. The rule travels here from
 * `members/loading.tsx` with more force, not less — a count leaked there is how
 * many people exist; a count leaked here is **how many nights are planned**, and
 * that number is the shape of a calendar nobody outside the project has seen. It
 * says *a list is coming*, never *this many nights exist*.
 *
 * ── The shell is the same shell the loaded page uses ────────────────────────
 *
 * `wide`, because `/admin/calendar` is on §4's closed wide list as of this plan
 * (`44-UI-SPEC.md` §8.1). A placeholder at a different maximum from the page it
 * precedes makes the content jump sideways the moment the data lands, which is
 * the defect a skeleton exists to prevent, achieved by a skeleton.
 *
 * ── The primitive, not a hand-rolled pulse ──────────────────────────────────
 *
 * `Skeleton` is the primitive (`44-UI-SPEC.md` §12): 102 hand-rolled pulsing
 * blocks live in this tree and the primitive has too few importers. Nothing is
 * built here, and no animation is added — the only motion is the one
 * `SkeletonLine` and `SkeletonCard` already carry.
 *
 * ── No filter row, because the page has none ────────────────────────────────
 *
 * `members/loading.tsx` draws chips and a search field because its page has them.
 * This one draws neither: §8.1 refuses a filter, a search, a sort control and
 * pagination on this surface, and a placeholder that promised any of the four
 * would be a placeholder for a page that does not exist.
 */
export default function CalendarLoading() {
  return (
    <PageShell width="wide">
      <header className="pb-6">
        {/* The page title's box. */}
        <SkeletonLine className="h-9 w-40" />
      </header>

      {/* The rows. Seven is a literal — see the docblock. */}
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
