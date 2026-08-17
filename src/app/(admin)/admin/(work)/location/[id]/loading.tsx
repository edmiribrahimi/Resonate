import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for one scouted space.
 *
 * ── What a loading state on THIS surface may not do ─────────────────────────
 *
 * The page it stands in for renders **the name of a space that may be under
 * negotiation and its street address**, and it is gated: what a session may read
 * is decided by the row-level policies, and the page redirects anybody without
 * `production.location.manage` before it renders at all. (The name here is a
 * description of the gate, not the gate: what refuses is the page's own guard
 * and the policies, and this file has neither.)
 *
 * So this placeholder **carries no name, no address and no number**. The five
 * cards below are a **literal**, read from nothing: no query runs before this
 * file renders, nothing about the row is available to it, and no prop is
 * accepted. They stand for the five sections — the four questions, the hours,
 * the attributes, the suitabilities, the record — and for nothing about their
 * contents.
 *
 * ⚠ **And the two notices that may sit above them are deliberately not drawn.**
 * A space that left the race, and a space that is acquired in writing, each get
 * a block of their own on the loaded page. A skeleton for either would say
 * *this space has left the race* or *this space is acquired* before anything
 * had been read — which is a claim, made by a placeholder, about the two facts
 * on this surface that decide whether a name may be spoken outside the room.
 *
 * ── The shell is the same shell the loaded page uses ────────────────────────
 *
 * `default`, matching `[id]/page.tsx`, and deliberately **not** the `wide` its
 * list uses: §4's wide list is closed and the entry this plan added to it by
 * decision is the list, whose primary object is a dense table. One space is not
 * one. A placeholder at a different maximum from the page it precedes makes the
 * content jump sideways the moment the data lands, which is the defect a
 * skeleton exists to prevent, achieved by a skeleton.
 *
 * ── The primitive, not a hand-rolled pulse ──────────────────────────────────
 *
 * `Skeleton` is the primitive (`44-UI-SPEC.md` §12): 102 hand-rolled pulsing
 * blocks live in this tree and the primitive has too few importers. Nothing is
 * built here, and no animation is added — the only motion is the one
 * `SkeletonLine` and `SkeletonCard` already carry.
 */
export default function LocationSpaceLoading() {
  return (
    <PageShell width="default">
      <header className="pb-6">
        {/* The name's box, and the stage badge beside it. */}
        <SkeletonLine className="h-9 w-72" />
      </header>

      {/* The five sections. Five is a literal — see the docblock. */}
      <div className="space-y-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
