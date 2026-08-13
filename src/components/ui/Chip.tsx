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
 * The badge rung lives at the foot of this file — pill radius, the `sm` and
 * `xs` padding steps, 12 px semibold, and **deliberately no minimum height**,
 * so the two stay visually distinct without one. It was added by plan 41-08,
 * with `/admin/members/register` as its first render (D-41-04). Neither class
 * string is repeated in prose, for the reason `Button.tsx` states: to Tailwind
 * a class string in a comment is a use.
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

interface ChipLinkProps<T extends string> extends ChipCommon {
  /**
   * `Route` and not `string`: `typedRoutes` is on, and a menu that cannot name
   * an address nobody serves is the property `src/lib/routes/staff-tabs.ts`
   * depends on.
   *
   * ── Why it is `Route<T>` and not `Route` (D-41.1-26) ──────────────────────
   *
   * It was the bare `Route` until phase 41.1, which is that type **at its
   * default parameter** — and at the default parameter the dynamic arm of
   * Next's route implementation collapses to `never`. The consequence is not
   * theoretical: plan 41.1-07 tried to give six event controls a chip apiece
   * and the compiler refused every one of them,
   *
   *     Type '`/admin/events/${string}/edit`' is not assignable to type
   *     'Route | undefined'
   *
   * so it hand-composed six `<Link>` elements instead — a correct choice at the
   * time and a worse component. `Link` never had the problem because **`Link` is
   * generic** and infers its parameter from the template; this is the same
   * treatment, and `next/link`'s own `LinkProps<RouteInferType>` is the shape it
   * copies rather than a new idea.
   *
   * **Two ways out were refused, and the reasons stay written here** so nobody
   * reaches for them again:
   *
   *  - **casting the href.** It is what would make an annotation compile, and it
   *    switches off the only check that turns a stale address into a build error
   *    instead of a 404 found by whoever clicked it. This file forbade it before
   *    the problem appeared, and the prohibition is why the problem was reported
   *    rather than quietly worked around.
   *  - **widening `href` to `string`.** Same loss, spelled differently, and it is
   *    the trap `Button`'s `href` still carries — see the note at the foot of
   *    this file.
   *
   * **This change is type-only: no rendered output differs by a byte**, which is
   * exactly why it could be made in a reconciliation wave and could not be made
   * inside one of five parallel conversion worktrees (D-41.1-15). No converted
   * surface needs re-observing on account of it.
   */
  href: Route<T>;
  onClick?: never;
}

interface ChipButtonProps extends ChipCommon {
  href?: never;
  onClick: () => void;
}

export type ChipProps<T extends string = string> =
  | ChipLinkProps<T>
  | ChipButtonProps;

/**
 * The discriminant is **not** destructured, deliberately: destructuring a
 * discriminated union collapses the narrowing, and the branch below reads
 * `props.href` so TypeScript still knows which of the two shapes it holds.
 *
 * The type parameter is inferred from the `href` a caller passes and is never
 * written at a call site — `<Chip href={`/admin/events/${id}/edit`}>` compiles
 * with nothing spelled. A caller passing no `href` lands on the button arm,
 * where `T` is inferred as the default and means nothing, which is the same
 * thing `next/link` does with an object href.
 */
export function Chip<T extends string>(props: ChipProps<T>) {
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

/* ────────────────────────────────────────────────────────────────────────────
 * Badge — the other rung, and the one that is NOT a target
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * A badge: a small pill that **states** something and cannot be operated.
 *
 * It lives beside the chip rather than in its own file because the sentence at
 * the top of this file governs both, and a reader deciding between them must
 * meet it. Restated, because it is the difference between a correct file and a
 * 20 px target:
 *
 * > **A badge that is a `<Link>` or a `<button>` is a Chip, not a Badge.**
 *
 * It renders a `<span>`, and that is the enforcement rather than a default:
 * there is no prop that makes it interactive, so a caller who needs a target
 * has to reach for the chip and meets its 44 px on the way.
 *
 * ── No minimum height, deliberately ──────────────────────────────────────────
 *
 * The padding steps are the 8 px and 4 px rungs of §3.1, chosen over the tree's
 * incumbent pair because those two values are not multiples of 4 and not steps
 * this ladder names — the argument §3.1 makes against a 12 px margin, and it
 * applies with more force here, since that margin was at least a multiple of 4.
 * The result is roughly 24 px tall against the chip's 44, so the two stay
 * visually distinct **without a height doing it**, which is why G5 scans
 * interactive elements only and a badge is exempt by not being one.
 *
 * ── The two tones, and what the second one does NOT claim ────────────────────
 *
 * `neutral` borrows its grammar from the unselected chip above — a boundary
 * declared in the base, `--control` at 7.14 : 1, and a recessed ink. It is the
 * answer for every mark that merely names a thing.
 *
 * `emphasis` is a fill, and **a semantic used as a fill carries `--ground` as
 * its ink** (`globals.css:175-178`): computed on this tree, `--ground` on
 * `--sem-done` is **5.99 : 1**, clearing 1.4.3's 4.5 : 1 for small text. Light
 * ink over the same fill would not.
 *
 * **What the fill means, and the line it must not cross.** It means *look here
 * first*. It does **not** grade an outcome, and there is deliberately no tone
 * per outcome. The first surface to render this is the membership register,
 * where the acts that admit somebody are the ones the eye should land on —
 * that file's own words, and its reason is `community-membership.md`'s gate
 * *nessuna corsia grigia*: every way into this community that skips the
 * ordinary approval path is an exception to be counted and attributed.
 * Assigning a colour to each of the seven acts would settle in CSS what that
 * module says is **not yet written** — the criterion by which somebody is let
 * in or refused. A refusal is a communication, not a hue.
 *
 * Neither tone uses `--accent`: §5.1 reserves it for four things and names *a
 * state signal* among the ones it is never for.
 */
const BADGE_BASE =
  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold normal-case";

const BADGE_TONE = {
  neutral: "border border-control text-ink-2",
  emphasis: "bg-sem-done text-ground",
} as const;

export type BadgeTone = keyof typeof BADGE_TONE;

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`${BADGE_BASE} ${BADGE_TONE[tone]} ${className}`.trimEnd()}>
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * THE OTHER HALF OF D-41.1-26 — NAMED HERE, DELIBERATELY NOT FIXED
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * **A converted surface that needs internal navigation uses `Chip` or `Link`.
 * Never `Button` with an `href`.** That is a standing constraint for the rest of
 * this phase, and this is where it is written down, because this is the file a
 * person is reading when they are choosing between the two.
 *
 * The measurement behind it: the button ladder's `href` branch renders a **bare
 * anchor**, and its `href` is typed `string` rather than a route. So a call site
 * reaching for it on an internal address gets neither client-side navigation nor
 * prefetching — a full document load in an App Router application — and it gets
 * no build-time check that the address exists either. Both silently.
 *
 * **It is not a defect phase 41 introduced.** That component's own docblock
 * records that two of the three sites it first replaced were already plain
 * anchors, so it preserved behaviour rather than changing it. What makes it worth
 * a paragraph is that it is a **trap for every conversion still to come**: the
 * failure is invisible on the surface that commits it.
 *
 * **Why it is named and not fixed.** Changing it is a **runtime** change to
 * spine, in the middle of a conversion phase, and it would put every already
 * converted surface back in front of a person. A reconciliation wave is exactly
 * the wrong place for that: this file's own generic change above ships in the
 * same commit precisely because it is type-only and this one is not. Deferred
 * with its measurement attached, which is the difference between a deferral and
 * a forgetting.
 *
 * *(A comment and not an exported constant, on purpose: a symbol nobody imports
 * is the orphan shape D-41-04 exists to prevent, and a rule does not become more
 * binding by being given a runtime value nobody reads.)*
 */
