export default function EventComparisonLoading() {
  return (
    <div className="min-h-dvh pb-24">
      {/* Header skeleton */}
      <header className="px-6 pt-12 pb-6">
        <div className="h-4 w-32 animate-pulse rounded bg-card-border/50" />
        <div className="mt-3 h-8 w-56 animate-pulse rounded-lg bg-card-border/50" />
      </header>

      {/* StaffNav skeleton */}
      <div className="mb-6 px-6">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 animate-pulse rounded-full bg-card-border/50"
            />
          ))}
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Event selector skeleton */}
        <div className="animate-pulse rounded-2xl border border-card-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-card-border/50" />
            <div className="h-3 w-16 rounded bg-card-border/50" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-3 py-2"
              >
                <div className="h-4 w-4 rounded bg-card-border/50" />
                <div className="h-4 flex-1 rounded bg-card-border/50" />
                <div className="h-4 w-20 rounded-full bg-card-border/50" />
              </div>
            ))}
          </div>
        </div>

        {/* Mode toggle skeleton */}
        <div className="flex gap-2">
          <div className="h-8 w-28 animate-pulse rounded-full bg-card-border/50" />
          <div className="h-8 w-20 animate-pulse rounded-full bg-card-border/50" />
        </div>

        {/* Chart placeholder skeleton */}
        <div className="animate-pulse rounded-2xl border border-card-border bg-card p-4">
          <div className="mb-4 h-3 w-32 rounded bg-card-border/50" />
          <div className="h-[300px] rounded-lg bg-card-border/20" />
        </div>
      </div>
    </div>
  );
}
