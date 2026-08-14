"use client";

import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Input";

import { requestRefund } from "../refund-actions";

/**
 * The ticket holder's own refund request — a confirmation for money leaving,
 * on a control nothing renders.
 *
 * ── Why a file with no importer was converted (D-41.2-03) ────────────────────
 *
 * A tree-wide search for this component's name returns this file's own
 * declarations and nothing else: **it has no importer at all**, so no surface
 * conversion in this phase reaches it and the ratchet entry naming it — *a
 * hand-rolled overlay on the ticket surface, a refund request, which is money
 * leaving* — could not reach zero as a by-product. Converting is the only
 * disposition that decides nothing outside this phase: deleting would answer a
 * product question that is not this phase's, and a permanent exemption would
 * claim a file will never convert.
 *
 * The needle is described rather than spelled, for the reason
 * `refund-actions.ts:24-28` states in place: to a census counting occurrences,
 * a literal in a comment is an occurrence.
 *
 * **It gained no importer here.** Giving it one would restore a feature, and
 * that is D-41.2-03's deferred half, still deferred.
 *
 * ── The money path is untouched, and that is the point ───────────────────────
 *
 * One server action is called from here and it is called with **the same
 * arguments, in the same order, as before**: the ticket identifier and the
 * free-text reason. No status transition, no refund amount, no idempotency key
 * and no webhook path is written, read or reshaped by this file — it renders
 * controls and reports what the action returned. The action module was read in
 * order to be able to tell a rendering change from a payload change, and it was
 * not edited.
 *
 * The copy is byte-identical. Every label, every placeholder and the one
 * fallback sentence are the ones that were here.
 *
 * ── The confirmation, and what it gained ─────────────────────────────────────
 *
 * It was a hand-rolled overlay: no Escape, no focus trap, nothing focused on
 * open, and the page behind it fully reachable. It is now the platform's modal
 * element, which supplies all three by specification.
 *
 * §11 applied verbatim, because this control asks for money to come back out:
 * **Cancel is first in the DOM, first in the tab order, carries the
 * initial-focus marker the modal honours imperatively after opening, and is the
 * secondary rung. The confirming control is the destructive rung and is focused
 * by nothing. There is no Enter-to-confirm.**
 *
 * **Before, the focus target was: nothing** — the overlay was a plain `div`,
 * it called nothing on open, and this file has never carried the React
 * autofocus prop. **After, it is Cancel.** That is read out of the file rather
 * than inferred; `src/components/ui/Dialog.tsx:117-147` is why the attribute
 * form would not have delivered it either.
 *
 * The refusal is the primitive's status region rather than a paragraph inside
 * the panel — and never a toast, which a native dialog paints over. It is reset
 * by `closeDialog`, so **every route out of the confirmation** — the close
 * control, Escape and Cancel — runs through one function and none of them can
 * leave a stale refusal behind.
 *
 * The modal is mounted only while it is open.
 *
 * ── One finding carried forward rather than fixed ────────────────────────────
 *
 * **The refusal collapses every cause into one sentence.** The catch arm
 * reports whatever the action threw, or a single bare fallback when it carried
 * none — so a failed authentication, a ticket that is not the caller's, and a
 * request that is already pending are indistinguishable on screen. This project
 * has no error tracking, so a refusal a person cannot read is a refusal nobody
 * ever reads. Naming each cause is a rewrite of a money surface's copy and
 * belongs to a plan that owns that decision; it is recorded in this phase's
 * `deferred-items.md`, not performed here.
 */

interface RefundRequestButtonProps {
  ticketId: string;
}

export default function RefundRequestButton({ ticketId }: RefundRequestButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const reasonId = useId();

  /**
   * Every route out of the confirmation runs through here — the close control,
   * Escape, and Cancel — so none of them can leave a stale refusal behind.
   */
  function closeDialog() {
    setError(null);
    setShowDialog(false);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await requestRefund(ticketId, reason);
        setSuccess(true);
        setShowDialog(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (success) {
    /*
      Announced rather than merely printed: the outcome replaces the control
      that produced it, so a person not looking at this corner of the page was
      told nothing at all — and there is no error tracking behind it to notice
      either. The sentence is unchanged.
    */
    return (
      <div
        role="status"
        className="rounded-xl border border-sem-warn/30 bg-sem-warn/10 p-4 text-center"
      >
        <p className="text-sm font-medium text-sem-warn">
          Refund request submitted
        </p>
      </div>
    );
  }

  return (
    <>
      {/*
        The control that merely OPENS the refusal takes the outlined rung; the
        one that performs it takes the destructive rung, below. That asymmetry
        is the whole shape of §11, and `RefundActions.tsx:117` is the same
        choice on the staff side of the same act.
      */}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setShowDialog(true)}
      >
        Request Refund
      </Button>

      {showDialog && (
        <Dialog
          open
          onClose={closeDialog}
          title="Request Refund"
          status={error ? { tone: "crit", message: error } : null}
          actions={
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                data-initial-focus
                onClick={closeDialog}
                disabled={isPending}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                className="flex-1"
                disabled={isPending}
                onClick={handleSubmit}
              >
                {isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          }
        >
          {/*
            The field had no programmatic name at all: a screen reader
            announced it as an editable region and nothing else. The name is
            the placeholder's own words, so nothing a person reads changed.
          */}
          <Textarea
            id={reasonId}
            aria-label="Why do you want a refund? (optional)"
            placeholder="Why do you want a refund? (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </Dialog>
      )}
    </>
  );
}
