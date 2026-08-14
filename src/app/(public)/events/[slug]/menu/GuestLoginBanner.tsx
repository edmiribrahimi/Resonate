"use client";

import Link from "next/link";

import { Button, FOCUS_RING } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * The guest sign-in invite on the drinks menu — a banner and a pre-checkout
 * question, converted while the feature is switched off.
 *
 * ── Why a file nothing renders was converted at all (D-41.2-03) ──────────────
 *
 * This file is reached by **no import closure**: its three call sites are
 * commented out — `menu/page.tsx:12-13` and `:179-183`, and
 * `GuestDrinkMenu.tsx:11` and `:259-267` — so no surface conversion in this
 * phase clears it as a by-product, and it sat on **two** ratchet lists that
 * could not otherwise reach zero.
 *
 * Three dispositions were available and only one decides nothing outside this
 * phase. **Deleting** would answer a product question — should the invite
 * exist? — that is not this phase's, and on a public repository a deletion is a
 * publication of that answer. **A permanent exemption** would be a lie about a
 * file whose own import comment says *re-enable by restoring this import*; the
 * exemption's rule is *a file that will never convert is not a debt*, and this
 * one is meant to come back. **Converting** costs the lines below, clears both
 * ratchets, and leaves the re-enable path warm: when the invite returns it
 * lands already converted instead of reopening a gate that had closed.
 *
 * **Nothing here re-enables it.** No import was restored and no render site was
 * uncommented. Finishing a job somebody deliberately stopped is a product
 * decision, and it is not this one.
 *
 * ── The three phone-tier prefixes are DELETED, not migrated ──────────────────
 *
 * The overlay below used to write its own sheet-versus-window pair — bottom
 * anchored on a phone, centred above the boundary, with the phone sheet's
 * bottom padding. **The primitive owns that pair** (`Dialog.tsx:278-280`), so
 * the three prefixed classes are gone rather than moved to the tier this
 * contract uses. Migrating them would have left a second author for a decision
 * the primitive already makes, and two authors is how two implementations
 * disagree.
 *
 * ── The two sign-in destinations are byte-identical ──────────────────────────
 *
 * `src/lib/routes/next-redirect.ts:73` names this file's register call sites by
 * line as the producers of one entry on its allow-list. The destination string,
 * its encoding and its parameter name are unchanged here — only the elements
 * around them moved, so the allow-list still admits exactly what it admitted.
 * The line numbers themselves have moved, which is a documentation drift
 * reported rather than silently repaired: that file is outside this plan.
 *
 * ── Focus, and why no marker is declared ─────────────────────────────────────
 *
 * The question below has no destructive answer, so nothing here claims the
 * initial focus. The primitive then focuses **the close control**, which is
 * first in the DOM and is the least destructive control by construction
 * (`Dialog.tsx:117-147`). Said out loud rather than left to the default,
 * because the one answer that must never be focused — continuing without
 * saving the tokens — is on this panel.
 */

interface GuestLoginBannerProps {
  slug: string;
}

export default function GuestLoginBanner({ slug }: GuestLoginBannerProps) {
  const menuUrl = encodeURIComponent(`/events/${slug}/menu`);

  return (
    <div className="rounded-xl border border-sem-info/30 bg-sem-info/10 p-3">
      <div className="flex items-center gap-3">
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-sem-info"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-2">
            Keep your drink tokens safe across devices.{" "}
            {/*
              An inline link inside a sentence, so it stays a link and stays in
              the sentence: the target is raised to the floor with the shape
              `(auth)/login/page.tsx:220` already uses, rather than being pulled
              out of the prose into a pill — which would have deleted the word
              joining the two answers, and the copy does not change.
            */}
            <Link
              href={`/login?next=/events/${slug}/menu`}
              className={`inline-flex min-h-11 items-center align-middle font-medium text-accent underline transition-colors hover:text-accent-hover ${FOCUS_RING}`}
            >
              Log in
            </Link>
            {" or "}
            <Link
              href={`/register?next=${menuUrl}`}
              className={`inline-flex min-h-11 items-center align-middle font-medium text-accent underline transition-colors hover:text-accent-hover ${FOCUS_RING}`}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function GuestWarningModal({
  onContinue,
  onClose,
  onLogin,
  onSignUp,
  slug,
}: {
  onContinue: () => void;
  onClose: () => void;
  onLogin?: () => void;
  onSignUp?: () => void;
  slug: string;
}) {
  const menuUrl = encodeURIComponent(`/events/${slug}/menu`);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Guest Checkout"
      /*
        Three answers on three rungs of one ladder, in the order they were in:
        the accent fill for signing in, the outlined rung for signing up, and
        the quietest rung for proceeding without either. The hierarchy is the
        one the hand-rolled version drew with three different borders, and no
        label changed.

        They sit in the actions region rather than in the body because the body
        is the only scroller: an answer inside it can be below the fold at the
        moment the question is asked.

        The two that navigate are given an `href` rather than a handler, which
        keeps them elements a person can middle-click and copy — the same
        choice `(public)/payment/callback/page.tsx:139` already made.
      */
      actions={
        <div className="space-y-2">
          {onLogin ? (
            <Button className="w-full" onClick={onLogin}>
              Log in
            </Button>
          ) : (
            <Button className="w-full" href={`/login?next=/events/${slug}/menu`}>
              Log in
            </Button>
          )}

          {onSignUp ? (
            <Button variant="secondary" className="w-full" onClick={onSignUp}>
              Sign up
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              href={`/register?next=${menuUrl}`}
            >
              Sign up
            </Button>
          )}

          <Button variant="ghost" className="w-full" onClick={onContinue}>
            Continue as guest
          </Button>
        </div>
      }
    >
      <p className="text-sm text-sem-warn">
        You may lose your tokens if you don&apos;t log in.
      </p>
    </Dialog>
  );
}
