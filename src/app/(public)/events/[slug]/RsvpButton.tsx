"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { rsvpToParty, cancelRsvp } from "./rsvp-actions";

/**
 * The RSVP control — converted by plan 41.2-18.
 *
 * ── The act is untouched, and that is the point of this conversion ───────────
 *
 * Two Server Actions are called from here, and both are called with the same
 * arguments, in the same order, as before. The anonymous branch stores the same
 * intent under the same key and sends the person to the same destination. No
 * condition under which this control is drawn, refuses, or changes state was
 * added, removed or reordered. The action module was **read** in order to be able
 * to tell a rendering change from a payload change, and it was **not edited** —
 * it is the one module on this surface carrying the server directive, and
 * opening it is a stop condition rather than a judgement call.
 *
 * **Why that matters more here than on an ordinary control.** An RSVP unlocks a
 * hint about where a night is, and it does so *regardless* of the
 * reveal-on-purchase setting — a deliberate asymmetry recorded elsewhere in this
 * tree. So a change to when this control is drawn is a change to who is told
 * where a night happens. This conversion made none.
 *
 * ── Cancelling is NOT the destructive rung ───────────────────────────────────
 *
 * It was a red fill, and it is now the secondary rung. The rung follows the act,
 * and this act destroys nothing: the row goes, and pressing again puts it back —
 * the action applies no ceiling that could refuse the second press. Painting a
 * reversible act in the critical semantic spends, on something recoverable, the
 * one colour this system has for saying *this cannot be taken back* — and on
 * this surface that colour has real work to do. **This is a visible change**: the
 * cancel control is no longer red. Same argument as the sign-out control in the
 * member dashboard, re-derived on this act rather than inherited from it.
 */

interface RsvpButtonProps {
  partyId: string;
  eventId: string;
  hasRsvp: boolean;
  isAuthenticated?: boolean;
  eventSlug?: string;
}

export default function RsvpButton({
  partyId,
  eventId,
  hasRsvp: initialHasRsvp,
  isAuthenticated = true,
  eventSlug,
}: RsvpButtonProps) {
  const [hasRsvp, setHasRsvp] = useState(initialHasRsvp);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);

    // Anonymous user: save intent and redirect to register
    if (!isAuthenticated && !hasRsvp) {
      localStorage.setItem(
        "resonate_intent",
        JSON.stringify({ type: "rsvp", partyId, eventId, eventSlug })
      );
      window.location.href = `/register?next=/events/${eventSlug}`;
      return;
    }

    startTransition(async () => {
      try {
        if (hasRsvp) {
          await cancelRsvp(partyId);
          setHasRsvp(false);
        } else {
          await rsvpToParty(partyId, eventId);
          setHasRsvp(true);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      }
    });
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4"
        >
          <p className="text-sm text-sem-crit">{error}</p>
        </div>
      )}
      <Button
        className="w-full"
        variant={hasRsvp ? "secondary" : "primary"}
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPending
          ? "Processing..."
          : hasRsvp
            ? "Cancel RSVP"
            : "I'm going"}
      </Button>
    </div>
  );
}
