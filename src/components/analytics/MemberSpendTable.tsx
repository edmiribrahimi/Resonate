import type { MemberSpendProfile } from "@/lib/analytics/cross-event-queries";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

export default function MemberSpendTable({
  members,
}: {
  members: MemberSpendProfile[];
}) {
  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted/60">
        No member spending data
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
              <th className="pb-3 font-medium">#</th>
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium text-right">Tickets</th>
              <th className="pb-3 font-medium text-right">Drinks</th>
              <th className="pb-3 font-medium text-right">Total</th>
              <th className="pb-3 font-medium text-right">Events</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/50">
            {members.map((m, i) => (
              <tr key={m.userId}>
                <td className="py-3 text-muted">{i + 1}</td>
                <td className="py-3 font-medium">{m.fullName}</td>
                <td className="py-3 text-muted">{m.email}</td>
                <td className="py-3 text-right">{eur(m.ticketSpend)}</td>
                <td className="py-3 text-right">{eur(m.drinkSpend)}</td>
                <td className="py-3 text-right font-semibold">
                  {eur(m.totalSpend)}
                </td>
                <td className="py-3 text-right text-muted">
                  {m.eventsAttended}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {members.map((m, i) => (
          <div
            key={m.userId}
            className="rounded-xl border border-card-border/50 bg-card/50 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">
                <span className="text-muted mr-2">#{i + 1}</span>
                {m.fullName}
              </p>
              <p className="text-sm font-semibold">{eur(m.totalSpend)}</p>
            </div>
            <p className="mt-1 text-xs text-muted truncate">{m.email}</p>
            <div className="mt-2 flex gap-4 text-xs text-muted">
              <span>Tickets: {eur(m.ticketSpend)}</span>
              <span>Drinks: {eur(m.drinkSpend)}</span>
              <span>{m.eventsAttended} events</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
