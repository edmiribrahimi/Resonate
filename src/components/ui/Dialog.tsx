"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

import { IconButton } from "@/components/ui/Button";

/**
 * The one dialog — a sheet from the bottom edge on a phone, a centred window
 * from 768 px up, from a single implementation.
 *
 * ── What this replaces, counted rather than estimated ────────────────────────
 *
 * Recorded in this direction because it is the direction a later reader can
 * check with a gate. Measured on this tree today: **seven** native
 * `<dialog>` + `showModal()` shells whose class string is byte-identical across
 * six of them, and **eleven** hand-rolled full-screen overlays that are not
 * `<dialog>` elements at all. Eighteen copies of one thing.
 *
 * D-41-09's instruction was that **an eighteenth is not built beside them**, and
 * §8.3's is that the extraction comes from the ancestor of the copy tree rather
 * than from a leaf: `src/components/venues/CreateVenueModal.tsx` is named as
 * the source by `RetireFormatDialog.tsx`, which is in turn named as the source
 * by `RevealVenueDialog.tsx`. Extracting from the ancestor means the provenance
 * of this file is already written in two other files' docblocks.
 *
 * Plan 41-09 converts **three** of the eighteen — the three on `/admin/formats`.
 * `scripts/verify-dialogs.mjs` carries the other fifteen as a written list with
 * the conversion unit that will remove each one, and prints the number on every
 * run. The number is the point, not the tick.
 *
 * ── The behaviour comes from the platform, and that is the whole argument ────
 *
 * `showModal()` supplies **Escape, the focus trap, background inertness and the
 * top layer by specification**. That is why the seven native shells are right
 * and why the eleven hand-rolled overlays are the ones that need this most:
 * measured, **none of the eleven handles any of the three**, and every dialog
 * on the public purchase path is among them.
 *
 * So this file writes no key handler, no focus-cycling code and no
 * `aria-modal`. Each of those would be a second author for something the user
 * agent already does, and a second author is how two implementations disagree.
 *
 * ── Which parts are NEW here, stated as new ──────────────────────────────────
 *
 *  1. **The sheet half.** The four sheet modals in the tree
 *     (`RedeemConfirmationModal`, `SumUpCheckoutModal`, `GuestLoginBanner`,
 *     `GuestTokenDisplay`) are hand-rolled overlays that already sit on the
 *     bottom edge on a phone; the seven native shells centre at every width.
 *     §8.3 grafts the first onto the second, and the graft is **three class
 *     pairs of CSS** — the cross-axis alignment, the panel radius, and the
 *     bottom padding. Nothing in JavaScript reads the viewport (§0 rule 6).
 *  2. **The three regions.** The specimen has one padded box; this has a
 *     header, a body that is **the only scroller**, and an actions region.
 *  3. **The status region**, which is not decoration — see below.
 *  4. **The 44 × 44 close control**, from the shared icon rung. The specimen's
 *     is a 32 px circle, which is below §6.1's floor.
 *  5. **The accessible name.** The specimen's `<dialog>` has none; this one is
 *     labelled by its own heading.
 *
 * ── A dialog reports its own outcome, and never raises a toast ───────────────
 *
 * A native `<dialog>` paints in the **top layer**, which is above every
 * `z-index` — including the toast container's `z-[70]`. A converted dialog that
 * reported success by toast would therefore report it **invisibly**: the exact
 * silent failure `meta-gates.md` forbids, in a project that has **no error
 * tracking**, so a message nobody sees is a message that exists nowhere.
 *
 * > **A dialog reports its own outcome inside its own panel.** `role="status"`
 * > for a success, `role="alert"` for a failure, ink `--sem-done` / `--sem-crit`
 * > on `--surface` — **5.69 : 1** and **6.99 : 1**, computed 2026-08-11.
 * > **A dialog never reaches for the toast context's hook.**
 *
 * The hook's name is deliberately not written anywhere in this file. A check
 * whose only match is the sentence forbidding the thing is a check that gets
 * ignored the third time it goes red — the defect
 * `[id]/assignments/actions.ts:58-62` already records, and the discipline
 * `ColorSwatchPicker.tsx` and `CreateFormatModal.tsx` already follow.
 *
 * This is latent rather than theoretical: that hook has exactly one consumer
 * today and it is not a dialog, so the rule goes live on first use.
 * `verify-dialogs.mjs` check C asserts it rather than leaving it remembered.
 *
 * ── The status region sits BELOW the scroller, deliberately ──────────────────
 *
 * §8.3 puts it *"at the foot of the body"*. It is rendered as its own region
 * immediately after the body rather than as the body's last child, and the
 * difference is not cosmetic: the body is the scroller, so an alert placed
 * inside it can be **below the fold at the moment it appears**. An error a
 * person has to scroll to find, in a repository with no error tracking, is the
 * newsletter form's failure with an extra step. Outside the scroller it is
 * always on screen, and the panel's own maximum height still holds because the
 * body shrinks instead.
 *
 * ── Light dismiss stays hand-rolled, and is INERT in this tree ───────────────
 *
 * §8.3 keeps the incumbent's `e.target === e.currentTarget` test rather than
 * the newer `closedby` attribute, which would also change Escape and
 * back-gesture semantics and is newer than `<dialog>` itself — proven behaviour
 * in seven files beats a newer attribute.
 *
 * **Measured, and written down rather than left to be discovered:** with the
 * incumbent's structure the handler **cannot fire**. The `<dialog>` carries no
 * padding and the wrapper below it is `h-full w-full`, so the dialog element
 * exposes no clickable area of its own and every click outside the panel lands
 * on the wrapper. The seven shells all have this property. It is preserved
 * exactly: making light dismiss live would mean an outside click discards a
 * half-typed form, which is a **behaviour** decision and does not belong to an
 * extraction. The handler is kept where §8.3 puts it so that the decision, when
 * somebody takes it, is one line and not a rediscovery.
 *
 * ── Initial focus: ONE mechanism, and it is not the attribute ────────────────
 *
 * Two mechanisms exist in the tree for one intent — the `autoFocus` prop
 * (`RetireFormatDialog.tsx:319`, `RevealVenueDialog.tsx:426`) and an imperative
 * `.focus()` after `showModal()`. §8.3 names `autofocus`; §2.1 of the pattern
 * map says to pick one and delete the other.
 *
 * **The attribute form does not survive `showModal()` in this stack, and that
 * is read out of the installed React rather than assumed.** In
 * `react-dom@19`'s client build, `autoFocus` is explicitly skipped by the
 * attribute writer (`case "autoFocus": break;`) and implemented instead as
 * `newProps.autoFocus && domElement.focus()` at commit — so **no `autofocus`
 * attribute is ever written to the DOM**. `showModal()` then runs in an effect,
 * *after* that commit, and re-performs the dialog focusing steps; finding no
 * `autofocus` attribute, the user agent focuses the first focusable element
 * instead. The React prop's focus is therefore overwritten a moment later.
 *
 * So the attribute is not a mechanism that exists here, and picking it would
 * have picked the half that loses. This file focuses imperatively, once,
 * immediately after `showModal()`:
 *
 *   - the element carrying **`data-initial-focus`**, if the caller declared
 *     one. A declared marker beats a heuristic — it forces the author to say
 *     which control is the least destructive, and it is greppable, which is the
 *     same argument §13 makes for `data-target="child"`;
 *   - otherwise **the close control**, which is first in the DOM and is the
 *     least destructive control by construction.
 *
 * **A confirmation whose Enter key performs the act is a confirmation that did
 * not ask.** That sentence is `RevealVenueDialog.tsx:243-249`'s, promoted here
 * from one file's habit to the rule every dialog inherits.
 *
 * ── Animation: none ──────────────────────────────────────────────────────────
 *
 * If a later plan adds one it carries `motion-reduce:`. `MotionProvider.tsx:12`
 * sets the reduced-motion preference for the motion **library** and not for a
 * CSS keyframe, so a keyframe added without the variant would ignore a setting
 * the rest of the product honours.
 */

/** §8.3's two panel widths. The `lg` list is closed and lives in the contract. */
export type DialogSize = "md" | "lg";

/**
 * `md` (448 px) is every dialog. `lg` (512 px) is for a **form** dialog on
 * §8.3's closed list — `CreateFormatModal`, `CreateSeriesModal`,
 * `CreateVenueModal`, `CreateArtistModal`, `EditVenueButton`,
 * `EditArtistButton`. A confirmation is not on that list and does not take it:
 * a two-button question does not become easier to answer by being wider.
 */
const PANEL_MAX_WIDTH = {
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

/** What a dialog can say about its own outcome. See the docblock. */
export type DialogStatusTone = "done" | "crit";

export interface DialogStatus {
  readonly tone: DialogStatusTone;
  readonly message: string;
}

/**
 * The ink per tone, on `--surface`. Both figures are computed, not preferred:
 * `--sem-done` **5.69 : 1** and `--sem-crit` **6.99 : 1**, against WCAG 1.4.3's
 * 4.5 : 1 for small text.
 *
 * There is no tinted box and no boundary. The incumbent dialogs draw the
 * failure as a raw-palette panel; a semantic ink at 6.99 : 1 says the same
 * thing in the token layer, and a box around one sentence is a container that
 * states nothing its content does not.
 */
const STATUS_INK = {
  done: "text-sem-done",
  crit: "text-sem-crit",
} as const;

interface DialogProps {
  /** Whether the dialog is showing. The effect below is what opens and closes it. */
  readonly open: boolean;
  /**
   * Called when the dialog closes **by any route** — the close control, Escape,
   * or the platform's own `close` event. A caller that resets state on close
   * puts it here and nowhere else, so no route can skip it.
   */
  readonly onClose: () => void;
  /**
   * The heading, and the dialog's accessible name.
   *
   * `normal-case` is declared on the element rather than assumed: a title can
   * carry a format name — `SunSet`, `RamaDub`, `MotionLab`, `re:sonate` — and
   * `text-transform` **inherits**, so "we did not ask for upper case" is not a
   * guarantee on a surface whose ancestors might. Upper-casing appears in 43
   * files in this tree.
   */
  readonly title: string;
  readonly size?: DialogSize;
  /** The body. It is the only scrolling region. */
  readonly children: ReactNode;
  /** The buttons, in the order they are read. Cancel first — §11. */
  readonly actions?: ReactNode;
  /** The dialog's own outcome, in its own panel. Never a toast. */
  readonly status?: DialogStatus | null;
}

/**
 * The close control's marker.
 *
 * The fallback focus target is found by this attribute rather than by a ref,
 * because the control is the shared icon rung and reaching into it would mean
 * widening that primitive's props from here. A declared marker is also the
 * thing a person can grep, which is the argument §13 already makes for
 * `data-target="child"`.
 */
const CLOSE_MARKER = "data-dialog-close";

export function Dialog({
  open,
  onClose,
  title,
  size = "md",
  children,
  actions,
  status = null,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();

      // After showModal(), never before: the user agent performs its own
      // focusing step as part of opening, and anything focused earlier is
      // replaced by it. See the docblock for the measurement behind this.
      const declared = dialog.querySelector<HTMLElement>("[data-initial-focus]");
      const fallback = dialog.querySelector<HTMLElement>(`[${CLOSE_MARKER}]`);
      (declared ?? fallback)?.focus();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  const handleDialogClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      className="fixed inset-0 z-[60] m-0 h-dvh w-dvw max-h-none max-w-none bg-black/80 backdrop:bg-transparent p-0"
      onClose={handleDialogClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full items-end justify-center p-0 md:items-center md:p-4">
        <div
          className={`flex max-h-[85dvh] w-full ${PANEL_MAX_WIDTH[size]} flex-col overflow-hidden rounded-t-2xl bg-surface md:rounded-2xl`}
        >
          <div className="flex min-h-11 items-center justify-between px-6 pt-6">
            <h2
              id={headingId}
              className="text-base font-semibold normal-case text-ink"
            >
              {title}
            </h2>

            <IconButton data-dialog-close aria-label="Close" onClick={onClose}>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 6L6 18M6 6l12 12"
                />
              </svg>
            </IconButton>
          </div>

          {/*
            The only scroller. `min-h-0` is load-bearing and not tidiness: a
            flex child will not shrink below its content without it, so the
            panel's maximum height would clip the body instead of scrolling it.
          */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>

          {status ? (
            <div className="px-6 pt-2">
              <p
                role={status.tone === "crit" ? "alert" : "status"}
                className={`text-sm ${STATUS_INK[status.tone]}`}
              >
                {status.message}
              </p>
            </div>
          ) : null}

          {actions ? (
            <div className="px-6 pb-[calc(1.5rem+var(--nav-inset-block-end))] pt-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
