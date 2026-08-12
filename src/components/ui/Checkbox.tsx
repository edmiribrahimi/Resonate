import type { InputHTMLAttributes } from "react";

import { FOCUS_RING } from "@/components/ui/Button";

/**
 * A checkbox: a 16 px drawn box inside a 44 × 44 hit area.
 *
 * ── What it closes ───────────────────────────────────────────────────────────
 *
 * §6.4's ranked list opens with this control: the two boxes in the member table
 * are the smallest interactive elements in this phase's territory, drawn at
 * **16 px** and therefore under half the 44 px floor §6.1 fixes. §8.6 names the
 * resolution and it is deliberately not "make the box bigger": **the drawn box
 * keeps its size and gains a hit area**, because a 44 px checkbox glyph in a
 * table column would be a different control, and the thing that has to be 44 px
 * is what a finger can land on, not what an eye reads.
 *
 * The hit area is the `<label>`. It is the route §8.6 names first, and it is the
 * better of the two it offers: a label carrying the minimum is *also* the
 * control's programmatic name, so one element does both jobs and there is no
 * state in which the target exists and the name does not. The alternative —
 * an absolutely-positioned pseudo-element inset around the box — buys the same
 * 44 px and buys no name.
 *
 * ── The boundary is not decoration here ──────────────────────────────────────
 *
 * §4.2's list of interactive controls names a checkbox explicitly, so the box
 * carries the control boundary and never a line token. The arithmetic is
 * `Input.tsx`'s and is the same on this control: the control boundary reaches
 * **7.03 : 1** over the sunk well and **6.78 : 1** over a card, against WCAG
 * 1.4.11's 3 : 1; a line token reaches at most **1.39 : 1** and is not a
 * boundary at all. The well is the declared sunk ground, whose contrast against
 * a card is 1.04 : 1 — so, exactly as on a text input, **the boundary is the
 * only channel that says where the control is.**
 *
 * ── The checked fill is NOT the accent, and that is a reading of §5.1 ─────────
 *
 * The incumbent boxes tint their checked state with the brand accent. §5.1's
 * accent list is **closed** — the primary button fill, the active navigation
 * entry, a link inside prose, the lineup pills on an event card — and a form
 * control's own checked indicator is on none of it. So the fill is `--ink`:
 * 17.02 : 1 against the sunk well, and the user agent draws the tick against it.
 * The change is visible and is a contract decision rather than a preference.
 *
 * ── The name is required, and the type is what requires it ───────────────────
 *
 * Same construction as the icon rung's label and the text controls' accessible
 * name: a checkbox with no name is announced as "checkbox" and nothing else, on
 * a surface where the row it selects is a person. `labelHidden` hides it from
 * the eye and keeps it for everybody else — which is what a selection column in
 * a table needs, since the column header cannot name the individual row.
 *
 * ── `id` is required for the same reason it is on the text controls ──────────
 *
 * It is what binds the label to the input. Deriving it would need a hook, and a
 * hook here would force every server component rendering a form into the client
 * bundle. A caller rendering the same row in two branches must give the two
 * boxes two ids — duplicate ids would make one label address the wrong box —
 * and `DataTable` does exactly that for its own two branches.
 */

/**
 * The drawn box. 16 px, unchanged in size from the incumbent boxes on purpose.
 *
 * `shrink-0` because the box lives inside a flex label beside a name that may
 * be long: without it the box is the thing that gives way.
 */
const BOX =
  "h-4 w-4 shrink-0 rounded border border-control bg-sunk accent-ink";

/** The 44 × 44 hit area, and the control's programmatic name. */
const HIT_AREA =
  "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2";

interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "id" | "type" | "className" | "aria-label"
  > {
  /** Binds the label to the input. Unique in the document — see the docblock. */
  readonly id: string;
  /** The accessible name. Visible unless `labelHidden`. */
  readonly label: string;
  /**
   * Hide the label from sight, keep it for assistive technology.
   *
   * The selection column of a table is the case this exists for: the header
   * says "select", but each row's box needs to say *which row*, and there is no
   * space to draw that.
   */
  readonly labelHidden?: boolean;
  /** Lands on the hit area, never on the drawn box. */
  readonly className?: string;
}

export function Checkbox({
  id,
  label,
  labelHidden = false,
  className = "",
  ...rest
}: CheckboxProps) {
  return (
    <label htmlFor={id} className={`${HIT_AREA} ${className}`.trimEnd()}>
      <input
        {...rest}
        type="checkbox"
        id={id}
        className={`${BOX} ${FOCUS_RING}`}
      />
      <span className={labelHidden ? "sr-only" : "text-sm text-ink"}>
        {label}
      </span>
    </label>
  );
}
