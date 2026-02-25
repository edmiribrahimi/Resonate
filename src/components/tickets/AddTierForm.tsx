"use client";

import { useState, useTransition } from "react";
import { createTier } from "@/app/(organizer)/organizer/events/[id]/tickets/actions";

interface AddTierFormProps {
  eventId: string;
}

export default function AddTierForm({ eventId }: AddTierFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result = await createTier(eventId, formData);
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
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">
        Add Tier
      </h2>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="tier-name"
            className="block text-xs text-muted mb-1"
          >
            Name
          </label>
          <input
            id="tier-name"
            name="name"
            type="text"
            required
            maxLength={100}
            placeholder="e.g. Early Bird, VIP, General"
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="tier-price"
              className="block text-xs text-muted mb-1"
            >
              Price (EUR)
            </label>
            <input
              id="tier-price"
              name="price"
              type="number"
              required
              min={0}
              step={0.01}
              placeholder="0.00"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label
              htmlFor="tier-quantity"
              className="block text-xs text-muted mb-1"
            >
              Quantity
            </label>
            <input
              id="tier-quantity"
              name="quantity"
              type="number"
              required
              min={1}
              placeholder="100"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add Tier"}
        </button>
      </form>
    </div>
  );
}
