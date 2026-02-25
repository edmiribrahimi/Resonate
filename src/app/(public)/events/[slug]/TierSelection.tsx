"use client";

import { useState, useTransition } from "react";
import { purchaseTicket } from "@/app/(organizer)/organizer/events/actions";

interface Tier {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  available: number;
}

interface TierSelectionProps {
  eventId: string;
  tiers: Tier[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export default function TierSelection({ eventId, tiers }: TierSelectionProps) {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePurchase() {
    if (!selectedTierId) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await purchaseTicket(eventId, selectedTierId);
        if (result.success && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initiate purchase"
        );
      }
    });
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
        Get Your Ticket
      </h2>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {tiers.map((tier) => {
          const isSoldOut = tier.available <= 0;
          const isSelected = selectedTierId === tier.id;

          return (
            <button
              key={tier.id}
              type="button"
              disabled={isSoldOut || isPending}
              onClick={() => setSelectedTierId(tier.id)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                isSoldOut
                  ? "border-card-border bg-card/50 opacity-50 cursor-not-allowed"
                  : isSelected
                    ? "border-accent bg-accent/10"
                    : "border-card-border bg-card hover:border-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {tier.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {isSoldOut
                      ? "Sold out"
                      : `${tier.available} available`}
                  </p>
                </div>
                <p className="text-sm font-bold text-accent">
                  {formatPrice(tier.price)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selectedTierId || isPending}
        onClick={handlePurchase}
        className="w-full rounded-full bg-accent py-3 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Processing..." : "Buy Ticket"}
      </button>
    </div>
  );
}
