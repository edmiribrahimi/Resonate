"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";

import { changeStage, type LocationRefusal } from "./actions";

import {
  VENUE_STAGES,
  type VenueStage,
} from "@/lib/production/sections/vocabulary";

/**
 * The stage change — the one act on this section that decides whether a space
 * may be named in a material.
 *
 * ── Why it is a confirmation and not a select on the form ───────────────────
 *
 * Nothing is destroyed, so the trigger does not take the destructive rung. It
 * takes a confirmation for a reason the domain supplies: **the four words are
 * four different things**, and the last of them authorises a publication.
 * `venue-acquisition.md`, gate *lo stato prima del nome* — mapped is a desk
 * exercise, verified is a checked fact, contacted is a conversation, and
 * **acquired means in writing**, not *they said yes on the phone*. A control
 * that simply moved a space up a list would let the fourth word be picked with
 * the same gesture as the second.
 *
 * ── The evidence is asked for in the panel that asks for the stage ──────────
 *
 * Not on a later screen and not after the press. The confirming control is
 * **inert while the evidence field is blank**, the sentence that says why is
 * above it, and the act refuses again on the server — where
 * `production_space_acquired_needs_evidence` refuses after that. The code is the
 * sentence, the constraint is the boundary, and neither substitutes for the
 * other: `btrim` in the constraint means a string of spaces does not satisfy it,
 * which is exactly what a required field collects from somebody in a hurry.
 *
 * ⚠ **The other three stages have no evidence column, and this panel says so.**
 * Moving to `verified` or `contacted` is a claim about the world that the schema
 * records as one word with nothing behind it. Drawing the four transitions as if
 * they were equally evidenced would be the comfortable lie; the panel names what
 * has to be true instead, so that the person pressing is the evidence, knowingly.
 *
 * ── Cancel first, cancel focused, and no Enter-to-confirm ───────────────────
 *
 * `41-UI-SPEC.md` §11's rule, through the primitive's declared marker rather
 * than React's `autofocus` prop, which is **inert** in this stack — the
 * measurement is recorded at `Dialog.tsx:117-148`. **A confirmation whose Enter
 * key performs the act is a confirmation that did not ask.**
 *
 * ── This dialog does not name the space ─────────────────────────────────────
 *
 * Not in its title, not in its body, not in its outcome. A confirmation panel is
 * a thing somebody photographs, the space may be under negotiation, and this act
 * moves no address — so naming one would put a word on a screen for no gain.
 * The name is on the page behind it, beside its stage, in the one renderer
 * allowed to draw it.
 *
 * ── The outcome is reported in this dialog's own panel ──────────────────────
 *
 * and nowhere else. A native `<dialog>` paints in the top layer, above every
 * `z-index`, so an outcome reported by the transient route would be reported
 * invisibly — the silent failure `meta-gates.md` forbids, in a product with no
 * error tracking at all.
 */

/** What each stage means, in the domain's words, read before the press. */
const STAGE_MEANING: Record<VenueStage, string> = {
  mapped:
    "Mapped is a desk exercise: somebody wrote the place down. It says nothing about whether the place would host us.",
  verified:
    "Verified is a checked fact — something about the space was confirmed at the source. It is not a conversation and it is not an agreement.",
  contacted:
    "Contacted is a conversation. Somebody spoke to the place. Verbally interested is still not acquired.",
  acquired:
    "Acquired means IN WRITING. It is the only stage that unlocks naming this space in a material, a caption or a capitolato — and a name published on a negotiation still open closes that negotiation badly, and closes it for us.",
};

/** What the schema keeps behind each word, which is not the same for all four. */
const STAGE_EVIDENCE: Record<VenueStage, string> = {
  mapped:
    "Nothing is stored behind this word. The list keeps the claim, and you are it.",
  verified:
    "Nothing is stored behind this word: the schema has no field for what was checked or where. The claim rests on the person pressing.",
  contacted:
    "Nothing is stored behind this word: the schema has no field for who was spoken to or when. The claim rests on the person pressing.",
  acquired:
    "This is the one word the database refuses without evidence. Say where the agreement is — a pointer, never an attachment: a mail of such a date, a signed contract, and where it lives.",
};

/** One sentence per cause, shared with nothing. */
const STAGE_REFUSAL: Partial<Record<LocationRefusal, string>> = {
  invalid_id:
    "The stage did not move. This space could not be identified, so the database was never asked — reload the page.",
  invalid_stage:
    "The stage did not move. That is not one of the four stages — reload the page.",
  agreement_evidence_missing:
    "The stage did not move. Acquired means in writing, and the line saying where the writing is was empty or blank.",
  promoted_cannot_leave_acquired:
    "The stage did not move. This space has already been crossed into the venue list, so its stage cannot leave acquired from here — undo the crossing where it was made.",
  note_carries_contact:
    "The stage did not move. The evidence line carries what looks like a mail address or a mobile number, and this field holds a pointer to the agreement, not a contact. Nothing was masked and nothing was stored.",
  space_not_found:
    "The stage did not move. This space is no longer readable from here — reload the page.",
  space_exited:
    "The stage did not move. This space has left the race, and a record of that decision is not edited any further.",
  read_failed:
    "The stage did not move. A read that had to happen first did not answer, so nothing was attempted.",
  write_failed: "The stage did not move. The database refused the write.",
};

/** What a refusal this surface did not expect is reported as, with its code. */
function describeStageRefusal(reason: LocationRefusal): string {
  return (
    STAGE_REFUSAL[reason] ??
    `The stage did not move. The act refused this with “${reason}”, which this panel does not expect.`
  );
}

export function StageChangeDialog({
  spaceId,
  currentStage,
}: {
  readonly spaceId: string;
  /** The stage the space is on now. Never null: entering the list is the mapping. */
  readonly currentStage: VenueStage;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<VenueStage>(currentStage);
  const [agreementEvidence, setAgreementEvidence] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  /*
    THE CONDITION NAMES THE EVIDENCE FIELD, AND IT IS TRIMMED.

    A string of spaces is what a required field collects from somebody in a
    hurry, and the constraint underneath uses `btrim` for exactly that reason. If
    the control were inert only on an empty string, the surface would offer a
    press the database refuses — and the person would read a constraint code
    instead of the rule.
  */
  const evidenceMissing =
    stage === "acquired" && agreementEvidence.trim() === "";

  function close() {
    setRefusal(null);
    setOutcome(null);
    setStage(currentStage);
    setOpen(false);
  }

  async function confirm() {
    if (working || evidenceMissing) return;
    setRefusal(null);
    setWorking(true);

    try {
      const result = await changeStage(spaceId, stage, agreementEvidence);

      if (!result.ok) {
        setRefusal(describeStageRefusal(result.reason));
        return;
      }

      // The page re-reads NOW, behind this panel, while the outcome stays on
      // screen to be read. Dismissing by Escape therefore cannot leave a page
      // still offering an act that has already happened.
      router.refresh();
      setOutcome(
        stage === "acquired"
          ? "The stage is acquired, and the line saying where the agreement is was stored with it. This space may now be named in a material — nothing here has named it."
          : `The stage is ${stage}. Nothing was published and no address moved.`
      );
    } catch (thrown) {
      // Shape, not message: a production build redacts the message of an error
      // thrown out of a Server Action, so these two branches say only what the
      // shape can honestly tell apart.
      const unreachable =
        thrown instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);

      setRefusal(
        unreachable
          ? "The stage did not move. The request never reached the server — check the connection and try again."
          : "The stage did not move. This account is not allowed to write in the location section. If this surface was open a moment ago, reload the page."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="md" onClick={() => setOpen(true)}>
        Change the stage
      </Button>

      <Dialog
        open={open}
        onClose={close}
        /* The title names the act and never the space. */
        title="Change the stage"
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
                disabled={working || evidenceMissing}
              >
                {working ? "Working…" : "Move the stage"}
              </Button>
            </div>
          )
        }
      >
        {outcome ? (
          <p className="text-sm text-ink">{outcome}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              A stage is a claim about the world, not a position in a list. The
              four words are four different things, and only the last of them
              authorises naming this space anywhere outside this surface.
            </p>

            <Select
              id="stage-target"
              label="The stage it has actually reached"
              value={stage}
              onChange={(e) => setStage(e.target.value as VenueStage)}
            >
              {VENUE_STAGES.map((one) => (
                <option key={one} value={one}>
                  {one}
                </option>
              ))}
            </Select>

            {/* WHAT THE WORD MEANS, READ BEFORE THE PRESS AND NOT REMEMBERED. */}
            <div>
              <p className="text-sm font-semibold text-ink">
                {STAGE_MEANING[stage]}
              </p>
              <p className="mt-1 text-sm text-muted">{STAGE_EVIDENCE[stage]}</p>
            </div>

            {stage === "acquired" ? (
              <>
                <Input
                  id="stage-agreement-evidence"
                  label="Where the agreement is"
                  value={agreementEvidence}
                  onChange={(e) => setAgreementEvidence(e.target.value)}
                  hint="A pointer, never an attachment. Nothing is uploaded here."
                />
                {evidenceMissing ? (
                  <p role="alert" className="text-sm text-sem-crit">
                    Say where the agreement is before this can move. The database
                    refuses the stage without it, and a line of spaces does not
                    count.
                  </p>
                ) : null}
              </>
            ) : null}

            {currentStage === "acquired" && stage !== "acquired" ? (
              <p className="text-sm text-muted">
                This moves the stage DOWN from acquired. That is allowed — a
                negotiation falls through, and a list that could only rise would
                say the opposite of what happened. The line saying where the
                agreement was is kept, because the writing existed.
              </p>
            ) : null}
          </div>
        )}
      </Dialog>
    </>
  );
}
