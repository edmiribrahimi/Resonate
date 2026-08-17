import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the visual system.
 *
 * ── The counts are LITERALS, read from nothing ──────────────────────────────
 *
 * Two cards and one card, written as numbers in this file. No query runs before
 * this file renders, nothing about the data is available to it, and it accepts
 * no prop.
 *
 * **What it must not leak is the size of the archive.** The loaded page prints
 * that number on purpose — an archive nobody is filling is a format that stays
 * dependent on what arrives on the Monday for the Tuesday, and the count is the
 * only thing that reports it. A skeleton that guessed the count would be
 * answering that question before anything had been read, and answering it wrong.
 *
 * ── A skeleton may not imply a state ────────────────────────────────────────
 *
 * There is no placeholder for a state badge and none for a swatch. A grey pill
 * where *Written* or *Not decided* will appear reads as *there is a state here*,
 * and a grey square where a colour will appear reads as *there is a colour here*
 * — which on this surface is the one claim that must be earned: a format with no
 * palette gets words, never a placeholder swatch.
 *
 * ── The shell is the same shell the loaded page uses ────────────────────────
 *
 * `default` width, because the page's primary object is a document and not a
 * dense table. A placeholder at a different maximum makes the content jump
 * sideways the moment the data lands.
 *
 * ── The primitive, not a hand-rolled pulse ──────────────────────────────────
 *
 * `Skeleton` is the primitive (`44-UI-SPEC.md` §12). Nothing is built here and
 * no animation is added.
 */
export default function VisualLoading() {
  return (
    <PageShell>
      <header className="pb-6">
        {/* The page title's box, and the standing paragraph beneath it. */}
        <SkeletonLine className="h-9 w-52" />
        <SkeletonLine className="mt-3 h-4 w-full max-w-3xl" />
      </header>

      {/* The capitolato. Two is a literal — see the docblock. */}
      <div className="space-y-4 pb-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* The archive, as one block and never as a row per file. */}
      <SkeletonCard />
    </PageShell>
  );
}
