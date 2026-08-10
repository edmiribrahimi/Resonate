"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  retireFormat,
  restoreFormat,
  retireSeries,
  restoreSeries,
  type CatalogueRefusal,
  type CatalogueResult,
} from "@/app/(admin)/admin/formats/actions";
import { catalogueColorLabel } from "@/app/(admin)/admin/formats/ColorSwatchPicker";

/**
 * The confirmation the catalogue asks before taking something out of
 * circulation — and the one it asks before putting it back.
 *
 * ── It has no analog, so its shape is designed rather than copied ────────────
 *
 * Measured before writing: there is **no confirmation dialog for a destructive
 * action anywhere in `src/`** (`36-PATTERNS.md`, *No Analog Found*, first row).
 * The `<dialog>` shell, the backdrop click and the open/close effect are copied
 * from `CreateVenueModal.tsx:37-50` and `:140-152`, which is the shape this
 * repository already uses. The two-button confirm, the default focus and the
 * refusal box are new here, and are stated as new.
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      setRefusal(null);
      // `Cancel` takes the default focus, and this is the deliberate part:
      // `CreateVenueModal` focuses nothing on purpose-or-otherwise, so nothing
      // in the tree does this and it had to be written. A confirmation whose
      // Enter key performs the act is a confirmation that did not ask.
      //
      // `showModal()` also traps focus for as long as the dialog is open — the
      // rest of the document is inert — so no key handler is needed to keep it
      // inside. That is the browser's, not this file's, and it is why the
      // `<dialog>` element is the right shell for a confirmation.
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
          {/* `normal-case`: the heading carries a format name, and
              `text-transform` inherits — the reason `FormatMarker` exists. */}
          <h2 className="text-lg font-bold text-foreground normal-case">
            {heading}
          </h2>

          <p className="mt-3 text-sm text-muted">{body}</p>

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
              Cancel first in the DOM and first in the tab order, and it holds
              the focus the effect above puts on it. The order is the copy
              contract's: `[ Cancel ] [ Retire format ]`.
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
                mode === "retire"
                  ? // The destructive treatment: the `red-500/10` fill and the
                    // `red-400` ink, reserved for this button and this dialog's
                    // refusal box, and used nowhere else on this surface.
                    "flex-1 rounded-full border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-400 transition-opacity hover:opacity-90 disabled:opacity-50"
                  : // Restoring is not destructive, so it does not borrow the
                    // destructive treatment — but it is still a decision of its
                    // own, which is why it is behind this dialog at all.
                    "flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              }
            >
              {isSubmitting ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
