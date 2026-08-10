export default function MembersLoading() {
  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-card-border/50" />
      </header>

      {/* The tab-bar skeleton that stood here is gone: `(work)/layout.tsx` now
          mounts the real tab bar OUTSIDE this boundary, so a skeleton here
          would draw a second row of pills under a nav that is already
          rendered. Nothing else about this file changed. */}

      <div className="px-6">
        {/* Search bar skeleton */}
        <div className="mb-4 h-10 animate-pulse rounded-xl border border-card-border bg-card" />

        {/* Filter tabs skeleton */}
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-16 animate-pulse rounded-full bg-card-border/50"
            />
          ))}
        </div>

        {/* Member rows skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 animate-pulse rounded-xl border border-card-border bg-card p-3"
            >
              <div className="h-10 w-10 shrink-0 rounded-full bg-card-border/50" />
              <div className="flex-1">
                <div className="h-4 w-1/3 rounded-lg bg-card-border/50 mb-1.5" />
                <div className="h-3 w-1/2 rounded-lg bg-card-border/50" />
              </div>
              <div className="h-6 w-16 rounded-full bg-card-border/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
