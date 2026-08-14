"use client";

import { useState, useCallback, useEffect } from "react";

import { SumUpCardWidget } from "@/components/SumUpCardWidget";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * The panel a card is entered into — the platform's modal, around a mount point
 * this file does not touch.
 *
 * ── Nothing about the payment moved, and that is the point of this plan ──────
 *
 * This file holds no server action, no route and no arithmetic. It owns four
 * pieces of local state that describe **what is on screen**, and it reports what
 * the provider's widget called back with. No status transition, no amount, no
 * idempotency key and no webhook path is written, read or reshaped here.
 *
 * In particular the widget's props — the checkout identifier and the three
 * callbacks — are passed exactly as before, and **the element the provider
 * mounts into is not in this file at all**. Tidying a third-party mount point
 * would be a behaviour change on the purchase path wearing a visual costume.
 *
 * The copy is byte-identical: both titles, both success sentences, the loading
 * sentence, the failure fallback and the dismiss label are the ones that were
 * here.
 *
 * ── Four phone-tier prefixes DELETED, not migrated ───────────────────────────
 *
 * The overlay wrote its own sheet-versus-window pair — bottom anchored on a
 * phone, centred above the boundary, the sheet's bottom padding — plus a
 * **second** height clamp for the wide case. The primitive owns all of it
 * (`Dialog.tsx:278-280`), and its clamp is one unprefixed value, so the four
 * prefixed classes are gone rather than moved to the tier this contract uses.
 * Migrating them would have left a second author for a decision the primitive
 * already makes.
 *
 * The body's own scroll is gone for the same reason: the primitive's body is
 * the only scroller, and two scrollers is the same defect in another family.
 *
 * ── The failure is reported inside the panel, never by a toast ───────────────
 *
 * A native dialog paints in the top layer, above the toast container, so a
 * refusal raised from in here would be raised invisibly — and this repository
 * has no error tracking, which makes a message nobody sees a message that
 * exists nowhere. It is the primitive's `status`, which sits **outside** the
 * scroller and therefore cannot appear below the fold.
 *
 * ── Focus, and why no marker is declared ─────────────────────────────────────
 *
 * Nothing on this panel is destructive: its one answer is the provider's own
 * form, and the only control this file draws is the dismissal. So no
 * `data-initial-focus` is claimed and the primitive focuses the close control,
 * first in the DOM and least destructive by construction. Before the
 * conversion, the focus target was **nothing at all**.
 */

interface SumUpCheckoutModalProps {
  checkoutId: string;
  onClose: () => void;
  onPaymentComplete: () => void;
}

type ModalStatus = "loading" | "ready" | "success" | "error";

export default function SumUpCheckoutModal({
  checkoutId,
  onClose,
  onPaymentComplete,
}: SumUpCheckoutModalProps) {
  const [status, setStatus] = useState<ModalStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoad = useCallback(() => {
    setStatus("ready");
  }, []);

  const handleSuccess = useCallback(
    (_body: Record<string, unknown>) => {
      setStatus("success");
    },
    []
  );

  const handleError = useCallback((body: Record<string, unknown>) => {
    setStatus("error");
    setErrorMessage(
      (body.message as string) || (body.error as string) || "Payment failed. Please try again."
    );
  }, []);

  // Auto-complete after success
  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => {
      onPaymentComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [status, onPaymentComplete]);

  return (
    <Dialog
      open
      onClose={onClose}
      title={status === "success" ? "Payment Successful" : "Complete Payment"}
      status={
        status === "error" && errorMessage
          ? { tone: "crit", message: errorMessage }
          : null
      }
      actions={
        status === "error" ? (
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        ) : undefined
      }
    >
      {/* Body */}
      {status === "loading" && (
        <p className="text-sm text-ink-2">Loading payment form...</p>
      )}

      {status === "success" && (
        <div className="text-center py-4">
          <p className="text-lg font-medium text-sem-done">
            Payment received!
          </p>
          <p className="mt-1 text-sm text-ink-2">
            Your ticket is being confirmed...
          </p>
        </div>
      )}

      {/*
        Card Widget: render when not in success state.

        The condition, the props and the wrapper are the ones that were here.
        The provider's script decides when it is ready and where it draws; this
        file only decides whether the region exists.
      */}
      {status !== "success" && (
        <div className={status === "loading" ? "mt-4" : ""}>
          <SumUpCardWidget
            checkoutId={checkoutId}
            onSuccess={handleSuccess}
            onError={handleError}
            onLoad={handleLoad}
          />
        </div>
      )}
    </Dialog>
  );
}
