"use client";

import { useState, useTransition } from "react";
import { createDiscountCode } from "@/app/(admin)/admin/events/[id]/tickets/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Select } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/Typography";

/**
 * The form that creates a discount code — converted onto the primitives in plan
 * 41.1-22, with every rule that bounds a discount carried through unchanged.
 *
 * ── What a discount decides, and what this conversion therefore may not do ────
 *
 * A discount is the amount that is **not** collected. Its value carries a
 * minimum of one hundredth and the same hundredth step whether it is read as a
 * percentage or as a currency amount; the usage ceiling is optional with a
 * minimum of one, where absent means unlimited; the code itself is required and
 * bounded in length. Those attributes are validation and are carried through
 * field by field. The type selector switches only the **label** of the value
 * field — the constraint on the value is identical on both arms, and it was
 * identical before this conversion too.
 *
 * ── The refusal is one sentence per cause, and it is announced ────────────────
 *
 * The failure below is whatever the server action threw, rendered in an alert
 * region rather than a hand-drawn coloured box. It relays the action's own
 * sentence and does not collapse causes — but it also does not *separate* them,
 * because the causes are separated upstream and this file did not write them.
 * That limitation is recorded rather than fixed here: rewriting the copy is
 * outside a conversion, and this project has no error tracking, so a refusal a
 * person cannot read is a refusal nobody ever reads.
 */

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
    <Card className="overflow-hidden">
      <SectionHeading>Add Discount Code</SectionHeading>

      {error && (
        <p role="alert" className="mb-3 text-sm text-sem-crit">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          id={`dc-code-${partyId}`}
          label="Code"
          name="code"
          type="text"
          required
          maxLength={50}
          placeholder="e.g. EARLYBIRD20"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            id={`dc-type-${partyId}`}
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
          {/*
            One field, two labels, one constraint. The label follows the selector
            above; the minimum and the step do not, and did not before either.
          */}
          <Input
            id={`dc-amount-${partyId}`}
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
            placeholder="0.00"
          />
        </div>

        <Input
          id={`dc-max-${partyId}`}
          label="Max Uses"
          name="max_uses"
          type="number"
          min={1}
          placeholder="Unlimited"
        />

        {tiers.length > 0 && (
          <div
            role="group"
            aria-labelledby={`dc-apply-to-${partyId}`}
            className="space-y-2"
          >
            <p
              id={`dc-apply-to-${partyId}`}
              className="block text-xs font-semibold text-ink-2"
            >
              Apply to{" "}
              <span className="text-muted">
                {selectedTierIds.length === 0
                  ? "(All tiers)"
                  : `(${selectedTierIds.length} selected)`}
              </span>
            </p>
            {/* Column, because the hit area is an inline box and would otherwise
                run several tier names onto one line. */}
            <div className="flex flex-col items-start">
              {tiers.map((tier) => (
                <Checkbox
                  key={tier.id}
                  id={`dc-tier-${partyId}-${tier.id}`}
                  label={tier.name}
                  checked={selectedTierIds.includes(tier.id)}
                  onChange={() => toggleTier(tier.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/*
          The hidden field stays AFTER the box: an unchecked box submits nothing
          and the hidden value is read, a checked box submits first and wins.
        */}
        <div>
          <Checkbox
            id={`dc-active-${partyId}`}
            name="is_active"
            defaultChecked
            value="true"
            label="Active"
          />
          <input type="hidden" name="is_active" value="false" />
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Adding..." : "Add Code"}
        </Button>
      </form>
    </Card>
  );
}
