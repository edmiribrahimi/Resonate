import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The placeholder for the member-analytics surface.
 *
 * ── The width is the page's width, and that is the whole job ────────────────
 *
 * `wide`, because `/admin/analytics/members` is on §4's closed wide list and so
 * is the page this stands in for. A placeholder at a different maximum from the
 * page it precedes makes the content jump sideways the moment the data lands,
 * which is the defect a skeleton exists to prevent, achieved by a skeleton.
 *
 * ── EVERY COUNT HERE IS A LITERAL AND STANDS FOR NOTHING ────────────────────
 *
 * **This binds harder here than anywhere**, because the loaded page is a page
 * of counts: a rank, a number of referrals, a number of nights attended. No
 * query runs before a loading file renders, no length is available to it and
 * none is passed in — so the five and the three below are the same literals the
 * hand-rolled version carried, unchanged, and they say *rows are coming*, never
 * *this many people exist*. Reading either of them as a figure would be reading
 * a number nothing produced.
 *
 * ── The six hand-rolled pulses are gone, and so is the category error ───────
 *
 * Each of the six blocks this replaced drew its own shell and filled it with a
 * **line colour used as a ground** — the exact mistake `Skeleton.tsx` records.
 * The primitive's fill is deliberately near-invisible against the surface,
 * because a placeholder must read as absent content, not as content.
 *
 * No radius is appended to any line here. The line primitive fixes its own and
 * offers no opt-out: a caller's radius loses to it in the emitted sheet, so
 * writing one would be a line of code that does nothing (DEF-41-05, open).
 *
 * The KPI pair's small-boundary split is **mapped, not renamed** — it moves to
 * the one boundary this system has, the same way the page's does.
 */
export default function MemberInsightsLoading() {
  return (
    <PageShell width="wide">
      <header className="mb-6">
        {/* The back link's box, then the page title's. */}
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="mt-3 h-9 w-48" />
      </header>

      {/* The tab-bar skeleton that stood here is gone: `(work)/layout.tsx` now
          mounts the real tab bar OUTSIDE this boundary, so a skeleton here
          would draw a second row of pills under a nav that is already
          rendered. */}

      <div className="space-y-6">
        {/* The two KPI tiles. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Top spenders: its section label, then rows. Five is a literal. */}
        <div>
          <SkeletonLine className="mb-4 h-3 w-24" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>

        {/* Referral effectiveness: the same shape. Three is a literal. */}
        <div>
          <SkeletonLine className="mb-4 h-3 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
