import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import AppNav from "@/components/layout/AppNav";
import { SiteFooter } from "@/components/legal/SiteFooter";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { getAccessContext } from "@/lib/capabilities/server";
import { musicPageEnabled } from "@/lib/livecuts/enabled";
import { MUSIC_SOUNDCLOUD_PROFILE_URL } from "@/lib/livecuts/profile";
import { filterNights, listPublishedLiveCuts } from "@/lib/livecuts/queries";
import { civilDateLabel } from "@/lib/livecuts/title";
import type { UserRole } from "@/types/database";
import LiveCutCard, { ExternalLinkIcon } from "./LiveCutCard";
import LiveCutPlayButton from "./LiveCutPlayButton";
import { MusicPlayerProvider } from "./MusicPlayer";
import MusicFilterRow, { type MusicFilterOption } from "./MusicFilterRow";

/**
 * DECLARED, not derived.
 *
 * The page would be dynamic anyway (`getAccessContext()` reads the cookies),
 * but the reason here is its own: a LiveCut withdrawn — consent revoked, a
 * legal request — must disappear AT ONCE, not at a cache expiry. A copy of this
 * list rendered before the withdrawal and served after it would keep publishing
 * a recording somebody asked us to take down. For the same reason the service
 * worker never keeps `/music` offline (`src/app/sw.ts`, NetworkOnly), and no
 * action calls a revalidation of this path: there is nothing cached to revalidate.
 */
export const dynamic = "force-dynamic";

/**
 * Static on purpose: no data is read for the preview, so no preview can carry
 * a place or a person (UI-SPEC §D). The image is the brand's, never a cover.
 * `openGraph` is written whole because Next replaces nested metadata objects
 * rather than merging them — without its own `title` the preview would lose it.
 */
export const metadata: Metadata = {
  title: "Music — re:sonate",
  description: "LiveCuts are the recordings of our events, one for each set.",
  openGraph: {
    title: "Music — re:sonate",
    description: "LiveCuts are the recordings of our events, one for each set.",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630 }],
  },
};

/** Same shape as `events/page.tsx`: a repeated parameter arrives as an array and means no value. */
interface MusicPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MusicPage({ searchParams }: MusicPageProps) {
  if (!musicPageEnabled()) notFound();

  // Outside any try: a resolver failure reaches Next's error boundary instead
  // of being turned into a page state. It only chooses the navigation entries.
  const { role, capabilities, liveAssignmentCapabilities } = await getAccessContext();

  const params = await searchParams;
  const formatParam = typeof params.format === "string" && params.format !== "" ? params.format : null;
  const artistParam = typeof params.artist === "string" && params.artist !== "" ? params.artist : null;

  const result = await listPublishedLiveCuts();

  let body: ReactNode;

  if (!result.ok) {
    // Never the empty state in place of the error: the log line
    // `[music.list_query_failed]` was written by the query layer.
    body = (
      <div role="alert" className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">The recordings could not be loaded.</p>
        <p className="mt-2 text-sm text-muted">Reload the page to try again.</p>
      </div>
    );
  } else if (result.nights.length === 0) {
    body = (
      <div className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">No LiveCuts yet</p>
        <p className="mt-2 text-sm text-muted">
          When a recording is published it appears here, under its event.
        </p>
      </div>
    );
  } else {
    // Formats: only those with published rows — derived from the rows by the
    // query, never from the catalogue listing. With a single format the row is
    // not mounted: a filter with one choice filters nothing.
    const formatOptions: MusicFilterOption[] = result.formats;

    // Artists: those with a LiveCut inside the active format filter. An artist
    // the URL selected OUTSIDE that filter stays visible and selected at
    // the end, so the state can be seen while the list shows the filtered
    // empty state.
    const inFilter = result.artists.filter(
      (a) => formatParam === null || a.formatSlugs.includes(formatParam),
    );
    const artistOptions: MusicFilterOption[] = inFilter.map(({ slug, name }) => ({ slug, name }));
    let artistOutside = false;
    if (artistParam !== null && !inFilter.some((a) => a.slug === artistParam)) {
      const known = result.artists.find((a) => a.slug === artistParam);
      if (known) {
        artistOptions.push({ slug: known.slug, name: known.name });
        artistOutside = true;
      }
    }

    const nights = filterNights(result.nights, { format: formatParam, artist: artistParam });
    // «Now» before any play: the first card in reading order of the FILTERED
    // result — one card, never one per block (UI-SPEC §Color, reservation 1).
    const firstLiveCutId = nights[0]?.liveCuts[0]?.id ?? null;

    body = (
      <>
        {formatOptions.length >= 2 && (
          <MusicFilterRow
            axis="format"
            options={formatOptions}
            active={formatParam}
            other={artistParam}
          />
        )}
        {(inFilter.length >= 2 || artistOutside) && (
          <MusicFilterRow
            axis="artist"
            options={artistOptions}
            active={artistParam}
            other={formatParam}
          />
        )}

        {nights.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-base font-semibold text-ink">No LiveCuts match these filters</p>
            <p className="mt-2 text-sm text-muted">Clear a filter to see every recording.</p>
            <Link
              href="/music"
              className={`mt-2 inline-flex min-h-11 items-center text-sm text-muted hover:text-ink ${FOCUS_RING}`}
            >
              Show all LiveCuts
            </Link>
          </div>
        ) : (
          // `order` is the list as the visitor sees it, filters applied: what ⏮/⏭
          // step through (plan 52.3-23 — every player measured steps the
          // visible queue, never «the artist's tracks»).
          <MusicPlayerProvider order={nights.flatMap((block) => block.liveCuts)}>
            {/* One group per event, newest first, cards in timetable order — and no
                heading: the series key is internal to us (owner's request 13,
                2026-10-05), so the group says only its civil date, to assistive
                technology. A group, not a landmark per event; a hairline, no text.
                One column on every width since 2026-10-06 (plan 52.3-21): the
                three-column tile grid showed 1.3 cards per desktop viewport. */}
            <div className="space-y-6">
              {nights.map((block) => (
                <div
                  key={block.partyId}
                  role="group"
                  aria-label={civilDateLabel(block.date)}
                  className="border-t border-line-soft pt-6 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-col gap-2">
                    {block.liveCuts.map((liveCut) => (
                      <LiveCutCard
                        key={liveCut.id}
                        liveCut={liveCut}
                        headingLevel={2}
                        play={<LiveCutPlayButton liveCut={liveCut} isFirst={liveCut.id === firstLiveCutId} />}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </MusicPlayerProvider>
        )}
      </>
    );
  }

  return (
    <>
      <div className="md:[--nav-inset-inline-start:14rem]">
        {/* `default` (O-5): the width is written here AND in
            `scripts/conversion-manifest.mjs`; changing it is a decision with both lines. */}
        <PageShell width="default">
          <header className="mb-6">
            {/* No sentence under the title (owner, 2026-10-05). It lives on only
                as the link preview's description above — a question for plan 52.3-20. */}
            <PageTitle>Music</PageTitle>
            {/* Mounted only when the profile URL exists (O-8): never a button without a destination. */}
            {MUSIC_SOUNDCLOUD_PROFILE_URL !== null && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">Listen elsewhere</span>
                <Button
                  href={MUSIC_SOUNDCLOUD_PROFILE_URL}
                  variant="secondary"
                  size="sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SoundCloud
                  <ExternalLinkIcon />
                </Button>
              </div>
            )}
          </header>

          {body}

          <SiteFooter />
        </PageShell>
      </div>

      <AppNav
        role={role as UserRole | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
