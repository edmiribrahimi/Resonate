export default function EventsLoading() {
  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <div className="h-9 w-32 animate-pulse rounded-lg bg-card-border/50" />
      </header>

      {/* Tab bar skeleton */}
      <div className="flex gap-4 px-6 mb-4">
        <div className="h-8 w-24 animate-pulse rounded-full bg-card-border/50" />
        <div className="h-8 w-16 animate-pulse rounded-full bg-card-border/50" />
      </div>

      {/* Event cards skeleton */}
      <div className="flex flex-col gap-4 px-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-card-border bg-card p-5"
          >
            <div className="h-3 w-1/4 rounded-lg bg-card-border/50 mb-3" />
            <div className="h-6 w-2/3 rounded-lg bg-card-border/50 mb-3" />
            <div className="h-3 w-1/2 rounded-lg bg-card-border/50 mb-2" />
            <div className="h-3 w-1/3 rounded-lg bg-card-border/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
