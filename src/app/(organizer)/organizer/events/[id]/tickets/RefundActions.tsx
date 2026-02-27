"use client";

import { useState, useTransition } from "react";
import { approveRefund, rejectRefund, adminRefund } from "@/app/(public)/tickets/refund-actions";

interface RefundActionsProps {
  refundId?: string;
  ticketId?: string;
  isDirectRefund?: boolean;
}

export default function RefundActions({ refundId, ticketId, isDirectRefund }: RefundActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  if (done) {
    return (
      <span className="text-xs text-green-400 font-medium">Done</span>
    );
  }

  // Direct refund from ticket list
  if (isDirectRefund && ticketId) {
    return (
      <>
        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Refund
          </button>
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
            <div className="w-full max-w-sm rounded-2xl border border-card-border bg-background p-6">
              <h3 className="mb-4 text-lg font-bold">Confirm Refund</h3>
              <textarea
                placeholder="Reason (optional)"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={2}
                className="mb-4 w-full rounded-xl border border-card-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
              {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isPending}
                  className="flex-1 rounded-full border border-card-border py-2.5 text-sm font-medium text-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      try {
                        await adminRefund(ticketId, refundReason);
                        setDone(true);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed");
                      }
                    });
                  }}
                  className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isPending ? "Processing..." : "Refund"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Approve/reject pending refund request
  if (refundId) {
    return (
      <div>
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

        {showReject ? (
          <div className="space-y-2">
            <textarea
              placeholder="Reason for rejection (optional)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReject(false)}
                disabled={isPending}
                className="flex-1 rounded-full border border-card-border py-2 text-xs font-medium text-muted"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    try {
                      await rejectRefund(refundId, rejectNote);
                      setDone(true);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed");
                    }
                  });
                }}
                className="flex-1 rounded-full bg-red-500 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {isPending ? "..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await approveRefund(refundId);
                    setDone(true);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed");
                  }
                });
              }}
              className="flex-1 rounded-full bg-green-600 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {isPending ? "..." : "Approve"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowReject(true)}
              className="flex-1 rounded-full border border-red-500/30 py-2 text-xs font-medium text-red-400"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
