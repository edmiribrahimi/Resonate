"use client";

import { useEffect, useState, useTransition } from "react";
import { purchaseTicket } from "@/app/(admin)/admin/events/actions";
import { rsvpToParty } from "./rsvp-actions";
import SumUpCheckoutModal from "./SumUpCheckoutModal";

/**
 * The handler that picks a purchase back up after a return from the provider.
 *
 * ── Every resumption condition is unchanged, and that is the whole point ─────
 *
 * This is the quietest surface in this plan and the least forgiving: it decides
 * whether an act somebody already began is picked back up when they come back.
 * A condition changed here is a purchase that silently does not resume, on a
 * page with **no error tracking** behind it.
 *
 * So the six conditions below — the presence of a stored intent, the parse, the
 * event match, the branch on the intent's kind, the test on what the purchase
 * action returned, and the test that decides whether anything is drawn at all —
 * are byte-identical either side of this diff, as are the three points at which
 * the stored intent is removed and the two arguments each action is called with.
 * Both action modules were **read** so that a rendering change could be told from
 * a payload change, and neither was edited. No status transition, no amount, no
 * discount computation, no idempotency key and no webhook path is written, read
 * or reshaped here.
 *
 * ── Three failures are RECORDED here rather than repaired ────────────────────
 *
 * Recorded at `file:line` with their cost to a person in
 * `41.2-17-FINDINGS.md`, and deliberately left alone: repairing any of them is
 * either a payload change or new copy on the purchase path, which is what a
 * visual conversion is not allowed to do. The one that costs the most is the
 * discount: a code applied before signing up is carried into the stored intent
 * and is **not** carried out of it, so a guest who comes back is charged the
 * undiscounted price with nothing on screen saying so.
 */
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
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
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
            setCheckoutId(result.checkoutId);
            setProcessing(false);
            return;
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

  if (!processing && !isPending && !error && !checkoutId) return null;

  return (
    <div className="mx-6 mt-6">
      {(processing || isPending) && !error && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
          <p className="text-sm font-medium text-accent">
            Completing your action...
          </p>
        </div>
      )}
      {/*
        The refusal keeps its position and its condition; only its ink and its
        role move. It was a tinted box with no role, which announced nothing at
        all — and on the one surface whose job is to tell a person their purchase
        resumed, a message nobody is told is a message that exists nowhere.
      */}
      {error && (
        <p role="alert" className="text-sm text-sem-crit">
          {error}
        </p>
      )}
      {checkoutId && (
        <SumUpCheckoutModal
          checkoutId={checkoutId}
          onClose={() => setCheckoutId(null)}
          onPaymentComplete={() => {
            setCheckoutId(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
