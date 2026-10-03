import Link from "next/link";
import FormatMarker from "@/components/formats/FormatMarker";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * One filter row of `/music` — by format or by artist (UI-SPEC §A.2).
 *
 * The construction is copied from `src/app/(public)/events/FormatFilterRow.tsx`,
 * and its docblock carries the reasons, which hold here unchanged:
 *
 * - **Anchors, not buttons.** A filter is navigation: it lives in the URL,
 *   works with no JavaScript, opens in a new tab and can be shared. So the
 *   current chip carries `aria-current`, the attribute valid on a link.
 * - **The selected state is ground, ink and `aria-current` — never the
 *   interaction accent.** On this page the accent is reserved for «now» and
 *   playback; a chip that borrowed it would be a second «now».
 * - **The format colour comes from the catalogue row**, through `FormatMarker`
 *   and the run-time `color-mix` border, never as a literal in this file.
 * - **No number anywhere** — not in a label, not in an `aria-label`.
 *
 * Each href carries the OTHER axis, so choosing a format does not drop the
 * chosen artist and vice versa; a default is never written into the URL,
 * so the bare canonical URL stays `/music`.
 *
 * The options are the page's: formats with at least one published LiveCut,
 * artists with at least one inside the active format filter — plus, at the end,
 * an artist the URL selected outside that filter, so the state stays
 * visible while the list below shows the filtered empty state.
 */

export interface MusicFilterOption {
  readonly slug: string;
  readonly name: string;
  /** Only on the format row: `#RRGGBB` from the catalogue row. */
  readonly color?: string;
}

interface MusicFilterRowProps {
  readonly axis: "format" | "artist";
  readonly options: readonly MusicFilterOption[];
  /** The slug the URL selected on THIS axis, or null. */
  readonly active: string | null;
  /** The slug selected on the OTHER axis, preserved by every href. */
  readonly other: string | null;
}

/** `/music` with the two axes, each written only when set. */
function musicHref(format: string | null, artist: string | null): "/music" | `/music?${string}` {
  const parts: string[] = [];
  if (format !== null) parts.push(`format=${encodeURIComponent(format)}`);
  if (artist !== null) parts.push(`artist=${encodeURIComponent(artist)}`);
  return parts.length === 0 ? "/music" : `/music?${parts.join("&")}`;
}

export default function MusicFilterRow({ axis, options, active, other }: MusicFilterRowProps) {
  if (options.length === 0) return null;

  const isFormat = axis === "format";
  const hrefFor = (slug: string | null) =>
    isFormat ? musicHref(slug, other) : musicHref(other, slug);
  const allIsCurrent = active === null;

  return (
    <>
      <style>{`
        .music-filter-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .music-filter-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <nav
        aria-label={isFormat ? "Filter LiveCuts by format" : "Filter LiveCuts by artist"}
        className="mb-4"
      >
        <div className="music-filter-scroll -mx-6 flex gap-4 overflow-x-auto px-6">
          <Link
            href={hrefFor(null)}
            aria-current={allIsCurrent ? "true" : undefined}
            style={allIsCurrent ? { scrollMarginInline: "24px" } : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-control px-4 text-xs font-semibold tracking-wide normal-case transition-colors ${FOCUS_RING} ${
              allIsCurrent ? "bg-surface text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {isFormat ? "All formats" : "All artists"}
          </Link>

          {options.map((option) => {
            const isCurrent = option.slug === active;
            return (
              <Link
                key={option.slug}
                href={hrefFor(option.slug)}
                aria-current={isCurrent ? "true" : undefined}
                // Inline border colour while the neutral border class stays: if
                // `color-mix` is unsupported the declaration is dropped and the
                // neutral border remains. The hue is data, never a literal here.
                style={
                  isCurrent
                    ? isFormat && option.color
                      ? {
                          borderColor: `color-mix(in srgb, ${option.color} 45%, transparent)`,
                          scrollMarginInline: "24px",
                        }
                      : { scrollMarginInline: "24px" }
                    : undefined
                }
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-control px-4 text-xs font-semibold tracking-wide normal-case transition-colors ${FOCUS_RING} ${
                  isCurrent ? "bg-surface text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {isFormat && option.color ? (
                  <FormatMarker name={option.name} color={option.color} dimmed={!isCurrent} />
                ) : (
                  option.name
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
