import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for one night.
 *
 * ── What a loading state on THIS surface may not do ─────────────────────────
 *
 * The page it stands in for renders **an unannounced date and the word for a
 * space that may be under negotiation**, and it is gated: what a session may
 * read is decided by the row-level policies, and the page redirects anybody
 * without `production.calendar.manage` before it renders at all. (That key was
 * `production.read` until plan 45-05 split it into four section keys, D-45-04.
 * The name here is a description of the gate, not the gate: what refuses is the
 * page's own guard and the six policies, and this file has neither.)
 *
 * So this placeholder **must not leak a count or a name**. The two cards below
 * are a **literal**, read from nothing: no query runs before this file renders,
 * no length is available to it, and none is passed in. They stand for the two
 * sections — pieces, then the checklist — and not for how many pieces a night
 * owes, which is itself a fact about a plan nobody outside the project has seen.
 *
 * ── The shell is the same shell the loaded page uses ────────────────────────
 *
 * `default`, matching `[id]/page.tsx`, and deliberately **not** the `wide` its
 * list uses: §4's wide list is closed and the entry this phase added to it by
 * decision is the list, whose primary object is a dense table. A night is not
 * one (`44-UI-SPEC.md` §9.1). A placeholder at a different maximum from the page
 * it precedes makes the content jump sideways the moment the data lands, which
 * is the defect a skeleton exists to prevent, achieved by a skeleton.
 *
 * ── The primitive, not a hand-rolled pulse ──────────────────────────────────
 *
 * `Skeleton` is the primitive (`44-UI-SPEC.md` §12): 102 hand-rolled pulsing
 * blocks live in this tree and the primitive has too few importers. Nothing is
 * built here, and no animation is added — the only motion is the one
 * `SkeletonLine` and `SkeletonCard` already carry.
 */
export default function CalendarNightLoading() {
  return (
    <PageShell width="default">
      <header className="pb-6">
        {/* The night's name, and the label line beneath it. */}
        <SkeletonLine className="h-9 w-64" />
        <SkeletonLine className="mt-2 h-4 w-48" />
      </header>

      {/* The two sections. Two is a literal — see the docblock. */}
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
