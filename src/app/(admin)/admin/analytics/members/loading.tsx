export default function MemberInsightsLoading() {
  return (
    <div className="min-h-dvh pb-24">
      {/* Header skeleton */}
      <header className="px-6 pt-12 pb-6">
        <div className="h-4 w-32 animate-pulse rounded bg-card-border/50" />
        <div className="mt-3 h-8 w-48 animate-pulse rounded-lg bg-card-border/50" />
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
        {/* KPI cards skeleton (2 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="animate-pulse rounded-2xl border border-card-border bg-card p-6">
            <div className="h-3 w-28 rounded bg-card-border/50" />
            <div className="mt-3 h-9 w-20 rounded-lg bg-card-border/50" />
            <div className="mt-3 h-4 w-48 rounded bg-card-border/50" />
          </div>
          <div className="animate-pulse rounded-2xl border border-card-border bg-card p-6">
            <div className="h-3 w-32 rounded bg-card-border/50" />
            <div className="mt-3 h-9 w-16 rounded-lg bg-card-border/50" />
            <div className="mt-3 space-y-1">
              <div className="h-4 w-28 rounded bg-card-border/50" />
              <div className="h-4 w-36 rounded bg-card-border/50" />
            </div>
          </div>
        </div>

        {/* Top Spenders table skeleton */}
        <div className="animate-pulse rounded-2xl border border-card-border bg-card p-6">
          <div className="h-3 w-24 rounded bg-card-border/50 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-card-border/50 pb-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-6 rounded bg-card-border/50" />
                  <div className="h-4 w-32 rounded bg-card-border/50" />
                </div>
                <div className="flex gap-4">
                  <div className="h-4 w-16 rounded bg-card-border/50" />
                  <div className="h-4 w-16 rounded bg-card-border/50" />
                  <div className="h-4 w-20 rounded bg-card-border/50" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral Effectiveness skeleton */}
        <div className="animate-pulse rounded-2xl border border-card-border bg-card p-6">
          <div className="h-3 w-36 rounded bg-card-border/50 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-card-border/50 pb-3"
              >
                <div className="h-4 w-28 rounded bg-card-border/50" />
                <div className="flex items-center gap-6">
                  <div className="h-4 w-8 rounded bg-card-border/50" />
                  <div className="h-4 w-20 rounded bg-card-border/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
