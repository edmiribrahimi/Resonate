"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { redeemDrinkToken } from "@/app/(organizer)/organizer/events/actions";

interface RedeemConfirmationModalProps {
  drinkName: string;
  signedToken: string;
  onClose: () => void;
  onRedeemed: () => void;
}

type Phase = "confirm" | "redeeming" | "served";

export default function RedeemConfirmationModal({
  drinkName,
  signedToken,
  onClose,
  onRedeemed,
}: RedeemConfirmationModalProps) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const servedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss SERVED after 3 seconds
  useEffect(() => {
    if (phase !== "served") return;

    servedTimerRef.current = setTimeout(() => {
      onRedeemed();
      onClose();
    }, 3000);

    return () => {
      if (servedTimerRef.current) clearTimeout(servedTimerRef.current);
    };
  }, [phase, onRedeemed, onClose]);

  const handleConfirm = useCallback(() => {
    setError(null);
    setPhase("redeeming");

    startTransition(async () => {
      try {
        await redeemDrinkToken(signedToken);
        setPhase("served");
      } catch (err) {
        setPhase("confirm");
        setError(
          err instanceof Error ? err.message : "Redemption failed. Please try again."
        );
      }
    });
  }, [signedToken, startTransition]);

  const handleServedTap = useCallback(() => {
    if (servedTimerRef.current) clearTimeout(servedTimerRef.current);
    onRedeemed();
    onClose();
  }, [onRedeemed, onClose]);

  // SERVED full-screen overlay
  if (phase === "served") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
        onClick={handleServedTap}
      >
        <div className="text-center">
          <p
            className="text-6xl font-bold text-accent"
            style={{
              animation: "servedScale 400ms ease-out forwards",
            }}
          >
            SERVED
          </p>
          <p className="mt-4 text-lg text-muted">{drinkName}</p>
        </div>
        <style>{`
          @keyframes servedScale {
            from {
              transform: scale(0.5);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6 pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))] sm:pb-6">
        {/* Close button */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Redeem Drink
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

        {/* Drink name */}
        <p className="mb-6 text-center text-xl font-semibold text-foreground">
          {drinkName}
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Confirm button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="w-full rounded-full py-3 px-8 font-semibold text-white transition-all bg-accent active:scale-95 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Redeeming...
            </span>
          ) : (
            "Confirm"
          )}
        </button>
      </div>
    </div>
  );
}
