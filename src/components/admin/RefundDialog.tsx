"use client";

import { useState, useTransition } from "react";
import { refundTransactionAction } from "@/app/(admin)/admin/finance/actions";

interface RefundDialogProps {
  transactionCode: string;
  transactionAmount: number;
  refundedAmount: number;
  feeAmount: number;
  payoutDate?: string | null;
  currency: string;
  onClose: () => void;
  onRefundComplete: (amount: number, isFullRefund: boolean) => void;
}

export default function RefundDialog({
  transactionCode,
  transactionAmount,
  refundedAmount,
  feeAmount,
  payoutDate,
  currency,
  onClose,
  onRefundComplete,
}: RefundDialogProps) {
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [customAmount, setCustomAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const maxRefundable = transactionAmount - refundedAmount;
  const refundAmount =
    refundType === "full" ? maxRefundable : parseFloat(customAmount) || 0;
  const isFullRefund =
    refundType === "full" || refundAmount >= maxRefundable;
  const isValidAmount =
    refundType === "full" ||
    (refundAmount > 0 && refundAmount <= maxRefundable);

  function handleConfirm() {
    if (!isValidAmount) return;
    setError(null);
    startTransition(async () => {
      try {
        // For full refund, pass undefined (no amount param = SumUp refunds entire transaction)
        // For partial refund, pass the specific amount
        await refundTransactionAction(
          transactionCode,
          isFullRefund ? undefined : refundAmount
        );
        onRefundComplete(refundAmount, isFullRefund);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refund failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-card-border bg-background p-6">
        <h3 className="mb-4 text-lg font-bold">Confirm Refund</h3>

        {/* Transaction summary */}
        <div className="mb-4 rounded-xl border border-card-border bg-card/50 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Original amount</span>
            <span className="font-medium">
              {currency} {transactionAmount.toFixed(2)}
            </span>
          </div>
          {refundedAmount > 0 && (
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-muted">Already refunded</span>
              <span className="font-medium text-orange-400">
                {currency} {refundedAmount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted">Refundable</span>
            <span className="font-medium text-green-400">
              {currency} {maxRefundable.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Full/Partial toggle -- two radio-style buttons */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setRefundType("full")}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
              refundType === "full"
                ? "bg-accent text-white"
                : "border border-card-border text-muted hover:text-foreground"
            }`}
          >
            Full Refund
          </button>
          <button
            type="button"
            onClick={() => setRefundType("partial")}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
              refundType === "partial"
                ? "bg-accent text-white"
                : "border border-card-border text-muted hover:text-foreground"
            }`}
          >
            Partial Refund
          </button>
        </div>

        {/* Custom amount input (only shown for partial) */}
        {refundType === "partial" && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-muted">
              Refund amount ({currency})
            </label>
            <input
              type="number"
              min="0.01"
              max={maxRefundable}
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`Max ${maxRefundable.toFixed(2)}`}
              className="w-full rounded-xl border border-card-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            {customAmount && !isValidAmount && (
              <p className="mt-1 text-xs text-red-400">
                Amount must be between 0.01 and {maxRefundable.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Fee warning -- only shown when payout already processed */}
        {payoutDate && feeAmount > 0 && (
          <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
            <p className="text-xs text-yellow-400">
              SumUp fee of {currency} {feeAmount.toFixed(2)} is non-refundable
              (payout already processed).
            </p>
          </div>
        )}

        {/* Error message */}
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {/* Refund amount summary before confirm */}
        <p className="mb-4 text-center text-sm text-muted">
          Refunding{" "}
          <span className="font-bold text-foreground">
            {currency} {refundAmount.toFixed(2)}
          </span>
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-full border border-card-border py-2.5 text-sm font-medium text-muted transition-all hover:text-foreground active:scale-95 active:opacity-80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || !isValidAmount}
            className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-95 active:opacity-80 disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Confirm Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
