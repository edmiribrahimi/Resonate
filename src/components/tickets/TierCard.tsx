"use client";

import { useState, useTransition } from "react";
import PressableCard from "@/components/motion/PressableCard";
import {
  updateTier,
  deleteTier,
} from "@/app/(organizer)/organizer/events/[id]/tickets/actions";

interface TierWithSold {
  id: string;
  name: string;
  price: number;
  quantity: number | null;
  sold: number;
  show_remaining: boolean;
  starts_at: string | null;
  expires_at: string | null;
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
    <PressableCard className="rounded-2xl border border-card-border bg-card p-4 overflow-hidden">
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
                Quantity (empty = unlimited)
              </label>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={tier.quantity ?? ""}
                placeholder="Unlimited"
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              name="show_remaining"
              type="checkbox"
              defaultChecked={tier.show_remaining}
              value="true"
              className="rounded border-card-border bg-background text-accent focus:ring-accent"
            />
            <span className="text-xs text-muted">Show remaining tickets to users</span>
            <input type="hidden" name="show_remaining" value="false" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">
                Starts at (optional)
              </label>
              <input
                name="starts_at"
                type="datetime-local"
                defaultValue={tier.starts_at ? new Date(tier.starts_at).toISOString().slice(0, 16) : ""}
                className="w-full min-w-0 rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Expires at (optional)
              </label>
              <input
                name="expires_at"
                type="datetime-local"
                defaultValue={tier.expires_at ? new Date(tier.expires_at).toISOString().slice(0, 16) : ""}
                className="w-full min-w-0 rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

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
                <h3 className="text-sm font-semibold text-foreground">
                  {tier.name}
                </h3>
                {tier.starts_at && new Date(tier.starts_at) > new Date() && (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400 uppercase">
                    Coming soon
                  </span>
                )}
                {tier.expires_at && new Date(tier.expires_at) < new Date() && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400 uppercase">
                    Expired
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                <span>{formatPrice(tier.price)}</span>
                <span>
                  {tier.quantity !== null
                    ? `${tier.sold}/${tier.quantity} sold`
                    : `${tier.sold} sold`}
                </span>
                {tier.starts_at && new Date(tier.starts_at) > new Date() && (
                  <span>
                    Starts {new Date(tier.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {tier.expires_at && new Date(tier.expires_at) >= new Date() && (
                  <span>
                    Expires {new Date(tier.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
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

            {tier.sold === 0 && (
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
