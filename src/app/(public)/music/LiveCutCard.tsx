import Link from "next/link";
import type { ReactNode } from "react";
import FormatMarker from "@/components/formats/FormatMarker";
import { FOCUS_RING } from "@/components/ui/Button";
import { B2B_JOINER, civilDateLabel, durationLabel, showsPartNumber, slotLabel } from "@/lib/livecuts/title";
import type { LiveCutView } from "@/lib/livecuts/view";
import LiveCutCover from "./LiveCutCover";

/**
 * Heroicons v2 outline `arrow-top-right-on-square` — the external-link mark,
 * pasted as the other icons of the tree are. Exported so the page's «Listen
 * elsewhere» line draws the same mark instead of a second copy.
 */
export function ExternalLinkIcon({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

/**
 * One LiveCut — one recording of one timetable slot (UI-SPEC §A.4).
 *
 * ── One tree, two layouts ────────────────────────────────────────────────────
 *
 * On a phone the card is a ROW (96 px cover left, text middle, play right, the
 * external link on its own full-width line); from `md:` it is a TILE (cover on
 * top, full width, play over the cover's bottom-right corner, text below). The
 * same elements are placed in different grid cells by CSS — no breakpoint
 * duplicates a target, and the viewport is never read in JavaScript. The play
 * overlaps the cover from `md:` by sharing its grid area, not by absolute
 * positioning: one button in the DOM.
 *
 * ── What it says, and what it never says ─────────────────────────────────────
 *
 * Who (artists, each linked to `/artists/<slug>`; a b2b is ONE card with two
 * links), when (date · slot · duration, one monospace line that wraps between
 * the date and the slot, never inside a time), which format (name and colour
 * from the catalogue row, via `FormatMarker` — no colour literal in this file),
 * and where to listen (SoundCloud, Mixcloud only if the copy exists). It has no
 * line of place, in any state (O-1 (a)): the page talks about music.
 *
 * Never the series key — internal to us (owner's request 13, 2026-10-05) — and
 * never the SoundCloud title: it repeats artist, format and date, which the
 * card already says (request 16). The computed title lives on as the play
 * button's accessible name and in the player bar. `PT<n>` shows only when the
 * event has at least two published parts (request 14, `showsPartNumber`).
 * The duration stays: it was already on the card and request 16 does not
 * remove it — a declared choice, one line to take out if the owner wants it.
 *
 * ── `headingLevel` and `currentArtistSlug` ───────────────────────────────────
 *
 * On `/music` the artists line is an `h2` (no event heading sits above it any
 * more); on an artist's page, under its `LiveCuts` heading, it is an `h3`. There
 * the page's own artist is plain text — a link to the page you are on goes
 * nowhere — while a b2b partner stays a link.
 *
 * ── The `play` slot ──────────────────────────────────────────────────────────
 *
 * `null` today. Plan 52.3-08 passes the player's button here; the cell that
 * holds it is already laid out so that plan changes no class of this file.
 *
 * Not a link itself: it holds several targets. No hover on the card, no shadow.
 */
export default function LiveCutCard({
  liveCut,
  play,
  headingLevel = 2,
  currentArtistSlug = null,
}: {
  liveCut: LiveCutView;
  play: ReactNode;
  headingLevel?: 2 | 3;
  currentArtistSlug?: string | null;
}) {
  const titleId = `livecut-${liveCut.id}-title`;
  const joiner = B2B_JOINER.trim();
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <article
      aria-labelledby={titleId}
      className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center overflow-hidden rounded-2xl border border-line bg-surface md:grid-cols-1 md:items-start"
    >
      <LiveCutCover
        id={liveCut.id}
        coverUrl={liveCut.coverUrl}
        className="col-start-1 row-start-1 h-24 w-24 md:aspect-square md:h-auto md:w-full"
      />

      <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1 ps-4 py-2 md:col-start-1 md:row-start-2 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <FormatMarker name={liveCut.formatName} color={liveCut.formatColor} />
          {showsPartNumber(liveCut) && (
            <span className="font-mono text-xs font-semibold text-muted">
              <span aria-hidden="true">PT{liveCut.partNumber}</span>
              <span className="sr-only">Part {liveCut.partNumber}</span>
            </span>
          )}
        </div>

        <Heading
          id={titleId}
          className="flex flex-wrap items-center gap-x-1 gap-y-4 text-base font-semibold text-ink"
        >
          {liveCut.artists.map((artist, index) => (
            <span key={artist.slug} className="contents">
              {index > 0 && (
                <span className="text-sm font-normal text-muted">{joiner}</span>
              )}
              {artist.slug === currentArtistSlug ? (
                <span className="inline-flex items-center normal-case">{artist.name}</span>
              ) : (
                <Link
                  href={`/artists/${artist.slug}`}
                  className={`-my-2 inline-flex min-h-11 items-center normal-case hover:underline underline-offset-4 ${FOCUS_RING}`}
                >
                  {artist.name}
                </Link>
              )}
            </span>
          ))}
        </Heading>

        <p className="flex flex-wrap gap-x-1 font-mono text-xs font-semibold text-muted">
          <span className="whitespace-nowrap">{civilDateLabel(liveCut.date)} ·</span>
          <span className="whitespace-nowrap">
            {slotLabel(liveCut.slotStart, liveCut.slotEnd)} · {durationLabel(liveCut.durationSeconds)}
          </span>
        </p>
      </div>

      <div className="col-start-3 row-start-1 pe-2 md:col-start-1 md:row-start-1 md:self-end md:justify-self-end md:m-2 md:pe-0">
        {play}
      </div>

      <div className="col-span-3 row-start-2 flex flex-wrap items-center gap-x-4 border-t border-line-soft ps-4 md:col-span-1 md:row-start-3 md:px-4">
        <a
          href={liveCut.soundcloudUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-muted hover:text-ink ${FOCUS_RING}`}
        >
          Open on SoundCloud
          <ExternalLinkIcon />
        </a>
        {liveCut.mixcloudUrl && (
          <a
            href={liveCut.mixcloudUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-muted hover:text-ink ${FOCUS_RING}`}
          >
            Open on Mixcloud
            <ExternalLinkIcon />
          </a>
        )}
      </div>
    </article>
  );
}
