"use client";

import { useState } from "react";
import Link from "next/link";
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-all active:scale-95 active:opacity-80"
      >
        <LockClosedIcon /> Secret Venue
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-card-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <LockClosedIcon />
              <h3 className="text-lg font-semibold">Secret Venue</h3>
            </div>

            <div className="space-y-3 text-sm text-muted">
              {hint && isAuthenticated && (
                <p className="italic">
                  Hint: {hint}
                </p>
              )}

              <div className="space-y-2">
                <p className="font-medium text-foreground">How to unlock:</p>
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
                <Link
                  href="/register"
                  className="flex-1 rounded-full bg-accent py-2.5 text-center text-sm font-medium text-white transition-all hover:bg-accent-hover active:scale-95 active:opacity-80"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="flex-1 rounded-full border border-card-border py-2.5 text-center text-sm font-medium text-foreground hover:bg-background transition-all active:scale-95 active:opacity-80"
                >
                  Sign in
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`${!isAuthenticated ? "mt-3" : "mt-5"} w-full rounded-full bg-card border border-card-border py-2.5 text-sm font-medium text-muted hover:text-foreground transition-all active:scale-95 active:opacity-80`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
