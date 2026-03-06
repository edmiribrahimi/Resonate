"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { purchaseDrinksGuest } from "./actions";
import type { DrinkItem } from "@/types/database";
import SumUpCheckoutModal from "../SumUpCheckoutModal";
import { GuestWarningModal } from "./GuestLoginBanner";

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const STORAGE_KEY_PREFIX = "resonate_drink_tokens";

function storeGuestOrder(eventId: string, orderId: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
    const existing = JSON.parse(
      localStorage.getItem(key) || "[]"
    ) as string[];
    if (!existing.includes(orderId)) {
      existing.push(orderId);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch {
    /* localStorage unavailable */
  }
}

interface GuestDrinkMenuProps {
  eventId: string;
  drinks: DrinkItem[];
}

export default function GuestDrinkMenu({
  eventId,
  drinks,
}: GuestDrinkMenuProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pendingCheckoutId, setPendingCheckoutId] = useState<string | null>(
    null
  );
  const [showWarning, setShowWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pathname = usePathname();
  const slug = pathname.split("/")[2] || "";

  function updateQuantity(drinkId: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[drinkId] ?? 0;
      const next = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [drinkId]: next };
    });
  }

  const totalItems = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalPrice = drinks.reduce(
    (sum, d) => sum + d.price * (quantities[d.id] ?? 0),
    0
  );

  function handleOrder() {
    setError(null);
    const items = drinks
      .filter((d) => (quantities[d.id] ?? 0) > 0)
      .map((d) => ({ drinkItemId: d.id, quantity: quantities[d.id] }));

    if (items.length === 0) return;

    startTransition(async () => {
      try {
        const result = await purchaseDrinksGuest(eventId, items);
        if (result.success && result.checkoutId) {
          setOrderId(result.orderId);
          setPendingCheckoutId(result.checkoutId);
          setShowWarning(true);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initiate purchase"
        );
      }
    });
  }

  function handleWarningContinue() {
    setShowWarning(false);
    if (pendingCheckoutId) {
      setCheckoutId(pendingCheckoutId);
      setPendingCheckoutId(null);
    }
  }

  function handleWarningClose() {
    setShowWarning(false);
    setPendingCheckoutId(null);
    setOrderId(null);
  }

  function handlePaymentComplete() {
    setCheckoutId(null);

    if (orderId) {
      // Store in localStorage
      storeGuestOrder(eventId, orderId);

      // Update URL with order param
      window.history.replaceState({}, "", `?order=${orderId}`);

      // Dispatch custom event for GuestTokenDisplay
      window.dispatchEvent(
        new CustomEvent("guestOrderComplete", { detail: { orderId } })
      );
    }

    // Reset quantities
    setQuantities({});
    setOrderId(null);
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
        Drinks
      </h2>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {drinks.map((drink) => {
          const qty = quantities[drink.id] ?? 0;
          return (
            <div
              key={drink.id}
              className="flex items-center justify-between rounded-xl border border-card-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {drink.name}
                </p>
                <p className="text-sm text-accent font-semibold">
                  {formatPrice(drink.price)}
                </p>
              </div>

              {/* Quantity selector */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(drink.id, -1)}
                  disabled={qty <= 0}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-card-border text-foreground transition-colors hover:border-accent/50 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label={`Decrease ${drink.name}`}
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-medium text-foreground tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(drink.id, 1)}
                  disabled={qty >= 10}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-card-border text-foreground transition-colors hover:border-accent/50 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label={`Increase ${drink.name}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order summary bar */}
      {totalItems > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </span>
            <span className="font-semibold text-foreground">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOrder}
            disabled={isPending}
            className="w-full rounded-full bg-accent py-3 font-medium text-white transition-all hover:bg-accent-hover active:scale-95 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Processing..." : "Order Drinks"}
          </button>
        </div>
      )}

      {/* Pre-checkout warning modal */}
      {showWarning && (
        <GuestWarningModal
          onContinue={handleWarningContinue}
          onClose={handleWarningClose}
          slug={slug}
        />
      )}

      {/* SumUp checkout modal */}
      {checkoutId && (
        <SumUpCheckoutModal
          checkoutId={checkoutId}
          onClose={() => {
            setCheckoutId(null);
            setOrderId(null);
          }}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
