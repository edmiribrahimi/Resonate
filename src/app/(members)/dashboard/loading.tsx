import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the member dashboard — converted by plan 41.2-13.
 *
 * ── Eleven hand-rolled pulses, the most of the five in this phase ────────────
 *
 * This file wrote its own pulsing block eleven times, against a primitive that
 * had been correct and unimported for the whole of its existence (D-41-04, and
 * `Skeleton.tsx`'s own docblock carries the record). None is written here.
 *
 * ── Every count below is a literal and stands for NOTHING ───────────────────
 *
 * No query runs before a `loading.tsx` renders: nothing is fetched, no length is
 * available to this file and none is passed in. That constraint binds harder on
 * this placeholder than on any other in the phase, because what it stands in
 * front of is **a member's own tickets and their own drink tokens**. A count
 * chosen to look like a plausible number of tickets would be a claim about that
 * member's purchases, made before anything was read — and a person who sees two
 * boxes and then one ticket has been told something false by a file that knows
 * nothing.
 *
 * So the counts are shapes, not numbers: **two** quick-action tiles, because the
 * page draws exactly two and they are fixed navigation rather than data; **two**
 * ticket rows and **three** settings controls, both unchanged from the
 * hand-rolled version this replaces and both meaning only *a list is coming*.
 *
 * ── The width is the page's own ─────────────────────────────────────────────
 *
 * `default`, matching `page.tsx`'s shell exactly. A placeholder at a different
 * maximum makes the content jump sideways the moment the data lands, which is
 * the defect a skeleton exists to prevent, achieved by a skeleton.
 *
 * ── No radius is appended to a line ─────────────────────────────────────────
 *
 * `SkeletonLine` fixes its own radius and offers no opt-out: a caller appending
 * one loses, because both utilities are the same property at the same
 * specificity and the container radius is emitted last. Writing the class
 * anyway would be a line of code that does nothing. DEF-41-05, still open.
 *
 * ── What it does NOT do ─────────────────────────────────────────────────────
 *
 * It draws no navigation and declares no column clearance. A placeholder is not
 * a mount site: check E pairs the two sets over files that import the
 * responsive form directly, and this file imports nothing but the shell and the
 * placeholder.
 */
export default function DashboardLoading() {
  return (
    <PageShell width="default">
      <header className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            {/* The greeting, then the member's name at the title's box. */}
            <SkeletonLine className="mb-1 h-4 w-12" />
            <SkeletonLine className="h-9 w-40" />
          </div>
          {/* The role mark, at the badge's own height. */}
          <SkeletonLine className="mt-2 h-6 w-16" />
        </div>
        <SkeletonLine className="mt-1 h-4 w-48" />
        <SkeletonLine className="mt-1 h-3 w-32" />
      </header>

      <div className="flex flex-col gap-4">
        {/* The section label. */}
        <SkeletonLine className="h-3 w-20" />

        {/* The two quick actions. Two is the page's own fixed pair, not a count
            of anything read — see the docblock.

            These are lines and not cards, and that is a box measurement rather
            than a preference: the loaded tile fixes its own 96px height, and the
            card placeholder draws three lines inside 24px of padding, which
            does not fit in 96px. A placeholder that overflows the box it stands
            in for reintroduces the jump it exists to prevent. */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonLine key={i} className="h-24 w-full" />
          ))}
        </div>

        {/* The tickets. Two is a literal. */}
        <div>
          <SkeletonLine className="mb-3 h-3 w-24" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>

        {/* The settings controls. Three is a literal. */}
        <div>
          <SkeletonLine className="mb-3 h-3 w-20" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonLine key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
