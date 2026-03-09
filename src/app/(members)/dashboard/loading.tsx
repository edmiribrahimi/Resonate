export default function DashboardLoading() {
  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-4 w-12 animate-pulse rounded-lg bg-card-border/50 mb-1" />
            <div className="h-9 w-40 animate-pulse rounded-lg bg-card-border/50" />
          </div>
          <div className="mt-2 h-6 w-16 animate-pulse rounded-full bg-card-border/50" />
        </div>
        <div className="mt-1 h-4 w-48 animate-pulse rounded-lg bg-card-border/50" />
        <div className="mt-1 h-3 w-32 animate-pulse rounded-lg bg-card-border/50" />
      </header>

      <div className="flex flex-col gap-4 px-6">
        {/* Section label */}
        <div className="h-3 w-20 animate-pulse rounded-lg bg-card-border/50" />

        {/* Quick action cards */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-card-border bg-card p-4 h-24"
            >
              <div className="h-8 w-8 rounded-lg bg-card-border/50 mb-2" />
              <div className="h-4 w-2/3 rounded-lg bg-card-border/50" />
            </div>
          ))}
        </div>

        {/* Tickets section */}
        <div>
          <div className="mb-3 h-3 w-24 animate-pulse rounded-lg bg-card-border/50" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-card-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-card-border/50" />
                  <div className="flex-1">
                    <div className="h-4 w-1/2 rounded-lg bg-card-border/50 mb-1.5" />
                    <div className="h-3 w-1/3 rounded-lg bg-card-border/50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings section */}
        <div>
          <div className="mb-3 h-3 w-20 animate-pulse rounded-lg bg-card-border/50" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl border border-card-border bg-card"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
