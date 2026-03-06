"use client";

import { useState, useEffect, useCallback } from "react";
import { listPayouts } from "@/app/(admin)/admin/finance/actions";

interface PayoutItem {
  amount?: number;
  currency?: string;
  date?: string;
  fee?: number;
  id?: number;
  reference?: string;
  status?: "SUCCESSFUL" | "FAILED";
  transaction_code?: string;
  type?:
    | "PAYOUT"
    | "CHARGE_BACK_DEDUCTION"
    | "REFUND_DEDUCTION"
    | "DD_RETURN_DEDUCTION"
    | "BALANCE_DEDUCTION";
}

const typeColors: Record<string, string> = {
  PAYOUT: "bg-green-500/20 text-green-400 border-green-500/30",
  CHARGE_BACK_DEDUCTION: "bg-red-500/20 text-red-400 border-red-500/30",
  REFUND_DEDUCTION: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  DD_RETURN_DEDUCTION: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BALANCE_DEDUCTION: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const typeLabels: Record<string, string> = {
  PAYOUT: "Payout",
  CHARGE_BACK_DEDUCTION: "Chargeback",
  REFUND_DEDUCTION: "Refund",
  DD_RETURN_DEDUCTION: "DD Return",
  BALANCE_DEDUCTION: "Balance Ded.",
};

const statusColors: Record<string, string> = {
  SUCCESSFUL: "bg-green-500/20 text-green-400 border-green-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
};

function TypeBadge({ type }: { type?: string }) {
  const colorClass =
    typeColors[type ?? ""] ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  const label = typeLabels[type ?? ""] ?? type ?? "UNKNOWN";

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const colorClass =
    statusColors[status ?? ""] ??
    "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {status ?? "UNKNOWN"}
    </span>
  );
}

function formatDate(date?: string): string {
  if (!date) return "--";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(amount?: number, currency?: string): string {
  if (amount === undefined || amount === null) return "--";
  return `${currency ?? "EUR"} ${amount.toFixed(2)}`;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-lg bg-card/50"
        />
      ))}
    </div>
  );
}

export default function PayoutList() {
  // Default date range: last 30 days
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    start.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(end.toISOString().split("T")[0]);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPayouts({
        start_date: startDate,
        end_date: endDate,
      });
      setPayouts(result as PayoutItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Initial load -- keep [] deps, call listPayouts directly (same pattern as TransactionList)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listPayouts({
          start_date: start.toISOString().split("T")[0],
          end_date: end.toISOString().split("T")[0],
        });
        setPayouts(result as PayoutItem[]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load payouts"
        );
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    fetchPayouts();
  };

  if (loading && payouts.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error && payouts.length === 0) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">Failed to load payouts: {error}</p>
        <button
          onClick={fetchPayouts}
          className="mt-3 rounded-lg border border-red-500/40 px-4 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent/50 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent/50 focus:outline-none"
          />
        </div>
        <button
          onClick={handleApplyFilters}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:scale-95 disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {payouts.length === 0 && !loading ? (
        <div className="rounded-xl border border-card-border bg-card p-8 text-center text-muted">
          No payouts found
        </div>
      ) : (
        <>
          {/* Desktop table - hidden on small screens */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto rounded-xl border border-card-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-card-border bg-card/50">
                    <th className="px-4 py-3 font-medium text-muted">Date</th>
                    <th className="px-4 py-3 font-medium text-muted">Type</th>
                    <th className="px-4 py-3 font-medium text-muted text-right">
                      Amount
                    </th>
                    <th className="px-4 py-3 font-medium text-muted text-right">
                      Fee
                    </th>
                    <th className="px-4 py-3 font-medium text-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id ?? payout.reference}
                      className="border-b border-card-border/50 hover:bg-card/30"
                    >
                      <td className="px-4 py-3 text-muted">
                        {formatDate(payout.date)}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={payout.type} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatAmount(payout.amount, payout.currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted">
                        {formatAmount(payout.fee, payout.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={payout.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card layout - visible on small screens */}
          <div className="flex flex-col gap-3 lg:hidden">
            {payouts.map((payout) => (
              <div
                key={payout.id ?? payout.reference}
                className="rounded-xl border border-card-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <p className="text-xs text-muted">
                    {formatDate(payout.date)}
                  </p>
                  <p className="font-medium">
                    {formatAmount(payout.amount, payout.currency)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={payout.type} />
                    <StatusBadge status={payout.status} />
                  </div>
                  <p className="text-xs text-muted">
                    Fee: {formatAmount(payout.fee, payout.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
