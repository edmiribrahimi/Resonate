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
 *   precise by its caption is a reveal with extra steps. **Since 2026-08-22
 *   this is heavier than it was**: the page around this dialog no longer shows
 *   a secret night's address to anybody, ever, so the hint is the LAST thing a
 *   public surface says about where the night happens. A hint that identifies
 *   the place is not a reveal with extra steps any more — it is the reveal.
 * - **Promise an email it cannot keep.** The old rule here was *never promise
 *   an email*, because the page opened at the window and the mail followed hours
 *   later on a once-a-day cron (D-37-05). **The page no longer opens**, so the
 *   sentence that would be false by construction is now the opposite one: *"the
 *   address opens on this page"*. What replaced it says where the address
 *   actually goes — the buyer's own ticket, and the mail — and says it without
 *   attaching an hour to the mail, because that part has not changed and the
 *   cron still runs when it runs.
 *
 * ── The copy below was REWRITTEN on 2026-08-22, and not restyled ─────────────
 *
 * Three sentences in it had become false the moment the page's reveal ladder was
 * removed: *"the address appears straight away"*, *"you will see the address
 * here N hours before the night starts"*, and *"the address opens on this
 * page"*. A dialog whose whole job is to say WHO gets the address and WHEN, left
 * saying it wrongly, is worse than a stale code comment: it sends somebody to
 * wait on a surface that will never show them anything, and they find out at the
 * door.
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
}

export default function SecretVenueDialog({
  hint,
  isAuthenticated,
  isApproved,
  revealHours,
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
                      ONE ROAD NOW, AND IT LEAVES THIS PAGE.

                      The two bullets that stood here — a ticket or an RSVP
                      unlocking "straight away", and an approved member seeing
                      the address "here" at the window — described the page's
                      own reveal ladder, which was removed on 2026-08-22. Both
                      are gone rather than reworded, because there is no
                      remaining version of either that is true of THIS surface.

                      `revealOnPurchase` went with them. It used to split the
                      first bullet in two, and it no longer moves a pixel on any
                      public surface, so the prop was removed rather than left
                      arriving and deciding nothing.
                    */}
                    <li>
                      Buy a ticket. The venue appears on your ticket as soon as
                      it is revealed — {revealHours} hours before the night
                      starts, or sooner if we reveal it by hand
                    </li>
                    <li>
                      On an RSVP night, confirm your RSVP: we email you the
                      venue when it is revealed
                    </li>
                  </ul>
                  {/*
                    The sentence that closes the dialog, and the one line in this
                    file a future edit is most likely to get wrong. It has to say
                    that this page is NOT where the address arrives — otherwise a
                    reader keeps checking a page that will never change — without
                    attaching an hour to the mail, which nothing here can promise.
                  */}
                  <p className="text-xs">
                    The venue never appears on this page — not before the night,
                    not after it. It reaches the people who are coming: on their
                    ticket, and by email.
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
