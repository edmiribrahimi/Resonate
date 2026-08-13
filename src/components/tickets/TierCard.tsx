"use client";

import { useState, useTransition } from "react";
import {
  updateTier,
  deleteTier,
} from "@/app/(admin)/admin/events/[id]/tickets/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";

/**
 * One ticket tier, read and edited in place — converted in plan 41.1-22.
 *
 * ── The price is a mark, not a line of meta (D-41.1-13) ──────────────────────
 *
 * The figure that decides what a guest pays used to sit inside the same recessed
 * row as the sold count and the sale window, at the same size and the same ink.
 * It is lifted out and set beside the tier's name, because an operator scanning
 * a column of tiers reads the price first or reads it wrong. The number itself,
 * its formatting and its currency are untouched — what changed is where the eye
 * lands.
 *
 * ── The four state pills are marks, and not one of them is a target ──────────
 *
 * *Coming soon* and *Expired* state a fact about a sale window; neither can be
 * operated, so both are badges rather than chips — the distinction that keeps a
 * 44px rule from being satisfied by something nobody can press, and keeps a
 * 20px target from hiding inside something that can. Neither carries an outcome
 * hue: D-41.1-25 holds, the word is the channel, and D-41.1-29 measured that the
 * two semantic fills sit 1.23 : 1 apart and could not carry the distinction
 * anyway.
 *
 * ── The delete control, and the thing its new size does NOT mean ─────────────
 *
 * Deleting a tier is guarded by a native confirmation and by the sold count, and
 * this conversion changed neither. It takes the **secondary** rung, which is the
 * shape the refund control in this same closure already took when it converted
 * in wave 7: a destructive fill is reserved for the control inside a
 * confirmation, never for the one that opens it. Its hit area grew from roughly
 * 28px to 44px, and that is a **mis-hit correction, not an endorsement** —
 * D-41.1-31 records that this product's irreversible controls are already, on
 * average, easier to reach than its reversible ones, and nothing here was made
 * easier to *decide*.
 *
 * ── The container is static, deliberately ────────────────────────────────────
 *
 * It used to be the pressable card, which scales on tap. Nothing about this card
 * is pressable — the controls inside it are — so the press feedback was an
 * affordance promising an action the card does not have. `Card.tsx`'s own
 * docblock draws that line: the pressable one is for a card that is itself a
 * control, this is the static container.
 */

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
    <Card className="overflow-hidden">
      {error && (
        <p role="alert" className="mb-3 text-sm text-sem-crit">
          {error}
        </p>
      )}

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-3">
          <Input
            id={`tier-edit-name-${tier.id}`}
            label="Name"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={tier.name}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id={`tier-edit-price-${tier.id}`}
              label="Price (EUR)"
              name="price"
              type="number"
              required
              min={0}
              step={0.01}
              defaultValue={tier.price}
            />
            <Input
              id={`tier-edit-quantity-${tier.id}`}
              label="Quantity (empty = unlimited)"
              name="quantity"
              type="number"
              min={1}
              defaultValue={tier.quantity ?? ""}
              placeholder="Unlimited"
            />
          </div>

          {/* The hidden field stays AFTER the box — that order is the flag. */}
          <div>
            <Checkbox
              id={`tier-edit-show-remaining-${tier.id}`}
              name="show_remaining"
              defaultChecked={tier.show_remaining}
              value="true"
              label="Show remaining tickets to users"
            />
            <input type="hidden" name="show_remaining" value="false" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id={`tier-edit-starts-${tier.id}`}
              label="Starts at (optional)"
              name="starts_at"
              type="datetime-local"
              defaultValue={tier.starts_at ? new Date(tier.starts_at).toISOString().slice(0, 16) : ""}
              className="min-w-0"
            />
            <Input
              id={`tier-edit-expires-${tier.id}`}
              label="Expires at (optional)"
              name="expires_at"
              type="datetime-local"
              defaultValue={tier.expires_at ? new Date(tier.expires_at).toISOString().slice(0, 16) : ""}
              className="min-w-0"
            />
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
                <h3 className="text-sm font-semibold text-ink">
                  {tier.name}
                </h3>
                {tier.starts_at && new Date(tier.starts_at) > new Date() && (
                  <Badge>Coming soon</Badge>
                )}
                {tier.expires_at && new Date(tier.expires_at) < new Date() && (
                  <Badge>Expired</Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span>
                  {tier.quantity !== null
                    ? `${tier.sold}/${tier.quantity} sold`
                    : `${tier.sold} sold`}
                </span>
                {tier.starts_at && new Date(tier.starts_at) > new Date() && (
                  <span>
                    Starts {(() => { const d = new Date(tier.starts_at); const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${d.getDate()} ${M[d.getMonth()]}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; })()}
                  </span>
                )}
                {tier.expires_at && new Date(tier.expires_at) >= new Date() && (
                  <span>
                    Expires {(() => { const d = new Date(tier.expires_at); const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${d.getDate()} ${M[d.getMonth()]}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; })()}
                  </span>
                )}
              </div>
            </div>

            {/* The money mark — D-41.1-13. */}
            <p className="text-sm font-semibold text-ink">
              {formatPrice(tier.price)}
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

            {tier.sold === 0 && (
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
