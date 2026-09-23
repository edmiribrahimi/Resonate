"use client";

import { useState, type ReactNode } from "react";
import { StaggeredList, StaggeredItem } from "@/components/motion/StaggeredList";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * The square thumbnail grid, shared by two public surfaces.
 *
 * ── Converted by plan 41-08, and the scope of that conversion is deliberate ──
 *
 * This component is reached from `/gallery`, which plan 41-08 declares
 * converted, so it is inside that surface's import closure and G1 scans it. It
 * is **also** reached from `(public)/events/[slug]/MediaGallerySection.tsx` —
 * the public event page, which is `venue-secrecy` primary and belongs to a
 * later plan's conversion unit.
 *
 * That second consumer is what fixes how much this file was allowed to change:
 *
 *  - **The token substitutions are value-preserving.** The four legacy names
 *    this file carried are pure aliases in the token layer
 *    (`globals.css:247-250`), so the rendered colours are byte-identical. A
 *    surface nobody has scheduled does not change appearance because a
 *    neighbouring surface converted.
 *  - **The focus expression is a correction, not a preference.** This file was
 *    one of finding A3's 70 sites: it killed the outline and replaced it with an
 *    accent ring, which is the one indicator a keyboard user has, in the one
 *    colour that disappears against an accent fill (2.52 : 1). It now carries
 *    the shared expression, which is `--ink` at a 2 px offset. That is a defect
 *    closed on both surfaces at once, and it is the sort of change a phase is
 *    obliged to make rather than permitted to.
 *  - **The phone stays at two columns.** §2.3's migration map moves the
 *    *prefix*; the base two-column layout was never one and no clause retires
 *    it. Dropping the phone to a single square per row would be a layout change
 *    to the event page, delivered by a plan that does not declare it — the scope
 *    creep plan 41-07 refused on the toast, for the same reason. The desktop
 *    step §2.2's three-tier grid axis asks for is what was missing, and it is
 *    what was added.
 *
 * The thumbnail radius is §9's twelve-pixel rung, which names *thumbnail*
 * explicitly. The retired eight-pixel one is described here rather than spelled:
 * Tailwind cannot tell a class string in a comment from a use (DEF-41-01).
 */

export interface MediaGridItem {
  id: string;
  url: string;
  type: "photo" | "video";
  uploaded_by?: string;
}

interface MediaGridProps {
  items: MediaGridItem[];
  onItemClick?: (item: MediaGridItem) => void;
  actions?: (item: MediaGridItem) => ReactNode;
}

/*
  Zero silent failures (phase 52, NAV-07). After NAV-07 an address EXPIRES — the
  gallery's signature lasts an hour — and a row can arrive with no address at
  all when its signature failed. Without the sentence below an expired or
  unsigned picture would be a mute rectangle, indistinguishable from a gallery
  that simply has nothing in it. There is no error tracking in this product
  (`meta-gates.md`), so the visible effect is the only one that reaches anybody.
  A new pattern here: no `<img>` in the product had an `onError` before.
*/
export default function MediaGrid({ items, onItemClick, actions }: MediaGridProps) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  if (items.length === 0) return null;

  const markFailed = (id: string) =>
    setFailed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return (
    <StaggeredList className="grid grid-cols-2 lg:grid-cols-3 gap-2">
      {items.map((item) => (
        <StaggeredItem key={item.id}>
        <button
          type="button"
          /*
            An accessible name that says what the control does and names NOTHING
            about the item. A thumbnail's alt text is empty on purpose — the
            gallery is public and a caption or a place name in an accessible
            name would be published as surely as one in the caption itself.
          */
          aria-label={item.type === "photo" ? "Open photo" : "Open video"}
          className={`relative aspect-square min-h-11 w-full overflow-hidden rounded-xl bg-surface transition-transform active:scale-95 active:opacity-80 ${FOCUS_RING}`}
          onClick={() => onItemClick?.(item)}
        >
          {item.url === "" || failed.has(item.id) ? (
            <div className="flex h-full w-full items-center justify-center bg-raised">
              <p className="px-2 text-center text-xs text-muted">
                This image could not be loaded. Reload the page.
              </p>
            </div>
          ) : item.type === "photo" ? (
            <img
              src={item.url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => markFailed(item.id)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-raised">
              {/* Play icon triangle */}
              <svg
                className="h-12 w-12 text-ink-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}

          {/* Actions overlay */}
          {actions && (
            <div
              className="absolute top-1 right-1 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {actions(item)}
            </div>
          )}
        </button>
        </StaggeredItem>
      ))}
    </StaggeredList>
  );
}
