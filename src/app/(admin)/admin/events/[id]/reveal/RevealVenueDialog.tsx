"use client";

import { useState } from "react";
import {
  reHideVenue,
  revealVenueNow,
  sendMissingVenueReveal,
  type VenueRevealActionResult,
  type VenueRevealRefusal,
} from "@/app/(admin)/admin/events/[id]/reveal/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * The confirmation asked before an address leaves — and the one asked before a
 * night is taken back to secret.
 *
 * ── What this dialog IS, said where the analog says what it is NOT ───────────
 *
 * The shape below came from `admin/formats/RetireFormatDialog.tsx` — the
 * `<dialog>` shell, `showModal()`, the focus on `Cancel`, the refusal box, the
 * `catch` that branches on the shape of a failure. That file's docblock
 * (`:41-49`) already names this one, in advance, as the opposite case:
 *
 *   "Retiring **publishes nothing** and is **reversible**. It is not a monotone
 *    switch and it must not be built like one: unlike `venue_reveal_sent`,
 *    where the mail has left and the screenshot exists …"
 *
 * **Here the mail leaves and does not come back.** There is no unsend, the
 * screenshot exists, and the address is in somebody's phone. So the two
 * dialogues share their mechanics and share nothing else: the brake on this one
 * is the confirmation, and the part of the confirmation that actually stops a
 * person is **the number of people**, because it turns an abstraction into
 * human beings (D-37-16).
 *
 * ── The shell is no longer in this file ──────────────────────────────────────
 *
 * Plan 41.1-20 moved it to `src/components/ui/Dialog.tsx`, which was extracted
 * from the same ancestor this file and `RetireFormatDialog.tsx` both name. What
 * the primitive brought with it, and what this file therefore stopped carrying:
 * the panel geometry, the scrim, the light-dismiss handler, the open/close
 * effect, and the initial focus. What stays here is what this dialog **is** —
 * the question, the two answers, the eleven refusals, and the three acts.
 *
 * One consequence worth stating rather than discovering: the local reset of the
 * refusal and the outcome used to happen in the open effect, so a dismissal by
 * `Esc` left them standing until the next open. It now happens in `close()`,
 * which the primitive calls on **every** close route — the control, `Esc`, and
 * the platform's own close event. Same observable state, one place instead of
 * two.
 *
 * ── The focus target, before and after, measured rather than argued ──────────
 *
 * `41-UI-SPEC.md` §11 fixes the rule for a destructive confirmation: the cancel
 * is the default and the initial focus target, no Enter-to-confirm, and no
 * autofocus on the confirming control. This file already kept that rule. What
 * it did not keep was **one** mechanism for it, or a visible one.
 *
 * **Before**, two mechanisms sat here for one intent. The React `autofocus`
 * prop on `Cancel` is **inert**: `Dialog.tsx:117-148` reads it out of the
 * installed `react-dom@19` — the attribute writer skips it, so no `autofocus`
 * attribute ever reaches the DOM, and `showModal()`, running later in an effect,
 * cannot find one. But the effect in this file then called `.focus()` on the
 * cancel ref immediately after `showModal()`, which is exactly the moment that
 * lands. So `Cancel` **was** focused. It simply was not visible: the hand-rolled
 * buttons declared no focus expression at all, so nothing on screen said which
 * control held the focus.
 *
 * **This corrects D-41.1-24 and `41.1-PATTERNS.md` §5.3**, which read the inert
 * attribute and concluded the focus placement here was *"unspecified in
 * practice"*. The conclusion about the attribute is right; the conclusion about
 * this file is not, because the imperative call one screen above it was not
 * read. Recorded rather than edited away — a claim withdrawn without its
 * measurement reads as a slip, and this one is the exact claim the phase asked
 * to be verified rather than assumed.
 *
 * **After**, one mechanism: `Cancel` carries the initial-focus marker and the
 * primitive focuses that element imperatively after `showModal()`
 * (`Dialog.tsx:246-262`), the inert prop is gone rather than kept beside the
 * marker, and `Cancel` is a `Button`, so it carries the shared focus expression
 * and the placement is **observable**. The marker is written once, on the
 * control, which is the whole point of a declared marker over a heuristic: it is
 * greppable, and it appears exactly once in this file.
 *
 * **The sentence the monotone guard needs:** the reveal is at least as hard to
 * trigger after this conversion as before, and harder in the one respect a
 * person can check — the focus lands on `Cancel` by declaration instead of by
 * two mechanisms of which one is dead, and a person can now see that it did.
 * Nothing here shortens the path between opening this dialog and sending.
 *
 * ── No typed confirmation, and that is a decision rather than an omission ────
 *
 * Two buttons, `Cancel` focused. No box to type the venue's name into, no word
 * to repeat. D-37-16: the wrong friction on an act performed in a hurry — on a
 * Friday, late, by whoever is at a keyboard — produces **postponement, not
 * prudence**, and a reveal postponed past its window is the failure this whole
 * phase exists to prevent. The other half of it: *a confirmation whose Enter key
 * performs the act is a confirmation that did not ask*, which is why `Cancel` is
 * first in the DOM and holds the focus.
 *
 * ── No time limit, either (D-37-11) ─────────────────────────────────────────
 *
 * Nothing here compares the clock with the night's start, and the server action
 * does not either. A technical ceiling would be worked around by moving the
 * automatic window instead — the same act, one step further away, and **no
 * trace at all**.
 *
 * ── The number is READ, never re-derived ────────────────────────────────────
 *
 * `recipientCount` arrives from `getVenueRevealState`, which gets it from
 * `countVenueRevealRecipients` — the same `Map` that sends. This file does not
 * count anything: two implementations of the deduplication would put two
 * different numbers in front of the same irreversible act, and the one on
 * screen would be the one that never sent a mail.
 *
 * ── A refusal is a RETURNED value ───────────────────────────────────────────
 *
 * Every action in `events/[id]/reveal/actions.ts` returns a value. Next
 * **redacts** the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`), so a client that
 * read `err.message` would work under `next dev` and print a blank where it
 * counts. The `catch` below therefore branches on the **shape** of the failure —
 * *the request never left* against *the server refused it* — which is the most
 * that can honestly be told apart without a message.
 *
 * The eleven refusals are rendered from a **total** `Record`. A member added to
 * the union upstream turns this file red at build time instead of rendering a
 * blank at two in the morning. That is the opposite choice from the analog,
 * which narrows to a reachable subset — and the reason for the difference is
 * that these eleven all reach here: one surface calls all three acts.
 *
 * (**Eleven**, not the ten this paragraph used to claim. Counted against the
 * union at `actions.ts:144-275` — eleven members, and the `Record` below has
 * always carried all eleven, so only the sentence was wrong. Corrected with its
 * measurement rather than quietly, because a count in prose that nobody rechecks
 * is how a file starts describing a neighbour it no longer resembles.)
 *
 * The refusal is now the primitive's `status` region rather than a box drawn
 * here. It keeps its alert role and it moves **outside** the scrolling body
 * (`Dialog.tsx:316-325`), so a refusal can no longer appear below the fold of a
 * long consequence list. In a project with no error tracking, a refusal a person
 * has to scroll to find is the newsletter form's failure with an extra step.
 */

/** Which of the three acts this dialog is confirming. */
export type RevealDialogMode = "reveal" | "complete" | "re_hide";

interface RevealVenueDialogProps {
  readonly open: boolean;
  readonly mode: RevealDialogMode;
  /** Checked in JavaScript by the action against the night's own `event_id`. */
  readonly eventId: string;
  /** The night this dialog acts on. */
  readonly partyId: string;
  /** Rendered verbatim in the heading — a night's title is stored as written. */
  readonly nightTitle: string;
  /**
   * The place, by name.
   *
   * T-37-47, disposition **accept**: this is a staff surface, and whoever reads
   * this page already sees `venues(name)` in the form above it. It is named here
   * because a confirmation that says *"the address"* instead of *"the address of
   * X"* asks somebody to confirm from memory. It never enters an artefact under
   * `.planning/`.
   */
  readonly venueName: string;
  /**
   * How many PEOPLE receive the address if this is confirmed — deduplicated by
   * e-mail, so somebody holding both a ticket and an RSVP counts once.
   *
   * Read from `getVenueRevealState`. Never computed in this file.
   */
  readonly recipientCount: number;
  readonly onClose: () => void;
  /**
   * Called the instant an act succeeds, **before** the outcome is dismissed, so
   * the panel re-reads its state from the server while this dialog still shows
   * *"N of M"*. Dismissing by backdrop or by `Esc` therefore cannot leave the
   * panel showing a night that has already changed.
   */
  readonly onDone: () => void;
}

/**
 * One sentence per cause, and the `Record` is **total** over the union.
 *
 * Each opens by saying what did NOT happen, because on this domain that is the
 * first thing a person needs: `Nothing was sent` is the difference between
 * reloading the page and phoning somebody. There is no error tracking in this
 * project, so a refusal a person cannot read is a refusal nobody ever reads.
 */
const REFUSAL_SENTENCE: Record<VenueRevealRefusal, string> = {
  invalid_party_id:
    "Nothing was sent. This night could not be identified, so the database was never asked. Reload the page and start again from the event.",
  party_not_in_event:
    "Nothing was sent. This night does not belong to this event — or there is no such night. The two get the same answer deliberately, so that this surface cannot be used to find out which identifiers name a real night. Reload the page.",
  party_not_found:
    "Nothing was sent. The night was already gone by the moment the act was attempted — somebody removed it while this dialog was open. Reload the page.",
  not_secret:
    "Nothing was sent. This night is not marked as secret, so there is no address to release. This screen and the database disagree about what this night is: reload the page, and if this button is still here afterwards, somebody has changed the night's secret setting.",
  venue_not_set:
    "Nothing was sent, and nothing was written down. This night has no venue linked to it, so there is no address to release — free text in the venue field is a name, not an address, and it is not what the public page reads. Link the venue in the form above, save, then come back. The refusal is deliberate: revealing a night with nothing to publish would spend an act that cannot be taken back, and the real address would then become public by itself the moment somebody linked the venue.",
  already_revealed:
    "Nothing was sent. This night has already been revealed. Close this dialog: the panel behind it now says when it happened and who did it, and if anybody is still missing the address the button reads “Send to the N still missing”.",
  not_revealed:
    "Nothing changed. This night has never been revealed, so there is nothing to complete and nothing to take back.",
  re_hide_requires_master:
    "Nothing changed. Taking a night back to secret is a master's act, and this account is not a master. The page keeps showing what it was showing, the mails that left stay sent, and the trace is untouched.",
  recipients_unavailable:
    "Nothing was sent, and nothing was written down. Who is entitled to this address could not be read — and that is NOT “nobody is entitled”. An irreversible act must not be recorded against a number nobody could measure, so it was refused before anything happened. Try again; if it keeps failing, the ticket and RSVP tables cannot be read right now.",
  actor_name_missing:
    "Nothing was sent. This act is written down with the full name of whoever performs it, and this account's profile carries no full name. An act attributed to nobody is not an act. Put a full name on the profile, then try again.",
  write_failed:
    "Nothing was sent. The database refused the write, so no address left and nothing changed.",
};

/**
 * The refusal, translated.
 *
 * The lookup is widened to `string` on purpose: the value crosses the network
 * from a Server Action, so a value outside the union is possible at runtime even
 * though it is impossible at build time. It identifies itself on screen rather
 * than borrowing a sentence written for something else — the newsletter form's
 * *"Qualcosa è andato storto"* is the recorded precedent for what happens when a
 * surface has one bucket (`.planning/codebase/CONCERNS.md`).
 *
 * Exported so the panel's failed state read speaks the **same** vocabulary. A
 * second table of sentences would be a second place for a refusal to be
 * described differently depending on which call happened to hit it, and the
 * person reading is the same person.
 */
export function describeRefusal(reason: VenueRevealRefusal): string {
  const known = (REFUSAL_SENTENCE as Record<string, string | undefined>)[reason];
  return (
    known ??
    `Nothing was sent. The reveal refused this with "${reason}", which this dialog does not expect. Nothing changed.`
  );
}

/**
 * What actually happened, in the two numbers of D-37-12 — *"N of M"*.
 *
 * Never a generic notice. `0/0/0` with `no_recipients` means **nobody was
 * entitled**; `0/0/0` with `recipients_unavailable` means **we could not find
 * out**, and those two sentences must never become one. The same distinction is
 * drawn one layer down, in `reveal-party-venue.ts`, and it is drawn again here
 * because this is the layer a person reads.
 */
function describeOutcome(
  mode: RevealDialogMode,
  result: Extract<VenueRevealActionResult, { ok: true }>
): string {
  const { recipientsTotal, recipientsSent, recipientsFailed, failureKind } =
    result;

  if (mode === "re_hide") {
    return "This night is secret again on its page. Nothing was unsent — the mails that left stay sent — and the trace now carries this act underneath the reveal it follows, which is what keeps the two from contradicting each other.";
  }

  const opened =
    mode === "reveal"
      ? "The night is revealed and its page has stopped hiding the address. "
      : "";

  switch (failureKind) {
    case "recipients_unavailable":
      return `${opened}Who was entitled could not be read at the moment of the send, so no mail left — and that is NOT “nobody was entitled”. Nobody has been marked as reached, so every one of them stays reachable: the button will read “Send to the N still missing” once the count can be read again.`;

    case "no_recipients":
      return mode === "reveal"
        ? `${opened}No mail left, and that is measured rather than assumed: nobody holds a ticket or an RSVP for this night yet.`
        : "Nothing was sent and nothing was written down. Nobody is still missing — everybody who was entitled when the button was pressed has already been reached.";

    case "send_failed":
      return `${opened}0 of ${recipientsTotal}. Not one of the mails left. Nobody has been marked as reached, so the button now reads “Send to the ${recipientsTotal} still missing” and pressing it sends to all of them.`;

    case "party_not_found":
      return `${opened}The send reported that the night was gone, so no mail left. Reload the page and read what the panel says.`;

    case "none":
      return recipientsFailed === 0
        ? `${opened}${recipientsSent} of ${recipientsTotal}. The address has left for everybody who was entitled to it at this moment.`
        : `${opened}${recipientsSent} of ${recipientsTotal}. The ${recipientsFailed} whose mail did not leave have NOT been marked as reached, so the button now reads “Send to the ${recipientsFailed} still missing”.`;
  }
}

export default function RevealVenueDialog({
  open,
  mode,
  eventId,
  partyId,
  nightTitle,
  venueName,
  recipientCount,
  onClose,
  onDone,
}: RevealVenueDialogProps) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function close() {
    setRefusal(null);
    setOutcome(null);
    onClose();
  }

  async function confirm() {
    if (isSubmitting) return;
    setRefusal(null);
    setIsSubmitting(true);

    try {
      let result: VenueRevealActionResult;

      if (mode === "reveal") {
        result = await revealVenueNow(eventId, partyId);
      } else if (mode === "complete") {
        result = await sendMissingVenueReveal(eventId, partyId);
      } else {
        result = await reHideVenue(eventId, partyId);
      }

      if (!result.ok) {
        setRefusal(describeRefusal(result.reason));
        return;
      }

      // The panel re-reads from the server NOW, behind this dialog, while the
      // outcome stays on screen to be read. Dismissing by backdrop or by `Esc`
      // therefore cannot leave a stale panel — and the panel's own numbers come
      // from that fresh read, never from what this dialog just returned.
      onDone();
      setOutcome(describeOutcome(mode, result));
    } catch (err) {
      // The gate throws; the network throws. Both messages are redacted in a
      // production build, so the branch is on the SHAPE of the failure and each
      // branch names a different cause.
      const unreachable =
        err instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);

      setRefusal(
        unreachable
          ? "Nothing was sent. The request never reached the server — check the connection and try again. No address left."
          : "Nothing was sent. The server refused the request before the act. This account may no longer hold the permission that lets an address out; reload the page and check. Nothing changed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const people = recipientCount === 1 ? "1 person" : `${recipientCount} people`;

  const heading =
    mode === "reveal"
      ? `Reveal the venue for ${nightTitle}?`
      : mode === "complete"
        ? `Send the address to the ${recipientCount} still missing?`
        : `Take ${nightTitle} back to secret?`;

  /**
   * The three things D-37-16 asks for, in this order: **the place**, **how many
   * people**, and **that it does not come back**.
   */
  const lead =
    mode === "reveal"
      ? recipientCount === 0
        ? `You are about to release the address of ${venueName}. Nobody holds a ticket or an RSVP for this night yet, so no mail leaves — but the page stops hiding the address from whoever is entitled to see it. This does not come back.`
        : `You are about to send the address of ${venueName} to ${people}. This does not come back.`
      : mode === "complete"
        ? `You are about to send the address of ${venueName} to the ${people} the reveal did not reach. Nobody who already received it is mailed again. This does not come back either.`
        : `The page goes back to hiding the address of ${venueName}. This is not an undo.`;

  /**
   * What stays true afterwards, in the shape the analog uses: the consequences
   * named one by one, never a generic warning.
   */
  const consequences =
    mode === "reveal"
      ? [
          "This is ONE act and it does both things: it opens the page and it sends the mail. There is no send-only and no open-only — two one-way switches produce states nobody expects, and neither of them comes back.",
          "The night stays marked as revealed even if some of those mails fail to leave. Whoever was not reached stays reachable from the same button, which will say how many.",
          "The act is written down with your full name and the instant you pressed. That record is not removed, not by you and not by a master.",
        ]
      : mode === "complete"
        ? [
            "The instant of the reveal does not move. This sends to the people who were already entitled when somebody pressed the first time — not to anybody who arrived afterwards, who see the address on the page instead.",
            "It is written down as its own act, with your full name: it mails an address to more people, so it is exactly as attributable as the first one.",
          ]
        : [
            "The mails that left have left. This unsends nothing, and there is no unsend to write.",
            "The trace is not cleared. This night will keep saying it was revealed, on that date and by that person, while its page shows nothing — and that pair is the only honest one after an address has gone out.",
            "This is a master's act. If this account is not a master it will be refused, and the refusal will say so.",
          ];

  const confirmLabel =
    mode === "reveal"
      ? "Reveal now"
      : mode === "complete"
        ? `Send to the ${recipientCount} still missing`
        : "Take back to secret";

  return (
    <Dialog
      open={open}
      onClose={close}
      title={heading}
      status={refusal ? { tone: "crit", message: refusal } : null}
      actions={
        outcome ? (
          <Button variant="secondary" className="w-full" onClick={close}>
            Close
          </Button>
        ) : (
          <div className="flex gap-3">
            {/*
              `Cancel` first in the DOM, first in the tab order, and carrying
              the marker the primitive focuses on open. There is no text field
              in this dialog and there must not be one: D-37-16 refuses a typed
              confirmation, because the wrong friction on an act done in a hurry
              produces postponement, not prudence.

              `showModal()` also traps focus for as long as the dialog is open —
              the rest of the document is inert — so no key handler keeps it
              inside. That is the browser's, and it is why the native modal
              element is the right shell for a confirmation.
            */}
            <Button
              variant="secondary"
              className="flex-1"
              data-initial-focus
              onClick={close}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            {/*
              The confirming control takes the destructive rung — and that
              REVERSES what this file used to say, so the old reasoning is
              quoted rather than deleted:

                "NOT the destructive red … revealing does not destroy, it
                 **publishes**. Red on this surface is the colour of a refusal
                 box, and borrowing it here would say 'this might break
                 something' when the true sentence is 'this reaches people and
                 cannot be recalled'. The brake is the number in the paragraph
                 above, not a hue."

              Two things overrule it. First, `41-UI-SPEC.md` §11 names this
              dialog by name as one of the three destructive confirmations and
              fixes the rung for all three; a house rule that a surface opts out
              of per file is not a rule. Second, the reason it argued from no
              longer holds: the refusal is no longer a box drawn in a borrowed
              colour, it is the primitive's status region in the critical
              semantic ink, so the confirming control and a refusal are told
              apart by position and role rather than by hue.

              What does NOT change is the sentence it was defending: the brake
              on this act is the number of people in the paragraph above, and
              the rung is not asked to carry it. And the direction is the safe
              one under a monotone guard — a heavier confirming control makes
              the act harder to press by accident, never easier.

              Taking a night back to secret is NOT destructive — it publishes
              nothing and sends nothing — so it does not borrow that treatment.
              It is still a decision of its own, which is why it is behind this
              dialog at all, and it takes the primary rung so that it cannot be
              mistaken for the cancel beside it. Same asymmetry, same shape, as
              the analog's retire against restore.
            */}
            <Button
              variant={mode === "re_hide" ? "primary" : "destructive"}
              className="flex-1"
              onClick={confirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Working…" : confirmLabel}
            </Button>
          </div>
        )
      }
    >
      {outcome ? (
        <p className="text-sm text-ink">{outcome}</p>
      ) : (
        <>
          {/* `normal-case`: the lead carries a venue's name, and
              `text-transform` inherits. */}
          <p className="text-sm text-ink normal-case">{lead}</p>

          <ul className="mt-4 space-y-2">
            {consequences.map((sentence) => (
              <li key={sentence} className="text-sm text-muted">
                {sentence}
              </li>
            ))}
          </ul>
        </>
      )}
    </Dialog>
  );
}
