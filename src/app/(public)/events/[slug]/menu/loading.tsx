export default function MenuLoading() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Header image skeleton */}
      <div className="h-48 w-full animate-pulse bg-card-border/50" />

      <div className="mx-auto max-w-lg px-4 pb-24 -mt-12 relative z-10">
        {/* Event title */}
        <div className="h-7 w-2/3 animate-pulse rounded-lg bg-card-border/50 mb-2" />
        {/* Date */}
        <div className="h-4 w-40 animate-pulse rounded-lg bg-card-border/50 mb-6" />

        {/* Party selector skeleton */}
        <div className="flex gap-2 mb-6">
          <div className="h-9 w-24 animate-pulse rounded-full bg-card-border/50" />
          <div className="h-9 w-24 animate-pulse rounded-full bg-card-border/50" />
        </div>

        {/* Drink cards skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-card-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 rounded-xl bg-card-border/50" />
                <div className="flex-1">
                  <div className="h-5 w-1/2 rounded-lg bg-card-border/50 mb-2" />
                  <div className="h-4 w-16 rounded-lg bg-card-border/50" />
                </div>
                <div className="h-9 w-16 rounded-full bg-card-border/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
