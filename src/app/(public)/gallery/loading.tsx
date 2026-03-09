export default function GalleryLoading() {
  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <div className="h-9 w-28 animate-pulse rounded-lg bg-card-border/50" />
        <div className="mt-1 h-4 w-48 animate-pulse rounded-lg bg-card-border/50" />
      </header>

      <div className="px-6">
        {/* Event group skeleton */}
        <div className="mb-6">
          <div className="mb-3 h-5 w-40 animate-pulse rounded-lg bg-card-border/50" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-xl bg-card-border/50"
              />
            ))}
          </div>
        </div>

        {/* Second event group skeleton */}
        <div className="mb-6">
          <div className="mb-3 h-5 w-36 animate-pulse rounded-lg bg-card-border/50" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-xl bg-card-border/50"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
