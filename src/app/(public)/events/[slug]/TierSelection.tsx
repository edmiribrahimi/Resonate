"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { purchaseTicket } from "@/app/(organizer)/organizer/events/actions";
import PressableButton from "@/components/motion/PressableButton";
import SumUpCheckoutModal from "./SumUpCheckoutModal";

interface Tier {
  id: string;
  name: string;
  price: number;
  quantity: number | null;
  sold: number;
  available: number | null;
  show_remaining?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
}

type TierStatus = "coming_soon" | "available" | "sold_out" | "expired";

interface TierSelectionProps {
  partyId: string | null;
  tiers: Tier[];
  label?: string;
  isAuthenticated?: boolean;
  eventSlug?: string;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

/**
 * Compute chain-based status for each tier.
 * Tiers are sorted by price ascending. Each tier activates only
 * when all cheaper tiers are sold_out or expired.
 */
function computeTierStatuses(tiers: Tier[]): TierStatus[] {
  const sorted = [...tiers].sort((a, b) => a.price - b.price);
  const now = new Date();
  const statusMap = new Map<string, TierStatus>();

  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];

    // 1. Explicit starts_at not yet reached
    if (tier.starts_at && now < new Date(tier.starts_at)) {
      statusMap.set(tier.id, "coming_soon");
      continue;
    }

    // 2. Sold out (only if quantity is set)
    if (tier.available !== null && tier.available <= 0) {
      statusMap.set(tier.id, "sold_out");
      continue;
    }

    // 3. Expired
    if (tier.expires_at && now >= new Date(tier.expires_at)) {
      statusMap.set(tier.id, "expired");
      continue;
    }

    // 4. Previous tier (by price) still active → this one waits
    const prevTier = i > 0 ? sorted[i - 1] : null;
    if (prevTier) {
      const prevStatus = statusMap.get(prevTier.id)!;
      if (prevStatus !== "sold_out" && prevStatus !== "expired") {
        statusMap.set(tier.id, "coming_soon");
        continue;
      }
    }

    // 5. Available
    statusMap.set(tier.id, "available");
  }

  // Return statuses in the original tier order
  return tiers.map((t) => statusMap.get(t.id)!);
}

function statusLabel(status: TierStatus): string {
  switch (status) {
    case "coming_soon": return "Coming soon";
    case "available": return "Available";
    case "sold_out": return "Sold out";
    case "expired": return "Expired";
  }
}

function statusBadgeClasses(status: TierStatus): string {
  switch (status) {
    case "coming_soon": return "bg-blue-500/20 text-blue-400";
    case "available": return "bg-green-500/20 text-green-400";
    case "sold_out": return "bg-red-500/20 text-red-400";
    case "expired": return "bg-zinc-500/20 text-zinc-400";
  }
}

/**
 * Countdown timer for a given target date.
 */
function useCountdown(targetDate: Date | null) {
  const calcRemaining = useCallback(() => {
    if (!targetDate) return null;
    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds };
  }, [targetDate]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    if (!targetDate) return;
    setRemaining(calcRemaining());
    const interval = setInterval(() => {
      const r = calcRemaining();
      setRemaining(r);
      if (!r) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate, calcRemaining]);

  return remaining;
}

function CountdownDisplay({ targetDate }: { targetDate: Date }) {
  const remaining = useCountdown(targetDate);

  if (!remaining) return null;

  const parts: string[] = [];
  if (remaining.days > 0) parts.push(`${remaining.days}d`);
  if (remaining.hours > 0 || remaining.days > 0) parts.push(`${remaining.hours}h`);
  parts.push(`${remaining.minutes}m`);
  parts.push(`${String(remaining.seconds).padStart(2, "0")}s`);

  return (
    <span className="text-xs text-amber-400 tabular-nums" suppressHydrationWarning>
      {parts.join(" ")}
    </span>
  );
}

export default function TierSelection({ partyId, tiers, label, isAuthenticated = true, eventSlug }: TierSelectionProps) {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Re-render every 60s to recompute statuses (beyond the countdown timer)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const statuses = computeTierStatuses(tiers);

  // Find the currently available tier's expires_at for the countdown
  const availableTierIndex = statuses.findIndex((s) => s === "available");
  const availableTier = availableTierIndex >= 0 ? tiers[availableTierIndex] : null;
  const countdownTarget = availableTier?.expires_at ? new Date(availableTier.expires_at) : null;

  function handlePurchase() {
    if (!selectedTierId) return;
    setError(null);

    // Anonymous user: save intent and redirect to register
    if (!isAuthenticated) {
      localStorage.setItem(
        "resonate_intent",
        JSON.stringify({ type: "purchase", tierId: selectedTierId, partyId, eventSlug })
      );
      window.location.href = `/register?next=/events/${eventSlug}`;
      return;
    }

    startTransition(async () => {
      try {
        const result = await purchaseTicket(partyId, selectedTierId);
        if (result.success && result.checkoutId) {
          setCheckoutId(result.checkoutId);
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
        {label ?? "Get Your Ticket"}
      </h2>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {countdownTarget && countdownTarget.getTime() > Date.now() && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 mb-3">
          <span className="text-xs text-muted">Offer ends in</span>
          <CountdownDisplay targetDate={countdownTarget} />
        </div>
      )}

      <div className="space-y-2 mb-4">
        {tiers.map((tier, i) => {
          const status = statuses[i];
          const isDisabled = status !== "available";
          const isSelected = selectedTierId === tier.id;

          return (
            <button
              key={tier.id}
              type="button"
              disabled={isDisabled || isPending}
              onClick={() => setSelectedTierId(tier.id)}
              className={`w-full rounded-xl border p-4 text-left transition-all active:scale-[0.98] active:opacity-80 ${
                isDisabled
                  ? "border-card-border bg-card/50 opacity-50 cursor-not-allowed"
                  : isSelected
                    ? "border-accent bg-accent/10"
                    : "border-card-border bg-card hover:border-accent/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {tier.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClasses(status)}`}>
                      {statusLabel(status)}
                    </span>
                    {status === "available" && tier.show_remaining !== false && tier.available !== null && (
                      <span className="text-xs text-muted">
                        {tier.available} available
                      </span>
                    )}
                  </div>
                </div>
                <p className="shrink-0 text-sm font-bold text-accent">
                  {formatPrice(tier.price)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <PressableButton
        disabled={!selectedTierId || isPending}
        onClick={handlePurchase}
        className="w-full rounded-full bg-accent py-3 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Processing..." : label ? `Buy ${label}` : "Buy Ticket"}
      </PressableButton>

      {checkoutId && (
        <SumUpCheckoutModal
          checkoutId={checkoutId}
          onClose={() => setCheckoutId(null)}
          onPaymentComplete={() => {
            setCheckoutId(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
