import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the bar's QR surface — converted by plan 41.2-11.
 *
 * ── The shell is the same shell the loaded page uses ────────────────────────
 *
 * `default`, matching `page.tsx` exactly. A placeholder at a different maximum
 * from the page it precedes makes the content jump sideways the moment the data
 * lands, which is the defect a skeleton exists to prevent, achieved by a
 * skeleton. It is also the reason this file writes no maximum of its own: the
 * page stopped writing one in the same commit.
 *
 * ── Every count here is a literal and stands for nothing ────────────────────
 *
 * No query runs before a `loading.tsx` renders, no length is available to it
 * and none is passed in. Two selector placeholders and four card placeholders
 * say *a menu is coming*, never *this event has two parties* or *this party
 * sells four drinks*. That distinction is not pedantry on a surface where the
 * next screen is a purchase.
 *
 * ── One shape the incumbent promised and the page does not draw ─────────────
 *
 * The hand-rolled version this replaces drew a title bar and a date line above
 * the selector. **The page has never drawn either** — `page.tsx` carries a
 * written decision to omit the event title and date and keep the menu focused
 * on drinks, and plan 41.2-11 declared that surface deliberately headless. A
 * placeholder that reserves a heading nobody renders makes the page jump
 * upwards when the data lands and tells a reader a title is on its way. Both
 * are gone with the six hand-rolled pulses.
 *
 * ── DEF-41-05, still open ───────────────────────────────────────────────────
 *
 * No radius is appended to a line placeholder's call site. `SkeletonLine` fixes
 * its own, and a caller appending another loses, because both utilities are the
 * same property at the same specificity and — measured in the emitted
 * stylesheet on 2026-08-12 — the container radius is written after the pill
 * one. Writing the class anyway would be a line of code that does nothing.
 */
export default function MenuLoading() {
  return (
    <PageShell width="default">
      {/* The cover image's box. */}
      <SkeletonLine className="h-48 w-full" />

      {/* The party selector, at the chip's own height. Two is a literal. */}
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonLine key={i} className="h-11 w-24" />
        ))}
      </div>

      {/* The drink rows. Four is a literal — see the docblock. */}
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
