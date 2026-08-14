import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The events listing's loading state — four hand-rolled pulsing blocks gone
 * into the primitive, and nine legacy aliases gone with them.
 *
 * ── It must not jump, and that is the whole specification ────────────────────
 *
 * The shell and its width are the loaded page's — `default`, the same word
 * `page.tsx` passes. A placeholder at a different width moves the content
 * sideways the moment the data lands, which is the one thing a loading state
 * exists to avoid.
 *
 * The card shape is `SkeletonCard`, whose shell is the card contract — the
 * container radius, the line token on the edge, the surface ground and the
 * 24px padding — and since this phase the loaded row on this surface writes
 * exactly those four values (`EventTabs.tsx`, the link's inner box). The two
 * boxes are the same box.
 *
 * ── The grid analog was measured against the tree and does not fit ───────────
 *
 * `41.2-PATTERNS.md` §2.2 assigns the gallery placeholder — a two-column tile
 * grid — as this file's specimen. Measured on the surface it stands in front
 * of, the nights render as a SINGLE COLUMN of cards, so tiles in a grid would
 * guarantee the jump the constraint above forbids. The card form is taken
 * instead, and the divergence is recorded rather than absorbed.
 *
 * ── Every count is a literal and stands for nothing ──────────────────────────
 *
 * No query runs before this file renders. The four filter placeholders are a
 * shape, not the size of the catalogue; the three card placeholders are a
 * shape, not a number of nights. Nothing here is fetched and nothing here
 * names an event, a format or a place.
 *
 * ── No radius is appended to the line primitive ──────────────────────────────
 *
 * DEF-41-05 is still open and was measured in the emitted stylesheet: a radius
 * passed from a call site collides with the component's own at the same
 * specificity. So the chip-row placeholders are the primitive's own shape at
 * the chip's height, not pills.
 */
export default function EventsLoading() {
  return (
    <PageShell width="default">
      <header className="mb-6">
        <SkeletonLine className="h-9 w-32" />
      </header>

      {/* The format filter row. Its chips sit at the 44px floor, so these do. */}
      <div className="mb-4 flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLine key={i} className="h-11 w-24" />
        ))}
      </div>

      {/* The two time-axis chips. */}
      <div className="mb-6 flex gap-2">
        <SkeletonLine className="h-11 w-28" />
        <SkeletonLine className="h-11 w-20" />
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
