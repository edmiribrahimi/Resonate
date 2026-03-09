export default function MembershipCardLoading() {
  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-card-border/50" />
      </header>

      <div className="px-6">
        {/* Membership card skeleton */}
        <div className="animate-pulse rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-6">
          <div className="flex flex-col items-center gap-4">
            {/* QR code placeholder */}
            <div className="h-48 w-48 rounded-xl bg-card-border/50" />
            {/* Name */}
            <div className="h-6 w-40 rounded-lg bg-card-border/50" />
            {/* Membership code */}
            <div className="h-4 w-28 rounded-lg bg-card-border/50" />
          </div>
        </div>

        {/* Referral link skeleton */}
        <div className="mt-6 h-12 animate-pulse rounded-xl border border-card-border bg-card" />

        {/* How to use card */}
        <div className="mt-6 animate-pulse rounded-2xl border border-card-border bg-card p-5">
          <div className="h-5 w-40 rounded-lg bg-card-border/50 mb-3" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded-lg bg-card-border/50" />
            <div className="h-4 w-5/6 rounded-lg bg-card-border/50" />
            <div className="h-4 w-4/5 rounded-lg bg-card-border/50" />
          </div>
        </div>

        {/* Wallet button skeleton */}
        <div className="mt-4 h-12 animate-pulse rounded-full border border-card-border bg-card" />
      </div>
    </div>
  );
}
