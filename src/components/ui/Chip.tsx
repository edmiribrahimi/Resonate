import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties, ReactNode } from "react";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * A chip: a small pill that is **interactive** — a filter, a tab, a selectable
 * tag — and is therefore a 44 px finger target.
 *
 * ── The sentence that decides whether a file is correct ──────────────────────
 *
 * > **A badge that is a `<Link>` or a `<button>` is a Chip, not a Badge.**
 *
 * It is written here, at the top, and not left for the plan that adds the badge
 * rung, because it governs *this* component from the moment it exists. The two
 * look alike and differ on the only axis that matters: a badge states something
 * and is not a target, a chip does something and is. `41-UI-SPEC.md` §6.4
 * records the live case — a 20 px lineup pill on the public event page that is
 * a `<Link>` — and it is a chip, at 44 px, not a badge shrunk to fit.
 *
 * The badge rung itself — pill radius, the `sm` and `xs` padding steps, 12 px
 * semibold, and **deliberately no minimum height**, so the two stay visually
 * distinct without one — is **added by plan 41-08**, with
 * `/admin/members/register` as its first render (D-41-04). Its exact class
 * string lives in §8.5 and is not repeated in this comment, for the reason
 * `Button.tsx` states: to Tailwind a class string in a comment is a use.
 *
 * ── Where the shape came from ────────────────────────────────────────────────
 *
 * `src/app/(public)/events/FormatFilterRow.tsx:109-165`, which is the tree's
 * only prior art at 44 px (`min-h-11` occurs exactly twice tree-wide, both
 * there) and already carries every property this contract asks for: the
 * minimum height, `aria-current`, `normal-case` declared on the element, and
 * `scrollMarginInline` on the selected chip so it is not flush to the gutter.
 * The class string is `41-UI-SPEC.md` §8.5.
 *
 * Two of its properties survive here as decisions rather than as copying:
 *
 *  - **The border is declared in the base and coloured by state**, so there is
 *    no state in which a chip loses its border and no state in which acquiring
 *    one moves anything. `FormatFilterRow.tsx:148-153` states the same
 *    discipline for its inline hue fallback; only the token name changed —
 *    a control boundary is `--control` (**7.14 : 1**), never a line token
 *    (1.39 : 1).
 *  - **`normal-case` is declared, not assumed.** Upper-casing appears in 43
 *    files and `text-transform` inherits, so "we did not add it" is not a
 *    guarantee. Format names are the reason: `RamaDub` is not `RAMADUB`.
 *
 * ── Which sites this replaces ────────────────────────────────────────────────
 *
 * The eight work-surface tabs on the phone strip (`StaffNav`, this plan), the
 * two filter rows on `/admin/analytics/compare` and `/admin/members/growth`
 * that are RESP-04's "filters", and the lineup `<Link>` above. Each converts
 * with its surface.
 */

const CHIP_BASE =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap " +
  "rounded-full border px-4 text-xs font-semibold normal-case tracking-wide " +
  "transition-all active:scale-95 active:opacity-80";

/**
 * The selected chip takes the accent as a **fill**, so its ink is `--ground`
 * (6.85 : 1) and its border takes the fill's own colour — the boundary stays
 * declared, so nothing moves, and it does not draw a second ring in a third
 * hue around a filled pill.
 */
const CHIP_SELECTED = "border-accent bg-accent text-ground";
const CHIP_UNSELECTED = "border-control text-ink-2 hover:text-ink";

/**
 * Keeps the selected chip off the gutter when a strip has scrolled it into
 * view. 24 px is the page gutter (§3.1). Applied by the component rather than
 * by each caller: a strip that forgets it puts its current item flush against
 * the edge, and every strip wants the same answer.
 */
const SELECTED_SCROLL_MARGIN: CSSProperties = { scrollMarginInline: "24px" };

interface ChipCommon {
  children: ReactNode;
  /** Whether this chip is the current one among its siblings. */
  selected?: boolean;
  /**
   * What `aria-current` says when selected. A navigation tab is `"page"`; a
   * filter among filters is `"true"`. Defaults to `"true"` because a chip is a
   * filter more often than it is a tab.
   *
   * Colour is never the only channel (`40-UI-SPEC.md` §10): the accent fill
   * says *selected* to someone who can see it, and this says it to everyone
   * else.
   */
  ariaCurrent?: "page" | "true";
  className?: string;
  style?: CSSProperties;
}

interface ChipLinkProps extends ChipCommon {
  /**
   * `Route` and not `string`: `typedRoutes` is on, and a menu that cannot name
   * an address nobody serves is the property `src/lib/routes/staff-tabs.ts`
   * depends on.
   */
  href: Route;
  onClick?: never;
}

interface ChipButtonProps extends ChipCommon {
  href?: never;
  onClick: () => void;
}

export type ChipProps = ChipLinkProps | ChipButtonProps;

/**
 * The discriminant is **not** destructured, deliberately: destructuring a
 * discriminated union collapses the narrowing, and the branch below reads
 * `props.href` so TypeScript still knows which of the two shapes it holds.
 */
export function Chip(props: ChipProps) {
  const {
    children,
    selected = false,
    ariaCurrent = "true",
    className = "",
    style,
  } = props;

  const classes = `${CHIP_BASE} ${
    selected ? CHIP_SELECTED : CHIP_UNSELECTED
  } ${FOCUS_RING} ${className}`;

  const resolvedStyle = selected
    ? { ...SELECTED_SCROLL_MARGIN, ...style }
    : style;

  const current = selected ? ariaCurrent : undefined;

  if (props.href !== undefined) {
    return (
      <Link
        href={props.href}
        aria-current={current}
        style={resolvedStyle}
        className={classes}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-current={current}
      style={resolvedStyle}
      className={classes}
    >
      {children}
    </button>
  );
}
