interface TierSalesData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  revenue: number;
}

interface BuyerData {
  id: string;
  memberName: string;
  memberEmail: string;
  tierName: string;
  purchaseDate: string;
  discountCode?: string | null;
}

interface DiscountSummary {
  code: string;
  uses: number;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
}

interface SalesDashboardProps {
  eventTitle: string;
  tiers: TierSalesData[];
  buyers: BuyerData[];
  totalRevenue: number;
  totalSold: number;
  discountSummary?: DiscountSummary[];
}

function formatEUR(amount: number) {
  return `EUR ${amount.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function SalesDashboard({
  tiers,
  buyers,
  totalRevenue,
  totalSold,
  discountSummary,
}: SalesDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Revenue Summary */}
      <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-6">
        <p className="text-sm text-muted">Total Revenue</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-accent">
          {formatEUR(totalRevenue)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {totalSold} ticket{totalSold !== 1 ? "s" : ""} sold
        </p>
      </div>

      {/* Per-Tier Breakdown */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Tier Breakdown
        </h2>
        <div className="space-y-3">
          {tiers.map((tier) => {
            const sellThrough =
              tier.quantity > 0 ? (tier.sold / tier.quantity) * 100 : 0;
            const isSoldOut = tier.sold >= tier.quantity;

            return (
              <div
                key={tier.id}
                className="rounded-2xl border border-card-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {tier.name}
                      </h3>
                      {isSoldOut && (
                        <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                          Sold Out
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatEUR(tier.price)} per ticket
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">
                      {formatEUR(tier.revenue)}
                    </p>
                    <p className="text-xs text-muted">
                      {tier.sold}/{tier.quantity} sold
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-1.5 w-full rounded-full bg-card-border/50">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      isSoldOut ? "bg-red-400" : "bg-accent"
                    }`}
                    style={{ width: `${Math.min(sellThrough, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          {tiers.length === 0 && (
            <p className="text-sm text-muted/60">No tiers configured</p>
          )}
        </div>
      </div>

      {/* Buyer List */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Buyers
        </h2>
        {buyers.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-6 text-center">
            <p className="text-sm text-muted/60">No tickets sold yet</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <div className="rounded-2xl border border-card-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left text-xs uppercase tracking-wider text-muted">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Tier</th>
                      <th className="px-4 py-3 font-medium">Sconto</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyers.map((buyer) => (
                      <tr
                        key={buyer.id}
                        className="border-b border-card-border/50 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {buyer.memberName}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {buyer.memberEmail}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                            {buyer.tierName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {buyer.discountCode ? (
                            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                              {buyer.discountCode}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatDate(buyer.purchaseDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {buyers.map((buyer) => (
                <div
                  key={buyer.id}
                  className="rounded-2xl border border-card-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {buyer.memberName}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {buyer.memberEmail}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                      {buyer.tierName}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs text-muted">
                      {formatDate(buyer.purchaseDate)}
                    </p>
                    {buyer.discountCode && (
                      <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                        {buyer.discountCode}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Discount Code Summary */}
      {discountSummary && discountSummary.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Codici Sconto
          </h2>
          <div className="space-y-2">
            {discountSummary.map((ds) => (
              <div
                key={ds.code}
                className="flex items-center justify-between rounded-xl border border-card-border bg-card p-3"
              >
                <div>
                  <p className="text-sm font-mono font-semibold text-foreground">
                    {ds.code}
                  </p>
                  <p className="text-xs text-muted">
                    {ds.discount_type === "percentage"
                      ? `${ds.discount_amount}%`
                      : formatEUR(ds.discount_amount)}{" "}
                    sconto
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {ds.uses} {ds.uses === 1 ? "uso" : "usi"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
