"use client";

import { useState, useTransition, useEffect, useCallback, useId } from "react";
import { purchaseTicket } from "@/app/(admin)/admin/events/actions";
import { validateDiscountCode } from "@/app/(admin)/admin/events/[id]/tickets/actions";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/Typography";
import SumUpCheckoutModal from "./SumUpCheckoutModal";

/**
 * The surface that decides what a guest pays, on the design system.
 *
 * ── The money path is untouched, and that is the point of this conversion ────
 *
 * Two server actions are reachable from here and **both are called with the same
 * arguments, in the same order, as before**: the purchase takes the night, the
 * tier and the discount identifier; the validation takes the night and the typed
 * code. No status transition, no amount, no discount computation, no idempotency
 * key and no webhook path is written, read or reshaped by this file — it renders
 * controls and reports what an action returned or threw. Both action modules were
 * **read** so that a rendering change could be told from a payload change, and
 * neither was edited.
 *
 * The rule this inherits is `ticketing-payments.md`'s: the price that counts is
 * the one the server computes. The arithmetic below decides what a guest is
 * *shown* while choosing; it decides nothing about what is charged, and a
 * conversion that made this file a second author of that number would be a
 * behaviour change wearing a visual costume.
 *
 * ── Every validation attribute was proved unchanged, not eyeballed ───────────
 *
 * A diff read by eye shows what *moved*; it cannot show what was *dropped*,
 * because a dropped attribute produces a deletion that looks exactly like a
 * relocation. So the controls' attributes were extracted as a **sorted multiset
 * over comment-stripped source** before and after, with a raw count beside them
 * as a second instrument — the technique plan 41.1-22 established on the four
 * ticket components and recorded in the conversion manifest in its own words.
 *
 * ── The checkout panel is NOT opened here ────────────────────────────────────
 *
 * `SumUpCheckoutModal` was converted one wave earlier as spine, by plan 41.2-10,
 * precisely so that this plan and the bar's plans stayed separate plans instead
 * of being merged into one — 41.1-17's scheduling, applied again. Its mount
 * conditional and all three props it is given are byte-identical either side of
 * this diff.
 *
 * ── The one selectable control that stays a raw element, and why ─────────────
 *
 * A tier row is a full-width card in a single-select group. Neither pill rung
 * fits it: both `Button` and `Chip` declare a fully round radius, horizontal
 * padding, centred content and non-wrapping text, and defeating those from a
 * caller's class list would rely on class-list order — which Tailwind does not
 * honour, it resolves by source order. Delegating instead to the pressable card
 * would trade a `button` element for a `div`, taking keyboard operability and
 * the disabled state off the surface that decides what a guest pays.
 *
 * So the row stays a `button` and pays the contract **at the element**: the 44px
 * floor, the container radius, the imported focus expression, and semantic ink.
 * The colour-swatch picker under the format catalogue is the tree's converted
 * precedent for the same judgement — a selectable control kept as a raw element,
 * with the contract paid on it rather than around it.
 *
 * `aria-pressed` is the one behaviour this conversion adds, and it is declared
 * rather than slipped in: selection had exactly one channel before, a border
 * hue, which says nothing at all to a person who cannot see it. No wording, no
 * payload and no condition moves with it.
 */

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

/**
 * The four states carried one hue apiece — blue, green, red and grey.
 *
 * All four now take the neutral badge, and the loss is nothing: the state is
 * already **written** on the mark, and an unavailable row is already dimmed and
 * already refuses the press. Colour was the third channel, not the only one.
 *
 * D-41.1-25 refuses a tone per outcome, and the badge primitive says so in its
 * own words — the emphasis fill means *look here first*, it does not grade an
 * outcome. Wave 6 reached the same answer on this surface's sibling, where three
 * tinted marks went to one neutral badge for the same reason.
 */

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
    <span className="text-xs text-sem-warn tabular-nums" suppressHydrationWarning>
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

  // Discount code state
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<{
    id: string;
    discount_type: "percentage" | "fixed";
    discount_amount: number;
    applicable_tier_ids: string[] | null;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const discountCodeId = useId();

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

  function computeDiscountedPrice(price: number, disc: NonNullable<typeof discount>): number {
    if (disc.discount_type === "percentage") {
      return Math.round(price * (1 - disc.discount_amount / 100) * 100) / 100;
    }
    return Math.round((price - disc.discount_amount) * 100) / 100;
  }

  async function handleValidateCode() {
    if (!discountCode.trim() || !partyId) return;
    setDiscountError(null);
    setDiscount(null);
    setIsValidating(true);
    try {
      const result = await validateDiscountCode(partyId, discountCode.trim());
      setDiscount(result);
    } catch (err) {
      setDiscountError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setIsValidating(false);
    }
  }

  function handleClearDiscount() {
    setDiscount(null);
    setDiscountCode("");
    setDiscountError(null);
  }

  function handlePurchase() {
    if (!selectedTierId) return;
    setError(null);

    // Anonymous user: save intent and redirect to register
    if (!isAuthenticated) {
      localStorage.setItem(
        "resonate_intent",
        JSON.stringify({ type: "purchase", tierId: selectedTierId, partyId, eventSlug, discountCodeId: discount?.id ?? null })
      );
      window.location.href = `/register?next=/events/${eventSlug}`;
      return;
    }

    startTransition(async () => {
      try {
        const result = await purchaseTicket(partyId, selectedTierId, discount?.id ?? null);
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
      <SectionHeading>{label ?? "Get Your Ticket"}</SectionHeading>

      {/*
        The refusal keeps its position and its condition; only its ink and its
        role move. It was a tinted box with no role, which said nothing at all to
        a person not looking straight at it — and this repository has no error
        tracking, so a refusal nobody sees is a refusal that exists nowhere.
      */}
      {error && (
        <p role="alert" className="mb-3 text-sm text-sem-crit">
          {error}
        </p>
      )}

      {countdownTarget && countdownTarget.getTime() > Date.now() && (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 mb-3">
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
              aria-pressed={isSelected}
              disabled={isDisabled || isPending}
              onClick={() => setSelectedTierId(tier.id)}
              className={`min-h-11 w-full rounded-2xl border p-4 text-left transition-all active:scale-95 active:opacity-80 ${FOCUS_RING} ${
                isDisabled
                  ? "border-line bg-surface/50 opacity-50 cursor-not-allowed"
                  : isSelected
                    ? "border-accent bg-accent/10"
                    : "border-line bg-surface hover:border-accent/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {tier.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="shrink-0">{statusLabel(status)}</Badge>
                    {status === "available" && tier.show_remaining !== false && tier.available !== null && (
                      <span className="text-xs text-muted">
                        {tier.available} available
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {/*
                    The struck-through original beside the payable figure is the
                    channel that says a discount applied — a structural one, not
                    a hue. So the payable figure takes the same ink every price
                    on this surface takes, and D-41.1-25's refusal of a tone per
                    outcome is kept.
                  */}
                  {discount && (discount.applicable_tier_ids === null || discount.applicable_tier_ids.includes(tier.id)) && computeDiscountedPrice(tier.price, discount) >= 1.00 ? (
                    <>
                      <p className="text-xs text-muted line-through">{formatPrice(tier.price)}</p>
                      <p className="text-sm font-bold text-accent">{formatPrice(computeDiscountedPrice(tier.price, discount))}</p>
                    </>
                  ) : (
                    <p className="shrink-0 text-sm font-bold text-accent">{formatPrice(tier.price)}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {partyId && (
        <div className="mb-4">
          {!discount ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDiscountInput(!showDiscountInput)}
              >
                {showDiscountInput ? "Hide" : "Have a discount code?"}
              </Button>
              {showDiscountInput && (
                <div className="mt-2 flex items-start gap-2">
                  {/*
                    The field had a placeholder and no name of any kind, so a
                    screen reader announced it as "edit text" and nothing else.
                    The primitive's type requires one; the name added here is
                    the placeholder's own subject, and no visible word changed.
                  */}
                  <Input
                    id={discountCodeId}
                    aria-label="Discount code"
                    className="flex-1"
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleValidateCode(); } }}
                    placeholder="Enter code"
                  />
                  <Button
                    size="sm"
                    onClick={handleValidateCode}
                    disabled={!discountCode.trim() || isValidating}
                  >
                    {isValidating ? "..." : "Apply"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2">
              <p className="text-xs text-ink-2">
                Discount applied: {discount.discount_type === "percentage"
                  ? `${discount.discount_amount}%`
                  : formatPrice(discount.discount_amount)}
              </p>
              <Button size="sm" variant="ghost" onClick={handleClearDiscount}>
                Rimuovi
              </Button>
            </div>
          )}
          {/*
            The refusal stays OUTSIDE the field, at the same position and under
            the same condition as before. It is deliberately not handed to the
            primitive's own error slot: that slot renders inside the field's
            block, so a refusal raised and then hidden with the field would
            disappear — a change to WHEN a person is told a code was rejected,
            which is not a rendering change.
          */}
          {discountError && (
            <p role="alert" className="mt-1 text-xs text-sem-crit">{discountError}</p>
          )}
        </div>
      )}

      {/*
        The accent fill carried white ink, which is 2.91 : 1 on it and fails the
        4.5 : 1 the text rule asks for. The ladder's own arithmetic puts the page
        ground on an accent fill at 6.85 : 1, so the label on the control that
        starts a payment became readable as a by-product of using the rung.
      */}
      <Button
        className="w-full"
        disabled={!selectedTierId || isPending}
        onClick={handlePurchase}
      >
        {isPending ? "Processing..." : label ? `Buy ${label}` : "Buy Ticket"}
      </Button>

      {/*
        Converted one wave earlier as spine by plan 41.2-10 and NOT opened here.
        The conditional and all three props are byte-identical either side.
      */}
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
