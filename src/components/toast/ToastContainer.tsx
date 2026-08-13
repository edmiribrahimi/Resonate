"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Toast from "./Toast";

interface ToastData {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({
  toasts,
  onDismiss,
}: ToastContainerProps) {
  return (
    <div
      className="fixed right-0 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none"
      /*
       * ── The third author of the bar's height is gone (41-UI-SPEC §3.2) ──────
       *
       * This offset used to be written here as a literal: five rems for the
       * bottom bar, plus the safe-area inset, plus a rem of breathing room.
       * The page shell wrote the same assumption 54 times as `pb-24`, and the
       * four bottom sheets wrote it a third time. One declaration in
       * `globals.css` now holds it and all three read it.
       *
       * **On a phone the computed value does not move.**
       * `--nav-inset-block-end` is declared as five rems plus the safe-area
       * inset, so adding the rem below reproduces the previous expression term
       * for term. That is the evidence this migration is value-preserving, and
       * it is what makes the diff reviewable as a substitution rather than a
       * reposition. The previous literal is described here rather than quoted,
       * because a gate whose only match is the string it forbids cannot tell a
       * violation from its own explanation — the discipline 41-01 already paid
       * for twice, and the one `ColorSwatchPicker.tsx:22-27` states by omission.
       *
       * ── The one transient, named rather than left to be found ──────────────
       *
       * From `md` up `--nav-inset-block-end` is `0px`, so the toast sits at one
       * rem from the bottom edge — correct on a surface whose navigation has
       * moved to the side column, wrong on one that still shows the bottom bar.
       * `useToast` has **exactly one consumer today**, `GuestListClient`, which
       * is a work surface, and work surfaces took the side column in plan
       * 41-03. There is therefore no surface on which the new position is
       * wrong. Before 41-03 there would have been; this change is safe *now*,
       * and that ordering is the reason, not a coincidence.
       *
       * That paragraph argues the BLOCK axis, and it is still correct about it.
       * `--nav-inset-block-end` is untouched by everything below.
       *
       * ── THE INLINE AXIS: the same argument inverted, and a measured loss ────
       *
       * `left` used to read the **inline-axis** navigation clearance property —
       * the leading-edge counterpart of the block-axis one this file still reads
       * above — on the reasoning that from `md` up the container starts after
       * the side column so the toast centres in the content area instead of over
       * the navigation. It is named here by description and not spelled, for the
       * reason the paragraph above already gives about the previous literal: a
       * gate whose only match is the string it asserts about cannot tell a live
       * read from a comment explaining that there is no longer one.
       *
       * **SUPERSEDED 2026-08-13 by D-41.1-01/D-41.1-20, and kept beside the
       * measurement that superseded it.** That variable is no longer ambient:
       * `:root` declares it `0px` at every width and the two sites that own a
       * navigation column declare the 224px themselves, on the wrapper around
       * their own content. A custom property declared on a wrapper inherits
       * DOWN — and this container is not below either wrapper. `ToastProvider`
       * is mounted in `src/app/layout.tsx`, inside `<body>` as a sibling of the
       * route tree, so it sits ABOVE every route group's layout. Reading the
       * variable here would therefore resolve to `0px` on every route including
       * the two that do have a column: the expression would still be there and
       * would have stopped meaning anything.
       *
       * So the container pins to the inline start unconditionally. **This is a
       * real loss and it is written down as one rather than shipped as a
       * substitution.** With the column declared, a toast centred over the full
       * viewport at exactly 768px — the narrowest tablet — spans a region that
       * **overlaps the 224px navigation column by 32px**; at 1440px its centre
       * sits **112px** to the leading side of where it used to. Each toast is
       * capped at the small maximum declared below, which is what makes those
       * two numbers computable rather than estimated.
       *
       * **The two alternatives, and why each lost.**
       *   - *Reserve the column here with a breakpoint-keyed rule.* One utility,
       *     correct on a work surface — and it reintroduces the ambient claim in
       *     a second file: it would assume a column above 768px on the ten
       *     public and member sites that mount the bar-locked wrapper, and it is
       *     **permanently wrong on the door**, which keeps the bar at every
       *     width by decision (D-41-21, D-41.1-06). Refused.
       *   - *Declare the clearance where this container can inherit it.* The
       *     only construction correct on all thirteen mount sites, and it needs
       *     either `:has()` anchored on the root — refused by D-41.1-03, on
       *     MDN's explicit warning that any DOM change in the subtree forces
       *     re-evaluation, in a product that re-renders a live attendee list on
       *     a phone at a door — or moving this container below the declaring
       *     wrapper, which is real work and not a line.
       *
       * **The condition that reopens the refused one, stated so it is checked
       * rather than remembered: if the human observation in plan 41.1-05 task 4,
       * and again in plan 41.1-08, finds the 32px overlap unacceptable, then
       * D-41.1-03 REOPENS on evidence.** `:has()` was refused on a performance
       * argument made when the alternative was believed to be free. It is not
       * free — this docblock is what it costs — and a refusal priced against the
       * wrong alternative is a decision worth taking again.
       *
       * **This is also the region check E of `scripts/verify-conversion.mjs`
       * cannot reach**, and that gate says so on every run: it pairs two files
       * by their text and knows nothing about a container mounted above both.
       *
       * `right: 0` and this container's rung on §10's ladder are unchanged — the
       * rung is declared once, in the class list below, and naming it again here
       * would leave the check that counts it unable to tell the declaration from
       * its gloss.
       */
      style={{
        bottom: "calc(var(--nav-inset-block-end) + 1rem)",
        left: 0,
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <m.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto w-full max-w-sm"
          >
            <Toast
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onDismiss={onDismiss}
            />
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
