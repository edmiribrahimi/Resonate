import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the finance surface.
 *
 * ── What a placeholder on a MONEY surface may not do ─────────────────────────
 *
 * Every count below is a **literal** and stands for nothing. It reads from
 * nothing: no query runs before this file renders, no length is available to it
 * and none is passed in. That constraint binds harder here than anywhere else in
 * the phase, because a finance placeholder that appeared to know how many rows
 * are coming would be claiming to know something about money before a single
 * payment had been read.
 *
 * ── The shapes are the page's shapes, and three of the old ones were not ─────
 *
 * The version this replaces drew three summary tiles and a row of filter pills.
 * **The finance page renders neither.** A placeholder that predicts a layout the
 * page does not have guarantees the jump it exists to prevent — so the shapes
 * here are the ones the transaction list actually draws: the search row, the
 * filter row, and the rows themselves.
 *
 * ── The shell is the shell the loaded page uses ──────────────────────────────
 *
 * `wide`, because `/admin/finance` is on §4's closed wide list. A placeholder at
 * a different maximum from the page it precedes moves the content sideways the
 * moment the data lands.
 *
 * No radius is appended to any line below. The placeholder line fixes its own
 * and offers no opt-out; a caller appending a second one loses, because both are
 * the same property at the same specificity and the winner is whichever the
 * stylesheet emits last. Recorded as DEF-41-05 — a line of code that does
 * nothing is worse than the shape it fails to produce.
 */
export default function AdminFinanceLoading() {
  return (
    <PageShell width="wide">
      <header className="mb-6">
        {/* The page title's box. */}
        <SkeletonLine className="h-9 w-40" />
      </header>

      {/* The member-search row: one field and its control. */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 basis-64">
          <SkeletonLine className="h-11 w-full" />
        </div>
        <SkeletonLine className="h-11 w-28" />
      </div>

      {/* The filter row: two date fields, a status select and the apply
          control. Four is a literal — see the docblock. */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonLine key={i} className="h-11 w-40" />
        ))}
        <SkeletonLine className="h-11 w-28" />
      </div>

      {/* The rows. Six is a literal and stands for nothing. */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
