"use client";

import { useState, useTransition } from "react";
import { createTier } from "@/app/(admin)/admin/events/[id]/tickets/actions";

interface AddTierFormProps {
  eventId: string;
  partyId: string | null;
}

export default function AddTierForm({ eventId, partyId }: AddTierFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    <div className="rounded-2xl border border-card-border bg-card p-4 overflow-hidden">
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
              Quantity (empty = unlimited)
            </label>
            <input
              id="tier-quantity"
              name="quantity"
              type="number"
              min={1}
              placeholder="Unlimited"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            name="show_remaining"
            type="checkbox"
            defaultChecked
            value="true"
            className="rounded border-card-border bg-background text-accent focus:ring-accent"
          />
          <span className="text-xs text-muted">Show remaining tickets to users</span>
          <input type="hidden" name="show_remaining" value="false" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="tier-starts"
              className="block text-xs text-muted mb-1"
            >
              Starts at (optional)
            </label>
            <input
              id="tier-starts"
              name="starts_at"
              type="datetime-local"
              className="w-full min-w-0 rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label
              htmlFor="tier-expires"
              className="block text-xs text-muted mb-1"
            >
              Expires at (optional)
            </label>
            <input
              id="tier-expires"
              name="expires_at"
              type="datetime-local"
              className="w-full min-w-0 rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
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
