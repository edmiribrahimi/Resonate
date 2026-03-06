"use client";

import { useState, useEffect, useCallback } from "react";
import RefundDialog from "@/components/admin/RefundDialog";
import {
  listTransactions,
  getTransactionDetail,
} from "@/app/(admin)/admin/finance/actions";

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

interface CursorEntry {
  cursor: string;
  param?: "oldest_ref" | "newest_ref";
}

function StatusBadge({ status, refundedAmount }: { status?: string; refundedAmount?: number }) {
  // Show "Partially Refunded" when some amount was refunded but status is still SUCCESSFUL
  const displayStatus =
    status === "SUCCESSFUL" && (refundedAmount ?? 0) > 0
      ? "PARTIALLY REFUNDED"
      : status;

  const colors: Record<string, string> = {
    SUCCESSFUL: "bg-green-500/20 text-green-400 border-green-500/30",
    FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
    PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    CANCELLED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    REFUNDED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CHARGE_BACK: "bg-red-500/20 text-red-400 border-red-500/30",
    "PARTIALLY REFUNDED": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };

  const colorClass =
    colors[displayStatus ?? ""] ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {displayStatus?.replace("_", " ") ?? "UNKNOWN"}
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

function TransactionDetailInline({
  detail,
  isLoading,
  txn,
  onRefundClick,
}: {
  detail: any;
  isLoading: boolean;
  txn: TransactionItem;
  onRefundClick: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <svg
          className="h-4 w-4 animate-spin text-muted"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm text-muted">Loading details...</span>
      </div>
    );
  }

  if (!detail) return null;

  if (detail._error) {
    return <p className="py-3 text-sm text-red-400">{detail._error}</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 px-2 py-3 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-muted">Fee</p>
          <p className="mt-0.5 text-sm">
            {detail.fee_amount != null
              ? `EUR ${detail.fee_amount.toFixed(2)}`
              : "--"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted">Card</p>
          <p className="mt-0.5 text-sm">
            {detail.card?.type ?? "--"}
            {detail.card?.last_4_digits
              ? ` **** ${detail.card.last_4_digits}`
              : ""}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted">Status Detail</p>
          <p className="mt-0.5 text-sm">{detail.simple_status ?? "--"}</p>
        </div>
        {detail.tip_amount != null && detail.tip_amount > 0 && (
          <div>
            <p className="text-xs font-medium text-muted">Tip</p>
            <p className="mt-0.5 text-sm">
              EUR {detail.tip_amount.toFixed(2)}
            </p>
          </div>
        )}
        {detail.entry_mode && (
          <div>
            <p className="text-xs font-medium text-muted">Entry Mode</p>
            <p className="mt-0.5 text-sm">{detail.entry_mode}</p>
          </div>
        )}
      </div>
      {/* Refund button -- only for eligible transactions */}
      {!detail?._error && !isLoading && detail && (() => {
        const isEligible =
          txn.status === "SUCCESSFUL" &&
          (txn.refunded_amount ?? 0) < (txn.amount ?? 0);
        if (!isEligible) return null;
        return (
          <div className="mt-3 border-t border-card-border/30 pt-3">
            <button
              type="button"
              onClick={onRefundClick}
              className="rounded-full border border-red-500/30 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Refund
            </button>
          </div>
        );
      })()}
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
  const [cursorStack, setCursorStack] = useState<CursorEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [currentPageCursor, setCurrentPageCursor] = useState<
    string | undefined
  >(undefined);
  const [currentCursorParam, setCurrentCursorParam] = useState<
    "oldest_ref" | "newest_ref" | undefined
  >(undefined);

  // Filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Detail expand state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, any>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  // Refund dialog state
  const [refundTarget, setRefundTarget] = useState<TransactionItem | null>(null);

  const handleRefundComplete = useCallback(
    (txnCode: string, refundedAmount: number, isFullRefund: boolean) => {
      // Optimistic update: adjust transactions list
      setTransactions((prev) =>
        prev.map((txn) =>
          txn.transaction_code === txnCode
            ? {
                ...txn,
                status: isFullRefund ? "REFUNDED" : txn.status,
                refunded_amount: (txn.refunded_amount ?? 0) + refundedAmount,
              }
            : txn
        )
      );
      // Invalidate detail cache so next expand re-fetches fresh data
      setDetailCache((prev) => {
        const next = { ...prev };
        delete next[txnCode];
        return next;
      });
      // Close the dialog
      setRefundTarget(null);
    },
    []
  );

  const fetchTransactions = useCallback(
    async (
      params: {
        newest_ref?: string;
        oldest_ref?: string;
      } = {}
    ) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listTransactions({
          ...params,
          oldest_time: dateFrom
            ? new Date(dateFrom + "T00:00:00").toISOString()
            : undefined,
          newest_time: dateTo
            ? new Date(dateTo + "T23:59:59").toISOString()
            : undefined,
          statuses: statusFilter !== "all" ? [statusFilter] : undefined,
        });
        setTransactions(result.items as TransactionItem[]);
        setNextCursor(result.nextCursor);
        setNextCursorParam(result.nextCursorParam);
        setHasMore(result.hasMore);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load transactions"
        );
      } finally {
        setLoading(false);
      }
    },
    [dateFrom, dateTo, statusFilter]
  );

  // Initial load -- keep [] deps, call listTransactions directly (Plan 01 pattern)
  useEffect(() => {
    const load = async () => {
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
    };
    load();
  }, []);

  // Pagination handlers
  const handleNextPage = async () => {
    if (!nextCursor || !nextCursorParam) return;
    setExpandedId(null);
    setCursorStack((prev) => [
      ...prev,
      { cursor: currentPageCursor ?? "", param: currentCursorParam },
    ]);
    setCurrentPageCursor(nextCursor);
    setCurrentCursorParam(nextCursorParam);
    await fetchTransactions({ [nextCursorParam]: nextCursor });
  };

  const handlePrevPage = async () => {
    if (cursorStack.length === 0) return;
    setExpandedId(null);
    const prev = cursorStack[cursorStack.length - 1];
    setCursorStack((s) => s.slice(0, -1));
    if (prev.cursor === "") {
      // First page -- no cursor
      setCurrentPageCursor(undefined);
      setCurrentCursorParam(undefined);
      await fetchTransactions({});
    } else {
      setCurrentPageCursor(prev.cursor);
      setCurrentCursorParam(prev.param);
      await fetchTransactions({ [prev.param!]: prev.cursor });
    }
  };

  // Filter handler
  const handleApplyFilters = async () => {
    setExpandedId(null);
    setDetailCache({});
    setCursorStack([]);
    setCurrentPageCursor(undefined);
    setCurrentCursorParam(undefined);
    await fetchTransactions({});
  };

  // Detail expand handler with lazy fetch
  const toggleExpanded = async (transactionCode: string) => {
    if (expandedId === transactionCode) {
      setExpandedId(null);
      return;
    }
    setExpandedId(transactionCode);
    // Lazy fetch detail if not cached
    if (!detailCache[transactionCode]) {
      setDetailLoading(transactionCode);
      try {
        const detail = await getTransactionDetail(transactionCode);
        setDetailCache((prev) => ({ ...prev, [transactionCode]: detail }));
      } catch (e) {
        setDetailCache((prev) => ({
          ...prev,
          [transactionCode]: {
            _error:
              e instanceof Error ? e.message : "Failed to load details",
          },
        }));
      } finally {
        setDetailLoading(null);
      }
    }
  };

  if (loading && transactions.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error && transactions.length === 0) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">Failed to load transactions: {error}</p>
        <button
          onClick={() => fetchTransactions({})}
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
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent/50 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent/50 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent/50 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="SUCCESSFUL">Successful</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          onClick={handleApplyFilters}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:scale-95 disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {transactions.length === 0 && !loading ? (
        <div className="rounded-xl border border-card-border bg-card p-8 text-center text-muted">
          No transactions found
        </div>
      ) : (
        <>
          {/* Desktop table - hidden on small screens */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto rounded-xl border border-card-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-card-border bg-card/50">
                    <th className="w-8 px-2 py-3" />
                    <th className="px-4 py-3 font-medium text-muted">Date</th>
                    <th className="px-4 py-3 font-medium text-muted">
                      Description
                    </th>
                    <th className="px-4 py-3 font-medium text-muted text-right">
                      Amount
                    </th>
                    <th className="px-4 py-3 font-medium text-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => {
                    const txnCode = txn.transaction_code ?? txn.id ?? "";
                    const isExpanded = expandedId === txnCode;
                    return (
                      <DesktopTransactionRow
                        key={txn.id ?? txn.transaction_code}
                        txn={txn}
                        txnCode={txnCode}
                        isExpanded={isExpanded}
                        detailCache={detailCache}
                        detailLoading={detailLoading}
                        onToggleExpand={() => toggleExpanded(txnCode)}
                        onRefundClick={() => setRefundTarget(txn)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card layout - visible on small screens */}
          <div className="flex flex-col gap-3 lg:hidden">
            {transactions.map((txn) => {
              const txnCode = txn.transaction_code ?? txn.id ?? "";
              const isExpanded = expandedId === txnCode;
              return (
                <div
                  key={txn.id ?? txn.transaction_code}
                  className="rounded-xl border border-card-border bg-card"
                >
                  <button
                    onClick={() => toggleExpanded(txnCode)}
                    className="w-full p-4 text-left"
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
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-medium">
                            {formatAmount(txn.amount, txn.currency)}
                          </p>
                          <div className="mt-1">
                            <StatusBadge status={txn.status} refundedAmount={txn.refunded_amount} />
                          </div>
                        </div>
                        <svg
                          className={`h-4 w-4 text-muted transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-card-border/30 bg-card/20 px-4 py-3">
                      <TransactionDetailInline
                        detail={detailCache[txnCode]}
                        isLoading={detailLoading === txnCode}
                        txn={txn}
                        onRefundClick={() => setRefundTarget(txn)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          {transactions.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={handlePrevPage}
                disabled={cursorStack.length === 0 || loading}
                className="rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-border/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-xs text-muted">
                Page {cursorStack.length + 1}
              </span>
              <button
                onClick={handleNextPage}
                disabled={!hasMore || loading}
                className="rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-border/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {refundTarget && refundTarget.transaction_code && (
        <RefundDialog
          transactionCode={refundTarget.transaction_code}
          transactionAmount={refundTarget.amount ?? 0}
          refundedAmount={refundTarget.refunded_amount ?? 0}
          feeAmount={detailCache[refundTarget.transaction_code]?.fee_amount ?? 0}
          currency={refundTarget.currency ?? "EUR"}
          onClose={() => setRefundTarget(null)}
          onRefundComplete={(amount, isFullRefund) =>
            handleRefundComplete(refundTarget.transaction_code!, amount, isFullRefund)
          }
        />
      )}
    </>
  );
}

// Desktop table row (extracted for readability with expand/collapse)
function DesktopTransactionRow({
  txn,
  txnCode,
  isExpanded,
  detailCache,
  detailLoading,
  onToggleExpand,
  onRefundClick,
}: {
  txn: TransactionItem;
  txnCode: string;
  isExpanded: boolean;
  detailCache: Record<string, any>;
  detailLoading: string | null;
  onToggleExpand: () => void;
  onRefundClick: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-card-border/50 transition-colors hover:bg-card/30 ${isExpanded ? "bg-card/20" : ""}`}
      >
        <td className="w-8 px-2 py-3">
          <button onClick={onToggleExpand} className="p-0.5">
            <svg
              className={`h-4 w-4 text-muted transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </td>
        <td
          className="cursor-pointer px-4 py-3 text-muted"
          onClick={onToggleExpand}
        >
          {formatDate(txn.timestamp)}
        </td>
        <td className="px-4 py-3 font-medium">
          {txn.product_summary || "Transaction"}
        </td>
        <td className="px-4 py-3 text-right font-medium">
          {formatAmount(txn.amount, txn.currency)}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={txn.status} refundedAmount={txn.refunded_amount} />
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-card-border/50">
          <td colSpan={5} className="bg-card/20 px-8 py-2">
            <TransactionDetailInline
              detail={detailCache[txnCode]}
              isLoading={detailLoading === txnCode}
              txn={txn}
              onRefundClick={onRefundClick}
            />
          </td>
        </tr>
      )}
    </>
  );
}
