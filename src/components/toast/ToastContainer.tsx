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
       * `left` reads the leading-edge variable for the same reason: from `md`
       * up the container starts after the side column, so the toast centres in
       * the content area instead of over the navigation. `right: 0` and this
       * container's rung on §10's ladder are unchanged — the rung is declared
       * once, in the class list below, and naming it again here would leave the
       * check that counts it unable to tell the declaration from its gloss.
       */
      style={{
        bottom: "calc(var(--nav-inset-block-end) + 1rem)",
        left: "var(--nav-inset-inline-start)",
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
