"use client";

import { useState, useTransition } from "react";
import { createTier } from "@/app/(admin)/admin/events/[id]/tickets/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/Typography";

/**
 * The form that creates a ticket tier — converted onto the primitives in plan
 * 41.1-22, and nothing it decides about money moved.
 *
 * ── What a conversion may NOT touch here, and why it is written on this file ──
 *
 * Every field below is an input to an amount the system will later charge. The
 * price carries a minimum of zero and a hundredth-of-a-unit step; the quantity
 * carries a minimum of one and is optional, where absent means unlimited. Those
 * five facts — the control type, the required flag, the minimum, the step and
 * the maximum length — are **validation, not styling**, and they are carried
 * through this conversion attribute by attribute rather than re-typed. A step
 * lost in a substitution is a price nobody can enter, or one nobody expected,
 * and there is no test runner in this project to notice either.
 *
 * ── The identifiers are scoped, and that is a correction ─────────────────────
 *
 * This component is mounted **once per sub-event plus once for the event pass**,
 * so the fixed identifiers it used to carry were duplicated across the document
 * the moment a night had two paid sub-events. A duplicate identifier means the
 * visible label binds to the *first* control of that name rather than to its
 * own, which is a defect a sighted reviewer cannot see and a label convention
 * cannot fix by itself. The sibling discount form already scoped its identifiers
 * by sub-event; this one now does the same. No submitted name changed — the
 * server reads `name`, never `id`.
 */

interface AddTierFormProps {
  eventId: string;
  partyId: string | null;
}

export default function AddTierForm({ eventId, partyId }: AddTierFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // The event-pass mount has no sub-event, so it takes a name of its own rather
  // than the empty string, which would collide with nothing today and with the
  // next optional scope tomorrow.
  const scope = partyId ?? "event";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result = await createTier(eventId, partyId, formData);
        if (result.success) {
          form.reset();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create tier."
        );
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <SectionHeading>Add Tier</SectionHeading>

      {error && (
        <p role="alert" className="mb-3 text-sm text-sem-crit">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          id={`tier-name-${scope}`}
          label="Name"
          name="name"
          type="text"
          required
          maxLength={100}
          placeholder="e.g. Early Bird, VIP, General"
        />

        {/*
          One column on a phone, two from tablet width up. The incumbent grid was
          two columns at every width, and the two date controls in the second row
          below carried a minimum-width override — the file's own record that the
          row did not fit. The pair below the fold of a 390px viewport is a number
          field and a number field; stacking them is what makes each one reachable
          rather than merely present.
        */}
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            id={`tier-price-${scope}`}
            label="Price (EUR)"
            name="price"
            type="number"
            required
            min={0}
            step={0.01}
            placeholder="0.00"
          />
          <Input
            id={`tier-quantity-${scope}`}
            label="Quantity (empty = unlimited)"
            name="quantity"
            type="number"
            min={1}
            placeholder="Unlimited"
          />
        </div>

        {/*
          The hidden field stays AFTER the box, because that order is the
          behaviour: an unchecked box submits nothing, so the reader takes the
          hidden value; a checked box submits first and wins. Reversing the two
          would invert the flag without changing a single attribute.
        */}
        <div>
          <Checkbox
            id={`tier-show-remaining-${scope}`}
            name="show_remaining"
            defaultChecked
            value="true"
            label="Show remaining tickets to users"
          />
          <input type="hidden" name="show_remaining" value="false" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            id={`tier-starts-${scope}`}
            label="Starts at (optional)"
            name="starts_at"
            type="datetime-local"
            className="min-w-0"
          />
          <Input
            id={`tier-expires-${scope}`}
            label="Expires at (optional)"
            name="expires_at"
            type="datetime-local"
            className="min-w-0"
          />
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Adding..." : "Add Tier"}
        </Button>
      </form>
    </Card>
  );
}
