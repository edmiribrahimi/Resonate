import type { DrinkSalesItem } from "@/lib/analytics/event-queries";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

export default function DrinkSalesBreakdown({
  drinks,
}: {
  drinks: DrinkSalesItem[];
}) {
  if (drinks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted/60">
        No drink sales yet
      </p>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border text-left text-xs uppercase tracking-wider text-muted">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium text-right">Qty</th>
              <th className="pb-3 font-medium text-right">Revenue</th>
              <th className="pb-3 font-medium text-right">Redeemed</th>
              <th className="pb-3 font-medium text-right">Refunded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/50">
            {drinks.map((d) => (
              <tr key={d.drinkName}>
                <td className="py-3 font-medium">{d.drinkName}</td>
                <td className="py-3 text-right text-muted">{d.quantity}</td>
                <td className="py-3 text-right">{eur(d.revenue)}</td>
                <td className="py-3 text-right text-green-500">
                  {d.redeemed}
                </td>
                <td className="py-3 text-right text-red-400">{d.refunded}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {drinks.map((d) => (
          <div
            key={d.drinkName}
            className="rounded-xl border border-card-border/50 bg-card/50 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{d.drinkName}</p>
              <p className="text-sm font-semibold">{eur(d.revenue)}</p>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted">
              <span>Qty: {d.quantity}</span>
              <span className="text-green-500">
                Redeemed: {d.redeemed}
              </span>
              <span className="text-red-400">Refunded: {d.refunded}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
