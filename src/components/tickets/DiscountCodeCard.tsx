"use client";

import { useState, useTransition } from "react";
import PressableCard from "@/components/motion/PressableCard";
import {
  updateDiscountCode,
  deleteDiscountCode,
} from "@/app/(admin)/admin/events/[id]/tickets/actions";

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
    <PressableCard className="rounded-2xl border border-card-border bg-card p-4 overflow-hidden">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1">Code</label>
            <input
              name="code"
              type="text"
              required
              maxLength={50}
              defaultValue={discountCode.code}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">
                Discount Type
              </label>
              <select
                name="discount_type"
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "percentage" | "fixed")
                }
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed (EUR)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                {discountType === "percentage" ? "Discount (%)" : "Discount (EUR)"}
              </label>
              <input
                name="discount_amount"
                type="number"
                required
                min={0.01}
                step={0.01}
                defaultValue={discountCode.discount_amount}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">
              Max Uses
            </label>
            <input
              name="max_uses"
              type="number"
              min={1}
              defaultValue={discountCode.max_uses ?? ""}
              placeholder="Unlimited"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {tiers.length > 0 && (
            <div>
              <p className="block text-xs text-muted mb-1">
                Apply to{" "}
                <span className="text-muted/60">
                  {selectedTierIds.length === 0
                    ? "(All tiers)"
                    : `(${selectedTierIds.length} selected)`}
                </span>
              </p>
              <div className="space-y-1.5">
                {tiers.map((tier) => (
                  <label
                    key={tier.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTierIds.includes(tier.id)}
                      onChange={() => toggleTier(tier.id)}
                      className="rounded border-card-border bg-background text-accent focus:ring-accent"
                    />
                    <span className="text-xs text-foreground">{tier.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={discountCode.is_active}
              value="true"
              className="rounded border-card-border bg-background text-accent focus:ring-accent"
            />
            <span className="text-xs text-muted">Active</span>
            <input type="hidden" name="is_active" value="false" />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-all active:scale-95 active:opacity-80 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
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
              className="rounded-full border border-card-border px-4 py-1.5 text-xs font-medium text-muted hover:bg-card-border/30 transition-all active:scale-95 active:opacity-80"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground font-mono">
                  {discountCode.code}
                </h3>
                {discountCode.is_active ? (
                  <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400 uppercase">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-[10px] font-semibold text-gray-400 uppercase">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
                <span>
                  {discountCode.discount_type === "percentage"
                    ? `${discountCode.discount_amount}%`
                    : formatPrice(discountCode.discount_amount)}
                </span>
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
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-all active:scale-95 active:opacity-80"
            >
              Edit
            </button>

            {discountCode.used === 0 && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all active:scale-95 active:opacity-80 disabled:opacity-50"
              >
                {isPending ? "..." : "Delete"}
              </button>
            )}
          </div>
        </>
      )}
    </PressableCard>
  );
}
