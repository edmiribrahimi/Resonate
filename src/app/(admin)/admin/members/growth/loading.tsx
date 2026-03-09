export default function MemberGrowthLoading() {
  return (
    <div className="min-h-dvh pb-24">
      {/* Header skeleton */}
      <header className="px-6 pt-12 pb-6">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-card-border/50" />
      </header>

      {/* StaffNav skeleton */}
      <div className="flex gap-1 px-6 mb-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-20 shrink-0 animate-pulse rounded-full bg-card-border/50"
          />
        ))}
      </div>

      <div className="px-6 space-y-4">
        {/* Granularity toggle skeleton */}
        <div className="flex gap-2">
          <div className="h-8 w-20 animate-pulse rounded-full bg-card-border/50" />
          <div className="h-8 w-22 animate-pulse rounded-full bg-card-border/50" />
        </div>

        {/* Summary card skeleton */}
        <div className="rounded-2xl border border-card-border bg-card p-6">
          <div className="h-4 w-24 animate-pulse rounded-lg bg-card-border/50 mb-2" />
          <div className="h-10 w-16 animate-pulse rounded-lg bg-card-border/50 mb-4" />
          <div className="flex gap-4">
            <div className="h-4 w-24 animate-pulse rounded-lg bg-card-border/50" />
            <div className="h-4 w-20 animate-pulse rounded-lg bg-card-border/50" />
          </div>
          <div className="mt-3 pt-3 border-t border-card-border">
            <div className="h-4 w-32 animate-pulse rounded-lg bg-card-border/50" />
          </div>
        </div>

        {/* Chart container skeleton */}
        <div className="rounded-2xl border border-card-border bg-card p-6">
          <div className="h-5 w-32 animate-pulse rounded-lg bg-card-border/50 mb-4" />
          <div className="h-56 w-full animate-pulse rounded-lg bg-card-border/50" />
        </div>
      </div>
    </div>
  );
}
