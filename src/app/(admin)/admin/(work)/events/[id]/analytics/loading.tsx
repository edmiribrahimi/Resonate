import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for one event's analytics.
 *
 * ── The heaviest of the seven, and none of its weight was structure ─────────
 *
 * This file carried **eight hand-rolled pulsing blocks and forty-one legacy
 * token hits** — the largest single accumulation among the phase's seven
 * placeholders, and every one of them a re-implementation of something
 * `src/components/ui/Skeleton.tsx` already owned. The blocks are gone rather
 * than migrated: a placeholder that spells its own pulse is a placeholder that
 * can drift from the primitive's, and the drift shows up as two different
 * loading states in one product.
 *
 * The fills went with them, and that is the more interesting deletion. Every
 * block was filled with a **line** colour — a boundary weight used as a ground,
 * which is a category error before it is a token error, and the exact one the
 * primitive's own docblock records. Its fill sits at **1.08 : 1** on the card
 * surface on purpose: a placeholder must read as *absent content*, not as
 * content. A fill chosen to be visible produces a page that looks loaded while
 * it is empty, which is the silent-failure shape wearing a reassuring face.
 *
 * ── The width equals the page's, and that is the whole job ──────────────────
 *
 * `wide`, because `/admin/events/[id]/analytics` is named on §4's closed wide
 * list and its route file next door declares the same. A placeholder at a
 * different maximum makes the content jump sideways the moment the data lands —
 * the defect a skeleton exists to prevent, achieved by a skeleton.
 *
 * ── Every count is a literal, and two of them are refusals ──────────────────
 *
 * No query runs before a loading file renders. Nothing here is passed a length
 * and nothing here reads one, so the blocks below mirror the page's **regions**
 * and never its data: they say *panels are coming*, never *this event sold this
 * many drinks*.
 *
 * **Two panels are deliberately not drawn.** The drink popularity ranking and
 * the purchase funnel render only for a session holding `admin.access`, and a
 * placeholder cannot know which session it is standing in for. Drawing them
 * would promise an organizer two panels that will never arrive; drawing them
 * conditionally would mean resolving the access context here, which is a query,
 * which is the thing a loading file has not got. Five regions is the honest
 * answer and it is the smaller of the two, so the page grows into place rather
 * than collapsing out of it.
 *
 * ── The breakpoint is mapped, not renamed ───────────────────────────────────
 *
 * The pair below used to split at 640px, which is under every tablet in portrait
 * and over several phones in landscape. It splits at the portrait-tablet edge
 * now, matching the same pair on the page it precedes — §2.3, per class.
 *
 * ── No radius is appended to a line ─────────────────────────────────────────
 *
 * `SkeletonLine` fixes its own radius and offers no opt-out: measured in the
 * emitted stylesheet, the container radius is written after the pill one, so a
 * caller asking for a pill loses and writes a line of code that does nothing.
 * DEF-41-05, open, and not this plan's to close. The heights below are not that
 * — a height is geometry the primitive explicitly stands down for, and the two
 * tall panels carry one so the content underneath them does not travel a screen
 * upward when the charts arrive.
 */
export default function AnalyticsLoading() {
  return (
    <PageShell width="wide">
      <header className="mb-6">
        {/* The back link's box, at the target floor it declares when loaded. */}
        <SkeletonLine className="h-11 w-36" />
        {/* The page title's box. */}
        <SkeletonLine className="mt-2 h-9 w-32" />
        {/* The event's name under it. */}
        <SkeletonLine className="mt-2 h-4 w-48" />
      </header>

      <div className="space-y-6">
        {/* The revenue panel — full width, and first on the page. */}
        <SkeletonCard className="h-52" />

        {/* Attendance and the token lifecycle. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SkeletonCard className="h-44" />
          <SkeletonCard className="h-44" />
        </div>

        {/* The ticket velocity chart. */}
        <SkeletonCard className="h-72" />

        {/* The drink sales table. */}
        <SkeletonCard className="h-72" />

        {/* Market insights. */}
        <SkeletonCard className="h-56" />
      </div>
    </PageShell>
  );
}
