import type { RecentActivityItem } from "@/lib/analytics/dashboard-queries";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";

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

/**
 * The overview's activity feed.
 *
 * ── The amount is a figure and takes the data face ───────────────────────────
 *
 * Every row on this feed carries money, and money is what an operator reads
 * first on a row. The amounts take the data face — which carries tabular
 * figures from the token layer, so a column of them aligns down the card
 * without anything being asked of this file (DS-05) — and the semibold weight,
 * which is the one weight above 400 this system has. They do **not** take the
 * display face: §7.1's exclusion list names *any figure or count* by name.
 *
 * This is the same instinct D-41.1-13 fixes for the tables — a figure that
 * decides money is never the quietest thing on the row — reached here without
 * a slot contract, because this is a feed and not a table.
 *
 * ── The empty state states what will fill it ─────────────────────────────────
 *
 * §8.11's contract: a heading and one body sentence naming what comes next.
 * The previous copy was a single muted line reading *No recent activity*, which
 * is the shape §8.11 refuses by name — a list with nothing in it and a list
 * that has not loaded look identical, and that is a silent failure with a
 * neutral face (`nextjs-architecture.md`, gate *stato vuoto e d'errore*).
 */
export default function RecentActivityFeed({
  activities,
}: {
  activities: RecentActivityItem[];
}) {
  if (activities.length === 0) {
    return (
      <Card>
        <SectionHeading>Recent Activity</SectionHeading>
        <div className="px-6 py-12 text-center">
          <p className="text-base font-semibold text-ink">Nothing yet tonight</p>
          <p className="mt-1 text-sm text-muted">
            Ticket and drink purchases appear here as they are paid.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeading>Recent Activity</SectionHeading>
      <div>
        {activities.map((item, i) => (
          <div
            key={`${item.type}-${item.createdAt}-${i}`}
            className="flex items-center gap-3 py-3 border-b border-line last:border-0"
          >
            {/* Icon */}
            <span className="text-lg" aria-hidden="true">
              {item.type === "ticket" ? "\uD83C\uDFAB" : "\uD83C\uDF79"}
            </span>

            {/* Details. The name is the row's identity, so it takes the same
                grammar the card branch of the table primitive gives a title —
                14px, weight 600, the primary ink. */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {item.userName}
              </p>
              <p className="truncate text-xs text-muted">{item.eventTitle}</p>
            </div>

            {/* Amount + time */}
            <div className="shrink-0 text-right">
              <p className="font-mono text-sm font-semibold text-ink">
                {eur(item.amount)}
              </p>
              <p className="text-xs text-muted">
                {relativeTime(item.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
