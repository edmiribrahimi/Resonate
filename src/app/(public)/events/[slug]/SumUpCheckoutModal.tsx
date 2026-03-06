"use client";

import { useState, useCallback, useEffect } from "react";
import { SumUpCardWidget } from "@/components/SumUpCardWidget";

interface SumUpCheckoutModalProps {
  checkoutId: string;
  onClose: () => void;
  onPaymentComplete: () => void;
}

type ModalStatus = "loading" | "ready" | "success" | "error";

export default function SumUpCheckoutModal({
  checkoutId,
  onClose,
  onPaymentComplete,
}: SumUpCheckoutModalProps) {
  const [status, setStatus] = useState<ModalStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoad = useCallback(() => {
    setStatus("ready");
  }, []);

  const handleSuccess = useCallback(
    (_body: Record<string, unknown>) => {
      setStatus("success");
    },
    []
  );

  const handleError = useCallback((body: Record<string, unknown>) => {
    setStatus("error");
    setErrorMessage(
      (body.message as string) || (body.error as string) || "Payment failed. Please try again."
    );
  }, []);

  // Auto-complete after success
  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => {
      onPaymentComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [status, onPaymentComplete]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card p-6 pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))] sm:pb-6 sm:max-h-[90vh]">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {status === "success" ? "Payment Successful" : "Complete Payment"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-card-border transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {status === "loading" && (
          <p className="text-sm text-muted">Loading payment form...</p>
        )}

        {status === "success" && (
          <div className="text-center py-4">
            <p className="text-lg font-medium text-green-400">
              Payment received!
            </p>
            <p className="mt-1 text-sm text-muted">
              Your ticket is being confirmed...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Card Widget: render when not in success state */}
        {status !== "success" && (
          <div className={status === "loading" ? "mt-4" : ""}>
            <SumUpCardWidget
              checkoutId={checkoutId}
              onSuccess={handleSuccess}
              onError={handleError}
              onLoad={handleLoad}
            />
          </div>
        )}

        {/* Error: close button to dismiss */}
        {status === "error" && (
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-full bg-card-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card-border/80"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
