import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The pill ladder — three labelled rungs, one icon rung, four variants, and the
 * single focus expression the whole system shares.
 *
 * ── Where the shape came from ────────────────────────────────────────────────
 *
 * Not invented. `41-UI-SPEC.md` §8.5 fixed it after `41-RESEARCH.md` measured
 * **133 pill sites across six different vertical paddings**, the smallest of
 * which computes to 28 px. Six spellings of one thing is a decision, not a
 * rename (D-41-12), so the sizes were named in the contract before anything was
 * extracted here.
 *
 * Two properties of that contract are load-bearing and are the reason this file
 * exists rather than a `cn()` helper:
 *
 *  1. **Height comes from `min-h-11`, never from padding.** Every button in this
 *     product is a finger target (§6.1), so the ladder varies horizontal padding
 *     and type size only. `min-h-` and not `h-`: a target must be *at least*
 *     44 px and must still grow with its content.
 *  2. **Every horizontal step is a step §3.1 names** — 16 · 24 · 32. The
 *     tree's incumbent intermediate paddings are multiples of 4 that this
 *     ladder does not name, and are rejected on the same argument §3.1 uses to
 *     reject a 12 px margin. The exact rejected values live in §8.5 and are
 *     deliberately not repeated here: a class string written in a comment is,
 *     to Tailwind, indistinguishable from a use, and would emit a rule with no
 *     consumer (41-01, deviation 2).
 *
 * ── Which sites this replaces ────────────────────────────────────────────────
 *
 * Recorded in this direction because it is the direction that can be checked.
 * `IconButton` is the destination of the 32 px dialog close controls (`§6.4`,
 * three sites) and of the toast's dismiss control (plan 41-04, this wave).
 * The labelled rungs land on the 133 pill sites as each surface converts.
 *
 * ── What is NOT here, and when it arrives ────────────────────────────────────
 *
 * The plain labelled rung is **deferred to plan 41-05**, which converts
 * `/payment/callback` in the same task — that surface's three accent links are
 * its first render. D-41-04 forbids publishing a primitive in a wave that does
 * not convert a surface onto it, and this wave converts the navigation spine,
 * which renders navigation entries, a toast and a format marker: not one plain
 * labelled button.
 *
 * This is not a hypothetical discipline. `src/components/ui/Skeleton.tsx`
 * already exists, is correct, and has **zero importers**, while 102 hand-rolled
 * placeholder blocks live in 20 other files. Shipping a rung with no consumer is
 * repeating a mistake this tree already records.
 *
 * The size and variant maps below are therefore written **whole, now, and kept
 * module-private**. Plan 41-05 adds an export that reads them; it does not write
 * a second ladder.
 */

/**
 * The one focus expression, everywhere — `41-UI-SPEC.md` §5.4.
 *
 * Exported so that `Chip.tsx` reads it rather than spelling it a second time.
 * One declaration, one place, greppable.
 *
 * **The 2 px offset is load-bearing and may not be dropped for density.** The
 * ring is `--ink`, and with the offset it lands on the surrounding ground at
 * 15.22–17.29 : 1. Without it, on an accent fill, it is **2.52 : 1** — below
 * WCAG 1.4.11's 3 : 1, which is to say it is not an indicator at all.
 *
 * `focus-visible:` and never the bare focus pseudo-class: a mouse click on a
 * button should not draw a keyboard indicator.
 */
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Carried by every rung. The press feedback is the tree's existing one, unchanged. */
const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all " +
  "active:scale-95 active:opacity-80 disabled:pointer-events-none disabled:opacity-50";

/**
 * The four sizes — `41-UI-SPEC.md` §8.5.
 *
 * `lg` is the only rung above 44 px and is reserved for the single primary
 * action on a `focus` screen. `icon` is square by `min-w-11` and carries no
 * padding: its content is a 20–24 px glyph centred in a 44 × 44 hit area.
 */
const SIZE = {
  sm: "min-h-11 rounded-full px-4 text-xs font-semibold",
  md: "min-h-11 rounded-full px-6 text-sm font-semibold",
  lg: "min-h-12 rounded-full px-8 text-sm font-semibold",
  icon: "min-h-11 min-w-11 rounded-full p-0",
} as const;

/**
 * The four variants — `41-UI-SPEC.md` §8.5, on §5.3's arithmetic.
 *
 * **An accent fill carries `--ground` as its ink.** Computed, not preferred:
 * against `--accent` `#FF5C93`, `--ground` is **6.85 : 1**, white ink is
 * **2.91** and `--ink` is **2.52** — the last two fail 1.4.3's 4.5 : 1. Phase 40
 * §4.3 established the rule for the four semantics; §5.3 extends it to the
 * accent on the same arithmetic. `destructive` is the same rule on
 * `--sem-crit`, at **7.36 : 1**.
 *
 * A fill is its own boundary, so `primary` and `destructive` carry no border.
 * `secondary` carries `border-control` (**7.14 : 1** on `--ground`) and never
 * `--line*`, which is 1.39 : 1 and decorative — Phase 40's rule is that the
 * boundary of an interactive control is never carried by a line token alone.
 *
 * `ghost` holds a transparent border at rest so that acquiring one on hover or
 * focus shifts nothing. **A ghost at rest is a label, not a control**; it
 * becomes a control the moment a pointer or the keyboard addresses it.
 */
const VARIANT = {
  primary: "bg-accent text-ground",
  secondary: "border border-control text-ink",
  ghost:
    "border border-transparent text-ink-2 hover:border-control hover:text-ink focus-visible:border-control",
  destructive: "bg-sem-crit text-ground",
} as const;

export type ButtonSize = keyof typeof SIZE;
export type ButtonVariant = keyof typeof VARIANT;

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /**
   * **Required, and that is the whole point of typing it here.**
   *
   * An icon-only control has no accessible name of its own. Omitting the label
   * produces a 44 × 44 square that a screen reader announces as "button" and
   * nothing else — a defect that renders, compiles, and looks correct. Declared
   * required, it is a build error naming this file instead.
   */
  "aria-label": string;
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
}

/**
 * An icon-only control at 44 × 44.
 *
 * Defaults to `ghost`, because the sites it replaces — dialog close controls,
 * the toast dismiss — are all secondary to the thing they sit on and should not
 * compete with it. Pass `variant` when that is untrue.
 *
 * `type="button"` is written before the spread so a caller can still make it a
 * submit; without the default, a control inside a form submits it by accident,
 * which is the kind of failure this repository has no error tracking to notice.
 */
export function IconButton({
  variant = "ghost",
  className = "",
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`${BASE} ${SIZE.icon} ${VARIANT[variant]} ${FOCUS_RING} ${className}`}
    >
      {children}
    </button>
  );
}
