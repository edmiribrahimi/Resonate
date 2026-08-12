/**
 * The loading placeholder — `41-UI-SPEC.md` §8.9.
 *
 * ── The record this file carries, because it is the phase's own thesis ───────
 *
 * This component existed, was correct, and had **zero importers for the whole
 * of its existence**, while **102 hand-rolled pulsing placeholder blocks lived
 * in 20 other files** and one of those files defined its own local
 * re-implementation eight lines below the imports that could have brought this
 * one. D-41-04 — *no plan ships a primitive without converting a surface onto
 * it in the same plan* — exists because of this file, and `41-UI-SPEC.md` §0
 * rule 4 names it by path.
 *
 * **Plan 41-08 is the plan that gave it a consumer**, and the consumer landed
 * in the same commit range as this edit rather than a wave later. If you are
 * reading this because you are about to add a fourth export, add its call site
 * in the same plan.
 *
 * ── "Adoption, not creation" was true of the API and false of the strings ────
 *
 * §8.9 is titled *adoption, not creation*, and a plan that read it literally
 * would have shipped this file unedited. `41-PATTERNS.md` §2.9 caught it:
 * **three of the four visual strings this file was born with are retired by
 * this phase.** The 12px radius does not survive §9's three-rung ladder; the
 * legacy boundary alias was a *line* colour being used as a *ground*, which is
 * a category error before it is a token error; and the 20px padding is not a
 * step §3.1 names.
 *
 * *(The retired strings are described here and not spelled. Tailwind compiles a
 * class string out of a comment as readily as out of an element, and the gates
 * that count leftovers by grep cannot tell a docblock from a use — DEF-41-01,
 * and the same discipline `PageShell.tsx` and `Button.tsx` already keep.)*
 *
 * ── The one number that makes the contract legible ───────────────────────────
 *
 * The placeholder's fill is the raised ground on the card's surface, and that
 * pairing is **1.08 : 1**. It is deliberate and it is the point: a placeholder
 * must read as **absent content**, not as content. A ratio chosen to be
 * *visible* here would produce a page that looks loaded while it is empty,
 * which is the silent-failure shape with a reassuring face. Nothing in §12's
 * accessibility contract is being missed — the contrast minima govern text and
 * control boundaries, and this is neither.
 *
 * ── What is deliberately NOT changed ─────────────────────────────────────────
 *
 * The three export names and their props. A consumer written against this API
 * before the edit does not have to move, and the edit is therefore reviewable
 * as a visual change alone.
 *
 * **And the size map's keys stay.** They are TypeScript object keys, not
 * responsive prefixes, and `verify-breakpoints.mjs:95-110` documents this exact
 * file as the reason its trailing boundary guard exists: measured, this file
 * contributes **zero** of G6's 44 counted uses. Removing the small size to
 * satisfy a bare text search would break the API for a gate that was never
 * measuring it — and that script's own docblock names the "fix" as worse than
 * the red would have been.
 */

/**
 * Whether the caller already fixed a dimension, so the default must stand down.
 *
 * ── The measured defect this closes, and it was here from the beginning ──────
 *
 * Appending the caller's classes after the component's own is this tree's house
 * pattern, and it works whenever the two collide on a utility Tailwind emits in
 * ascending numeric order — a caller's taller height wins over a shorter
 * default because the shorter rule is written first.
 *
 * **It does not work for a named value, and the default width here is one.**
 * Measured in the emitted stylesheet on 2026-08-12: the full-width rule is
 * written *after* every numeric and fractional width in the sheet. So the
 * default width overrode every width a caller asked for — including the two
 * fractional ones this file passes to its own card shell three functions below.
 *
 * **Nobody had ever seen it**, because until plan 41-08 this file had zero
 * importers: an unrendered component cannot be wrong on screen. That is the
 * phase's own thesis arriving as a bug rather than as an argument, and it is
 * the reason D-41-04 asks for the consumer in the same plan.
 *
 * The fix does not depend on stylesheet order at all, in either direction.
 */
const CALLER_SETS_WIDTH = /(?:^|\s)(?:max-|min-)?w-/;
const CALLER_SETS_HEIGHT = /(?:^|\s)(?:max-|min-)?h-/;

function withDefaults(base: string, className: string, defaults: string[]) {
  return [base, ...defaults, className].filter(Boolean).join(" ");
}

interface SkeletonLineProps {
  className?: string;
}

export function SkeletonLine({ className = "" }: SkeletonLineProps) {
  const defaults = [];
  if (!CALLER_SETS_HEIGHT.test(className)) defaults.push("h-4");
  if (!CALLER_SETS_WIDTH.test(className)) defaults.push("w-full");

  return (
    <div
      className={withDefaults(
        "animate-pulse rounded-xl bg-raised",
        className,
        defaults
      )}
    />
  );
}

interface SkeletonCardProps {
  className?: string;
}

/**
 * A card-shaped placeholder.
 *
 * Its shell is the `Card` primitive's contract — the container radius, a line
 * token on the edge, the surface ground and the 24px padding §3.1 names — so
 * that the placeholder occupies the same box the loaded card will, and the
 * page does not jump when the content arrives. The shell is written out rather
 * than composed from `Card` because the pulse belongs to the outer element and
 * a placeholder is not a card: it is the space one is about to take.
 */
export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-line bg-surface p-6 ${className}`.trimEnd()}
    >
      <SkeletonLine className="h-5 w-3/4 mb-4" />
      <SkeletonLine className="h-4 w-full mb-2" />
      <SkeletonLine className="h-4 w-2/3" />
    </div>
  );
}

interface SkeletonTileProps {
  className?: string;
}

/**
 * A square placeholder for a media thumbnail — added by plan 41-08, with its
 * consumer in the same commit.
 *
 * ── Why a fourth export rather than a prop ───────────────────────────────────
 *
 * The line placeholder fixes its own height, which is what makes it a *line*.
 * A square is a different shape, not a taller line: reaching one by passing a
 * height through `className` would depend on which of two same-property
 * utilities Tailwind happens to emit last, and a layout that depends on
 * stylesheet ordering is a defect waiting for a version bump. The other route —
 * a hand-rolled pulsing block in the loading file — is the exact thing this
 * component exists to stop, 102 times over.
 *
 * ── It is published in the plan that renders it (D-41-04) ────────────────────
 *
 * `src/app/(public)/gallery/loading.tsx` is its consumer and lands in the same
 * commit. The radius is §9's thumbnail rung, the same one the real thumbnail
 * carries, so the placeholder occupies the box the image will and the page does
 * not jump.
 */
export function SkeletonTile({ className = "" }: SkeletonTileProps) {
  const defaults = [];
  if (!CALLER_SETS_WIDTH.test(className)) defaults.push("w-full");

  return (
    <div
      className={withDefaults(
        "animate-pulse rounded-xl bg-raised aspect-square",
        className,
        defaults
      )}
    />
  );
}

interface SkeletonAvatarProps {
  size?: "sm" | "md" | "lg";
}

/**
 * Three drawn sizes, keyed by name.
 *
 * These are object keys. See the note at the top of this file: they are not
 * responsive prefixes and no gate counts them as such.
 */
const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function SkeletonAvatar({ size = "md" }: SkeletonAvatarProps) {
  return (
    <div
      className={`animate-pulse rounded-full bg-raised ${sizeClasses[size]}`}
    />
  );
}
