import Link from "next/link";
import FormatMarker from "@/components/formats/FormatMarker";

/**
 * The format filter on `/events` — the chip row that must look the same to
 * everybody, always.
 *
 * ── Why anchors, and not buttons ─────────────────────────────────────────────
 *
 * FMT-04 asks for a filter that survives navigation and can be shared as a
 * link, and D-36-15 puts it in the address. That makes this NAVIGATION rather
 * than a toggle — so it wants an anchor, which works with no JavaScript, opens
 * in a new tab, and can be copied from the context menu. A button would need a
 * router call to do any of those, and would lose the first.
 *
 * The production tracker's own chips are buttons carrying the pressed-state
 * attribute, and the visual is adopted from them unchanged while the element is
 * not: that attribute is only valid on `role="button"`, so on an anchor the
 * correct one is `aria-current`. No element in `src/` carries the pressed-state
 * attribute today, so nothing is being made inconsistent — and this file does
 * not name it, so that sentence stays checkable with a grep.
 *
 * ── Why this component is not given the events ───────────────────────────────
 *
 * This is the guarantee, and it is structural rather than a rule somebody has
 * to keep: the props below are the CATALOGUE, the active slug and the active
 * tab. There is no results array here, so no property of a chip can depend on
 * one. A chip is therefore never greyed out, reordered or hidden because a
 * format happens to have nothing visible — and that is not a nicety. It is a
 * count with one bit of resolution: if a chip went dark when a format had
 * nothing published, LIGHTING UP WOULD BE THE ANNOUNCEMENT (D-36-13, D-36-14).
 *
 * For the same reason nothing here emits a number — not in a label, not in an
 * `aria-label`, not in a `title`. A count is the one channel that reveals an
 * unannounced night WITHOUT SHOWING ANYTHING, so no visual inspection of this
 * page could ever catch one.
 *
 * The row is also identical for an anonymous visitor and for someone who can
 * see drafts (D-36-16). The page builds it from one query, on one path; a
 * staff viewer's *results* include drafts, their *chips* do not.
 *
 * ── The two things not to copy from the neighbours ───────────────────────────
 *
 * 1. The Upcoming/Past tabs one element away transform their labels to capitals
 *    and pull the letters wide (`EventTabs.tsx`). Those two classes on a format
 *    chip ship `re:sonate` shouted and the CamelCase names flattened, to every
 *    visitor at once — which is why neither appears in this file. The name here
 *    is rendered by `FormatMarker`, which carries `normal-case` on the element
 *    itself so the invariant survives its own context.
 * 2. The only other `<Link>`-as-toggle in the tree (`members/growth/page.tsx`)
 *    fills its active state with the interaction accent. That accent is barred
 *    from the format channel: the moment one channel borrows the other, a
 *    format stops being identifiable. The on state here is ground, ink and
 *    `aria-current`.
 */

interface FormatChip {
  /** The catalogue slug. Travels in the address; never rendered as a label. */
  readonly slug: string;
  /** The string a visitor reads, stored verbatim. */
  readonly name: string;
  /** `#RRGGBB`, from the catalogue row — never a constant in this file. */
  readonly color: string;
}

interface FormatFilterRowProps {
  /**
   * The active catalogue, in the catalogue's own order. Retired and unlisted
   * formats never reach this list, so they get no chip.
   */
  readonly formats: readonly FormatChip[];
  /** The slug the address selected, already validated against `formats`. */
  readonly activeFormat: string | null;
  /** The other axis, preserved by every href below. */
  readonly activeTab: "upcoming" | "past";
}

export default function FormatFilterRow({
  formats,
  activeFormat,
  activeTab,
}: FormatFilterRowProps) {
  // Exactly one chip is current at a time. `All` is current whenever the
  // address named no format, or named one this catalogue does not hold — which
  // is the same answer, deliberately, so the page is no oracle for whether a
  // format exists.
  const allIsCurrent = activeFormat === null;
  const isPast = activeTab === "past";

  return (
    <>
      {/*
        The same scrollbar-hiding shape `StaffNav.tsx` already uses in this
        repository. A partially visible chip at the edge is what signals that
        the row scrolls, so the bar itself would only be noise.
      */}
      <style>{`
        .format-filter-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .format-filter-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/*
        One line that scrolls rather than wrapping, bled to the gutter with
        `-mx-6 px-6` so the first and last chip sit on the page margin and a
        partial chip can show past it. This stays a quiet header block: the
        focal point of the screen is the list below it, so no icons on the
        chips and no heading of its own.
      */}
      <nav aria-label="Filter events by format" className="mb-4 px-6">
        <div className="format-filter-scroll -mx-6 flex gap-4 overflow-x-auto px-6">
          <Link
            href={isPast ? "/events?tab=past" : "/events"}
            aria-current={allIsCurrent ? "true" : undefined}
            style={allIsCurrent ? { scrollMarginInline: "24px" } : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-card-border px-4 text-xs font-semibold tracking-wide normal-case transition-colors ${
              allIsCurrent
                ? "bg-card text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {/*
              No swatch: `All` is not a format, and giving it one would imply a
              colour it does not have. Its state is carried entirely by ground,
              ink and `aria-current`, so no colour channel is involved at all.
            */}
            All
          </Link>

          {formats.map((format) => {
            const isCurrent = format.slug === activeFormat;

            return (
              <Link
                key={format.slug}
                // A template literal at the call site, and a ternary so each
                // branch is one: a bare `string` variable does not compile
                // under `typedRoutes` (measured, `analytics/compare/page.tsx`).
                // Each href carries the other axis, because choosing a format
                // must not silently return a visitor to Upcoming — and the
                // default is never written into the address, so the canonical
                // bare address stays `/events`.
                href={
                  isPast
                    ? `/events?format=${encodeURIComponent(format.slug)}&tab=past`
                    : `/events?format=${encodeURIComponent(format.slug)}`
                }
                aria-current={isCurrent ? "true" : undefined}
                // The border colour is applied INLINE while the neutral
                // `border-card-border` class stays on the element: if
                // `color-mix` is unsupported the declaration is dropped and the
                // neutral border remains, so there is no state in which a chip
                // loses its border. The hue comes from the catalogue row and
                // never from a constant here (D-36-12, FMT-05).
                style={
                  isCurrent
                    ? {
                        borderColor: `color-mix(in srgb, ${format.color} 45%, transparent)`,
                        scrollMarginInline: "24px",
                      }
                    : undefined
                }
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-card-border px-4 transition-colors ${
                  isCurrent ? "bg-card" : ""
                }`}
              >
                {/*
                  `dimmed` is the off state of the FILTER — whether the address
                  selected this chip — and never a statement about the data.
                  See this file's docblock: the results are not in scope here,
                  by construction.
                */}
                <FormatMarker
                  name={format.name}
                  color={format.color}
                  dimmed={!isCurrent}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
