import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { FOCUS_RING } from "@/components/ui/Button";

/**
 * The three text-entry controls — `41-UI-SPEC.md` §8.6.
 *
 * ── What these are for, which is not tidying ─────────────────────────────────
 *
 * D-41-10 names finding A1 as this phase's, and says plainly that the input
 * primitive is not a tidy. **75 form inputs in this tree draw their boundary
 * with the legacy boundary name, which aliases the decorative line token, and a
 * line token reaches at most 1.39 : 1 over any ground** — against WCAG 1.4.11's
 * 3 : 1 for the boundary of an interactive control. Phase 40 wrote the rule and
 * handed the work forward; this file is where it is paid.
 *
 * **The consequence that makes the boundary non-negotiable.** An input's well is
 * `--sunk` `#0D0917` sitting inside a card of `--surface` `#140D20` — **1.04 : 1**.
 * The fill cannot show where the control is. **The boundary is the only channel**,
 * so it is not decoration here and it may not be dropped, softened, or replaced
 * by a line token because a line looked quieter.
 *
 * ── The five pairings, computed 2026-08-11 ───────────────────────────────────
 *
 *   boundary --control over --sunk .................. 7.03   (1.4.11, 3 : 1)
 *   boundary --control over --surface, on a card .... 6.78   (1.4.11, 3 : 1)
 *   value    --ink     over --sunk .................. 17.02  (1.4.3, 4.5 : 1)
 *   placeholder --muted over --sunk ................. 7.03   (1.4.3, 4.5 : 1)
 *   error text --sem-crit over --surface ............ 6.99   (1.4.3, 4.5 : 1)
 *
 * `--control` `#A493C0` **is** `--muted` **is** `--sem-info`: three names, one
 * value, literal on all three sides, which is `globals.css`'s own discipline and
 * D-40-05's reason for it. The name is not an ink name on purpose — writing an
 * ink's name on a boundary states a coincidence of value as if it were a
 * statement of role.
 *
 * ── Where the shape came from ────────────────────────────────────────────────
 *
 * `src/components/venues/CreateVenueModal.tsx:176-200` is the best specimen in
 * the tree, because it shows the whole unit — label, control, the read-only
 * variant and the textarea — in one block. **Its shape was copied and its
 * classes were not:** its boundary is the 1.39 : 1 one, its label carries a
 * weight this system does not have (500 exists nowhere in Phase 40's two-weight
 * type scale), and it has no focus expression at all. Its error box is a raw
 * Tailwind palette colour, and that is G1's subject rather than a pattern.
 *
 * ── Which sites this replaces, measured rather than estimated ────────────────
 *
 * Recorded in this direction because it is the direction a later reader can
 * check. `41-PATTERNS.md` §2.6 counts **102 occurrences across nine byte-exact
 * incumbent strings**, of which **83 are full-width**; the largest single family
 * is 38 and the smallest is 1. Nine spellings of one control is a decision and
 * not a rename, which is why the contract fixed the string before anything was
 * extracted here. *(The nine strings are named in §2.6 and are deliberately not
 * quoted: Tailwind cannot tell a class string in a comment from a use, so
 * quoting them would emit rules with no consumer and would make a grep-based
 * gate count this docblock as a site — 41-01 deviation 2, 41-03 deviation 4.)*
 *
 * The deltas that matter, per site: the boundary becomes the control boundary;
 * the well becomes the declared sunk ground rather than the page or the card;
 * the height comes from a 44 px floor rather than from vertical padding that
 * happened to compute to something; the label loses a weight that does not
 * exist and gains a real `htmlFor`; and the control gains a focus ring it did
 * not have.
 *
 * ── Height, and why it is a floor and not a height ───────────────────────────
 *
 * A 44 px **minimum**, never a fixed 44 px. A target must be *at least* 44 px
 * (§6.1) and must still grow with its content — a fixed height clips a textarea
 * the moment somebody types a second line, and it is the shape of bug that
 * renders, compiles and looks correct.
 *
 * ── What is deliberately NOT here ────────────────────────────────────────────
 *
 * **`Checkbox` and `Switch`.** Their first consumers are the member table's two
 * 16 px boxes (plan 41-10) and the drink menu manager and the event form
 * respectively. D-41-04 forbids publishing a primitive in a wave that does not
 * convert a surface onto it, and the three `(auth)` screens this plan converts
 * have neither control. `src/components/ui/Skeleton.tsx` — correct, complete and
 * with zero importers — is this tree's own record of what that mistake costs.
 *
 * The focus expression is **imported**, not spelled a second time. It is
 * declared once beside the button ladder and read here the way `Chip.tsx` reads
 * it: one declaration, one place, one diff. The 2 px offset inside it is
 * load-bearing — the ring is `--ink` and lands on the surrounding ground at
 * 15.22–17.29 : 1, where without the offset, on a filled control, it is 2.52 : 1
 * and is not an indicator at all.
 */

/**
 * §8.6's string, verbatim, shared by all three controls.
 *
 * The radius is the control radius of §9 — 12 px. The 8 px radius the incumbent
 * strings use four different ways does not survive §9's three-rung ladder: a
 * pill is fully round, a container is 16 px, a control is 12 px.
 */
const CONTROL =
  "min-h-11 w-full rounded-xl border border-control bg-sunk px-4 text-sm text-ink " +
  "placeholder:text-muted";

/**
 * An accessible name is required, and the type is what requires it.
 *
 * Either a visible `label`, which becomes a real `<label htmlFor>` and is the
 * control's programmatic name (D-41-11: the convention, never a sibling
 * `<div>`), or an `aria-label` where the surface's design carries the name some
 * other way. **Neither is not an option**: a field with no name is announced as
 * "edit text" and nothing else — a defect that renders, compiles and looks
 * correct, which is the same argument that makes the icon button's label a
 * required prop rather than a convention.
 */
type AccessibleName =
  | { label: string; "aria-label"?: string }
  | { label?: undefined; "aria-label": string };

interface FieldBase {
  /**
   * Required on every control, and not for tidiness: it is what binds the
   * visible label to the control and what the error region is addressed by.
   * Deriving it would need a hook, and a hook here would force every server
   * component that renders a form into the client bundle.
   */
  id: string;
  /**
   * The inline failure for THIS field. §11's rule applies to whatever is passed:
   * name the problem and the next step, and never the banned shape — the
   * newsletter form's *"Qualcosa è andato storto"*, which collapses a network
   * fault, a missing key and a duplicate address into one message nobody can act
   * on. This repository has **no error tracking**, so an error that is not
   * distinguishable on screen is not distinguishable anywhere.
   */
  error?: string;
  className?: string;
}

/** The label, the control and the error region, in the one order they take. */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="block text-xs font-semibold text-ink-2">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-sem-crit">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** `aria-describedby` and `aria-invalid` only exist while there is a failure. */
function describedBy(id: string, error?: string) {
  return error
    ? ({ "aria-invalid": true, "aria-describedby": `${id}-error` } as const)
    : null;
}

type InputProps = FieldBase &
  AccessibleName &
  Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "id" | "className" | "aria-label" | "aria-invalid" | "aria-describedby"
  >;

export function Input(props: InputProps) {
  const { id, label, error, className = "", ...rest } = props;

  return (
    <Field id={id} label={label} error={error}>
      <input
        {...rest}
        id={id}
        {...describedBy(id, error)}
        className={`${CONTROL} ${FOCUS_RING} ${className}`.trimEnd()}
      />
    </Field>
  );
}

type TextareaProps = FieldBase &
  AccessibleName &
  Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "id" | "className" | "aria-label" | "aria-invalid" | "aria-describedby"
  >;

/**
 * The same contract, plus vertical padding — and that addition is a decision.
 *
 * A single-line input's value is centred by the user agent; a textarea's starts
 * at the top edge, two pixels from the boundary. Without the padding the first
 * line touches the very boundary this file exists to make visible. 12 px is the
 * step the spacing ladder names below 16, and it is applied here and to neither
 * of the other two, because neither of them has the problem.
 */
export function Textarea(props: TextareaProps) {
  const { id, label, error, className = "", ...rest } = props;

  return (
    <Field id={id} label={label} error={error}>
      <textarea
        {...rest}
        id={id}
        {...describedBy(id, error)}
        className={`${CONTROL} py-3 ${FOCUS_RING} ${className}`.trimEnd()}
      />
    </Field>
  );
}

type SelectProps = FieldBase &
  AccessibleName &
  Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "id" | "className" | "aria-label" | "aria-invalid" | "aria-describedby"
  >;

/**
 * The native control, deliberately.
 *
 * `color-scheme: dark` on `<html>` is what keeps a native select from punching a
 * white rectangle into a dark page (§12), and the platform's own picker is the
 * one listbox on this product that already works with a screen reader, with a
 * keyboard, and on a phone held one-handed at an entrance. A custom combobox is
 * a decision for a plan that has a surface needing one, not a side effect of a
 * file about boundaries.
 */
export function Select(props: SelectProps) {
  const { id, label, error, className = "", ...rest } = props;

  return (
    <Field id={id} label={label} error={error}>
      <select
        {...rest}
        id={id}
        {...describedBy(id, error)}
        className={`${CONTROL} ${FOCUS_RING} ${className}`.trimEnd()}
      />
    </Field>
  );
}
