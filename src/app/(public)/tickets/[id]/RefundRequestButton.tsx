"use client";

import { useState, useTransition } from "react";
import { requestRefund } from "../refund-actions";

interface RefundRequestButtonProps {
  ticketId: string;
}

export default function RefundRequestButton({ ticketId }: RefundRequestButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await requestRefund(ticketId, reason);
        setSuccess(true);
        setShowDialog(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
        <p className="text-sm font-medium text-yellow-400">
          Refund request submitted
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDialog(true)}
        className="w-full rounded-full border border-card-border py-2.5 text-sm font-medium text-muted transition-all hover:border-red-500/50 hover:text-red-400 active:scale-95 active:opacity-80"
      >
        Request Refund
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-2xl border border-card-border bg-background p-6">
            <h3 className="mb-4 text-lg font-bold">Request Refund</h3>

            <textarea
              placeholder="Why do you want a refund? (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-xl border border-card-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />

            {error && (
              <p className="mb-3 text-sm text-red-400">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                disabled={isPending}
                className="flex-1 rounded-full border border-card-border py-2.5 text-sm font-medium text-muted transition-all hover:text-foreground active:scale-95 active:opacity-80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-95 active:opacity-80 disabled:opacity-50"
              >
                {isPending ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
