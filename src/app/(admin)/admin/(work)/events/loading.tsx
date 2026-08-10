export default function EventsLoading() {
  return (
    <div className="min-h-dvh pb-24">
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-card-border/50" />
        <div className="h-10 w-28 animate-pulse rounded-full bg-card-border/50" />
      </header>

      {/* The tab-bar skeleton that stood here is gone: `(work)/layout.tsx` now
          mounts the real tab bar OUTSIDE this boundary, so a skeleton here
          would draw a second row of pills under a nav that is already
          rendered. Same treatment plan 34-05 gave the finance and analytics
          skeletons; nothing else about this file changed. */}

      <div className="px-6">
        {/* Event cards skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-card-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-5 w-1/2 rounded-lg bg-card-border/50 mb-2" />
                  <div className="h-4 w-1/3 rounded-lg bg-card-border/50 mb-1" />
                  <div className="h-3 w-16 rounded-full bg-card-border/50" />
                </div>
                <div className="h-5 w-5 rounded bg-card-border/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
