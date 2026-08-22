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
 * here. **That sentence still holds for every caller that passes no
 * `successOutcome`** — the drinks path — and the block below explains the one
 * caller for which it gains a third paragraph.
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
 * ── `successOutcome`, ADDED 2026-08-22, and why it is OPTIONAL ───────────────
 *
 * **This panel is shared with the drinks path**, and that is the whole reason
 * the new prop is optional rather than a rewrite of the success state.
 * `DrinkMenu.tsx` and `menu/GuestDrinkMenu.tsx` mount this same file, and the
 * owner's decision is explicit: **the two paths are not unified.** A drink is
 * the same night and a few euros; a ticket is not. So when no `successOutcome`
 * is passed the success state is **byte-identical to what it was** — the same
 * two sentences, the same 2.5s timer, the same `onPaymentComplete`.
 *
 * When it IS passed, three things change and only for that caller:
 *
 *   1. **The timer does not run.** A destination that vanishes after two and a
 *      half seconds is not a destination. The dismissal is the person's.
 *   2. The panel says **where the thing they just bought lives**.
 *   3. It offers the address, and beside it the old behaviour — dismiss and
 *      reload — so nothing that worked before stops working.
 *
 * **The copy the caller passes must not promise an account.** Guest purchase is
 * a constraint the owner set on 2026-08-22; a sentence that promised a session
 * would become false for some buyers. Said here because this is the file a
 * future caller reads before writing that sentence.
 *
 * ── What did NOT change, and it is the load-bearing half ─────────────────────
 *
 * No status transition, no amount, no idempotency key and no webhook path is
 * written, read or reshaped. The widget's props — the checkout identifier and
 * the three callbacks — are passed exactly as before, the element the provider
 * mounts into is still not in this file, and `handleSuccess`, `handleError` and
 * `handleLoad` are untouched.
 *
 * **`PendingIntentHandler.tsx` was deliberately NOT edited**, so the resumed
 * purchase keeps the old behaviour. Its six resumption conditions are
 * byte-identical on purpose — a condition changed there is a purchase that
 * silently does not resume, on a page with no error tracking — and the gap that
 * leaves is declared rather than closed by touching it.
 *
 * ── Focus, and why no marker is declared ─────────────────────────────────────
 *
 * Nothing on this panel is destructive: its one answer is the provider's own
 * form, and every control this file draws is either a dismissal or a link to a
 * page. So no `data-initial-focus` is claimed and the primitive focuses the
 * close control, first in the DOM and least destructive by construction. Before
 * the conversion, the focus target was **nothing at all**.
 *
 * The two controls added with `successOutcome` do not change that reading: a
 * navigation is not a destruction, and neither is dismissing a panel whose
 * payment has already completed.
 */

/**
 * Where the thing that was just paid for lives, and how to say so.
 *
 * Optional on purpose — see the docblock. A caller that passes it gets an
 * explicit destination and no auto-dismiss; a caller that omits it gets exactly
 * the panel that was here before.
 */
export interface CheckoutSuccessOutcome {
  /** One sentence saying where it is. Must not presuppose an account. */
  readonly message: string;
  /** The address it is at. */
  readonly href: string;
  /** The label on the control that goes there. */
  readonly label: string;
}

interface SumUpCheckoutModalProps {
  checkoutId: string;
  onClose: () => void;
  onPaymentComplete: () => void;
  readonly successOutcome?: CheckoutSuccessOutcome;
}

type ModalStatus = "loading" | "ready" | "success" | "error";

export default function SumUpCheckoutModal({
  checkoutId,
  onClose,
  onPaymentComplete,
  successOutcome,
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

  // Auto-complete after success.
  //
  // ── The one condition added, and why it is a guard and not a rewrite ───────
  //
  // With a `successOutcome` the panel offers an address, and an address that
  // disappears after two and a half seconds is not an address: the timer would
  // close the panel out from under the hand reaching for it. Without one — the
  // drinks path — the timer runs exactly as it did, on the same delay, calling
  // the same callback.
  useEffect(() => {
    if (status !== "success") return;
    if (successOutcome) return;
    const timer = setTimeout(() => {
      onPaymentComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [status, onPaymentComplete, successOutcome]);

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
        ) : status === "success" && successOutcome ? (
          <div className="flex w-full flex-col gap-2">
            {/*
              The primitive renders an `<a>` for an `href`, so this is a plain
              anchor and carries the 44px floor from the primitive itself.
            */}
            <Button href={successOutcome.href} className="w-full">
              {successOutcome.label}
            </Button>
            {/*
              The old behaviour, kept and named. Dismissing reloads the page
              underneath, exactly as the timer used to — so a person who wants
              to stay where they were loses nothing.
            */}
            <Button
              variant="secondary"
              className="w-full"
              onClick={onPaymentComplete}
            >
              Stay on this page
            </Button>
          </div>
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
          {/*
            Both sentences are the ones that were here, byte for byte, and they
            are what a caller passing no outcome still gets. The third paragraph
            is additive and appears only for a caller that says where the thing
            lives.
          */}
          <p className="mt-1 text-sm text-ink-2">
            Your ticket is being confirmed...
          </p>
          {successOutcome && (
            <p className="mt-3 text-sm text-ink-2">{successOutcome.message}</p>
          )}
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
