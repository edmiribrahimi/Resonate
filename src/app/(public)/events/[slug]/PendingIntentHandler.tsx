"use client";

import { useEffect, useState, useTransition } from "react";
import { purchaseTicket } from "@/app/(organizer)/organizer/events/actions";
import { rsvpToParty } from "./rsvp-actions";

interface PendingIntentHandlerProps {
  eventSlug: string;
}

interface PurchaseIntent {
  type: "purchase";
  tierId: string;
  partyId: string | null;
  eventSlug: string;
}

interface RsvpIntent {
  type: "rsvp";
  partyId: string;
  eventId: string;
  eventSlug: string;
}

type Intent = PurchaseIntent | RsvpIntent;

export default function PendingIntentHandler({ eventSlug }: PendingIntentHandlerProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const raw = localStorage.getItem("resonate_intent");
    if (!raw) return;

    let intent: Intent;
    try {
      intent = JSON.parse(raw);
    } catch {
      localStorage.removeItem("resonate_intent");
      return;
    }

    // Only handle intents for the current event
    if (intent.eventSlug !== eventSlug) return;

    setProcessing(true);

    startTransition(async () => {
      try {
        if (intent.type === "purchase") {
          const result = await purchaseTicket(intent.partyId, intent.tierId);
          localStorage.removeItem("resonate_intent");
          if (result.success && result.checkoutId) {
            // TODO(08-02): open checkout modal with card widget instead of redirect
            console.log("Checkout created:", result.checkoutId);
          }
        } else if (intent.type === "rsvp") {
          await rsvpToParty(intent.partyId, intent.eventId);
          localStorage.removeItem("resonate_intent");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        localStorage.removeItem("resonate_intent");
      } finally {
        setProcessing(false);
      }
    });
  }, [eventSlug, startTransition]);

  if (!processing && !isPending && !error) return null;

  return (
    <div className="mx-6 mt-6">
      {(processing || isPending) && !error && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
          <p className="text-sm font-medium text-accent">
            Completing your action...
          </p>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
