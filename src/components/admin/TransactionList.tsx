"use client";

import { useState, useEffect, useCallback } from "react";
import { listTransactions } from "@/app/(admin)/admin/finance/actions";

type TransactionStatus =
  | "SUCCESSFUL"
  | "CANCELLED"
  | "FAILED"
  | "PENDING"
  | "REFUNDED"
  | "CHARGE_BACK";

interface TransactionItem {
  id?: string;
  transaction_code?: string;
  amount?: number;
  currency?: string;
  timestamp?: string;
  status?: string;
  payment_type?: string;
  type?: string;
  card_type?: string;
  product_summary?: string;
  payout_date?: string;
  refunded_amount?: number;
  installments_count?: number;
}

function StatusBadge({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    SUCCESSFUL: "bg-green-500/20 text-green-400 border-green-500/30",
    FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
    PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    CANCELLED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    REFUNDED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CHARGE_BACK: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const colorClass = colors[status ?? ""] ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {status?.replace("_", " ") ?? "UNKNOWN"}
    </span>
  );
}

function formatDate(timestamp?: string): string {
  if (!timestamp) return "--";
  return new Date(timestamp).toLocaleDateString("en-US", {
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
          className="animate-pulse h-12 bg-card/50 rounded-lg"
        />
      ))}
    </div>
  );
}

export default function TransactionList() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [nextCursorParam, setNextCursorParam] = useState<
    "oldest_ref" | "newest_ref" | undefined
  >();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listTransactions({});
      setTransactions(result.items as TransactionItem[]);
      setNextCursor(result.nextCursor);
      setNextCursorParam(result.nextCursorParam);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load transactions"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">Failed to load transactions: {error}</p>
        <button
          onClick={fetchTransactions}
          className="mt-3 rounded-lg border border-red-500/40 px-4 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          Retry
        </button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-8 text-center text-muted">
        No transactions found
      </div>
    );
  }

  return (
    <>
      {/* Desktop table - hidden on small screens */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-card-border bg-card/50">
                <th className="px-4 py-3 font-medium text-muted">Date</th>
                <th className="px-4 py-3 font-medium text-muted">
                  Description
                </th>
                <th className="px-4 py-3 font-medium text-muted text-right">
                  Amount
                </th>
                <th className="px-4 py-3 font-medium text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr
                  key={txn.id ?? txn.transaction_code}
                  className="border-b border-card-border/50 transition-colors hover:bg-card/30"
                >
                  <td className="px-4 py-3 text-muted">
                    {formatDate(txn.timestamp)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {txn.product_summary || "Transaction"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatAmount(txn.amount, txn.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={txn.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card layout - visible on small screens */}
      <div className="flex flex-col gap-3 lg:hidden">
        {transactions.map((txn) => (
          <div
            key={txn.id ?? txn.transaction_code}
            className="rounded-xl border border-card-border bg-card p-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">
                  {txn.product_summary || "Transaction"}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {formatDate(txn.timestamp)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {formatAmount(txn.amount, txn.currency)}
                </p>
                <div className="mt-1">
                  <StatusBadge status={txn.status} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
