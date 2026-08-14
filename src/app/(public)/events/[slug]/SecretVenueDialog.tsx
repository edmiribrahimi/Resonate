"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { LockClosedIcon } from "@/components/ui/Icons";

/**
 * The hint dialog — and the only place on this page that describes, in prose,
 * WHO gets the address and WHEN.
 *
 * ── Why `revealHours` is `number` and not `number | null` ────────────────────
 *
 * It used to be nullable, and the component branched on it: a stored window
 * printed the number of hours, a `NULL` printed a vague phrase about the reveal
 * happening nearer the night. The second half was **false**. A night with no
 * stored window is not revealed vaguely later: it is revealed at
 * `DEFAULT_VENUE_REVEAL_HOURS`, exactly like a night that stored that number.
 * The page promised one thing and the predicate did another — and a promise the
 * system does not keep is a defect, not an imprecision.
 *
 * The server resolves the window before it gets here (`venueRevealHours(...)`
 * at the call site, plan 37-06), so the missing case no longer exists by the
 * time this component runs. Narrowing the type is what makes that structural:
 * with `number` there is no `else` branch to write, and no second coalescing
 * fallback to add. The number lives in ONE place — `DEFAULT_VENUE_REVEAL_HOURS` in
 * `src/utils/datetime.ts` — and a copy of it here would be the third, which is
 * the drift plan 37-04 exists to end.
 *
 * ── What this dialog must never do ───────────────────────────────────────────
 *
 * - **Show the address.** It shows the hint, never the location
 *   (`venue-secrecy.md`, gate *percorsi enumerati*: this is exit #2 of the
 *   page). The prose around the hint must not narrow it either — a hint made
 *   precise by its caption is a reveal with extra steps.
 * - **Promise an email.** The mail is a NOTIFICATION, not the reveal (D-37-05):
 *   the page opens at the instant of the window, the mail leaves on the next
 *   useful run of a once-a-day cron, and the two can be hours apart. "You will
 *   receive the address by email at the window" would be false by construction.
 *
 * ── The shell is no longer in this file (plan 41.2-16) ───────────────────────
 *
 * What the primitive brought with it, and what this file therefore stopped
 * carrying: the panel geometry, the scrim, the hand-rolled light-dismiss
 * handler, the open/close effect, the initial focus, and the panel's own
 * heading element — the `title` prop **is** the heading, and it is also the
 * dialog's accessible name, which the hand-rolled panel never had.
 *
 * **What stays is what this dialog IS:** the question, its three branches, the
 * two ways in and the way out. Not one conditional line moved.
 *
 * The panel takes the primitive's default width. The wider rung is a closed
 * list of **form** dialogs and this is not one: a dialog that answers a question
 * does not become easier to read by being wider.
 *
 * ── The sentence the monotone guard needs ────────────────────────────────────
 *
 * **The address is at least as hard to reach after this conversion as before,
 * and nothing here shortens the path between opening this dialog and being told
 * one — because this dialog never tells one.** It is the negative branch of the
 * page's venue chain: everything it renders is chosen so as *not* to be the
 * address, and a conversion may restyle it and may not narrow it.
 *
 * What genuinely changed is one thing, and it is a strengthening: four controls
 * that declared no minimum height at all now reach the 44px floor. **Nothing
 * about who may open this dialog changed; only how easily a finger hits it.**
 *
 * ── The initial focus, and why the marker is declared rather than inherited ──
 *
 * The primitive focuses the element carrying its marker if the caller declares
 * one, and otherwise the close control, *which is first in the DOM and is the
 * least destructive control by construction*. **Before this conversion, nothing
 * at all was focused**: the shell was a plain `div`, so no focusing step ran
 * when it appeared and focus simply stayed on the trigger. That was read out of
 * this file — the whole focus census in it was empty — and not inferred from a
 * neighbour.
 *
 * **This dialog has no destructive control and no control that performs an
 * act.** Its three answers are two ways in and one way out. So the rule §11
 * states for a confirmation — the cancel is the initial-focus target, and the
 * confirming control is focused by nothing — reads here as: the **way out**
 * carries the marker, and neither road in may hold the focus a modal opens
 * with. The marker is written once, on `Close`, which is the only control in the
 * actions region; the two roads in stay in the body, where they already were,
 * below the sentence that offers them.
 *
 * Declared rather than left to the default, because a declared marker forces
 * the author to say which control is the least destructive and is the thing a
 * person can grep. **One mechanism, not two** — this project has already
 * corrected a file in which two sat there for one intent.
 *
 * ── There is no Enter-to-confirm here, and it is re-derived, not cited ───────
 *
 * Re-read out of the two primitives rather than taken on trust from a
 * neighbouring file's prose. `src/components/ui/Dialog.tsx` renders a
 * `<dialog>` with no `<form>` inside it, declares no form method, binds no
 * submit handler and writes no key handler at all — its own docblock says so
 * as a decision: *"this file writes no key handler, no focus-cycling code and
 * no `aria-modal`"*. And `src/components/ui/Button.tsx` writes `type="button"`
 * before the caller's spread on both of its rungs, precisely so that a control
 * inside a form cannot submit it by accident. **So no key press performs
 * anything in this panel.** The only two controls that go anywhere are links,
 * and following a link is not confirming an act.
 *
 * ── The controls, and why the two roads in are links rather than buttons ─────
 *
 * `Sign up` and `Sign in` navigate inside this application, so they stay
 * elements the router handles: the chip rung renders a typed `next/link`, which
 * keeps client-side navigation, prefetching and the build-time check that the
 * address exists. The button ladder's link branch renders a bare anchor and
 * would have lost all three silently — the trap named at the foot of
 * `src/components/ui/Chip.tsx`.
 *
 * The consequence, stated rather than discovered: the two chips are drawn the
 * same, where the hand-rolled pair drew one filled and one outlined. Neither is
 * *current* among siblings, so the rung has no honest way to mark one of them,
 * and inventing one would say in colour what this project has written down is
 * not yet decided — the criterion by which somebody is let in.
 */
interface SecretVenueDialogProps {
  hint: string | null;
  isAuthenticated: boolean;
  isApproved: boolean;
  /** The EFFECTIVE window, already resolved by the server. Never the raw column. */
  revealHours: number;
  revealOnPurchase: boolean;
}

export default function SecretVenueDialog({
  hint,
  isAuthenticated,
  isApproved,
  revealHours,
  revealOnPurchase,
}: SecretVenueDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <LockClosedIcon /> Secret Venue
      </Button>

      {open && (
        <Dialog
          open
          onClose={() => setOpen(false)}
          title="Secret Venue"
          actions={
            <Button
              variant="secondary"
              className="w-full"
              data-initial-focus
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          }
        >
          <div className="space-y-3 text-sm text-muted">
            {hint && isAuthenticated && (
              <p className="italic">
                Hint: {hint}
              </p>
            )}

            <div className="space-y-2">
              <p className="font-medium text-ink">How to unlock:</p>
              {!isAuthenticated ? (
                <p className="mb-2">Sign up or sign in to access secret venues.</p>
              ) : !isApproved ? (
                <p>Your account needs to be approved first.</p>
              ) : (
                <>
                  <ul className="list-disc list-inside space-y-1">
                    {/*
                      Level 1 — a ticket or an RSVP, at once.

                      The two are NOT symmetric, and the asymmetry is the
                      reason this is one conditional bullet and not a tidy
                      pair: a ticket unlocks immediately only when the night
                      has `venue_reveal_on_purchase` set, while an RSVP
                      unlocks regardless of that flag (D-37-10) — because an
                      RSVP is not a purchase, and the reveal cron mails an
                      RSVP holder without consulting the flag either.
                    */}
                    {revealOnPurchase ? (
                      <li>
                        Buy a ticket, or confirm your RSVP — the address appears
                        straight away
                      </li>
                    ) : (
                      <li>
                        Confirm your RSVP and the address appears straight away.
                        On this night a ticket alone does not: ticket holders
                        wait for the window like everyone else
                      </li>
                    )}
                    {/*
                      Level 2 — the widening of phase 37 (D-37-02). An
                      approved member reaches the address WITHOUT buying
                      anything. This bullet is why the old list was wrong:
                      it offered "buy a ticket to unlock immediately" as if
                      buying were the only road, which stopped being true.
                    */}
                    <li>
                      Or buy nothing at all: as an approved member you will see
                      the address here {revealHours} hours before the night
                      starts — sooner, if we reveal it by hand
                    </li>
                  </ul>
                  {/*
                    No promise of an email, on purpose (D-37-05). The mail is a
                    notification that follows the page, not the reveal itself.
                  */}
                  <p className="text-xs">
                    The address opens on this page. Any email is a notification
                    that follows it, and it can arrive hours later.
                  </p>
                </>
              )}
            </div>
          </div>

          {!isAuthenticated && (
            <div className="mt-5 flex gap-3">
              <Chip href="/register" className="flex-1">
                Sign up
              </Chip>
              <Chip href="/login" className="flex-1">
                Sign in
              </Chip>
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
