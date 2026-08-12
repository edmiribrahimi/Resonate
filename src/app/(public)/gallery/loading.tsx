import { PageShell } from "@/components/ui/PageShell";
import { SkeletonLine, SkeletonTile } from "@/components/ui/Skeleton";

/**
 * The gallery's loading state — **and the first import
 * `src/components/ui/Skeleton.tsx` has ever had.**
 *
 * That sentence is the point of the file, not a footnote. The placeholder
 * component existed, was correct, and rendered nowhere, while this very file
 * hand-rolled six pulsing blocks eight lines apart. `41-UI-SPEC.md` §0 rule 4
 * names that pairing as the failure the whole phase is arranged to prevent, and
 * D-41-04 is the rule it produced. Plan 41-08 is the plan that closed it.
 *
 * ── It must not jump ─────────────────────────────────────────────────────────
 *
 * The shell, its width, the gutter, the rhythm and the grid's column counts are
 * the loaded page's. A skeleton whose boxes sit somewhere else is worse than no
 * skeleton: it moves the content the moment it arrives, which is the one thing
 * a loading state exists to avoid.
 *
 * Two groups and their item counts are a **shape**, not a claim about the data.
 * Nothing here is fetched and nothing here names an event.
 */
export default function GalleryLoading() {
  return (
    <PageShell width="wide">
      <header className="pb-6">
        <SkeletonLine className="h-9 w-28" />
        <SkeletonLine className="mt-2 h-4 w-48" />
      </header>

      <div className="space-y-8">
        <div>
          <SkeletonLine className="mb-3 h-5 w-40" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonTile key={i} />
            ))}
          </div>
        </div>

        <div>
          <SkeletonLine className="mb-3 h-5 w-36" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonTile key={i} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
