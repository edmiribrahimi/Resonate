"use client";

import { useState, useTransition } from "react";
import {
  updateDiscountCode,
  deleteDiscountCode,
} from "@/app/(admin)/admin/events/[id]/tickets/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Select } from "@/components/ui/Input";

/**
 * One discount code, read and edited in place — converted in plan 41.1-22.
 *
 * ── The discount is a mark (D-41.1-13) ───────────────────────────────────────
 *
 * A discount is money that is not collected, so the figure is lifted out of the
 * recessed meta row and set beside the code, at the same weight the tier card
 * gives a price. Percentage or currency, the value and its formatting are
 * untouched — only where it sits changed.
 *
 * ── *Active* and *Inactive* are marks, and neither is a target ────────────────
 *
 * Both state a fact and neither can be operated, so both are badges. Neither
 * takes an outcome hue: D-41.1-25 holds — the word is the channel — and
 * D-41.1-29 measured the two semantic fills at 1.23 : 1, under WCAG 1.4.11's
 * 3 : 1, so the palette could not carry the distinction as adjacent fills even
 * if the contract allowed it.
 *
 * ── The delete control ───────────────────────────────────────────────────────
 *
 * Guarded by a native confirmation and by the usage count, both unchanged. It
 * takes the **secondary** rung — the shape the refund control in this same
 * closure took in wave 7, where the destructive fill is reserved for the control
 * *inside* a confirmation and never for the one that opens it. Its hit area grew
 * from roughly 28px to 44px: a mis-hit correction under D-41.1-31, not an
 * invitation.
 */

export interface DiscountCodeWithUsage {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
  max_uses: number | null;
  is_active: boolean;
  used: number;
  tier_names: string[];
}

interface DiscountCodeCardProps {
  discountCode: DiscountCodeWithUsage;
  eventId: string;
  tiers: { id: string; name: string }[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export default function DiscountCodeCard({
  discountCode,
  eventId,
  tiers,
}: DiscountCodeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    discountCode.discount_type
  );
  const [selectedTierIds, setSelectedTierIds] = useState<string[]>(() => {
    // Derive initial selected tier IDs from tier_names
    return tiers
      .filter((t) => discountCode.tier_names.includes(t.name))
      .map((t) => t.id);
  });

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Set tier_ids as JSON string
    formData.set(
      "tier_ids",
      selectedTierIds.length > 0 ? JSON.stringify(selectedTierIds) : "[]"
    );

    startTransition(async () => {
      try {
        const result = await updateDiscountCode(
          discountCode.id,
          eventId,
          formData
        );
        if (result.success) {
          setIsEditing(false);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update discount code."
        );
      }
    });
  }

  function handleDelete() {
    setError(null);

    const confirmed = window.confirm(
      `Are you sure you want to delete the code "${discountCode.code}"?`
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const result = await deleteDiscountCode(discountCode.id, eventId);
        if (!result.success) {
          setError("Failed to delete discount code.");
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to delete discount code."
        );
      }
    });
  }

  function toggleTier(tierId: string) {
    setSelectedTierIds((prev) =>
      prev.includes(tierId)
        ? prev.filter((id) => id !== tierId)
        : [...prev, tierId]
    );
  }

  return (
    <Card className="overflow-hidden">
      {error && (
        <p role="alert" className="mb-3 text-sm text-sem-crit">
          {error}
        </p>
      )}

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-3">
          <Input
            id={`dc-edit-code-${discountCode.id}`}
            label="Code"
            name="code"
            type="text"
            required
            maxLength={50}
            defaultValue={discountCode.code}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Select
              id={`dc-edit-type-${discountCode.id}`}
              label="Discount Type"
              name="discount_type"
              value={discountType}
              onChange={(e) =>
                setDiscountType(e.target.value as "percentage" | "fixed")
              }
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed (EUR)</option>
            </Select>
            {/* One field, two labels, one constraint — as before. */}
            <Input
              id={`dc-edit-amount-${discountCode.id}`}
              label={
                discountType === "percentage"
                  ? "Discount (%)"
                  : "Discount (EUR)"
              }
              name="discount_amount"
              type="number"
              required
              min={0.01}
              step={0.01}
              defaultValue={discountCode.discount_amount}
            />
          </div>

          <Input
            id={`dc-edit-max-${discountCode.id}`}
            label="Max Uses"
            name="max_uses"
            type="number"
            min={1}
            defaultValue={discountCode.max_uses ?? ""}
            placeholder="Unlimited"
          />

          {tiers.length > 0 && (
            <div
              role="group"
              aria-labelledby={`dc-edit-apply-to-${discountCode.id}`}
              className="space-y-2"
            >
              <p
                id={`dc-edit-apply-to-${discountCode.id}`}
                className="block text-xs font-semibold text-ink-2"
              >
                Apply to{" "}
                <span className="text-muted">
                  {selectedTierIds.length === 0
                    ? "(All tiers)"
                    : `(${selectedTierIds.length} selected)`}
                </span>
              </p>
              {/* Column, because the hit area is an inline box. */}
              <div className="flex flex-col items-start">
                {tiers.map((tier) => (
                  <Checkbox
                    key={tier.id}
                    id={`dc-edit-tier-${discountCode.id}-${tier.id}`}
                    label={tier.name}
                    checked={selectedTierIds.includes(tier.id)}
                    onChange={() => toggleTier(tier.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* The hidden field stays AFTER the box — that order is the flag. */}
          <div>
            <Checkbox
              id={`dc-edit-active-${discountCode.id}`}
              name="is_active"
              defaultChecked={discountCode.is_active}
              value="true"
              label="Active"
            />
            <input type="hidden" name="is_active" value="false" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setIsEditing(false);
                setError(null);
                setDiscountType(discountCode.discount_type);
                setSelectedTierIds(
                  tiers
                    .filter((t) => discountCode.tier_names.includes(t.name))
                    .map((t) => t.id)
                );
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-sm font-semibold text-ink">
                  {discountCode.code}
                </h3>
                {discountCode.is_active ? (
                  <Badge>Active</Badge>
                ) : (
                  <Badge>Inactive</Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span>
                  {discountCode.max_uses !== null
                    ? `${discountCode.used}/${discountCode.max_uses} used`
                    : `${discountCode.used} used`}
                </span>
                <span>
                  {discountCode.tier_names.length === 0
                    ? "All tiers"
                    : `Only: ${discountCode.tier_names.join(", ")}`}
                </span>
              </div>
            </div>

            {/* The money mark — D-41.1-13. */}
            <p className="text-sm font-semibold text-ink">
              {discountCode.discount_type === "percentage"
                ? `${discountCode.discount_amount}%`
                : formatPrice(discountCode.discount_amount)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>

            {discountCode.used === 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "..." : "Delete"}
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
