import type { HTMLAttributes, ReactNode } from "react";

/**
 * The one card shell — `41-UI-SPEC.md` §8.4.
 *
 * 202 sites, one axis of variation (the radius), and therefore a mechanical
 * substitution rather than a decision: D-41-12 separates the families that
 * needed the contract to choose for them from the ones that only needed a
 * value fixed, and the card is the second kind.
 *
 * ── The one thing that is a decision, and both of its destinations ───────────
 *
 * The incumbent card edge is drawn with the legacy boundary name, which aliases
 * the decorative line token. That name appears **406 times** in the tree, and
 * D-41-13's triage splits every one of them two ways:
 *
 *  - **the edge of a container** — a card, a panel, a tile, a table row — keeps
 *    a line token and becomes `border-line`. It stays decorative on purpose:
 *    a card's *content* already says where the card is, so its edge is a hint
 *    and not an affordance (1.29:1, and correct as such).
 *  - **the boundary of an interactive control** — an input, a select, a
 *    checkbox, a secondary or ghost button — becomes `border-control` and lives
 *    in the form controls and in the button ladder, **not here**. A line token
 *    reaches at most 1.39:1 against any ground, against WCAG 1.4.11's 3:1;
 *    `--control` is 7.14:1 on the page ground. That half is finding A1
 *    (D-41-10) and it is why the two halves may not be collapsed back into one.
 *
 * **Both destinations are named here on purpose.** A rule that can only be kept
 * by remembering which of the two you meant is not a rule that gets kept: the
 * next person to convert a surface meets 406 identical-looking sites and has to
 * decide, per site, which kind it is. The question to ask at each one is not
 * *what does it look like* but *can it be operated* — if it can, its boundary
 * is not this component's.
 *
 * ── What this is not ─────────────────────────────────────────────────────────
 *
 * A card that is itself pressable is `PressableCard` in `src/components/motion/`
 * and carries the focus expression; this is the static container. And nothing
 * here sets a width: a card is as wide as the shell lets it be.
 */

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={`rounded-2xl border border-line bg-surface p-6 ${className}`.trimEnd()}
    >
      {children}
    </div>
  );
}
