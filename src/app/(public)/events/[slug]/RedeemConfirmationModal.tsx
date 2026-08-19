"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";

import { redeemDrinkToken } from "@/app/(admin)/admin/events/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * The drink-token redemption, in three screens — the guest's question, the
 * bartender's serve, and the moment after it.
 *
 * ── The money path is untouched, and that is the point of this plan ──────────
 *
 * One server action is called from here, three times, and **all three calls
 * carry the same two arguments in the same order as before**: the signed token
 * and the verb. No status transition, no amount, no idempotency key and no
 * webhook path is written, read or reshaped by this file — it renders controls
 * and reports what the action threw. `redeemDrinkToken` was **read** so that a
 * rendering change could be told from a payload change, and it was not edited.
 *
 * The copy is byte-identical: the title, the drink name, both button labels and
 * every refusal sentence are the ones that were here.
 *
 * ── ONE of the three screens converted, and the other two DELIBERATELY NOT ───
 *
 * The plan for this file modelled it as a twin of
 * `admin/events/[id]/tickets/RefundActions.tsx` with a single shell at the foot
 * of the file. **Measured with the gate's own matcher, it carries three
 * overlays, not one** — the guest's confirmation, and the two full-bleed screens
 * the bartender uses. Only the first is converted.
 *
 * The other two are refused, and the reason is in this file's own words one
 * screen below: the serve area *"takes the whole screen"* so a bartender
 * *"doesn't have to aim"*, and the row that reverts the token is *"kept narrow
 * so the bartender's tap can't hit it by mistake"*. Inside the primitive that
 * row would become a full-width control in the actions region — directly under
 * the thumb. Reverting an active token is money going backwards at a bar with a
 * queue in front of it, so a conversion that makes it **easier** to hit is a
 * behaviour change on the money path wearing a visual costume. `checkin-offline`
 * asymmetry, on the other side of the counter.
 *
 * Their **inks** are converted, since a token substitution moves no geometry.
 * Their **shells** are not. The dialog ratchet therefore still names this file,
 * correctly: one hand-rolled overlay left here, and it is declared rather than
 * hidden from the matcher.
 *
 * ── Focus: before, nothing. After, the close control ─────────────────────────
 *
 * The hand-rolled confirmation focused nothing on open, trapped nothing, and
 * left the page behind it fully reachable. It is now the platform's modal, which
 * supplies Escape, the trap and background inertness by specification.
 *
 * **No `data-initial-focus` marker is declared, and that is a decision rather
 * than an omission.** The marker exists to name a control less destructive than
 * the primitive's fallback — and here there is none: this panel holds exactly
 * one affirmative answer and the close control, and the close control is both
 * first in the DOM and the least destructive by construction
 * (`Dialog.tsx:117-147`). Declaring a marker would have required **adding a
 * Cancel control**, which is a new user-visible word on a money confirmation;
 * the copy rule is the more restrictive of the two and it wins
 * (`meta-gates.md`). Enter therefore lands on the close control and closes —
 * it never confirms.
 *
 * ── The affirmative control keeps the accent fill, and is NOT destructive ────
 *
 * Activating a token moves it `purchased → active`, and the screen it opens
 * carries an explicit path back to `purchased`. **The step is reversible by
 * design** — that is what the bartender's Cancel row is for — so it is not the
 * same class of control as a refund and does not take the critical rung. The
 * destructive rung is for acts that destroy; this one claims a drink somebody
 * already bought.
 */

interface RedeemConfirmationModalProps {
  drinkName: string;
  signedToken: string;
  /** If the token is already in 'active' state on open, jump straight to the bartender screen. */
  initialActive?: boolean;
  onClose: () => void;
  /** Token transitioned to 'active' (customer just confirmed). */
  onActivated?: () => void;
  /** Token finalized to 'redeemed' (bartender just served). */
  onRedeemed: () => void;
  /** Token reverted to 'purchased' (customer cancelled). */
  onCancelled?: () => void;
}

type Phase = "confirm" | "activating" | "active" | "serving" | "served" | "cancelling";

export default function RedeemConfirmationModal({
  drinkName,
  signedToken,
  initialActive = false,
  onClose,
  onActivated,
  onRedeemed,
  onCancelled,
}: RedeemConfirmationModalProps) {
  const [phase, setPhase] = useState<Phase>(initialActive ? "active" : "confirm");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const servedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
    CINQUE SECONDI, E IL NUMERO E' PER CHI STA AL BANCO.

    La sequenza dichiarata dal proprietario il 2026-08-19 e': **si tocca, si
    legge SERVED, poi si versa**. La lettura avviene AL TOCCO, quindi questa
    schermata deve sopravvivere alla lettura — non alla versata.

    Una prima stesura della fase 47 chiedeva che non si chiudesse affatto,
    temendo un barista che preme, si gira a prendere il bicchiere e torna a
    conferma scaduta. Quel timore descrive un ordine diverso — premi, versa, poi
    verifica — che NON e' quello in uso. Il congedo manuale e' stato valutato e
    scartato.

    Abbassare questo numero toglie a chi sta al banco l'unico controllo che ha in
    mano. Vedi `.planning/v1.6-PHASE-47-PROBE.md`.
  */
  useEffect(() => {
    if (phase !== "served") return;
    servedTimerRef.current = setTimeout(() => {
      onRedeemed();
      onClose();
    }, 5000);
    return () => {
      if (servedTimerRef.current) clearTimeout(servedTimerRef.current);
    };
  }, [phase, onRedeemed, onClose]);

  const handleActivate = useCallback(() => {
    setError(null);
    setPhase("activating");
    startTransition(async () => {
      try {
        await redeemDrinkToken(signedToken, "activate");
        setPhase("active");
        onActivated?.();
      } catch (err) {
        setPhase("confirm");
        setError(err instanceof Error ? err.message : "Activation failed.");
      }
    });
  }, [signedToken, startTransition, onActivated]);

  /*
    `setPhase("served")` STA DOPO L'`await`, E NON E' UNO STILE: E' UNA GARANZIA.

    Il barista consegna il drink perche' ha visto questa schermata. Se comparisse
    prima della conferma del server, un momento di rete assente produrrebbe un
    drink versato e un token mai riscattato — cioe' esattamente il difetto che la
    fase 47 e' andata a chiudere, riaperto da un'ottimizzazione dell'interfaccia.

    NESSUNA TRANSIZIONE DI STATO DI QUESTO TOKEN DIVENTA OTTIMISTICA. Chi in
    futuro volesse «rendere piu' reattiva» questa modale sta togliendo la sola
    cosa che rende affidabile la procedura del banco.

    Misurato in laboratorio il 2026-08-19: `.planning/v1.6-PHASE-47-PROBE.md`.
  */
  const handleServe = useCallback(() => {
    setError(null);
    setPhase("serving");
    startTransition(async () => {
      try {
        await redeemDrinkToken(signedToken, "serve");
        setPhase("served");
      } catch (err) {
        setPhase("active");
        setError(err instanceof Error ? err.message : "Redemption failed.");
      }
    });
  }, [signedToken, startTransition]);

  const handleCancel = useCallback(() => {
    setError(null);
    setPhase("cancelling");
    startTransition(async () => {
      try {
        await redeemDrinkToken(signedToken, "cancel");
        onCancelled?.();
        onClose();
      } catch (err) {
        setPhase("active");
        setError(err instanceof Error ? err.message : "Cancellation failed.");
      }
    });
  }, [signedToken, startTransition, onCancelled, onClose]);

  const handleServedTap = useCallback(() => {
    if (servedTimerRef.current) clearTimeout(servedTimerRef.current);
    onRedeemed();
    onClose();
  }, [onRedeemed, onClose]);

  /**
   * Every route out of the confirmation runs through here — the close control,
   * Escape, and the platform's own close event — so none of them can leave a
   * stale refusal behind. The caller unmounts this panel as well, but the rule
   * holds here rather than depending on that.
   */
  const closeConfirm = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  if (phase === "served") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-ground/95 backdrop-blur-md"
        onClick={handleServedTap}
      >
        <div className="text-center">
          <p
            className="text-6xl font-bold text-accent"
            style={{ animation: "servedScale 400ms ease-out forwards" }}
          >
            SERVED
          </p>
          <p className="mt-4 text-lg text-ink-2">{drinkName}</p>
        </div>
        <style>{`
          @keyframes servedScale {
            from { transform: scale(0.5); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Active screen — full-bleed tap target so the bartender doesn't have to aim
  if (phase === "active" || phase === "serving" || phase === "cancelling") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-ground/95 backdrop-blur-md">
        {/* Big tap-to-serve area: takes the whole screen above the Cancel row */}
        <button
          type="button"
          onClick={handleServe}
          disabled={isPending}
          className="flex flex-1 flex-col items-center justify-center px-6 text-center transition-colors active:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-accent animate-pulse">
            {phase === "serving" ? "Serving..." : "Tap anywhere to serve"}
          </p>
          {/*
            The step moves to the phase's own boundary and is not deleted: the
            drink name is what a bartender reads at a glance in a dark room, and
            one size for every width would have decided that by default. It was
            written at a second breakpoint this contract does not use, which is
            the only thing that changed.
          */}
          <p className="mt-4 text-4xl md:text-5xl font-bold text-ink">
            {drinkName}
          </p>
          <p className="mt-2 text-sm text-ink-2">Active — awaiting service</p>
          {/*
            Announced rather than merely printed. It was a tinted box that said
            nothing to anyone not looking at it, and there is no error tracking
            behind it to notice either.
          */}
          {error && (
            <span role="alert" className="mt-6 text-sm text-sem-crit">
              {error}
            </span>
          )}
          <p className="mt-12 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-ground">
            {phase === "serving" ? "Serving..." : "Mark as served"}
          </p>
        </button>

        {/* Cancel row, kept narrow so the bartender's tap can't hit it by mistake */}
        <div className="px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="mx-auto block rounded-full border border-control bg-transparent px-6 py-2 text-xs font-medium text-ink-2 transition-colors hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "cancelling" ? "Cancelling..." : "Cancel"}
          </button>
        </div>
      </div>
    );
  }

  // Initial confirm (or activating)
  return (
    <Dialog
      open
      onClose={closeConfirm}
      title="Redeem Drink"
      status={error ? { tone: "crit", message: error } : null}
      actions={
        <Button
          className="w-full"
          onClick={handleActivate}
          disabled={isPending}
        >
          {phase === "activating" ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Activating...
            </span>
          ) : (
            "Confirm"
          )}
        </Button>
      }
    >
      <p className="text-center text-xl font-semibold text-ink">{drinkName}</p>
    </Dialog>
  );
}
