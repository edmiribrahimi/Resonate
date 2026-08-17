import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the scouted spaces.
 *
 * ── What a loading state on THIS surface may not do ─────────────────────────
 *
 * The list it stands in for renders **the names of spaces that may be under
 * negotiation**, and it is gated: what a session may read is decided by the
 * row-level policies, and the page redirects anybody without
 * `production.location.manage` before it renders at all. (The name here is a
 * description of the gate, not the gate: what refuses is the page's own guard
 * and the policies, and this file has neither.)
 *
 * So this placeholder **must not leak a number or a name**. The seven cards
 * below are a **literal**, read from nothing: no query runs before this file
 * renders, nothing about the data is available to it, and no prop is accepted.
 * The rule travels here from the calendar's placeholder with more force, not
 * less — what leaks there is how many nights are planned; what would leak here
 * is **how many spaces are under consideration**, which is itself the fact.
 * *How much scouting exists* is the shape of a search nobody outside the project
 * has seen, and it is exactly the sort of thing a screenshot carries away.
 *
 * It says *a list is coming*. It never says *this many spaces exist* — and it
 * particularly never says *no space exists*, which is the true state today and
 * has its own written sentence on the loaded page rather than a shrug here.
 *
 * ── The shell is the same shell the loaded page uses ────────────────────────
 *
 * `wide`, because `/admin/location` joins §4's closed wide list by the decision
 * recorded in `page.tsx`. A placeholder at a different maximum from the page it
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
 * There is no search field, no chip row, no sort control and no pagination on
 * the loaded page, and a placeholder that promised any of them would be a
 * placeholder for a page that does not exist. The sort control matters most: an
 * ordering control on this list is how a list ordered by stage quietly becomes
 * a ranking, and a ranking is not an availability.
 */
export default function LocationLoading() {
  return (
    <PageShell width="wide">
      <header className="pb-6">
        {/* The page title's box, and the standing paragraph beneath it. */}
        <SkeletonLine className="h-9 w-40" />
        <SkeletonLine className="mt-3 h-4 w-full max-w-3xl" />
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
