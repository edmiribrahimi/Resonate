"use client";

import { useState } from "react";
import RedeemConfirmationModal from "./RedeemConfirmationModal";

interface DrinkTokenCardProps {
  token: {
    id: string;
    drink_name: string;
    price: number;
    token: string;
    status: "purchased" | "redeemed" | "refunded";
    created_at?: string;
    redeemed_at: string | null;
    refunded_at?: string | null;
  };
  onRedeemed: (tokenId: string) => void;
  showTimestamps?: boolean;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DrinkTokenCard({ token, onRedeemed, showTimestamps }: DrinkTokenCardProps) {
  const [showModal, setShowModal] = useState(false);

  if (token.status === "redeemed") {
    return (
      <div className="rounded-xl border border-card-border bg-card p-4 opacity-60">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {token.drink_name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {formatPrice(token.price)}
            </p>
          </div>
          <span className="shrink-0 text-green-400 text-lg" aria-label="Redeemed">
            &#10003;
          </span>
        </div>
        {showTimestamps && (
          <div className="mt-2 space-y-0.5">
            {token.created_at && (
              <p className="text-xs text-muted">
                Purchased: {formatTime(token.created_at)}
              </p>
            )}
            {token.redeemed_at && (
              <p className="text-xs text-muted">
                Redeemed: {formatTime(token.redeemed_at)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (token.status === "refunded") {
    return (
      <div className="rounded-xl border border-card-border bg-card p-4 opacity-60">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {token.drink_name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {formatPrice(token.price)}
            </p>
          </div>
          <span className="shrink-0 text-blue-400 text-xs font-medium" aria-label="Refunded">
            Refunded
          </span>
        </div>
        {showTimestamps && (
          <div className="mt-2 space-y-0.5">
            {token.created_at && (
              <p className="text-xs text-muted">
                Purchased: {formatTime(token.created_at)}
              </p>
            )}
            {token.refunded_at && (
              <p className="text-xs text-muted">
                Refunded: {formatTime(token.refunded_at)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-4">
        <p className="text-sm font-medium text-foreground truncate">
          {token.drink_name}
        </p>
        <p className="mt-0.5 text-sm text-accent font-semibold">
          {formatPrice(token.price)}
        </p>
        {showTimestamps && token.created_at && (
          <p className="mt-1 text-xs text-muted">
            Purchased: {formatTime(token.created_at)}
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="mt-3 w-full rounded-full bg-accent py-2.5 font-medium text-white transition-all active:scale-95 active:opacity-80"
        >
          Redeem
        </button>
      </div>

      {showModal && (
        <RedeemConfirmationModal
          drinkName={token.drink_name}
          signedToken={token.token}
          onClose={() => setShowModal(false)}
          onRedeemed={() => {
            onRedeemed(token.id);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
