import type { RecentActivityItem } from "@/lib/analytics/dashboard-queries";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export default function RecentActivityFeed({
  activities,
}: {
  activities: RecentActivityItem[];
}) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
          Recent Activity
        </h2>
        <p className="text-sm text-muted">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
        Recent Activity
      </h2>
      <div>
        {activities.map((item, i) => (
          <div
            key={`${item.type}-${item.createdAt}-${i}`}
            className="flex items-center gap-3 py-3 border-b border-card-border last:border-0"
          >
            {/* Icon */}
            <span className="text-lg" aria-hidden="true">
              {item.type === "ticket" ? "\uD83C\uDFAB" : "\uD83C\uDF79"}
            </span>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {item.userName}
              </p>
              <p className="truncate text-xs text-muted">{item.eventTitle}</p>
            </div>

            {/* Amount + time */}
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium">{eur(item.amount)}</p>
              <p className="text-xs text-muted">
                {relativeTime(item.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
