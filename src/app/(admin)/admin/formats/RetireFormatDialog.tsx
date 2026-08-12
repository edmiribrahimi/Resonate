"use client";

import { useState } from "react";
import {
  retireFormat,
  restoreFormat,
  retireSeries,
  restoreSeries,
  type CatalogueRefusal,
  type CatalogueResult,
} from "@/app/(admin)/admin/formats/actions";
import { catalogueColorLabel } from "@/app/(admin)/admin/formats/ColorSwatchPicker";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * The confirmation the catalogue asks before taking something out of
 * circulation — and the one it asks before putting it back.
 *
 * ── Where the shell came from, and where it lives now ────────────────────────
 *
 * Measured before this file was first written: there was **no confirmation
 * dialog for a destructive action anywhere in `src/`** (`36-PATTERNS.md`, *No
 * Analog Found*, first row). The native modal shell, the backdrop click and the
 * open/close effect were therefore **copied from `CreateVenueModal.tsx`**,
 * which is the shape this repository already used. The two-button confirm, the
 * default focus and the refusal box were new here, and were stated as new.
 *
 * **That shell is no longer in this file.** Plan 41-09 extracted it into
 * `src/components/ui/Dialog.tsx` — from the same ancestor, which is exactly why
 * the extraction was provable: this docblock and `RevealVenueDialog.tsx:18-19`
 * had already written the lineage down before anybody went looking for it. The
 * lineage is kept rather than deleted, because it is the evidence.
 *
 * What the primitive brought with it, and what this file therefore stopped
 * carrying: the panel geometry, the scrim, the light-dismiss handler, the
 * open/close effect, the 32 px close control (now 44 × 44, §6.1), and the
 * initial focus. What stays here is what this dialog **is** — the question, the
 * two answers, the ten refusals and the asymmetry between retire and restore.
 *
 * ── What this dialog is NOT, recorded so nobody has to guess ─────────────────
 *
 * Retiring **publishes nothing** and is **reversible**. It is not a monotone
 * switch and it must not be built like one: unlike `venue_reveal_sent`, where
 * the mail has left and the screenshot exists, retiring a format writes a
 * timestamp that a later act can clear. **This phase adds no monotone switch at
 * all.** The monotone guard the phase must not break is the series progressivo,
 * and it is held by storing the number rather than deriving it
 * (`meta-gates.md`, *verifica delle guardie monotone*).
 *
 * Nothing here deletes, and the absence is structural rather than remembered:
 * `admin/formats/actions.ts` exports no removal of any kind, and both foreign
 * keys are `ON DELETE RESTRICT`, so a format that carries nights could not be
 * removed even by a caller who went around this surface. D-36-10: the archive
 * keeps showing the sigla a night actually ran under.
 *
 * ── Restoring is NOT an undo, and this dialog says so in its own words ───────
 *
 * The two directions are not symmetric, and the asymmetry is in the schema
 * rather than in this file. `formats_color_active_unique` is a **partial**
 * unique index — `WHERE retired_at IS NULL` — so retiring a format **releases
 * its colour** and another format may take it. When one has, `restoreFormat`
 * returns `color_taken` and the restore does not happen.
 *
 * So the restore copy does not read as the retire copy backwards, the refusal
 * **names its cause and a way out** rather than reporting that something went
 * wrong, and `production-calendar.md` supplies the second reason for asking at
 * all: a retired sigla is not cited again, so bringing a name back is a decision
 * of its own and not the undoing of a mistake.
 *
 * ── A refusal is a RETURNED value ────────────────────────────────────────────
 *
 * Every action in `admin/formats/actions.ts` returns `CatalogueResult`. Next
 * **redacts** the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`), so a client that
 * read `err.message` would work under `next dev` and print a blank where it
 * counts. The `catch` below therefore branches on the **shape** of the failure —
 * it distinguishes *the request never left* from *the server refused it*, which
 * is the most that can honestly be told apart without a message.
 */

/** Which table the act lands on. The copy differs; the mechanics do not. */
export type RetireSubject = "format" | "series";

/** Which direction. `restore` is not the inverse of `retire` — see the docblock. */
export type RetireMode = "retire" | "restore";

/**
 * The refusals these four actions can actually return, read out of
 * `admin/formats/actions.ts` return by return.
 *
 * Narrowed rather than total over `CatalogueRefusal`, for the reason
 * `36-08-SUMMARY.md` states about its own tables: a total `Record` would have to
 * write members this dialog can never meet, and a branch that cannot be reached
 * is a branch nobody maintains. The cost is stated rather than glossed — a
 * member **added** to the union does not turn this red; it reaches the `default`
 * branch, which prints the refusal's own value instead of hiding it behind a
 * sentence written for something else.
 */
type ReachableRefusal =
  | "invalid_id"
  | "format_not_found"
  | "format_already_retired"
  | "format_not_retired"
  | "series_not_found"
  | "series_already_retired"
  | "series_not_retired"
  | "color_taken"
  | "precheck_failed"
  | "write_failed";

/** Turns red the day a member above stops existing in the union it copies. */
type _ReachableIsSubset = ReachableRefusal extends CatalogueRefusal ? true : never;
const _reachableIsSubset: _ReachableIsSubset = true;
void _reachableIsSubset;

interface RetireFormatDialogProps {
  readonly open: boolean;
  /** The row this dialog acts on. */
  readonly id: string;
  /** Rendered verbatim in the heading — a format name is stored as it is written. */
  readonly name: string;
  readonly subject: RetireSubject;
  readonly mode: RetireMode;
  /**
   * The format's `#RRGGBB`, when the subject is a format.
   *
   * Used for one thing only: naming the colour in the `color_taken` refusal, so
   * a person reads *Amber is already used by …* rather than a hex they never
   * typed.
   */
  readonly color?: string;
  /**
   * The **active** format holding `color` right now, when there is one.
   *
   * The action returns `color_taken` **without** a holder name on purpose, so a
   * format's name never travels inside a refusal value. The surface holds the
   * catalogue, so it names the holder — and it must build the map from active
   * formats only, because a retired one released its tint.
   */
  readonly colorHolder?: string;
  readonly onClose: () => void;
  /** Called after the act succeeded, so the surface can reload its rows. */
  readonly onDone: () => void;
}

export default function RetireFormatDialog({
  open,
  id,
  name,
  subject,
  mode,
  color,
  colorHolder,
  onClose,
  onDone,
}: RetireFormatDialogProps) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function close() {
    setRefusal(null);
    onClose();
  }

  /**
   * One sentence per cause. `Could not …` opens each one and what follows is the
   * reason, never a stand-in for one — there is no error tracking in this
   * project, so a refusal a person cannot read is a refusal nobody ever reads.
   */
  function describe(reason: CatalogueRefusal): string {
    const noun = subject === "format" ? "format" : "series";

    switch (reason as ReachableRefusal) {
      case "invalid_id":
        return `Could not act. This ${noun} could not be identified. Reload the page and try again from the list.`;
      case "format_not_found":
      case "series_not_found":
        return `Could not act. This ${noun} is no longer in the catalogue — it may have changed while this dialog was open. Reload the page.`;
      case "format_already_retired":
      case "series_already_retired":
        return `Nothing to do. This ${noun} is already retired. Reload the page to see the current list.`;
      case "format_not_retired":
      case "series_not_retired":
        return `Nothing to do. This ${noun} is not retired. Reload the page to see the current list.`;
      case "color_taken": {
        // The one refusal that has a way out, so it says what the way out is.
        const label = color ? catalogueColorLabel(color) : "This colour";
        return colorHolder
          ? `Not restored. ${label} was released when this format was retired, and ${colorHolder} holds it now. Give one of the two a different colour, then restore this one.`
          : `Not restored. ${label} was released when this format was retired, and another active format holds it now. Give one of the two a different colour, then restore this one.`;
      }
      case "precheck_failed":
        return "Could not act. A check that runs before the write could not be performed, so nothing was attempted and nothing changed.";
      case "write_failed":
        return "Could not act. The database refused the write. Nothing changed.";
      default:
        // Not a bucket: an unforeseen cause identifies itself on screen rather
        // than borrowing a sentence written for something else.
        return `Could not act. The catalogue refused this with "${reason}", which this dialog does not expect. Nothing changed.`;
    }
  }

  async function confirm() {
    if (isSubmitting) return;
    setRefusal(null);
    setIsSubmitting(true);

    try {
      let result: CatalogueResult;

      if (subject === "format") {
        result = mode === "retire" ? await retireFormat(id) : await restoreFormat(id);
      } else {
        result = mode === "retire" ? await retireSeries(id) : await restoreSeries(id);
      }

      if (!result.ok) {
        setRefusal(describe(result.reason));
        return;
      }

      onDone();
      close();
    } catch (err) {
      // The guard throws; the network throws. Both messages are redacted in a
      // production build, so the branch is on the SHAPE of the failure and each
      // branch names a different cause.
      const unreachable =
        err instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);

      setRefusal(
        unreachable
          ? "Could not act. The request never reached the server. Nothing changed — check the connection and try again."
          : "Could not act. The server refused the request. This account may no longer hold permission to manage the catalogue; reload the page and check. Nothing changed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // The copy, verbatim from the copywriting contract for the retire/format case.
  const heading =
    mode === "retire" ? `Retire ${name}?` : `Restore ${name}?`;

  const body =
    subject === "format"
      ? mode === "retire"
        ? "New nights can no longer be assigned to it. Nights already recorded under it keep their name and stay where they are."
        : "New nights can be assigned to it again. This is not an undo: retiring released its colour, so if another format has taken it since, this is refused until one of the two takes a different colour."
      : mode === "retire"
        ? "New nights can no longer be assigned to this series. Nights already recorded in it keep their name and their number."
        : "New nights can be assigned to it again. Numbering continues from the highest number this series ever handed out — nothing is renumbered.";

  const confirmLabel =
    mode === "retire"
      ? subject === "format"
        ? "Retire format"
        : "Retire series"
      : subject === "format"
        ? "Restore format"
        : "Restore series";

  return (
    <Dialog
      open={open}
      onClose={close}
      title={heading}
      status={refusal ? { tone: "crit", message: refusal } : null}
      actions={
        <div className="flex gap-3">
          {/*
            Cancel first in the DOM, first in the tab order, and it carries the
            marker the primitive focuses on open.

            The argument is carried across from where this file first wrote it,
            because it is an argument and not a note: a confirmation whose Enter
            key performs the act is a confirmation that did not ask. The
            mechanism changed and the rule did not — the primitive focuses
            `[data-initial-focus]` imperatively, immediately after
            `showModal()`, which is the only moment the user agent does not
            overwrite. The `autoFocus` prop that used to sit here was measured
            NOT to survive that step and is gone rather than kept beside it.

            `showModal()` also traps focus for as long as the dialog is open —
            the rest of the document is inert — so no key handler keeps it
            inside. That is the browser's, and it is why the native modal
            element is the right shell for a confirmation.

            The order is the copy contract's: `[ Cancel ] [ Retire format ]`.
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
            // The destructive rung, and it is a rung rather than a bespoke
            // treatment now: a semantic fill carries `--ground` as its ink, at
            // 7.36 : 1 (§8.5). Restoring is NOT destructive, so it does not
            // borrow that treatment — but it is still a decision of its own,
            // which is why it is behind this dialog at all.
            variant={mode === "retire" ? "destructive" : "primary"}
            className="flex-1"
            onClick={confirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Working…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted">{body}</p>
    </Dialog>
  );
}
