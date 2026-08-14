import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The event page's loading state — converted by plan 41.2-18.
 *
 * Nine hand-rolled pulsing blocks are gone. This was the phase's last
 * placeholder; the only hand-rolled pulses left under `src/` are the primitive's
 * own and the scanner's, and the scanner is Phase 42's.
 *
 * ── It must not jump, and that is chosen against the LOADED shape ────────────
 *
 * The width is the page's own — `default`, the width D-41.2-02 fixes for all ten
 * of this phase's surfaces and the one wave 0's dry run declared for this route.
 * A placeholder at a different width slides the content sideways the moment it
 * arrives, which is the one thing a loading state exists to prevent.
 *
 * **The cover block is not the incumbent's shape, and the change is the point.**
 * It was a sixteen-by-nine box. The loaded cover is capped in height, and its
 * no-image branch is a fixed 192px box — so at this shell's own width the
 * sixteen-by-nine placeholder stood roughly 230px taller than anything that
 * could land in it. The height here is the loaded branch's own, measured rather
 * than inherited.
 *
 * **The card blocks are the card primitive's box**, because the shell the loaded
 * night cards carry is one of the shells this phase sends there. If the page's
 * night card does not land on that primitive, this is a box to reconcile rather
 * than a claim to trust — which is what the phase's reconciliation wave is for.
 *
 * ── Two constraints that travel with the primitive ───────────────────────────
 *
 * **Every count is a literal and stands for nothing.** No query runs before this
 * file renders, so three description rows and two card blocks are a *shape* —
 * never a statement that this event has two nights, and never a statement about
 * who is playing at them.
 *
 * **No radius is appended to a line placeholder** (DEF-41-05, still open). The
 * lineup blocks are therefore the primitive's own corner and not the pill's, and
 * that is a deliberate one-property mismatch rather than an oversight.
 *
 * ── It names no place, and it must not begin to ──────────────────────────────
 *
 * Every block here is a neutral rectangle. A placeholder that labelled one of
 * them would be making a statement about a night before anything had been read —
 * and on this surface, where a night's whereabouts can be secret, the statement
 * it would make is the one that cannot be taken back.
 */
export default function EventDetailLoading() {
  return (
    <PageShell width="default">
      {/* Cover */}
      <SkeletonLine className="h-48" />

      <div className="pt-6">
        {/* Date */}
        <SkeletonLine className="mb-1 h-4 w-40" />

        {/* Title */}
        <SkeletonLine className="mb-4 h-9 w-2/3" />

        {/* Description */}
        <div className="mb-6 space-y-2">
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-5/6" />
          <SkeletonLine className="h-4 w-3/4" />
        </div>

        {/* Lineup */}
        <div className="mb-6">
          <SkeletonLine className="mb-3 h-3 w-16" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLine key={i} className="h-7 w-20" />
            ))}
          </div>
        </div>

        {/* Night cards */}
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="mb-6" />
        ))}
      </div>
    </PageShell>
  );
}
