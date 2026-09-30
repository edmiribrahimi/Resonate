"use client";

import { useId, useState, useTransition } from "react";

import { adminRefund } from "@/app/(public)/tickets/refund-actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Input";

/**
 * The per-row refund control — the one a work surface actually presses.
 *
 * ── Converted here as spine, and that is a scheduling decision ───────────────
 *
 * **Two work surfaces mount this file** — the event's sales dashboard and the
 * tickets surface — which is why the research map counts it among the phase's
 * shared visual files. D-41.1-15 says a shared component two plans would both
 * touch is either converted in an earlier wave as spine or assigned to exactly
 * one plan. It is converted here, ahead of both, so that the sales plan and the
 * tickets plan stay two plans instead of being merged into one. Recorded so the
 * next reader knows the merger was avoided deliberately rather than missed.
 *
 * ── The money path is untouched, and that is the point of this plan ──────────
 *
 * One server action is called from here, `adminRefund`, **with the same
 * arguments, in the same order, as before**: the ticket identifier and the
 * free-text reason. (Until 2026-09-30 two more were called — the approval and
 * the rejection of a client's refund request. They left with D-52.2-06: no
 * client can ask for a refund any more, D-52.2-05.) No status transition, no refund
 * amount, no idempotency key and no webhook path is written, read or reshaped by
 * this file — it renders controls and reports what the action returned. The
 * action module was read in order to be able to tell a rendering change from a
 * payload change, and it was not edited.
 *
 * The copy is byte-identical. Every label, every placeholder and every fallback
 * sentence is the one that was here.
 *
 * ── The confirmation, and what it gained ─────────────────────────────────────
 *
 * The direct refund's own confirmation was a hand-rolled overlay: no Escape, no
 * focus trap, nothing focused on open, and the page behind it fully reachable.
 * It is now the platform's modal element, which supplies all three by
 * specification. Cancel is first in the DOM, is the secondary rung and carries
 * the initial-focus marker the modal honours imperatively after opening; the
 * confirming control is the destructive rung and is focused by nothing.
 *
 * **Before, the focus target was: nothing.** After, it is Cancel. That is a
 * measurement rather than a reading of intent — see
 * `src/components/ui/Dialog.tsx:117-147` for why the React autofocus prop would
 * not have delivered it either.
 *
 * The modal is mounted only while it is open, which keeps the DOM cost of a
 * long list of rows exactly what it was: one confirmation at a time, not one per
 * row.
 *
 * ── The colour of the completion mark is a decision ──────────────────────────
 *
 * The completion mark carried a raw palette hue and became the neutral badge.
 * D-41.1-25 refuses a tone per outcome and D-41.1-29 measured the two semantic
 * fills that would have carried one at **1.23 : 1** against each other, where
 * 3 : 1 is the threshold for telling two components apart. The word is the
 * channel, and it is the only channel this token set can currently support.
 *
 * ── A finding carried forward rather than fixed ──────────────────────────────
 *
 * **Every failure below collapses into one word.** The catch arms report
 * whatever the action threw, or a single bare fallback when it carried no
 * message — so a permission refusal, a network fault and a provider error
 * are indistinguishable on screen. This project has no error tracking, so a
 * refusal a person cannot read is a refusal nobody ever reads. Naming each
 * cause is a rewrite of a money surface's copy and belongs to a plan that
 * owns that decision.
 */

/**
 * The refund went through but the email to the holder did not (phase 52.2,
 * RFD-01). It is not a failure of the action -- the money is back and the
 * ticket is gone -- but it must not close in silence: the holder still believes
 * they have a valid ticket, and the door will refuse it. There is no error
 * tracking, so this is where the organizer finds out.
 */
const NOT_NOTIFIED_MESSAGE =
  "Refunded. The holder could not be emailed — tell them before the night: the ticket is no longer valid.";

interface RefundActionsProps {
  ticketId?: string;
  isDirectRefund?: boolean;
}

export default function RefundActions({ ticketId, isDirectRefund }: RefundActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [notNotified, setNotNotified] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const refundReasonId = useId();

  /**
   * Every route out of the confirmation runs through here — the close control,
   * Escape, and Cancel — so none of them can leave a stale refusal behind.
   */
  function closeConfirm() {
    setError(null);
    setShowConfirm(false);
    // The refund went through even though the email did not: once the notice
    // has been read, the row is done.
    if (notNotified) setDone(true);
  }

  if (done) {
    if (notNotified) {
      return (
        <div>
          <Badge>Done</Badge>
          <p role="alert" className="mt-2 text-xs text-sem-crit">
            {NOT_NOTIFIED_MESSAGE}
          </p>
        </div>
      );
    }
    return <Badge>Done</Badge>;
  }

  // Direct refund from ticket list
  if (isDirectRefund && ticketId) {
    return (
      <>
        <Button size="sm" variant="secondary" onClick={() => setShowConfirm(true)}>
          Refund
        </Button>

        {showConfirm && (
          <Dialog
            open
            onClose={closeConfirm}
            title="Confirm Refund"
            status={
              error
                ? { tone: "crit", message: error }
                : notNotified
                  ? { tone: "crit", message: NOT_NOTIFIED_MESSAGE }
                  : null
            }
            actions={
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  data-initial-focus
                  onClick={closeConfirm}
                  disabled={isPending}
                >
                  Cancel
                </Button>

                <Button
                  variant="destructive"
                  className="flex-1"
                  // After a refund that could not be emailed the dialog stays
                  // open to say so, and this control must not refund twice.
                  disabled={isPending || notNotified}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      try {
                        const result = await adminRefund(ticketId, refundReason);
                        if (result.notified === false) {
                          setNotNotified(true);
                          return;
                        }
                        setDone(true);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed");
                      }
                    });
                  }}
                >
                  {isPending ? "Processing..." : "Refund"}
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
              id={refundReasonId}
              aria-label="Reason (optional)"
              placeholder="Reason (optional)"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={2}
            />
          </Dialog>
        )}
      </>
    );
  }

  return null;
}
