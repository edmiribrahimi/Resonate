import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the members surface.
 *
 * ── This is `Skeleton`'s SECOND consumer, and that is the point of it ────────
 *
 * §8.9 is titled *adoption, not creation*. `src/components/ui/Skeleton.tsx`
 * existed, was correct, and had zero importers for the whole of its existence
 * while 102 hand-rolled pulsing blocks lived in 20 other files — this one among
 * them. Plan 41-08 gave it its first importer; a first importer is a proof, and
 * a second is a pattern. Nothing is built here.
 *
 * ── What a loading state on THIS surface may not do ─────────────────────────
 *
 * The list this stands in for renders **members' names and addresses**, and it
 * is gated: what a session may read is decided by the row-level policies, and
 * this page redirects anybody without the capability before it renders at all.
 *
 * So a placeholder here **must not leak a count or a name**. The eight cards
 * below are a **literal**, unchanged from the hand-rolled version this replaces
 * and read from nothing: no query runs before this file renders, no length is
 * available to it, and none is passed in. It says *a list is coming*, never
 * *this many people exist*. The same holds for the three chip-shaped
 * placeholders: they stand for the four status tabs, and the count of
 * placeholders is a constant, not the number of anything.
 *
 * ── The shell is the same shell the loaded page uses ────────────────────────
 *
 * `wide`, because `/admin/members` is on §4's closed wide list. A placeholder
 * at a different maximum from the page it precedes makes the content jump
 * sideways the moment the data lands, which is the defect a skeleton exists to
 * prevent, achieved by a skeleton.
 */
export default function MembersLoading() {
  return (
    <PageShell width="wide">
      <header className="mb-6">
        {/* The page title's box. */}
        <SkeletonLine className="h-9 w-40" />
      </header>

      {/* The four status tabs, at the chip's own height.

          They are NOT drawn as pills, and that is a measurement rather than a
          preference. `SkeletonLine` fixes its own radius and offers no opt-out:
          a caller appending a pill radius loses, because both utilities are the
          same property at the same specificity and — measured in the emitted
          stylesheet on 2026-08-12 — the container radius is written after the
          pill one. Writing the class anyway would have been a line of code that
          does nothing, which is worse than the shape it fails to produce.
          Recorded as DEF-41-05. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLine key={i} className="h-11 w-24" />
        ))}
      </div>

      {/* The filter row: the search field and the two selects. */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <SkeletonLine className="h-11 w-full" />
        <div className="flex gap-3">
          <SkeletonLine className="h-11 w-32" />
          <SkeletonLine className="h-11 w-32" />
        </div>
      </div>

      {/* The rows. Eight is a literal — see the docblock. */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
