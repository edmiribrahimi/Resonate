import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the events surface.
 *
 * ── The width is the page's width, and that is the whole point of it ─────────
 *
 * `default`, because the page this stands in front of renders `default` — §4's
 * wide list is closed and does not name `/admin/events`. A placeholder at a
 * different maximum from the page it precedes makes the content jump sideways
 * the moment the data lands, which is the defect a skeleton exists to prevent,
 * achieved by a skeleton. The pair is `(work)/events/page.tsx` and this file,
 * and they were converted in the same commit so the pair cannot have been
 * written from memory.
 *
 * ── Nothing here counts anything ─────────────────────────────────────────────
 *
 * The three rows are a **literal**, unchanged from the hand-rolled version this
 * replaces. No query runs before a `loading.tsx` renders — the router reaches it,
 * not an import — so no length is available to this file and none is passed in.
 * It says *a list is coming*, never *this many nights exist*.
 *
 * ── Two things deleted rather than restyled ──────────────────────────────────
 *
 * The three hand-rolled pulsing blocks, and the fill they used: a **line**
 * colour being used as a **ground**, which is a category error before it is a
 * token error. The primitive's own fill is the raised ground on the surface at
 * 1.08 : 1, deliberately near-invisible, because a placeholder must read as
 * absent content rather than as content.
 *
 * And a radius is **not** appended to a skeleton line here. The container radius
 * is written after the pill radius in the emitted sheet, so a caller's radius is
 * a line of code that does nothing — DEF-41-05, still open and not this phase's
 * to close.
 *
 * ── What is NOT drawn, and why the omission survives ─────────────────────────
 *
 * The tab-bar skeleton this file once carried is still gone: `(work)/layout.tsx`
 * mounts the real tab bar OUTSIDE this boundary, so a skeleton here would draw a
 * second row of pills under a navigation that is already rendered. Plan 34-05
 * gave the finance and analytics placeholders the same treatment.
 */
export default function EventsLoading() {
  return (
    <PageShell width="default">
      <header className="mb-6 flex items-center justify-between gap-3">
        {/* The page title's box, and the create control's. */}
        <SkeletonLine className="h-9 w-24" />
        <SkeletonLine className="h-11 w-32" />
      </header>

      {/* The rows. Three is a literal — see the docblock. Each card occupies
          the box a loaded row takes, because both are written from the same
          three values: the container radius, a line token on the edge, and the
          surface ground at the 24px padding. */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
