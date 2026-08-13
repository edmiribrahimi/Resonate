"use client";

import { useState, useEffect, useCallback } from "react";
import RefundDialog from "@/components/admin/RefundDialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Input, Select } from "@/components/ui/Input";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  listTransactions,
  getTransactionDetail,
  enrichTransactionsWithBuyers,
  searchPurchasesByMember,
  type PurchaseSearchResult,
} from "@/app/(admin)/admin/finance/actions";

/**
 * The finance transaction list — `41-UI-SPEC.md` §8.8, plan 41.1-15.
 *
 * ── What this conversion is, and the line it does not cross ──────────────────
 *
 * This file **renders** a payment status and **opens** a refund. It does not set
 * one, and the conversion changed nothing that could. `meta-gates.md`'s second
 * monotone guard — *a payment reaching completion corrects forward, never
 * backwards* — binds every edit here, so no status transition, no refund amount,
 * no idempotency key and no webhook path was touched. What moved is markup:
 * class strings, JSX structure and imports.
 *
 * The refund dialog itself is **not opened by this plan**. It is one of the
 * three knots and belongs to plan 41.1-17, with its own impact analysis. That is
 * also why `/admin/finance` is **not declared converted here**: the closure walks
 * through this file into that one, so the declaration is held for the final
 * reconciliation rather than made early.
 *
 * ── One column declaration, two whole renderings ─────────────────────────────
 *
 * `DataTable` gives the table and the phone card one array of columns, so a
 * column added to one cannot be forgotten on the other. This surface has a
 * second problem the primitive was not built for: when a member search is
 * active it renders an **entirely different list** instead of the table — two
 * whole renderings of the same facts, not two branches of one declaration.
 *
 * That second rendering is still hand-written below and still carries its own
 * copy of how an amount and a date are written. Task 2 of this plan is what
 * removes the copy.
 *
 * ── What stays at the call site, because the primitive declines it ───────────
 *
 * Cursor pagination. The primitive declines sorting, pagination, column resizing
 * and row virtualisation by name, so the cursor stack, the next cursor and the
 * current page cursor stay exactly where they were and were not edited.
 */

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

/* ────────────────────────────────────────────────────────────────────────────
 * The one row shape both renderings are declared over
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What a row of this surface is, independent of where it came from.
 *
 * The transaction list and the member search return **two different shapes** for
 * the same facts. Declaring the columns over a third shape that both map into is
 * what makes the two renderings structurally unable to disagree: there is one
 * place that says how an amount is written, one that says how a status is drawn,
 * and one that says how a date reads.
 */
interface TransactionRow {
  /** The React key. Unique within one rendering. */
  readonly id: string;
  /**
   * The transaction code — the key the detail fetch, the expansion state and the
   * refund dialog have always agreed on.
   */
  readonly code: string;
  readonly description: string;
  /** The buyer's name where one was matched, and null where none was. */
  readonly buyer: string | null;
  readonly amount?: number;
  readonly currency?: string;
  readonly status?: string;
  readonly refundedAmount: number;
  readonly timestamp?: string;
  /** The API item, handed unchanged to the detail region and to the refund dialog. */
  readonly item: TransactionItem;
}

function rowOfTransaction(
  txn: TransactionItem,
  buyer: string | null
): TransactionRow {
  const code = txn.transaction_code ?? txn.id ?? "";
  return {
    id: txn.id ?? txn.transaction_code ?? code,
    code,
    description: txn.product_summary || "Transaction",
    buyer,
    amount: txn.amount,
    currency: txn.currency,
    status: txn.status,
    refundedAmount: txn.refunded_amount ?? 0,
    timestamp: txn.timestamp,
    item: txn,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The status word
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Seven statuses, one mark, and **no tone per outcome**.
 *
 * This badge used to carry seven raw palette families — one hue per status. The
 * tempting replacement was the four semantic tokens, collapsing seven outcomes
 * onto four colours. **D-41.1-25 refuses that, and this surface is the case the
 * refusal was written for.** The badge primitive has a neutral form and an
 * emphasis fill that means *look here first*; it deliberately has no tone that
 * grades an outcome, because a colour per outcome settles in a stylesheet a
 * judgement nobody has written down. A refusal is a communication, not a hue.
 *
 * So the **word is the channel**, which is what the accessibility contract has
 * required all along: colour was never allowed to be the only one. The seven
 * words stay seven and stay distinct; what is gone is the hue that repeated
 * them, and that loss is accepted rather than overlooked.
 *
 * **One question is reported and deliberately not answered here.** D-41.1-25
 * leaves open a single criterion — *does the status grade a person, or report a
 * machine?* — and names the newsletter's broadcast result as the one place it may
 * legitimately be re-asked. A payment status reports a machine too. That is an
 * argument for re-asking the question, not a licence to answer it inside a
 * conversion commit, and it is written into this plan's SUMMARY as a question
 * owed rather than settled at this call site.
 *
 * The partial-refund reading below is untouched: it is a **rendering** of two
 * facts the API already returns, and it sets nothing.
 */
function StatusBadge({
  status,
  refundedAmount,
}: {
  status?: string;
  refundedAmount?: number;
}) {
  // Show "Partially Refunded" when some amount was refunded but status is still SUCCESSFUL
  const displayStatus =
    status === "SUCCESSFUL" && (refundedAmount ?? 0) > 0
      ? "PARTIALLY REFUNDED"
      : status;

  return <Badge>{displayStatus?.replace("_", " ") ?? "UNKNOWN"}</Badge>;
}

function formatDate(timestamp?: string): string {
  if (!timestamp) return "--";
  const d = new Date(timestamp);
  const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
}

function formatAmount(amount?: number, currency?: string): string {
  if (amount === undefined || amount === null) return "--";
  return `${currency ?? "EUR"} ${amount.toFixed(2)}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The detail region, rendered by the expansion in both branches
 * ──────────────────────────────────────────────────────────────────────────── */

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
          aria-hidden="true"
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
    return (
      <p role="alert" className="py-3 text-sm text-sem-crit">
        {detail._error}
      </p>
    );
  }

  return (
    <div>
      {/* The detail grid maps per class rather than by rename: what was one
          column below the small tier and three above it now gains the middle
          step, so the three fields are two-up at the width where the navigation
          column has already taken 224px away and are three-up only once there is
          room for three. */}
      <div className="grid grid-cols-1 gap-4 px-2 py-3 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs font-semibold text-muted">Fee</p>
          <p className="mt-0.5 text-sm text-ink-2">
            {detail.fee_amount != null
              ? `EUR ${detail.fee_amount.toFixed(2)}`
              : "--"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted">Card</p>
          <p className="mt-0.5 text-sm text-ink-2">
            {detail.card?.type ?? "--"}
            {detail.card?.last_4_digits
              ? ` **** ${detail.card.last_4_digits}`
              : ""}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted">Status Detail</p>
          <p className="mt-0.5 text-sm text-ink-2">{detail.simple_status ?? "--"}</p>
        </div>
        {detail.tip_amount != null && detail.tip_amount > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted">Tip</p>
            <p className="mt-0.5 text-sm text-ink-2">
              EUR {detail.tip_amount.toFixed(2)}
            </p>
          </div>
        )}
        {detail.entry_mode && (
          <div>
            <p className="text-xs font-semibold text-muted">Entry Mode</p>
            <p className="mt-0.5 text-sm text-ink-2">{detail.entry_mode}</p>
          </div>
        )}
      </div>
      {/* Refund button -- only for eligible transactions.

          The eligibility test is unchanged, byte for byte: it reads the status
          and the refunded figure the API returned and decides whether to draw a
          control. It does not write either. What changed is the pill: the
          destructive rung of the button ladder, whose ink on that fill computes
          above the small-text minimum where the hand-written outline did not
          reach a 44px target at all. The confirmation still lives in the dialog
          this control opens, and that dialog is not opened by this plan. */}
      {!detail?._error && !isLoading && detail && (() => {
        const isEligible =
          txn.status === "SUCCESSFUL" &&
          (txn.refunded_amount ?? 0) < (txn.amount ?? 0);
        if (!isEligible) return null;
        return (
          <div className="mt-3 border-t border-line pt-3">
            <Button size="sm" variant="destructive" onClick={onRefundClick}>
              Refund
            </Button>
          </div>
        );
      })()}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The list
 * ──────────────────────────────────────────────────────────────────────────── */

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

  // Member search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PurchaseSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Buyer name enrichment for transaction list
  const [buyerMap, setBuyerMap] = useState<Record<string, string>>({});

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
      // Also update search results if in search mode
      setSearchResults((prev) =>
        prev.map((r) =>
          r.transactionCode === txnCode
            ? { ...r, status: isFullRefund ? "REFUNDED" : r.status }
            : r
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

  const handleSearch = useCallback(async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearchMode(false);
      return;
    }
    setSearchLoading(true);
    setIsSearchMode(true);
    try {
      const results = await searchPurchasesByMember(searchQuery.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchMode(false);
  }, []);

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
        const items = result.items as TransactionItem[];
        setTransactions(items);
        setNextCursor(result.nextCursor);
        setNextCursorParam(result.nextCursorParam);
        setHasMore(result.hasMore);

        // Enrich with buyer names
        const codes = items
          .map((t) => t.transaction_code)
          .filter((c): c is string => !!c);
        if (codes.length > 0) {
          const buyers = await enrichTransactionsWithBuyers(codes);
          setBuyerMap((prev) => ({ ...prev, ...buyers }));
        }
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
        const items = result.items as TransactionItem[];
        setTransactions(items);
        setNextCursor(result.nextCursor);
        setNextCursorParam(result.nextCursorParam);
        setHasMore(result.hasMore);

        // Enrich with buyer names
        const codes = items
          .map((t) => t.transaction_code)
          .filter((c): c is string => !!c);
        if (codes.length > 0) {
          const buyers = await enrichTransactionsWithBuyers(codes);
          setBuyerMap(buyers);
        }
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

  /**
   * The five columns, declared once and read by both renderings.
   *
   * The array order is the table's order and is the one it already had; the slot
   * is what the phone card does with each, and they are independent.
   *
   * **The amount is a `mark`, and that is the rule this surface exists to
   * satisfy** (D-41.1-13): on a surface that carries money, the figure that
   * decides money is what an operator must meet first, never a detail buried in
   * the line underneath. The card slot gives it position but no weight, so the
   * cell renders its own emphasis and the data face; the date takes the same face
   * in the table so a column of dates aligns.
   *
   * **The buyer becomes a column of its own.** It used to be a second line
   * inside the description cell, which is not a thing a card can lay out. It
   * reads the same map it always did, and where no buyer was matched it says so
   * instead of rendering nothing — on a finance list, an unmatched sale is a fact
   * an operator should be able to see.
   */
  const columns: DataColumn<TransactionRow>[] = [
    {
      key: "date",
      header: "Date",
      card: "meta",
      figure: true,
      cell: (row) => formatDate(row.timestamp),
    },
    {
      key: "description",
      header: "Description",
      card: "title",
      cell: (row) => row.description,
    },
    {
      key: "buyer",
      header: "Buyer",
      card: "subtitle",
      cell: (row) => row.buyer ?? "--",
    },
    {
      key: "amount",
      header: "Amount",
      card: "mark",
      figure: true,
      align: "end",
      cell: (row) => (
        <span className="font-mono text-sm font-semibold text-ink">
          {formatAmount(row.amount, row.currency)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      card: "mark",
      cell: (row) => (
        <StatusBadge status={row.status} refundedAmount={row.refundedAmount} />
      ),
    },
  ];

  const rows = transactions.map((txn) =>
    rowOfTransaction(txn, buyerMap[txn.transaction_code ?? ""] ?? null)
  );

  if (loading && transactions.length === 0) {
    /* Five is a literal and stands for nothing. A placeholder on a money surface
       that appeared to know how many rows are coming would be claiming to know
       something about money before anything has been read. */
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-6 text-center"
      >
        <p className="text-sm font-semibold text-sem-crit">
          The transactions could not be read.
        </p>
        {/* The cause, kept and shown. This repository has no error tracking, so
            a cause that is not on screen is a cause nobody will ever see. */}
        <p className="mt-2 text-sm text-ink-2">{error}</p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-4"
          onClick={() => fetchTransactions({})}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Member search */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 basis-64">
          <Input
            id="transaction-member-search"
            label="Search member purchases"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Member name..."
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={searchLoading || searchQuery.trim().length < 2}
        >
          {searchLoading ? "..." : "Search"}
        </Button>
        {isSearchMode && (
          <Button variant="secondary" onClick={clearSearch}>
            Clear
          </Button>
        )}
      </div>

      {isSearchMode ? (
        <div className="mb-6">
          {searchLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <Card className="text-center text-sm text-muted">
              No purchases found for &quot;{searchQuery}&quot;
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted">{searchResults.length} purchase(s) found</p>
              {/* The second whole rendering. It is still hand-written and still
                  carries its own copy of how an amount and a date are written —
                  the drift this file's primitive exists to prevent, surviving
                  one task longer because removing it is task 2's job and not
                  this one's. */}
              {searchResults.map((result, i) => (
                <Card key={`${result.id}-${i}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{result.memberName}</p>
                        <Badge>{result.type === "ticket" ? "Ticket" : "Drinks"}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted">{result.memberEmail}</p>
                      <p className="mt-1 text-xs text-muted">
                        {result.eventTitle} &middot; {result.description}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(result.purchaseDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="font-mono text-sm font-semibold text-ink">{result.currency} {result.amount.toFixed(2)}</p>
                      <StatusBadge status={result.status === "COMPLETED" ? "SUCCESSFUL" : result.status} />
                    </div>
                  </div>
                  {result.transactionCode && result.status !== "REFUNDED" && (
                    <div className="mt-3 border-t border-line pt-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setRefundTarget({
                            transaction_code: result.transactionCode!,
                            amount: result.amount,
                            refunded_amount: 0,
                            currency: result.currency,
                          });
                        }}
                      >
                        Refund
                      </Button>
                    </div>
                  )}
                  {!result.transactionCode && (
                    <p className="mt-2 text-xs italic text-muted">Transaction code unavailable -- refund via SumUp dashboard</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Filters.

          The small-tier prefix is mapped rather than renamed: the row stacks
          below the tier boundary and becomes a row above it, at the boundary the
          shell and the navigation column both use. It is also allowed to wrap
          there, because above that boundary the navigation column has taken
          224px and four controls in a row would otherwise run past the edge. */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <Input
          id="transaction-date-from"
          label="From"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          id="transaction-date-to"
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        {/* The select had no accessible name at all — it was announced as a
            listbox and nothing else. The label is visible, which is this tree's
            convention, and it is what the two date fields already had. */}
        <Select
          id="transaction-status-filter"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="SUCCESSFUL">Successful</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
        {/* The apply control carried an accent fill with white ink, which
            computes at 2.91:1 — below the small-text minimum. The button
            ladder's primary rung is the same fill with the ink that computes at
            6.85:1 on it. */}
        <Button onClick={handleApplyFilters} disabled={loading}>
          Apply
        </Button>
      </div>

      {/* One array, one column declaration, two trees. The switch was at 1024px
          here and is 768px in one place now, and this file no longer names a
          breakpoint for the table at all.

          Which facts survive on a phone is the judgement made here rather than
          by the layout: the DESCRIPTION is the card's title, the BUYER its
          subtitle, the AMOUNT and the STATUS the two marks opposite them — the
          money first, and the status word under it — and the DATE a labelled
          detail underneath. Nothing is dropped. */}
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        caption="Transactions, with the amount and the payment status of each"
        empty="No transactions found"
        expansion={{
          isExpanded: (row) => expandedId === row.code,
          onToggle: (row) => toggleExpanded(row.code),
          render: (row) => (
            <TransactionDetailInline
              detail={detailCache[row.code]}
              isLoading={detailLoading === row.code}
              txn={row.item}
              onRefundClick={() => setRefundTarget(row.item)}
            />
          ),
          // The disclosure names the ROW, not the column: a column of controls
          // all called "details" names nothing, and the row here is a payment.
          label: (row) =>
            `Details for ${row.description}, ${formatAmount(row.amount, row.currency)}`,
        }}
      />

      {/* Pagination controls.

          The primitive declines pagination by name, so the cursor stack and its
          two handlers stay here and were not edited. Only the two pills moved
          onto the button ladder. */}
      {transactions.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={handlePrevPage}
            disabled={cursorStack.length === 0 || loading}
          >
            Prev
          </Button>
          <span className="text-xs text-muted">
            Page {cursorStack.length + 1}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleNextPage}
            disabled={!hasMore || loading}
          >
            Next
          </Button>
        </div>
      )}
      </>
      )}

      {refundTarget && refundTarget.transaction_code && (
        <RefundDialog
          transactionCode={refundTarget.transaction_code}
          transactionAmount={refundTarget.amount ?? 0}
          refundedAmount={refundTarget.refunded_amount ?? 0}
          feeAmount={isSearchMode ? 0 : (detailCache[refundTarget.transaction_code]?.fee_amount ?? 0)}
          payoutDate={isSearchMode ? null : (detailCache[refundTarget.transaction_code]?.payout_date ?? null)}
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
