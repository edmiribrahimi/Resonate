"use client";

import { useState, useTransition } from "react";
import { purchaseDrinks } from "@/app/(admin)/admin/events/actions";
import { StaggeredList, StaggeredItem } from "@/components/motion/StaggeredList";
import PressableButton from "@/components/motion/PressableButton";
import type { DrinkItem } from "@/types/database";
import SumUpCheckoutModal from "./SumUpCheckoutModal";

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

interface DrinkMenuProps {
  eventId: string;
  partyId: string;
  drinks: DrinkItem[];
}

export default function DrinkMenu({ eventId, partyId, drinks }: DrinkMenuProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        const result = await purchaseDrinks(eventId, partyId, items);
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
        Drinks
      </h2>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <StaggeredList className="space-y-2 mb-4">
        {drinks.map((drink) => {
          const qty = quantities[drink.id] ?? 0;
          return (
            <StaggeredItem
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
            </StaggeredItem>
          );
        })}
      </StaggeredList>

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
          <PressableButton
            onClick={handleOrder}
            disabled={isPending}
            className="w-full rounded-full bg-accent py-3 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Processing..." : "Order Drinks"}
          </PressableButton>
        </div>
      )}

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
