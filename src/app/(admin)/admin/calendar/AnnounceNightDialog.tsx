"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

import {
  announceNight,
  tickChecklistItem,
  type CalendarFailure,
  type CalendarRefusal,
} from "./actions";
import {
  ChecklistSection,
  type ChecklistItemView,
  type ChecklistTickOutcome,
} from "./ChecklistSection";
import type { CivilDate } from "@/lib/production/ics/vocabulary";

/**
 * The client half of the calendar's two writes: the confirmation asked before a
 * night is announced, and the wiring that lets a checklist box be ticked.
 *
 * ── Why both live in one module, when the file is named after one of them ────
 *
 * Because a Server Component cannot make the closure either of them needs.
 * `ChecklistSection` (plan 44-11) declares a handler whose refusal has **two**
 * members, deliberately, so the act's richer set of reason codes stays with the
 * act; mapping one onto the other is a function, and a function cannot cross
 * from a server component into a client component as a prop. So the mapping has
 * to sit on this side of the boundary, and putting it in a second client file
 * beside this one would be a file whose whole content is four lines of
 * translation. Declared here rather than discovered by the next reader who
 * wonders why a checklist bridge lives in a file named after a dialog.
 *
 * ── The act is consequential, and NOT destructive ───────────────────────────
 *
 * Nothing is destroyed, so the trigger does not take the destructive rung
 * (§11.1). It takes a confirmation for a reason the domain supplies rather than
 * a convention: **it spends a series number, and a spent number is never
 * released.** The trigger is `primary`, `md`.
 *
 * ── Cancel first, cancel focused, and no Enter-to-confirm ───────────────────
 *
 * `41-UI-SPEC.md` §11's rule, and the mechanism is the primitive's declared
 * marker rather than React's `autofocus` prop. That prop is **inert**:
 * `Dialog.tsx:117-148` records the measurement — react-dom's attribute writer
 * skips it, so no attribute reaches the DOM and `showModal()`, running later in
 * an effect, finds nothing to honour. `RevealVenueDialog`'s docblock carries the
 * whole correction. A marker is also the thing a person can grep, and it appears
 * exactly once in this file, on the cancel control.
 *
 * ── The three venue-secrecy decisions, as this surface renders them ─────────
 *
 * Taken by the expert persona on 2026-08-15 under the owner's standing
 * instruction to proceed, recorded with their reason in `44-12-SUMMARY.md`, and
 * loosenable by the owner:
 *
 *   1. **A night whose space is not `acquired` cannot be announced.** The refusal
 *      is drawn in the body and the confirming control is disabled — the reason
 *      is readable **before** the button is pressed, never applied silently
 *      after it. The act refuses again on the server, which is where the
 *      guarantee actually lives.
 *   2. **The night is created with its address kept secret**, and part 1 of the
 *      body says so in the same breath as what does become writable.
 *   3. **This dialog does not name the venue.** A confirmation panel is a thing
 *      somebody photographs, and the act moves no address, so naming one would
 *      put a word on a screen for no gain. That is the one place this dialog
 *      diverges from `RevealVenueDialog`, which names the place because the
 *      place is exactly what is leaving.
 *
 * ── The outcome is reported in the dialog's own panel ───────────────────────
 *
 * and nowhere else — `Dialog.tsx:173-192`, and the transient notification this
 * file therefore does not import is asserted absent by `verify:dialogs` check C,
 * which is why its name is not written here (`formats/actions.ts:58-63`: a grep
 * whose only match is the sentence forbidding the thing is a grep that gets
 * ignored the third time it goes red). And one sentence per cause, never a
 * shared *there was a problem* — the recorded precedent in this repository is
 * the newsletter form collapsing three causes into one indebuggable message,
 * and this product has no error tracking, so the sentence on screen is the whole
 * of the observable effect.
 *
 * ── Nothing here says what a format sounds like ─────────────────────────────
 *
 * No string, class name, component name or comment (`sound-manifesto.md`). The
 * brand is written `re:sonate`, with a normal `e`.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The wiring for the tick — two sentences kept as two
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The codes for which `We could not save that tick. The item is unchanged.` is a
 * **complete** answer.
 *
 * Everything else the act can return is named beside the sentence rather than
 * dressed in one written for something else. `actor_name_missing` is the case
 * that makes the distinction worth drawing: it means *this account's profile
 * carries no full name*, which has a next step the two-sentence contract has no
 * form for, so the code travels and the reader can act on it.
 */
type TickFullySaid =
  | "invalid_id"
  | "invalid_ticked"
  | "item_not_found"
  | "write_failed";

/** Turns red the day a member above stops existing in the union it copies. */
type _TickIsSubset = TickFullySaid extends CalendarRefusal ? true : never;
const _tickIsSubset: _TickIsSubset = true;
void _tickIsSubset;

const TICK_FULLY_SAID: ReadonlySet<string> = new Set<TickFullySaid>([
  "invalid_id",
  "invalid_ticked",
  "item_not_found",
  "write_failed",
]);

/**
 * One night's checklist, with the act that records a tick supplied.
 *
 * Passing the handler removes the read-only notice and the `disabled` attribute
 * `ChecklistSection` draws in its absence; nothing else about the section
 * changes. Its `empty` slot still comes from the page, because only the page
 * knows which emptiness it is looking at.
 */
export function CalendarNightChecklist({
  items,
  today,
  empty,
}: {
  readonly items: readonly ChecklistItemView[] | null;
  readonly today: CivilDate;
  readonly empty: ReactNode;
}) {
  async function onTick(
    itemId: string,
    ticked: boolean
  ): Promise<ChecklistTickOutcome> {
    try {
      const result = await tickChecklistItem(itemId, ticked);
      if (result.ok) return { ok: true };

      return {
        ok: false,
        refusal: "not_saved",
        unexpected: TICK_FULLY_SAID.has(result.reason)
          ? undefined
          : result.reason,
      };
    } catch (err) {
      /*
        The gate THROWS and the network throws, and a production build redacts
        the message of an error thrown out of a Server Action — so the branch is
        on the SHAPE of the failure, which is the most that can honestly be told
        apart. A request that never left is *it did not save*; anything else that
        reached the server and came back as a throw is the gate, because every
        other failure in the act is a returned value.
      */
      const unreachable =
        err instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);

      return { ok: false, refusal: unreachable ? "not_saved" : "not_permitted" };
    }
  }

  return (
    <ChecklistSection
      items={items}
      today={today}
      empty={empty}
      onTick={onTick}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The announcement — the stage, the four body parts, and the refusals
 * ──────────────────────────────────────────────────────────────────────────── */

/** The stage a space has actually reached, as the plan row carries it. */
type VenueStageValue = "mapped" | "verified" | "contacted" | "acquired" | null;

/**
 * Why a space that is not `acquired` stops the act, in that stage's own words.
 *
 * Each names **the stage and never the space**: four declared words and a null,
 * none of which identifies a place. The common clause is the rule itself, so a
 * reader meets it whichever stage they are on.
 */
function stageRefusalSentence(stage: VenueStageValue): string {
  switch (stage) {
    case "mapped":
      return "This night's space is at mapped — a desk exercise. Nobody has called it.";
    case "verified":
      return "This night's space is at verified — a checked fact, not an agreement.";
    case "contacted":
      return "This night's space is at contacted — a conversation, not an agreement.";
    case null:
      // Not recorded, and deliberately NOT read as `acquired`: an inferred
      // agreement is the one reading this rule exists to refuse.
      return "No stage is recorded for this night's space, so it is not acquired.";
    default:
      // A stage outside the four declared words. Named rather than hidden, so
      // the day the vocabulary grows this says so instead of falling silent.
      return `This night's space carries the stage "${stage}", which this surface does not expect and which is not acquired.`;
  }
}

const STAGE_RULE =
  "A night can be announced only once its space is acquired, and acquired means in writing. Announcing a night in a space still under negotiation closes that negotiation badly, and closes it for us.";

/** §11.2 part 2, and it is the surfacing of a one-way switch. */
const NUMBER_SENTENCE =
  "Announcing spends this night's series number. A number that has been spent is never reused.";

/** §11.2 part 4 — D-44-16, said in the place a person would fear otherwise. */
const STILL_PROCEEDS =
  "Open items do not stop this. The checklist warns; it never blocks.";

/** §13.2's row for a count that could not be taken. Never a figure. */
const COULD_NOT_COUNT = "We could not count";

/**
 * What `announceNight` can return, read out of the act's body.
 *
 * Narrowed rather than total over `CalendarRefusal` — the tick's own codes
 * cannot arrive here — with the cost written down: a member added upstream
 * reaches the `default` arm, which **prints the value** rather than hiding it
 * inside a sentence written for something else.
 */
type AnnounceRefusal =
  | "invalid_id"
  | "plan_not_found"
  | "already_announced"
  | "already_announced_orphan_night"
  | "format_not_resolved"
  | "series_not_resolved"
  | "start_time_missing"
  | "venue_stage_not_acquired"
  | "number_taken"
  | "precheck_failed"
  | "write_failed"
  | "link_failed";

/** Turns red the day a member above stops existing in the union it copies. */
type _AnnounceIsSubset = AnnounceRefusal extends CalendarRefusal ? true : never;
const _announceIsSubset: _AnnounceIsSubset = true;
void _announceIsSubset;

/**
 * One sentence per cause.
 *
 * Each opens by saying **what did not happen**, because on this act that is the
 * first thing a person needs: whether a number was spent decides whether
 * pressing again is safe. §13.2's own sentence — *nothing was written and the
 * series number was not spent* — is true of every member here except
 * `link_failed`, which says the opposite because there the opposite is true.
 *
 * It takes the whole failure rather than the reason alone, because one member
 * carries a value the sentence has to print: the night left unlinked by a lost
 * race has the same title and the same date as the one that won, so the id is
 * the only thing that names it.
 */
function describeAnnounceRefusal(failure: CalendarFailure): string {
  const reason = failure.reason;
  switch (reason as AnnounceRefusal) {
    case "invalid_id":
      return "We could not announce this night. Nothing was written and the series number was not spent — this night could not be identified, so the database was never asked. Reload the page.";
    case "plan_not_found":
      return "We could not announce this night. Nothing was written and the series number was not spent. The calendar no longer holds this night — reload the page.";
    case "already_announced":
      return "Nothing was written and no second number was spent. This night has already been announced, and announcing it again would spend another number that could never be released. Reload the page: it now says so.";
    case "already_announced_orphan_night":
      return `⚠ Two facts, and both are true. This night was announced by somebody else while this press was running, so the calendar row is already tied to their night — do NOT press again. And this press did create a night before losing: it is unpublished, it is tied to nothing, and no series number was spent on it because it carries no progressivo. It is on the events surface, under this night's name, and its id is ${failure.orphanPartyId ?? "not recorded"}. It is the one to remove.`;
    case "format_not_resolved":
      return "We could not announce this night. Nothing was written and the series number was not spent. The import could not resolve this entry's format, and a night cannot exist without one. Fix the entry in the calendar file and run the import again.";
    case "series_not_resolved":
      return "We could not announce this night. Nothing was written and the series number was not spent. The import could not resolve which run of the format this night belongs to.";
    case "start_time_missing":
      return "We could not announce this night. Nothing was written and the series number was not spent. The calendar entry carries no start time, and an hour on a door is not something this act may invent.";
    case "venue_stage_not_acquired":
      return `We could not announce this night. Nothing was written and the series number was not spent. ${STAGE_RULE}`;
    case "number_taken":
      return "We could not announce this night. Nothing was written and the series number was not spent. Another night already carries this format, this run and this number — two nights cannot share the three.";
    case "precheck_failed":
      return "We could not announce this night. Nothing was written and the series number was not spent: a read that had to happen first did not answer, so nothing was attempted.";
    case "write_failed":
      return "We could not announce this night. The database refused the write, so nothing was written and the series number was not spent.";
    case "link_failed":
      return "⚠ The night was created and its series number IS spent. What failed is the link back to the calendar, so the two are not tied together. Do NOT press this again — a second press would create a second night and spend a second number. The night is on the events surface; the link has to be repaired there.";
    default:
      return `We could not announce this night. The act refused this with "${reason}", which this surface does not expect. Nothing was written.`;
  }
}

interface AnnounceNightDialogProps {
  /** The calendar row this act reads. Shape-checked again inside the act. */
  readonly planId: string;
  /** How far this night's space actually is. Four words, or not recorded. */
  readonly venueStage: VenueStageValue;
  /** Whether the calendar row is already tied to a night. */
  readonly alreadyAnnounced: boolean;
  /**
   * The sentences of the items still open — **not a count**.
   *
   * `Venue not confirmed in writing` reads as a decision; a figure reads as a
   * formality (§11.2 part 3). `null` means the checklist itself could not be
   * read, which is not the same as *none*.
   */
  readonly openItems: readonly string[] | null;
}

export function AnnounceNightDialog({
  planId,
  venueStage,
  alreadyAnnounced,
  openItems,
}: AnnounceNightDialogProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stageBlocks = venueStage !== "acquired";

  function close() {
    setRefusal(null);
    setOutcome(null);
    setOpen(false);
  }

  async function confirm() {
    if (isSubmitting) return;
    setRefusal(null);
    setIsSubmitting(true);

    try {
      const result = await announceNight(planId);

      if (!result.ok) {
        setRefusal(describeAnnounceRefusal(result));
        return;
      }

      // The surface re-reads NOW, behind this dialog, while the outcome stays on
      // screen to be read. Dismissing by backdrop or by Escape therefore cannot
      // leave a page that still offers an act which has already happened.
      router.refresh();
      setOutcome(
        result.openItems === null
          ? "The night exists, unpublished, and its series number is spent. How many checklist items were still open could not be read — that is not the same as none. Nothing is publicly readable until somebody publishes it, and its address is kept secret."
          : result.openItems === 0
            ? "The night exists, unpublished, and its series number is spent. Nothing on its checklist was open. Nothing is publicly readable until somebody publishes it, and its address is kept secret."
            : `The night exists, unpublished, and its series number is spent. ${result.openItems} checklist ${result.openItems === 1 ? "item was" : "items were"} still open, and that did not stop it. Nothing is publicly readable until somebody publishes it, and its address is kept secret.`
      );
    } catch (err) {
      // Shape, not message: a production build redacts the message of an error
      // thrown out of a Server Action, so the two branches say only what the
      // shape can honestly tell apart. Every other failure is a returned value,
      // so a throw that reached the server is the gate.
      const unreachable =
        err instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);

      setRefusal(
        unreachable
          ? "Nothing was written and the series number was not spent. The request never reached the server — check the connection and try again."
          : "You do not have permission to announce a night. Nothing was written and the series number was not spent. If this surface was open a moment ago, reload the page and check what this account can still do."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (alreadyAnnounced) {
    /*
      No control at all, and a sentence in its place. A disabled button here
      would be indistinguishable from a refusal, and those are two of the things
      §13.2 exists to keep apart — the act is not refused, it has already
      happened.
    */
    return (
      <p className="text-sm text-muted">
        This night is already announced. It exists in the product, and the
        calendar row is tied to it.
      </p>
    );
  }

  return (
    <>
      {/*
        `primary`, not `destructive`: nothing is destroyed. `md` is the ordinary
        labelled rung, and this act is behind a confirmation because of what it
        spends, not because of what it breaks.
      */}
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        Announce this night
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title="Announce this night"
        size="md"
        status={refusal ? { tone: "crit", message: refusal } : null}
        actions={
          outcome ? (
            <Button variant="secondary" className="w-full" onClick={close}>
              Close
            </Button>
          ) : (
            <div className="flex gap-3">
              {/*
                Cancel first in the DOM, first in the tab order, and carrying the
                marker the primitive focuses after `showModal()`. No
                Enter-to-confirm and no focus on the confirming control: a
                confirmation whose Enter key performs the act is a confirmation
                that did not ask.
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

              <Button
                variant="primary"
                className="flex-1"
                onClick={confirm}
                disabled={isSubmitting || stageBlocks}
              >
                {isSubmitting ? "Working…" : "Announce"}
              </Button>
            </div>
          )
        }
      >
        {outcome ? (
          <p className="text-sm text-ink">{outcome}</p>
        ) : (
          <div className="space-y-4">
            {/*
              PART 1 — what becomes visible, and the venue is NOT named.

              The sentence states what is written and what is explicitly not,
              because *the address does not move* is the fact this panel exists
              to make legible. Where the space is not acquired, the refusal
              leads: it is the first thing a reader needs and the reason the
              confirming control below is inert.
            */}
            {stageBlocks ? (
              <div role="alert">
                <p className="text-sm font-semibold text-ink">
                  {stageRefusalSentence(venueStage)}
                </p>
                <p className="mt-1 text-sm text-muted">{STAGE_RULE}</p>
              </div>
            ) : null}

            <p className="text-sm text-ink">
              This writes the night into the product as an{" "}
              <strong className="font-semibold">unpublished</strong> draft: its
              format, its run of that format, its number, its date and its start
              time. Nothing on it is publicly readable until somebody publishes
              it, which is a separate act on a separate surface. The space is not
              carried across and no address is written, so this cannot reveal a
              venue — revealing stays its own act, and it does not come back.
            </p>

            {/* PART 2 — the number, and it is a one-way switch. */}
            <p className="text-sm text-ink">{NUMBER_SENTENCE}</p>

            {/* PART 3 — the open items, NAMED. Never a count. */}
            <div>
              <p className="text-sm text-ink">Still open on this night:</p>
              {openItems === null ? (
                <p className="mt-1 text-sm text-muted">
                  {COULD_NOT_COUNT} what is still open on this night — the
                  checklist could not be read. That is not the same as nothing
                  being open.
                </p>
              ) : openItems.length === 0 ? (
                <p className="mt-1 text-sm text-muted">
                  Nothing. Every item on this night&apos;s checklist is ticked.
                </p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {openItems.map((label) => (
                    <li key={label} className="text-sm text-muted">
                      {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* PART 4 — it still proceeds. */}
            <p className="text-sm text-muted">{STILL_PROCEEDS}</p>
          </div>
        )}
      </Dialog>
    </>
  );
}
