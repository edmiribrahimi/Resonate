"use client";

import { useState, useTransition } from "react";
import {
  updateTier,
  deleteTier,
} from "@/app/(organizer)/organizer/events/[id]/tickets/actions";

interface TierWithSold {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
}

interface TierCardProps {
  tier: TierWithSold;
  eventId: string;
}

export default function TierCard({ tier, eventId }: TierCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await updateTier(tier.id, eventId, formData);
        if (result.success) {
          setIsEditing(false);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update tier."
        );
      }
    });
  }

  function handleDelete() {
    setError(null);

    const confirmed = window.confirm(
      `Are you sure you want to delete the "${tier.name}" tier?`
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const result = await deleteTier(tier.id, eventId);
        if (!result.success) {
          setError("Failed to delete tier.");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete tier."
        );
      }
    });
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1">Name</label>
            <input
              name="name"
              type="text"
              required
              maxLength={100}
              defaultValue={tier.name}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">
                Price (EUR)
              </label>
              <input
                name="price"
                type="number"
                required
                min={0}
                step={0.01}
                defaultValue={tier.price}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Quantity
              </label>
              <input
                name="quantity"
                type="number"
                required
                min={1}
                defaultValue={tier.quantity}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError(null);
              }}
              className="rounded-full border border-card-border px-4 py-1.5 text-xs font-medium text-muted hover:bg-card-border/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {tier.name}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                <span>{formatPrice(tier.price)}</span>
                <span>
                  {tier.sold}/{tier.quantity} sold
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Edit
            </button>

            {tier.sold === 0 && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : "Delete"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
