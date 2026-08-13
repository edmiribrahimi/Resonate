import type { InputHTMLAttributes } from "react";

import { FOCUS_RING } from "@/components/ui/Button";

/**
 * A switch: a 24 px drawn track inside a 44 × 44 hit area.
 *
 * ── Why this file exists, and it is not tidying ──────────────────────────────
 *
 * This phase's own thesis is that **it builds nothing** — every primitive it
 * needs already exists and already has an adopter. That sentence was hiding one
 * construction item. `41-UI-SPEC.md` §8.6 names a switch in its heading and
 * specifies it; the primitives folder held twelve files and none of them was it
 * (D-41.1-23).
 *
 * Four hand-written tracks carry the shape today, and they are **one
 * accessibility finding written four times, not a styling preference**:
 *
 *   · `src/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager.tsx:347`
 *   · `src/components/events/EventForm.tsx:635`
 *   · `src/components/events/EventForm.tsx:1144`
 *   · `src/components/events/EventForm.tsx:1499`
 *
 * Every one of them draws a track **24 px tall against §6.1's 44 px floor**, and
 * every one of them spells its own focus suppression, which §5.4 says does not
 * survive. Converting them one at a time would have paid the same finding four
 * times and left the fifth writer free to make it again; the primitive is what
 * makes it uncorrectable rather than correctable-per-site.
 *
 * **The first is this plan's, and it lands in the same commit as this file**
 * (D-41-04, and `Skeleton.tsx:14-17`'s house sentence: *if you are reading this
 * because you are about to add a fourth export, add its call site in the same
 * plan*). The other three are `EventForm.tsx`'s and are adopted by **plan
 * 41.1-18**, which depends on this one. Nothing here was widened for them: this
 * component's props are the shape the drinks menu's own call site needed.
 *
 * ── The drawn size stays; the target does not ────────────────────────────────
 *
 * §8.6's resolution is deliberately not *make the track bigger*: the drawn track
 * keeps its size and gains a 44 × 44 hit area. Of the two mechanisms §8.6 offers
 * — wrapping the input in a label that carries the minimum, or an inset
 * pseudo-element — this takes the **first**, for `Checkbox.tsx`'s reason and not
 * a fresh one: a label carrying the minimum is *also* the control's programmatic
 * name, so one element does both jobs and there is no state in which the target
 * exists and the name does not. The second mechanism buys the same 44 px and
 * buys no name.
 *
 * **What that costs, stated rather than discovered.** The minimum lives on the
 * label and not on the input, so `verify-touch-targets.mjs` measures the input
 * at its drawn 24 px and cannot see the hit area around it. `Checkbox.tsx:105`
 * is the same case and is the tenth entry of that gate's exemption 2a — *the one
 * entry whose size is not on this element at all, and that is the contract*.
 * This file needs the eleventh, plus its path in that gate's primitive list where
 * a null sits today. **Neither is written here** (D-41.1-22: the wave's
 * reconciliation plan owns every gate edit); both entry texts are reported in
 * this plan's SUMMARY, and the gate stays green until the drinks surface is
 * declared converted.
 *
 * ── The boundary is the channel, and the knob is measured on two grounds ─────
 *
 * The well is the declared sunk ground, whose contrast against a card is
 * **1.04 : 1** — so, exactly as on a text input and on the checkbox, the well
 * does not say where the control is and **the boundary is the only channel that
 * does**. It is the control token: **6.78 : 1** over a card, **7.03 : 1** over
 * the well, against WCAG 1.4.11's 3 : 1. A line token reaches at most 1.39 : 1
 * and is not a boundary at all.
 *
 * When the switch is on, the track takes the accent fill and the boundary takes
 * the same value as the fill. That is not a second accent use: **a fill is its
 * own boundary** (`Button.tsx`'s rule for the primary rung), and the fill against
 * a card is what says where the control is once it is there.
 *
 * The knob changes colour with the ground under it, and both pairings are
 * computed rather than preferred: over the well it is the primary ink at
 * **17.02 : 1**; over the accent fill it is the page ground at **6.85 : 1** —
 * the same arithmetic that gives the primary button its ink, and the reason the
 * knob is not one colour on both. The incumbent knob was white, which is
 * **2.91 : 1** on the accent and fails 1.4.11.
 *
 * **And colour is never the only channel** (`40-UI-SPEC.md` §10): the knob's
 * *position* carries the state, and it carries it for a reader who cannot tell
 * the two fills apart.
 *
 * ── The focus expression is imported, never re-spelled ───────────────────────
 *
 * `FOCUS_RING` comes from `Button.tsx`. It keys off the pseudo-class that
 * distinguishes a keyboard focus from a mouse click, and it carries a 2 px
 * offset — and the offset is load-bearing rather than cosmetic: on an accent
 * fill an ink ring with no offset is 2.52 : 1 and is not an indicator at all.
 * The four incumbent tracks each suppress their own outline; this file is why
 * the fifth is not written, and **it does not spell the expression a second
 * time** — not in code, and not in this paragraph either, since Tailwind
 * compiles a class string out of a comment as readily as out of an element
 * (DEF-41-01).
 *
 * ── The props are the call site's, and nothing more ──────────────────────────
 *
 * The checked state, the change handler, the disabled state, the `name` and the
 * submitted `value` all arrive through the rest spread and reach the input
 * **unchanged** — a switch's state, its name and its value are behaviour, and a
 * conversion does not touch behaviour. `id` is required for the reason it is
 * required on the text controls and on the checkbox: it is what binds the label
 * to the input, and deriving it would need a hook, which would drag every server
 * component rendering a form into the client bundle.
 *
 * **If you are reading this because you are about to add a prop, add its call
 * site in the same plan.**
 */

/**
 * The drawn track. 24 × 44, unchanged in size from the incumbent tracks on
 * purpose — §8.6 keeps the drawn size and moves the target instead.
 *
 * `shrink-0` because the track sits in a flex row beside a name that may be
 * long: without it the track is the thing that gives way.
 */
const TRACK =
  "peer h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full " +
  "border border-control bg-sunk transition-colors duration-200 " +
  "checked:border-accent checked:bg-accent " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The knob, drawn as the track's sibling rather than as its pseudo-element.
 *
 * An `<input>` is a replaced element and WebKit does not render pseudo-elements
 * on one — and **this product's primary device is a phone, on which every iOS
 * browser is WebKit**, so a knob drawn that way would simply be absent on the
 * device that matters most. A following sibling is also what lets the track's
 * own checked state reach it, which a descendant could not do.
 *
 * 20 px inside a 24 px track leaves 2 px on every side, and the travel is the
 * remaining 20 px — the same geometry the incumbent tracks already had.
 */
const KNOB =
  "pointer-events-none absolute start-0.5 top-0.5 h-5 w-5 rounded-full " +
  "bg-ink transition-transform duration-200 " +
  "peer-checked:translate-x-5 peer-checked:bg-ground peer-disabled:opacity-50";

/** The 44 × 44 hit area, and the control's programmatic name. */
const HIT_AREA =
  "inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-2";

interface SwitchProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "id" | "type" | "role" | "className" | "aria-label"
  > {
  /** Binds the label to the input. Unique in the document — see the docblock. */
  readonly id: string;
  /** The accessible name. Visible unless `labelHidden`. */
  readonly label: string;
  /**
   * Hide the label from sight, keep it for assistive technology.
   *
   * A switch inside a dense row is the case this exists for: the row already
   * names the thing being switched, and the control needs to say *which row* to
   * somebody who cannot see it.
   */
  readonly labelHidden?: boolean;
  /** Lands on the hit area, never on the drawn track. */
  readonly className?: string;
}

export function Switch({
  id,
  label,
  labelHidden = false,
  className = "",
  ...rest
}: SwitchProps) {
  return (
    <label htmlFor={id} className={`${HIT_AREA} ${className}`.trimEnd()}>
      <span className="relative inline-flex shrink-0">
        <input
          {...rest}
          type="checkbox"
          role="switch"
          id={id}
          className={`${TRACK} ${FOCUS_RING}`}
        />
        <span aria-hidden="true" className={KNOB} />
      </span>
      <span className={labelHidden ? "sr-only" : "text-sm text-ink"}>
        {label}
      </span>
    </label>
  );
}
