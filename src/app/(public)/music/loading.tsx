import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * The Music page's loading state (UI-SPEC §A.6) — same model as
 * `events/loading.tsx`.
 *
 * The shell and its width are the loaded page's (`default`), so nothing moves
 * sideways when the data lands. Every count here is a literal shape and stands
 * for nothing: no query runs before this file renders, so two blocks of three
 * cards are not a number of events or of recordings. No text.
 */
export default function MusicLoading() {
  return (
    <PageShell width="default">
      <header className="mb-6">
        <SkeletonLine className="h-9 w-32" />
        <SkeletonLine className="mt-2 h-5 w-64" />
      </header>

      <div className="space-y-12">
        {Array.from({ length: 2 }).map((_, block) => (
          <div key={block}>
            <SkeletonLine className="mb-4 h-11 w-48" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
