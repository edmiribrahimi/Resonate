"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  reHideVenue,
  revealVenueNow,
  sendMissingVenueReveal,
  type VenueRevealActionResult,
  type VenueRevealRefusal,
} from "@/app/(admin)/admin/events/[id]/reveal/actions";

/**
 * The confirmation asked before an address leaves — and the one asked before a
 * night is taken back to secret.
 *
 * ── What this dialog IS, said where the analog says what it is NOT ───────────
 *
 * The shape below is copied from `admin/formats/RetireFormatDialog.tsx` — the
 * `<dialog>` shell, `showModal()`, the focus on `Cancel`, the refusal box, the
 * `catch` that branches on the shape of a failure. That file's docblock
 * (`:27-35`) already names this one, in advance, as the opposite case:
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
 * ── No typed confirmation, and that is a decision rather than an omission ────
 *
 * Two buttons, `Cancel` focused. No box to type the venue's name into, no word
 * to repeat. D-37-16: the wrong friction on an act performed in a hurry — on a
 * Friday, late, by whoever is at a keyboard — produces **postponement, not
 * prudence**, and a reveal postponed past its window is the failure this whole
 * phase exists to prevent. The analog states the other half of it: *a
 * confirmation whose Enter key performs the act is a confirmation that did not
 * ask*, which is why `Cancel` is first in the DOM and holds the focus.
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
 * The ten refusals are rendered from a **total** `Record`. A member added to
 * the union upstream turns this file red at build time instead of rendering a
 * blank at two in the morning. That is the opposite choice from the analog,
 * which narrows to a reachable subset — and the reason for the difference is
 * that these ten all reach here: one surface calls all three acts.
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      setRefusal(null);
      setOutcome(null);
      // `Cancel` takes the default focus. A confirmation whose Enter key
      // performs the act is a confirmation that did not ask — and on this
      // surface the act publishes an address.
      //
      // `showModal()` also traps focus while the dialog is open — the rest of
      // the document is inert — so no key handler is needed to keep it inside.
      cancelRef.current?.focus();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  const handleDialogClose = useCallback(() => {
    onClose();
  }, [onClose]);

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
   * What stays true afterwards, in the shape `RetireFormatDialog:261-268` uses:
   * the consequences named one by one, never a generic warning.
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
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none bg-black/80 backdrop:bg-transparent p-0"
      onClose={handleDialogClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="flex h-full w-full items-center justify-center p-4">
        <div
          role="document"
          className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-card-border bg-background p-6"
        >
          {/* `normal-case`: the heading carries a night's title, and
              `text-transform` inherits. */}
          <h2 className="text-lg font-bold text-foreground normal-case">
            {heading}
          </h2>

          {outcome ? (
            <>
              <p className="mt-3 text-sm text-foreground">{outcome}</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-full border border-card-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-foreground normal-case">{lead}</p>

              <ul className="mt-4 space-y-2">
                {consequences.map((sentence) => (
                  <li key={sentence} className="text-sm text-muted">
                    {sentence}
                  </li>
                ))}
              </ul>

              {refusal && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3"
                >
                  <p className="text-sm text-red-400">{refusal}</p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                {/*
                  `Cancel` first in the DOM, first in the tab order, and holding
                  the focus the effect above put on it. There is no text field
                  in this dialog and there must not be one: D-37-16 refuses a
                  typed confirmation, because the wrong friction on an act done
                  in a hurry produces postponement, not prudence.
                */}
                <button
                  ref={cancelRef}
                  type="button"
                  autoFocus
                  onClick={close}
                  disabled={isSubmitting}
                  className="flex-1 rounded-full border border-card-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirm}
                  disabled={isSubmitting}
                  className={
                    mode === "re_hide"
                      ? // Secondary treatment. Taking a night back to secret is
                        // a decision of its own, but it publishes nothing and
                        // sends nothing, so it does not take the weight of the
                        // act above it.
                        "flex-1 rounded-full border border-card-border px-6 py-3 text-sm font-semibold text-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      : // NOT the destructive red of `RetireFormatDialog:336`,
                        // and the omission is reasoned rather than inherited:
                        // revealing does not destroy, it **publishes**. Red on
                        // this surface is the colour of a refusal box, and
                        // borrowing it here would say "this might break
                        // something" when the true sentence is "this reaches
                        // people and cannot be recalled". The brake is the
                        // number in the paragraph above, not a hue.
                        "flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  }
                >
                  {isSubmitting ? "Working…" : confirmLabel}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
