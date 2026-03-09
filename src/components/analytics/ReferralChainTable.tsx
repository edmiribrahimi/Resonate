import type { ReferralChain } from "@/lib/analytics/cross-event-queries";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

export default function ReferralChainTable({
  chains,
}: {
  chains: ReferralChain[];
}) {
  if (chains.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted/60">
        No referral data
      </p>
    );
  }

  return (
    <>
      {/* Desktop table with collapsible rows */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border text-left text-xs uppercase tracking-wider text-muted">
              <th className="pb-3 font-medium">Referrer</th>
              <th className="pb-3 font-medium text-right">Referred</th>
              <th className="pb-3 font-medium text-right">Chain Spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/50">
            {chains.map((c) => (
              <tr key={c.referrerId}>
                <td className="py-3" colSpan={3}>
                  <details className="group">
                    <summary className="flex cursor-pointer items-center justify-between list-none">
                      <span className="font-medium group-open:text-accent transition-colors">
                        {c.referrerName}
                      </span>
                      <span className="flex items-center gap-6">
                        <span className="text-muted">{c.referredCount}</span>
                        <span className="font-semibold w-28 text-right">
                          {eur(c.totalChainSpend)}
                        </span>
                        <span className="text-muted transition-transform group-open:rotate-90">
                          &#9654;
                        </span>
                      </span>
                    </summary>
                    <div className="mt-3 ml-4 space-y-1">
                      {c.referredMembers.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm text-muted"
                        >
                          <span>{m.name}</span>
                          <span>{eur(m.totalSpend)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards with collapsible detail */}
      <div className="space-y-3 sm:hidden">
        {chains.map((c) => (
          <details
            key={c.referrerId}
            className="group rounded-xl border border-card-border/50 bg-card/50"
          >
            <summary className="flex cursor-pointer items-center justify-between p-4 list-none">
              <div>
                <p className="font-medium group-open:text-accent transition-colors">
                  {c.referrerName}
                </p>
                <p className="text-xs text-muted">
                  {c.referredCount} referred
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold">
                  {eur(c.totalChainSpend)}
                </p>
                <span className="text-muted transition-transform group-open:rotate-90">
                  &#9654;
                </span>
              </div>
            </summary>
            <div className="border-t border-card-border/50 px-4 pb-4 pt-3 space-y-2">
              {c.referredMembers.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm text-muted"
                >
                  <span>{m.name}</span>
                  <span>{eur(m.totalSpend)}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
