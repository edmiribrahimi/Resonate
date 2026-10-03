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
import { civilDateLabel, slotLabel } from "@/lib/livecuts/title";
import type { NightBlock } from "@/lib/livecuts/view";
import type { UserRole } from "@/types/database";
import LiveCutCard, { ExternalLinkIcon } from "./LiveCutCard";
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

/**
 * The event key's class — Orbitron, the one dated deviation from 41 §7.1
 * (UI-SPEC §Typography). Option O-7: to return to Inter, remove `font-display`
 * from this line and nothing else.
 */
const NIGHT_KEY_CLASS =
  "inline-flex min-h-11 items-center font-display text-base font-semibold tracking-normal normal-case text-ink hover:underline underline-offset-4";

/** Same shape as `events/page.tsx`: a repeated parameter arrives as an array and means no value. */
interface MusicPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * The meta line of an event block: date · time · N LiveCut(s).
 *
 * N is how this page reads MUS-03's «number of episodes»: the PUBLISHED cards
 * of that event, `liveCuts.length` — not the slots of the timetable. An episode
 * not yet published is not counted, and the timetable count is production
 * material that does not enter this page (UI-SPEC §A.3, meta line).
 */
function nightMeta(block: NightBlock): string {
  const parts = [civilDateLabel(block.date)];
  if (block.time && block.endTime) parts.push(slotLabel(block.time, block.endTime));
  const n = block.liveCuts.length;
  parts.push(`${n} ${n === 1 ? "LiveCut" : "LiveCuts"}`);
  return parts.join(" · ");
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
          <div className="space-y-12">
            {nights.map((block) => (
              <section key={block.partyId} aria-labelledby={`night-${block.partyId}`}>
                <h2 id={`night-${block.partyId}`}>
                  {/* `min-h-11` also written here, literally: `verify:touch-targets`
                      reads the element's own class string, not the constant. */}
                  <Link href={`/events/${block.eventSlug}`} className={`min-h-11 ${NIGHT_KEY_CLASS} ${FOCUS_RING}`}>
                    {block.key}
                  </Link>
                </h2>
                <p className="mb-4 font-mono text-xs font-semibold text-muted">{nightMeta(block)}</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {block.liveCuts.map((liveCut) => (
                    <LiveCutCard key={liveCut.id} liveCut={liveCut} play={null} />
                  ))}
                </div>
              </section>
            ))}
          </div>
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
            <PageTitle>Music</PageTitle>
            <p className="mt-2 text-sm text-muted">
              LiveCuts are the recordings of our events, one for each set.
            </p>
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
