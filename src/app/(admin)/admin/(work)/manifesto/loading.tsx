import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the sound manifesto.
 *
 * ── The count is a LITERAL, read from nothing ───────────────────────────────
 *
 * Three cards, written as a number in this file. No query runs before this file
 * renders, nothing about the data is available to it, and it accepts no prop —
 * so it cannot say *this many rules exist*, and it particularly cannot say
 * *none exists*, which is the true state today and has its own written sentence
 * on the loaded page rather than a shrug here.
 *
 * The rule travels from the calendar's placeholder and from the location one.
 * What it would leak here is smaller than a list of spaces under negotiation
 * and it is not nothing: **how much of the manifesto is written** is itself the
 * fact this section exists to report, and a skeleton that answered it before the
 * page did would be answering it without the state badge that qualifies it.
 *
 * ── A skeleton may not imply a state ────────────────────────────────────────
 *
 * There is no placeholder for a badge, and that is deliberate rather than
 * economical. A grey pill in the place where *Written* or *Not decided* will
 * appear is a shape that reads as *there is a state here* — and on this surface
 * the difference between the three states is the entire content. The same
 * discipline as the location detail's placeholder, which draws no skeleton for
 * its two notices because a skeleton where *acquired* would go is a claim made
 * before anything has been read.
 *
 * ── The shell is the same shell the loaded page uses ────────────────────────
 *
 * `default` width, because the page's primary object is prose and not a dense
 * table. A placeholder at a different maximum from the page it precedes makes
 * the content jump sideways the moment the data lands, which is the defect a
 * skeleton exists to prevent, achieved by a skeleton.
 *
 * ── The primitive, not a hand-rolled pulse ──────────────────────────────────
 *
 * `Skeleton` is the primitive (`44-UI-SPEC.md` §12). Nothing is built here and
 * no animation is added — the only motion is the one `SkeletonLine` and
 * `SkeletonCard` already carry.
 */
export default function ManifestoLoading() {
  return (
    <PageShell>
      <header className="pb-6">
        {/* The page title's box, and the standing paragraph beneath it. */}
        <SkeletonLine className="h-9 w-56" />
        <SkeletonLine className="mt-3 h-4 w-full max-w-3xl" />
      </header>

      {/* The sections. Three is a literal — see the docblock. */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
