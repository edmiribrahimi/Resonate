import type { ReactNode } from "react";

/**
 * The page shell — the outermost element of every converted surface.
 *
 * ── What it owns ─────────────────────────────────────────────────────────────
 *
 * Four things, and the reason they are one component rather than four
 * conventions is that three of them were previously written per page and the
 * fourth could not be written per page at all:
 *
 *  1. **The content maximum** (`41-UI-SPEC.md` §4, D-41-06). Nothing wider than
 *     32rem existed anywhere in this tree, so every surface ran edge to edge at
 *     1920px — RESP-02's defect. The cap lives here and nowhere else.
 *  2. **The gutter and the vertical rhythm** — 24px inline, 48px above.
 *  3. **The navigation clearance, in every tier** (D-41-03). This is the one
 *     that could not be a convention: from 768px up the navigation leaves the
 *     bottom edge for the leading edge, and 49 pages carrying a hand-written
 *     96px of bottom padding would each have had to learn that separately.
 *  4. **Nothing else.** In particular it sets **no ground**: `globals.css`
 *     already binds `body` to the page ground, so a page that writes its own
 *     background colour on its root drops it as redundant when it converts.
 *
 * ── The arithmetic, written here because 47 future diffs depend on it ────────
 *
 * The bottom padding is the navigation's block-end inset plus 16px. The inset
 * is declared in `globals.css` as 5rem plus the device's bottom safe-area
 * inset below 768px, and 0 at and above it. So:
 *
 *   phone, no safe-area inset:  80 + 0 + 16 = **96px**
 *   phone, with an inset:       80 + inset + 16
 *   tablet and desktop:          0 + 0 + 16 = **16px**
 *
 * **96px is exactly what the tree's 47 hand-written page roots already
 * produce**, so the migration is value-preserving on the device it was written
 * for. That sentence is what makes each of those 47 diffs reviewable rather
 * than merely plausible. *(The incumbent utility is named in prose and not
 * spelled: Tailwind cannot tell a class string in a comment from a use, and a
 * later gate counting leftover manual clearance would count this docblock —
 * 41-01 deviation 2, 41-03 deviation 1.)*
 *
 * ── Why the padding is on the outer element ──────────────────────────────────
 *
 * The inner container centres inside **the space the side column leaves**, not
 * inside the viewport. Put the inline-start padding on the inner element and a
 * centred card sits 112px too far to the right at every width above 768px.
 *
 * Logical properties throughout — the interface is LTR and English this
 * milestone, and `padding-inline-start` costs nothing over its physical
 * spelling while being the correct one.
 */

/** §4's three forms. The two lists that assign them are closed and are edited by decision. */
export type PageShellWidth = "default" | "wide" | "focus";

interface PageShellProps {
  /**
   * `default` unless the surface is on one of §4's two closed lists.
   *
   * `wide` is for a surface whose primary object is a dense table or a
   * multi-column grid — twelve routes, enumerated in §4. `focus` is a
   * single-purpose screen with one card and one action — four routes, also
   * enumerated. Everything else is `default`, and that is not a fallback: it
   * is the answer for every surface nobody had to think about.
   */
  width?: PageShellWidth;
  children: ReactNode;
  /** Lands on the inner container — the one that carries the cap. */
  className?: string;
}

export function PageShell({
  width = "default",
  children,
  className = "",
}: PageShellProps) {
  if (width === "focus") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 ps-[calc(var(--nav-inset-inline-start)+1.5rem)] pb-[calc(var(--nav-inset-block-end)+1rem)]">
        <div className={`w-full max-w-sm ${className}`.trimEnd()}>{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh ps-[var(--nav-inset-inline-start)]">
      <div
        className={`mx-auto w-full ${
          width === "wide" ? "max-w-7xl" : "max-w-5xl"
        } px-6 pt-12 pb-[calc(var(--nav-inset-block-end)+1rem)] ${className}`.trimEnd()}
      >
        {children}
      </div>
    </div>
  );
}
