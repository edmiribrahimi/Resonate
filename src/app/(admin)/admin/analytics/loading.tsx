export default function AdminAnalyticsOverviewLoading() {
  return (
    <div className="min-h-dvh pb-24">
      {/* Header skeleton */}
      <header className="px-6 pt-12 pb-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-card-border/50" />
        <div className="mt-2 h-4 w-20 animate-pulse rounded bg-card-border/50" />
      </header>

      {/* StaffNav skeleton */}
      <div className="mb-6 overflow-x-auto px-6">
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 animate-pulse rounded-full bg-card-border/50"
            />
          ))}
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* KPI cards skeleton: 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Revenue card */}
          <div className="animate-pulse rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-6">
            <div className="h-3 w-24 rounded bg-card-border/50" />
            <div className="mt-3 h-8 w-32 rounded-lg bg-card-border/50" />
          </div>
          {/* Members card */}
          <div className="animate-pulse rounded-2xl border border-card-border bg-card p-6">
            <div className="h-3 w-16 rounded bg-card-border/50" />
            <div className="mt-3 h-8 w-20 rounded-lg bg-card-border/50" />
          </div>
          {/* Upcoming Events card */}
          <div className="animate-pulse rounded-2xl border border-card-border bg-card p-6">
            <div className="h-3 w-28 rounded bg-card-border/50" />
            <div className="mt-3 h-8 w-12 rounded-lg bg-card-border/50" />
          </div>
        </div>

        {/* Navigation link cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="animate-pulse rounded-2xl border border-card-border bg-card p-4">
            <div className="h-4 w-28 rounded bg-card-border/50" />
            <div className="mt-2 h-3 w-40 rounded bg-card-border/50" />
          </div>
          <div className="animate-pulse rounded-2xl border border-card-border bg-card p-4">
            <div className="h-4 w-32 rounded bg-card-border/50" />
            <div className="mt-2 h-3 w-44 rounded bg-card-border/50" />
          </div>
        </div>

        {/* Recent activity skeleton */}
        <div className="animate-pulse rounded-2xl border border-card-border bg-card p-6">
          <div className="h-3 w-28 rounded bg-card-border/50 mb-4" />
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 border-b border-card-border/50 last:border-0"
              >
                <div className="h-7 w-7 rounded-full bg-card-border/50" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-24 rounded bg-card-border/50" />
                  <div className="h-3 w-32 rounded bg-card-border/50" />
                </div>
                <div className="space-y-1.5 text-right">
                  <div className="h-4 w-16 rounded bg-card-border/50" />
                  <div className="h-3 w-10 rounded bg-card-border/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
