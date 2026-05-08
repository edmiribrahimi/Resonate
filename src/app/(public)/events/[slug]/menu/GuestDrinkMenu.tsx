"use client";

import { useState, useEffect, useTransition } from "react";
import { purchaseDrinksGuest, claimGuestOrders } from "./actions";
import type { DrinkItem } from "@/types/database";
import SumUpCheckoutModal from "../SumUpCheckoutModal";
// Pre-checkout login/signup prompt temporarily disabled — re-enable by
// restoring `usePathname`/`useRouter`, the showWarning state, and
// the <GuestWarningModal /> render with its handlers.
// import { usePathname, useRouter } from "next/navigation";
// import { GuestWarningModal } from "./GuestLoginBanner";

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const STORAGE_KEY_PREFIX = "resonate_drink_tokens";
const CART_STORAGE_KEY = "resonate_drink_cart";

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
  partyId: string;
  drinks: DrinkItem[];
  isAuthenticated?: boolean;
}

export default function GuestDrinkMenu({
  eventId,
  partyId,
  drinks,
  isAuthenticated = false,
}: GuestDrinkMenuProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Claim guest tokens after login/register
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return;
      const orderIds = JSON.parse(stored) as string[];
      if (orderIds.length === 0) return;
      claimGuestOrders(orderIds)
        .then(() => localStorage.removeItem(key))
        .catch(() => {});
    } catch {
      /* localStorage unavailable */
    }
  }, [isAuthenticated, eventId]);

  // Restore cart from localStorage after login redirect and auto-checkout
  const [autoCheckout, setAutoCheckout] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${CART_STORAGE_KEY}_${eventId}`);
      if (saved) {
        const savedQuantities = JSON.parse(saved) as Record<string, number>;
        localStorage.removeItem(`${CART_STORAGE_KEY}_${eventId}`);
        const hasItems = Object.values(savedQuantities).some((q) => q > 0);
        if (hasItems) {
          setQuantities(savedQuantities);
          setAutoCheckout(true);
        }
      }
    } catch {
      /* localStorage unavailable */
    }
  }, [eventId]);

  // Trigger checkout once quantities are set from restored cart
  useEffect(() => {
    if (autoCheckout && Object.values(quantities).some((q) => q > 0)) {
      setAutoCheckout(false);
      startCheckout();
    }
  }, [autoCheckout]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function startCheckout() {
    const items = drinks
      .filter((d) => (quantities[d.id] ?? 0) > 0)
      .map((d) => ({ drinkItemId: d.id, quantity: quantities[d.id] }));

    startTransition(async () => {
      try {
        const result = await purchaseDrinksGuest(eventId, partyId, items);
        if (result.success && result.checkoutId) {
          setOrderId(result.orderId);
          setCheckoutId(result.checkoutId);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initiate purchase"
        );
      }
    });
  }

  function handleOrder() {
    setError(null);
    const items = drinks
      .filter((d) => (quantities[d.id] ?? 0) > 0)
      .map((d) => ({ drinkItemId: d.id, quantity: quantities[d.id] }));

    if (items.length === 0) return;

    if (totalPrice < 1) {
      setError("Minimum order amount is €1.00");
      return;
    }

    // Pre-checkout login/signup prompt is temporarily disabled: every order
    // (auth or guest) goes straight to SumUp checkout. Re-introduce the
    // `if (!isAuthenticated) setShowWarning(true)` branch when the prompt
    // and its handlers (handleWarningContinue/Login/SignUp/Close) are restored.
    startCheckout();
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
        Drink list
      </h2>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {drinks.map((drink) => {
          const qty = quantities[drink.id] ?? 0;
          return (
            <div
              key={drink.id}
              className="flex flex-col rounded-xl border border-card-border bg-card p-4"
            >
              <div className="min-w-0 flex-1 text-center">
                <p className="whitespace-pre-line text-base font-semibold text-foreground">
                  {drink.name}
                </p>
                <p className="mt-0.5 text-lg font-bold text-accent">
                  {formatPrice(drink.price)}
                </p>
              </div>

              {/* Quantity selector */}
              <div className="mt-3 flex items-center justify-center gap-2">
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

      {/* Pre-checkout warning modal temporarily disabled */}
      {/* {showWarning && (
        <GuestWarningModal
          onContinue={handleWarningContinue}
          onClose={handleWarningClose}
          onLogin={handleWarningLogin}
          onSignUp={handleWarningSignUp}
          slug={slug}
        />
      )} */}

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
