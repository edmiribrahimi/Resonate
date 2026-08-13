"use client";

import { useId, useState, useTransition } from "react";

import { approveRefund, rejectRefund, adminRefund } from "@/app/(public)/tickets/refund-actions";
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
 * Three server actions are called from here and **all three are called with the
 * same arguments, in the same order, as before**: the ticket identifier, the
 * refund identifier and the free-text reason. No status transition, no refund
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
 * ── Three colours were lost, and each loss is a decision ─────────────────────
 *
 * The completion mark, the affirmative control and the two refusing controls
 * each carried a raw palette hue. The mark becomes the neutral badge and the
 * controls take the ladder's rungs — the affirmative one the accent fill, the
 * one that confirms a refusal the critical fill, the one that merely opens the
 * refusal the outlined rung. D-41.1-25 refuses a tone per outcome and D-41.1-29
 * measured the two semantic fills that would have carried one at **1.23 : 1**
 * against each other, where 3 : 1 is the threshold for telling two components
 * apart. The word is the channel, and it is the only channel this token set can
 * currently support.
 *
 * ── Two findings carried forward rather than fixed ───────────────────────────
 *
 *  1. **Approving a refund moves money on a single press, with no
 *     confirmation.** The refusing path has a two-step shape and the approving
 *     path does not, which is the asymmetry the wrong way round. Adding a
 *     confirmation is a behaviour change on a money path; it is reported, not
 *     performed here.
 *  2. **Every failure below collapses into one word.** The catch arms report
 *     whatever the action threw, or a single bare fallback when it carried no
 *     message — so a permission refusal, a network fault and a provider error
 *     are indistinguishable on screen. This project has no error tracking, so a
 *     refusal a person cannot read is a refusal nobody ever reads. Naming each
 *     cause is a rewrite of a money surface's copy and belongs to a plan that
 *     owns that decision.
 */

interface RefundActionsProps {
  refundId?: string;
  ticketId?: string;
  isDirectRefund?: boolean;
}

export default function RefundActions({ refundId, ticketId, isDirectRefund }: RefundActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const refundReasonId = useId();
  const rejectNoteId = useId();

  /**
   * Every route out of the confirmation runs through here — the close control,
   * Escape, and Cancel — so none of them can leave a stale refusal behind.
   */
  function closeConfirm() {
    setError(null);
    setShowConfirm(false);
  }

  if (done) {
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
            status={error ? { tone: "crit", message: error } : null}
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
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      try {
                        await adminRefund(ticketId, refundReason);
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

  // Approve/reject pending refund request
  if (refundId) {
    return (
      <div>
        {/*
          The failure is announced rather than merely printed. It was a plain
          paragraph, so a person not looking at this row was told nothing at
          all — and there is no error tracking behind it to notice either.
        */}
        {error && <p role="alert" className="mb-2 text-xs text-sem-crit">{error}</p>}

        {showReject ? (
          <div className="space-y-2">
            <Textarea
              id={rejectNoteId}
              aria-label="Reason for rejection (optional)"
              placeholder="Reason for rejection (optional)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowReject(false)}
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    try {
                      await rejectRefund(refundId, rejectNote);
                      setDone(true);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed");
                    }
                  });
                }}
              >
                {isPending ? "..." : "Confirm Reject"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await approveRefund(refundId);
                    setDone(true);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed");
                  }
                });
              }}
            >
              {isPending ? "..." : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              disabled={isPending}
              onClick={() => setShowReject(true)}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
