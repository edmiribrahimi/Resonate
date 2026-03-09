export default function EventDetailLoading() {
  return (
    <div className="min-h-dvh pb-24">
      {/* Cover image skeleton */}
      <div className="px-6 pt-6">
        <div className="aspect-video w-full animate-pulse rounded-2xl bg-card-border/50" />
      </div>

      <div className="px-6 pt-6">
        {/* Date */}
        <div className="mb-1 h-4 w-40 animate-pulse rounded-lg bg-card-border/50" />

        {/* Title */}
        <div className="mb-4 h-9 w-2/3 animate-pulse rounded-lg bg-card-border/50" />

        {/* Description lines */}
        <div className="mb-6 space-y-2">
          <div className="h-4 w-full animate-pulse rounded-lg bg-card-border/50" />
          <div className="h-4 w-5/6 animate-pulse rounded-lg bg-card-border/50" />
          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-card-border/50" />
        </div>

        {/* Lineup pills skeleton */}
        <div className="mb-6">
          <div className="mb-3 h-3 w-16 animate-pulse rounded-lg bg-card-border/50" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-7 w-20 animate-pulse rounded-full bg-card-border/50"
              />
            ))}
          </div>
        </div>

        {/* Party card skeletons */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="mb-6 animate-pulse rounded-xl border border-card-border bg-card p-4"
          >
            <div className="mb-3">
              <div className="h-5 w-1/2 rounded-lg bg-card-border/50 mb-2" />
              <div className="flex items-center gap-3 mt-1">
                <div className="h-4 w-24 rounded-lg bg-card-border/50" />
                <div className="h-4 w-20 rounded-lg bg-card-border/50" />
              </div>
              <div className="mt-1 h-4 w-32 rounded-lg bg-card-border/50" />
            </div>
            <div className="h-10 w-full rounded-xl bg-card-border/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
