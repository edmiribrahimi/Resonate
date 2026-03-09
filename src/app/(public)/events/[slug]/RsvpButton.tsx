"use client";

import { useState, useTransition } from "react";
import PressableButton from "@/components/motion/PressableButton";
import { rsvpToParty, cancelRsvp } from "./rsvp-actions";

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
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      <PressableButton
        onClick={handleToggle}
        disabled={isPending}
        className={`w-full rounded-full py-3 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          hasRsvp
            ? "bg-red-500/80 hover:bg-red-500"
            : "bg-accent hover:bg-accent-hover"
        }`}
      >
        {isPending
          ? "Processing..."
          : hasRsvp
            ? "Cancel RSVP"
            : "I'm going"}
      </PressableButton>
    </div>
  );
}
