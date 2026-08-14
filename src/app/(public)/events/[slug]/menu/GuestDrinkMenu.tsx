"use client";

import { useState, useEffect, useTransition } from "react";

import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";
import type { DrinkItem } from "@/types/database";

import SumUpCheckoutModal from "../SumUpCheckoutModal";
import { purchaseDrinksGuest, claimGuestOrders } from "./actions";
// Pre-checkout login/signup prompt temporarily disabled — re-enable by
// restoring `usePathname`/`useRouter`, the showWarning state, and
// the <GuestWarningModal /> render with its handlers.
// import { usePathname, useRouter } from "next/navigation";
// import { GuestWarningModal } from "./GuestLoginBanner";

/**
 * The menu a person buys a drink from without an account.
 *
 * ── The double-sided minimum does not move ───────────────────────────────────
 *
 * The provider refuses a checkout below a floor, and this file refuses first so
 * that a guest is never sent to a checkout that will reject them. Both sides are
 * deliberate: `actions.ts` re-computes the total from the catalogue and applies
 * the same floor server-side, because the price that counts is the one the
 * server calculates. The comparison, its value and the sentence that accompanies
 * it are byte-identical, and they are quoted before and after in this plan's
 * SUMMARY — changing any of the three would be a behaviour change on the
 * purchase path.
 *
 * ── The claim of a guest's paid orders is RECORDED, not repaired ─────────────
 *
 * When a guest who has already paid signs in, their orders are claimed onto the
 * new account. Every failure of that claim — network, server, an order that no
 * longer resolves — lands in one empty `catch`, and the enclosing `try` swallows
 * a second class on top of it. A guest who paid, then signed in, silently keeps
 * unclaimed orders: **nothing tells them and nothing tells us**, and this
 * repository has no error tracking, so it reaches a human only when somebody
 * says so at the bar.
 *
 * It carries an entry at `file:line` in this phase's `deferred-items.md`,
 * written in wave 0, routed to a plan that owns what a buyer is told when a
 * purchase fails. **Repairing it here would be a behaviour change on the money
 * path under a visual mandate**, and a fix is not a wider `catch` — it is a
 * decision about what a guest sees. Untouched, byte-identical, on purpose.
 *
 * ── No payload moves ─────────────────────────────────────────────────────────
 *
 * Two server actions are called from here and both carry the same arguments in
 * the same order as before. No status transition, no amount, no idempotency key
 * and no webhook path is written, read or reshaped by this file. `actions.ts`
 * was **read** so a rendering change could be told from a payload change, and it
 * was not edited.
 *
 * ── The disabled sign-in prompt stays disabled ───────────────────────────────
 *
 * The import of the disabled sign-in prompt and its render are both commented
 * out in this file, and this conversion re-enables neither. Neither name is
 * spelled in this paragraph on purpose: a docblock that writes the needle
 * inflates the very census that exists to measure it, which is the defect
 * `RefundRequestButton.tsx` recorded in wave 0 of this phase. A visual pass that
 * switched a guest feature back on would have shipped a decision nobody took.
 */

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
      <SectionHeading className="mb-3">Drink list</SectionHeading>

      {/*
        Announced rather than merely tinted. It was a red-tinted box with no
        role, which said nothing at all to a person not looking straight at it —
        and the refusals that land here include the checkout minimum and
        whatever the purchase action threw. The sentence is unchanged; only its
        boundary and its ink are.
      */}
      {error && (
        <p role="alert" className="mb-3 text-sm text-sem-crit">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {drinks.map((drink) => {
          const qty = quantities[drink.id] ?? 0;
          return (
            /*
              The padding is written on the two axes rather than as one value:
              the shell's own `p-6` is emitted AFTER a shorter `p-4` in the
              sheet and would win, which is the named-value ordering defect
              `Skeleton.tsx:60-81` records. The density of a two-column menu on
              a phone is the caller's.
            */
            <Card key={drink.id} className="flex flex-col px-4 py-4">
              <div className="min-w-0 flex-1 text-center">
                <p className="whitespace-pre-line text-base font-semibold text-ink">
                  {drink.name}
                </p>
                <p className="mt-0.5 text-lg font-bold text-accent">
                  {formatPrice(drink.price)}
                </p>
              </div>

              {/*
                Quantity selector. Both steppers were 32px squares; on the
                shared icon rung they are 44×44, which is the floor a thumb
                needs at a counter, in the dark, one-handed. The accessible
                names are the ones that were here.
              */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <IconButton
                  variant="secondary"
                  onClick={() => updateQuantity(drink.id, -1)}
                  disabled={qty <= 0}
                  aria-label={`Decrease ${drink.name}`}
                >
                  -
                </IconButton>
                <span className="w-6 text-center text-sm font-medium text-ink tabular-nums">
                  {qty}
                </span>
                <IconButton
                  variant="secondary"
                  onClick={() => updateQuantity(drink.id, 1)}
                  disabled={qty >= 10}
                  aria-label={`Increase ${drink.name}`}
                >
                  +
                </IconButton>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Order summary bar */}
      {totalItems > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-2">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </span>
            <span className="font-semibold text-ink">
              {formatPrice(totalPrice)}
            </span>
          </div>

          <Button className="w-full" onClick={handleOrder} disabled={isPending}>
            {isPending ? "Processing..." : "Order Drinks"}
          </Button>
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
