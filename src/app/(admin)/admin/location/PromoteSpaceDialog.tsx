"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

import { promoteSpace, type PromotionRefusal } from "./actions";
import { SpaceName } from "./SpaceName";

import type { VenueStage } from "@/lib/production/sections/vocabulary";

/**
 * The one bridge from an internal list to something the public may eventually
 * see — and the confirmation that describes exactly what leaves.
 *
 * ── Why this panel NAMES the space, when the calendar's deliberately does not ─
 *
 * `AnnounceNightDialog`'s point 3 says *this dialog does not name the venue*,
 * and the reason it gives is sound: a confirmation panel is a thing somebody
 * photographs, and that act moves no address, so naming a place would put a word
 * on a screen for no gain. **This act moves the address**, so the same reasoning
 * inverts. The precedent it follows is `RevealVenueDialog`, which names the
 * place BECAUSE the place is exactly what is leaving: a confirmation that hid
 * the name and the address would be asking for consent to something it did not
 * describe, on the one act in this phase that is not undone by pressing again.
 *
 * The name is drawn once, in the body, and never in the title — the title names
 * the act. The **address is not drawn at all**: whether one crosses is the fact
 * this panel has to state, and it can state that without repeating a street.
 *
 * ⚠ **And it is drawn through `SpaceName`, which is the only renderer allowed
 * to.** Not to satisfy a gate: `venue-acquisition.md`'s *lo stato prima del
 * nome* means a space is named WITH its stage, and this is the panel where that
 * matters most — the stage is the single fact that decides whether the crossing
 * happens. A confirmation that named the place and left the badge on the page
 * behind it would show a candidate as though it were a venue, in the panel whose
 * whole job is to say it is not one yet. `verify:section-surface` check A found
 * this on its first run, on a hand-rolled `<strong>`.
 *
 * ── The act is consequential and NOT destructive ────────────────────────────
 *
 * Nothing is destroyed, so the trigger does not take the destructive rung. It
 * takes a confirmation for a reason the domain supplies: `venue-acquisition.md`
 * — a ranking is not an availability, and **acquired means in writing**. And a
 * venue is a thing a night can be built on, from where the address reaches the
 * public through the reveal machinery.
 *
 * ── Cancel first, cancel focused, and no Enter-to-confirm ───────────────────
 *
 * `41-UI-SPEC.md` §11's rule, through the primitive's **declared marker** rather
 * than React's `autofocus` prop, which is inert in this stack — the measurement
 * is recorded at `Dialog.tsx:117-148`. A confirmation whose Enter key performs
 * the act is a confirmation that did not ask, and here it would be a
 * confirmation that did not ask about the irreversible one.
 *
 * ── The refusal is drawn BEFORE the press, and again after it ───────────────
 *
 * Where the stage is not `acquired` the confirming control is inert and the
 * reason is in the body with the stage named — so the rule is readable before
 * the button rather than applied silently after it. The act refuses again on the
 * server, which is where the guarantee lives, and
 * `production_space_promotion_needs_acquired` refuses after that.
 *
 * ── The outcome is reported in this dialog's own panel ──────────────────────
 *
 * and nowhere else. A native `<dialog>` paints in the top layer, above every
 * `z-index`, so an outcome reported by the transient route would be reported
 * invisibly — a silent failure in a product with **no error tracking at all**,
 * where the sentence on this screen is the whole of the observable effect.
 *
 * ── Hiding the trigger protects nothing ─────────────────────────────────────
 *
 * See the mount on the detail page. The three things that refuse an unentitled
 * subject are the middleware entry, the page guard and the row-level policies.
 * The absence of a button is none of them.
 */

/** One sentence per cause, shared with nothing. */
const PROMOTION_REFUSAL: Record<PromotionRefusal, string> = {
  catalogue_manage_required:
    "No venue was created. This account may work the location section and may not create a venue — they are two different permissions on purpose, and this is the second one. Ask whoever manages permissions for the catalogue key.",
  invalid_id:
    "No venue was created. This space could not be identified, so the database was never asked — reload the page.",
  space_not_found:
    "No venue was created. This space is no longer readable from here — reload the page.",
  space_exited:
    "No venue was created. This space left the race, and a record of that decision does not cross into the venue list.",
  already_promoted:
    "No second venue was created, and that is the point: this space has already been crossed. Reload the page — it now says so.",
  not_acquired:
    "No venue was created. A space crosses from acquired and from no other stage, and acquired means IN WRITING — not that somebody said yes on the phone.",
  no_agreement_evidence:
    "No venue was created. The stage says acquired and the line saying where the agreement is has been left empty. Acquired means in writing, and the writing has to be findable.",
  venue_name_taken:
    "No venue was created. The catalogue already holds a venue under this exact name, and a name is not something this act may alter to get around a collision — a venue is written the way the venue writes it. Most likely this place is already over there, arrived by another route. Check the venue list before doing anything else.",
  slug_taken:
    "No venue was created. The web address this name produces is taken, and so is the suffixed form — which normally means two presses landed in the same instant. Press again.",
  venue_policy_refused:
    "No venue was created. The database refused this account permission to create one, while this surface read the permission as held. The two disagree, and that is a question about this account rather than about this space — reload the page and check what it can still do.",
  read_failed:
    "No venue was created. A read that had to happen first did not answer, so nothing was attempted.",
  write_failed:
    "No venue was created. The database refused the write.",
  promotion_link_failed:
    "The crossing did not complete, and the venue it had created was removed. Nothing exists in the venue list and this space is not linked to anything, so pressing again is safe.",
  promotion_raced:
    "Somebody else crossed this space while this press was running. The venue this press created was removed, so nothing of it survives — but the space IS crossed, by their press. Reload the page and do not press again.",
  promotion_orphan_venue:
    "⚠ A venue was created and this act could NOT remove it. Do not press again — a second press would create a second one. There are two readings and both are worth checking: either the row is sitting unlinked in the venue list, or the link did land and the response never came back, which is why the database refused to remove it. RELOAD THIS PAGE FIRST: if the space now reads as crossed, the crossing is done and there is nothing to repair.",
};

/**
 * What each stage means where it is NOT `acquired`, in that stage's own words.
 *
 * Each names the stage and never a space: four declared words identify nothing.
 * The rule below is the common clause, so a reader meets it whichever stage they
 * are standing on.
 */
const STAGE_IS_NOT_ACQUIRED: Record<Exclude<VenueStage, "acquired">, string> = {
  mapped:
    "This space is at mapped — a desk exercise. Nobody has called it, and nobody has agreed to anything.",
  verified:
    "This space is at verified — a checked fact, not an agreement.",
  contacted:
    "This space is at contacted — a conversation. Verbally interested is not acquired.",
};

const ACQUIRED_RULE =
  "A space crosses into the venue list from acquired and from no other stage, and acquired means IN WRITING — not that somebody said yes on the phone. A ranking measures how suitable a space would be, never whether it would host us.";

/** What a refusal this surface did not expect reads as, with its code printed. */
function describePromotionRefusal(reason: PromotionRefusal): string {
  return (
    PROMOTION_REFUSAL[reason] ??
    `No venue was created. The act refused this with “${reason}”, which this panel does not expect.`
  );
}

export function PromoteSpaceDialog({
  spaceId,
  name,
  stage,
  hasAddress,
  alreadyPromoted,
}: {
  readonly spaceId: string;
  /**
   * The space's name, drawn in the body because it is what leaves — and drawn
   * through `SpaceName`, with the stage beside it.
   *
   * The address is deliberately NOT a prop: this panel says WHETHER one crosses,
   * and it does not need the street to say that.
   */
  readonly name: string;
  /** The stage the space has actually reached. Never null: entering is mapping. */
  readonly stage: VenueStage;
  /** Whether the record holds a street address at all. */
  readonly hasAddress: boolean;
  /** Whether the crossing has already been made. */
  readonly alreadyPromoted: boolean;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const stageBlocks = stage !== "acquired";

  function close() {
    setRefusal(null);
    setOutcome(null);
    setOpen(false);
  }

  async function confirm() {
    if (working || stageBlocks) return;
    setRefusal(null);
    setWorking(true);

    try {
      const result = await promoteSpace(spaceId);

      if (!result.ok) {
        setRefusal(describePromotionRefusal(result.reason));
        return;
      }

      // The page re-reads NOW, behind this panel, while the outcome stays on
      // screen to be read. Dismissing by Escape therefore cannot leave a page
      // still offering an act that has already happened.
      router.refresh();
      setOutcome(
        result.addressCarried
          ? "The venue exists in the catalogue, and this space is linked to it. THE ADDRESS CROSSED WITH IT. Nothing is public yet: a venue is reachable from outside only once somebody builds a night on it, and that is a separate act. Nothing here revealed anything, and no reveal was armed."
          : "The venue exists in the catalogue, and this space is linked to it. NO ADDRESS CROSSED, because this record holds none — whoever picks this venue for a night will find it without one. Nothing is public yet, nothing here revealed anything, and no reveal was armed."
      );
    } catch (thrown) {
      // Shape, not message: a production build redacts the message of an error
      // thrown out of a Server Action, so these two branches say only what the
      // shape can honestly tell apart. Every other failure is a returned value,
      // so a throw that reached the server is the section gate.
      const unreachable =
        thrown instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);

      setRefusal(
        unreachable
          ? "No venue was created. The request never reached the server — check the connection and try again."
          : "No venue was created. This account is not allowed to work in the location section. If this surface was open a moment ago, reload the page."
      );
    } finally {
      setWorking(false);
    }
  }

  if (alreadyPromoted) {
    /*
      No control at all, and a sentence in its place. A disabled button here
      would be indistinguishable from a refusal, and those are two different
      things: the act is not refused, it has already happened.
    */
    return (
      <p className="text-sm text-muted">
        This space has already been crossed into the venue list. It is still on
        this list too — the crossing is a link, not a move.
      </p>
    );
  }

  return (
    <>
      {/*
        `primary`, not `destructive`: nothing is destroyed. The confirmation is
        here because of what the act STARTS, not because of what it breaks.
      */}
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        Cross into the venue list
      </Button>

      <Dialog
        open={open}
        onClose={close}
        /* The title names the act. The space is named in the body, where the
           sentence that says what leaves can stand beside it. */
        title="Cross into the venue list"
        size="lg"
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
                Enter-to-confirm and no focus on the confirming control.
              */}
              <Button
                variant="secondary"
                className="flex-1"
                data-initial-focus
                onClick={close}
                disabled={working}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                className="flex-1"
                onClick={confirm}
                disabled={working || stageBlocks}
              >
                {working ? "Working…" : "Cross it over"}
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
              THE REFUSAL LEADS WHERE THERE IS ONE. It is the first thing a
              reader needs and the reason the confirming control below is inert.
            */}
            {stageBlocks ? (
              <div role="alert">
                <p className="text-sm font-semibold text-ink">
                  {STAGE_IS_NOT_ACQUIRED[stage]}
                </p>
                <p className="mt-1 text-sm text-muted">{ACQUIRED_RULE}</p>
              </div>
            ) : null}

            {/*
              THE SPACE IS NAMED, DELIBERATELY, AND WITH ITS STAGE.

              The name is what leaves, and a confirmation that hid it would ask
              consent for something it did not describe. The stage travels with
              it through the one renderer allowed to draw a name, because a
              candidate shown as a venue is exactly the reading this panel exists
              to prevent.
            */}
            <div className="text-sm text-ink">
              <p>This crosses the space below into the venue list.</p>
              <div className="mt-2">
                <SpaceName name={name} stage={stage} />
              </div>
            </div>

            <ul className="space-y-3">
              {/* ONE — what is created. */}
              <li className="text-sm text-ink">
                <strong className="font-semibold">
                  It creates a venue in the catalogue
                </strong>{" "}
                — the list a night&apos;s venue is chosen from. From there a
                night may later be built on it, which is a separate act on a
                separate surface.
              </li>

              {/* TWO — the address, and this is the sentence the act is asked on. */}
              <li className="text-sm text-ink">
                {hasAddress ? (
                  <>
                    <strong className="font-semibold">
                      It carries the address across
                    </strong>{" "}
                    — and from a venue an address can reach the public through
                    the reveal machinery, once a night stands on it. That road
                    exists on purpose and this is its entrance. Nothing is
                    revealed today: no night is created here, and no reveal is
                    armed.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold">
                      No address crosses, because this record holds none.
                    </strong>{" "}
                    The venue arrives without one, and whoever builds a night on
                    it will have to find it. Nothing is revealed today either
                    way: no night is created here, and no reveal is armed.
                  </>
                )}
              </li>

              {/* THREE — pressing again does not undo it. */}
              <li className="text-sm text-ink">
                <strong className="font-semibold">
                  It cannot be undone by pressing again.
                </strong>{" "}
                The link is written on this space, and a second press is refused
                as already crossed. Removing a venue happens in the catalogue,
                and removing one is a master&apos;s act.
              </li>

              {/* FOUR — nothing leaves this list. */}
              <li className="text-sm text-ink">
                <strong className="font-semibold">
                  The space stays in the location section.
                </strong>{" "}
                Nothing is deleted and nothing is moved out of the list: the
                promotion is a link, not a migration.
              </li>
            </ul>
          </div>
        )}
      </Dialog>
    </>
  );
}
