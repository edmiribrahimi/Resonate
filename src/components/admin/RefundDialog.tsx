"use client";

import { useId, useState, useTransition } from "react";

import { refundTransactionAction } from "@/app/(admin)/admin/finance/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

/**
 * The confirmation the finance ledger asks before money leaves the business.
 *
 * ── What this conversion changed, and what it deliberately did not ───────────
 *
 * **Nothing about the money changed.** No status transition, no refund amount,
 * no idempotency key and no webhook path was touched: the arithmetic below is
 * the file's own, `refundTransactionAction` is called with the same two
 * arguments in the same order, and the rule the payment domain already carries —
 * verify a payment's state at the provider, never from an announcement — lives
 * behind that action and is not restated, weakened or duplicated here.
 *
 * The copy is byte-identical. §11 of the design contract says of a destructive
 * confirmation: *none introduced*. Rewording what an operator reads before
 * moving somebody else's money is a decision, and it is not a conversion's.
 *
 * ── The focus target: what it was, and what it is ────────────────────────────
 *
 * **Before:** nothing was focused. This was a hand-rolled overlay, not a
 * `<dialog>`, so opening it moved focus nowhere — it stayed on the row control
 * that opened it, *behind* the scrim, with no focus trap, no Escape, and the
 * page behind still reachable by Tab and by pointer.
 *
 * **After:** the platform's modal element focuses the Cancel control
 * imperatively, immediately after the modal opens. Cancel is first in the DOM,
 * first in the tab order, carries the initial-focus marker, and is the
 * secondary rung; the confirming control is the destructive rung and is focused
 * by nothing. A confirmation whose Enter key performs the act is a confirmation
 * that did not ask.
 *
 * **Why the marker and not React's autofocus prop.** Measured against the
 * installed React and recorded at `src/components/ui/Dialog.tsx:117-147`: the
 * prop is skipped by the attribute writer, so no autofocus attribute ever
 * reaches the DOM, and the user agent's own focusing step then lands on the
 * first focusable element instead. The marker is the mechanism that survives;
 * the prop is the half that loses. This file never carried the prop, so nothing
 * was removed — it is stated because "it already focused Cancel" is a claim a
 * later reader would otherwise have to take on trust, and it was not true.
 *
 * So this conversion makes the refund **harder** to trigger by accident than it
 * was, not easier. Escape, the focus trap and the inert background all arrive by
 * specification with the modal element; none of the three existed here before.
 *
 * ── Two colours were lost, and the loss is a decision rather than an oversight
 *
 * The already-refunded figure and the refundable figure each carried a raw
 * palette hue. They now read in the ordinary ink, and the label beside each is
 * the channel. D-41.1-25 refuses a tone per outcome — *a refusal is a
 * communication, not a hue* — and D-41.1-29 measured the two semantic fills a
 * replacement would have used at **1.23 : 1** against each other, where WCAG
 * 1.4.11 asks 3 : 1 to tell two components apart. The palette could not carry
 * the distinction even if the contract allowed it.
 *
 * ── The failure is the dialog's own, in the dialog's own panel ───────────────
 *
 * The refusal is handed to the modal's status region, which announces it as an
 * alert in the critical ink and keeps it above the scrolling body. It is never
 * raised as a toast: a native modal paints in the top layer, above every stacking
 * index, so a toast reporting a failed refund would report it invisibly — and
 * this project has **no error tracking**, so a message nobody sees is a message
 * that exists nowhere.
 *
 * **A finding carried forward, not fixed here.** The refusal below collapses
 * every cause into whatever sentence the action threw, with a single bare
 * fallback when the throw carried no message. That is the shape the project has
 * already recorded as indebuggable. Naming each cause is the right repair and it
 * is a rewrite of a money path's copy, so it is reported rather than performed.
 */

interface RefundDialogProps {
  transactionCode: string;
  transactionAmount: number;
  refundedAmount: number;
  feeAmount: number;
  payoutDate?: string | null;
  currency: string;
  onClose: () => void;
  onRefundComplete: (amount: number, isFullRefund: boolean) => void;
}

export default function RefundDialog({
  transactionCode,
  transactionAmount,
  refundedAmount,
  feeAmount,
  payoutDate,
  currency,
  onClose,
  onRefundComplete,
}: RefundDialogProps) {
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [customAmount, setCustomAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const amountFieldId = useId();

  const maxRefundable = transactionAmount - refundedAmount;
  const refundAmount =
    refundType === "full" ? maxRefundable : parseFloat(customAmount) || 0;
  const isFullRefund =
    refundType === "full" || refundAmount >= maxRefundable;
  const isValidAmount =
    refundType === "full" ||
    (refundAmount > 0 && refundAmount <= maxRefundable);

  /**
   * Every route out of this dialog runs through here — the close control,
   * Escape, and the Cancel button — so no route can leave a stale refusal
   * behind. The analog puts the reset in exactly one place for that reason.
   */
  function close() {
    setError(null);
    onClose();
  }

  function handleConfirm() {
    if (!isValidAmount) return;
    setError(null);
    startTransition(async () => {
      try {
        // For full refund, pass undefined (no amount param = SumUp refunds entire transaction)
        // For partial refund, pass the specific amount
        await refundTransactionAction(
          transactionCode,
          isFullRefund ? undefined : refundAmount
        );
        onRefundComplete(refundAmount, isFullRefund);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refund failed");
      }
    });
  }

  return (
    <Dialog
      open
      onClose={close}
      title="Confirm Refund"
      status={error ? { tone: "crit", message: error } : null}
      actions={
        <div className="flex gap-3">
          {/*
            Cancel first in the DOM, first in the tab order, and it carries the
            marker the modal focuses on open. The order is the contract's:
            the refusal, then the act.
          */}
          <Button
            variant="secondary"
            className="flex-1"
            data-initial-focus
            onClick={close}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleConfirm}
            disabled={isPending || !isValidAmount}
          >
            {isPending ? "Processing..." : "Confirm Refund"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Transaction summary */}
        <Card>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Original amount</span>
            <span className="font-semibold text-ink">
              {currency} {transactionAmount.toFixed(2)}
            </span>
          </div>
          {refundedAmount > 0 && (
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-muted">Already refunded</span>
              <span className="font-semibold text-ink">
                {currency} {refundedAmount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted">Refundable</span>
            <span className="font-semibold text-ink">
              {currency} {maxRefundable.toFixed(2)}
            </span>
          </div>
        </Card>

        {/*
          Full/Partial toggle -- two radio-style buttons.

          They become the shared selectable pill, which carries the 44px floor
          and says which of the two is current to a screen reader as well as to
          an eye — today the selection was announced by a fill and by nothing
          else. A grouped radio would be the more exact semantic still; that is
          a behaviour decision and is reported rather than taken inside a
          conversion of a money surface.
        */}
        <div className="grid grid-cols-2 gap-2">
          <Chip
            className="w-full"
            selected={refundType === "full"}
            onClick={() => setRefundType("full")}
          >
            Full Refund
          </Chip>
          <Chip
            className="w-full"
            selected={refundType === "partial"}
            onClick={() => setRefundType("partial")}
          >
            Partial Refund
          </Chip>
        </div>

        {/* Custom amount input (only shown for partial) */}
        {refundType === "partial" && (
          <Input
            id={amountFieldId}
            label={`Refund amount (${currency})`}
            type="number"
            min="0.01"
            max={maxRefundable}
            step="0.01"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder={`Max ${maxRefundable.toFixed(2)}`}
            error={
              customAmount !== "" && !isValidAmount
                ? `Amount must be between 0.01 and ${maxRefundable.toFixed(2)}`
                : undefined
            }
          />
        )}

        {/*
          Fee warning -- only shown when payout already processed.

          A standing caution rather than a failure, so it is not the status
          region: that one is for the outcome of the act. It takes the warning
          ink and no box — a boundary around a single sentence states nothing
          the sentence does not.
        */}
        {payoutDate && feeAmount > 0 && (
          <p className="text-xs text-sem-warn">
            SumUp fee of {currency} {feeAmount.toFixed(2)} is non-refundable
            (payout already processed).
          </p>
        )}

        {/*
          Refund amount summary before confirm. This is the figure that decides
          how much money moves, so it stays the heaviest thing in the body
          (D-41.1-13) and is never demoted to a supporting line.
        */}
        <p className="text-center text-sm text-muted">
          Refunding{" "}
          <span className="font-bold text-ink">
            {currency} {refundAmount.toFixed(2)}
          </span>
        </p>
      </div>
    </Dialog>
  );
}
