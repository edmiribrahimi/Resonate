"use client";

import { useState, useTransition } from "react";
import { createDiscountCode } from "@/app/(organizer)/organizer/events/[id]/tickets/actions";

interface AddDiscountCodeFormProps {
  eventId: string;
  partyId: string;
  tiers: { id: string; name: string }[];
}

export default function AddDiscountCodeForm({
  eventId,
  partyId,
  tiers,
}: AddDiscountCodeFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "percentage"
  );
  const [selectedTierIds, setSelectedTierIds] = useState<string[]>([]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Set tier_ids as JSON string
    formData.set(
      "tier_ids",
      selectedTierIds.length > 0 ? JSON.stringify(selectedTierIds) : ""
    );

    startTransition(async () => {
      try {
        const result = await createDiscountCode(eventId, partyId, formData);
        if (result.success) {
          form.reset();
          setDiscountType("percentage");
          setSelectedTierIds([]);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create discount code."
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
    <div className="rounded-2xl border border-card-border bg-card p-4 overflow-hidden">
      <h2 className="text-sm font-semibold text-foreground mb-3">
        Add Discount Code
      </h2>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor={`dc-code-${partyId}`}
            className="block text-xs text-muted mb-1"
          >
            Code
          </label>
          <input
            id={`dc-code-${partyId}`}
            name="code"
            type="text"
            required
            maxLength={50}
            placeholder="e.g. EARLYBIRD20"
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`dc-type-${partyId}`}
              className="block text-xs text-muted mb-1"
            >
              Discount Type
            </label>
            <select
              id={`dc-type-${partyId}`}
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
            <label
              htmlFor={`dc-amount-${partyId}`}
              className="block text-xs text-muted mb-1"
            >
              {discountType === "percentage" ? "Discount (%)" : "Discount (EUR)"}
            </label>
            <input
              id={`dc-amount-${partyId}`}
              name="discount_amount"
              type="number"
              required
              min={0.01}
              step={0.01}
              placeholder="0.00"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`dc-max-${partyId}`}
            className="block text-xs text-muted mb-1"
          >
            Max Uses
          </label>
          <input
            id={`dc-max-${partyId}`}
            name="max_uses"
            type="number"
            min={1}
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
            defaultChecked
            value="true"
            className="rounded border-card-border bg-background text-accent focus:ring-accent"
          />
          <span className="text-xs text-muted">Active</span>
          <input type="hidden" name="is_active" value="false" />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add Code"}
        </button>
      </form>
    </div>
  );
}
