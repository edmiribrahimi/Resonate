import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import AppNav from "@/components/layout/AppNav";
import EditArtistButton from "@/components/artists/EditArtistButton";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The public artist profile — converted by plan 41.2-04.
 *
 * ── The shell, and why `default` is an answer ────────────────────────────────
 *
 * §4's `wide` list is closed and does not name this route, and `focus` is not
 * merely unlisted here — it is **unreachable**: `verify-conversion.mjs` reports
 * every surface that declares `focus` while mounting a navigation as a check-E
 * failure, and this page mounts one from the line below. So `default` is the
 * answer for a surface nobody had to argue about, not a fallback.
 *
 * The shell owns the maximum, the gutter, the vertical rhythm and the
 * navigation clearance, so the page root that used to carry a viewport height
 * and a hand-written bottom clearance is gone, and so is the repeated inline
 * padding under it.
 *
 * ── The header is a hero and stays one ───────────────────────────────────────
 *
 * Eight of this phase's ten page files carry the same three-line header; this
 * one does not. It carries a 160px portrait above the name, and that structure
 * survives the conversion untouched — what changed inside it is class strings
 * and the heading element, which becomes `PageTitle`.
 *
 * ── The navigation takes its responsive form (D-41.2-01) ─────────────────────
 *
 * `AppNav` is imported **directly** and the phone-locked wrapper is gone.
 * Directly is the whole of it: check E's pairing asks `importsDirectly`
 * (`verify-conversion.mjs:2803-2809`), so reaching the same component through
 * the wrapper counted as *not mounting* — while the gate's route table, reading
 * a different question, already printed this surface as mounted. A reader who
 * takes the route table for the answer concludes no declaration is owed and
 * ships content sliding under a 224px column at 768px and above.
 *
 * The declaration is the other half and lands in the same commit, on the
 * wrapper below, copied from `src/app/(public)/gallery/page.tsx:110` — the
 * public specimen, and the line the gate itself matched on its last green run.
 *
 * **What this does not change.** `41-UI-SPEC.md` §0 rule 5: width may change
 * layout, never membership. `AppNav` receives the same four props `MobileNav`
 * received, in the same order, so no entry appears or disappears and **no
 * capability check is touched**.
 *
 * ── The bio's reading measure stays, and it stays as it is ───────────────────
 *
 * The paragraph below keeps its own maximum. It is a *reading measure* on prose
 * an artist typed, not a container maximum on a page root: deleting it would set
 * a bio running the full width of the shell, which is a line length nobody
 * finishes. Wave 0 settled the disposition — DECLARE, not delete — and it is
 * `TYPOGRAPHIC_MEASURES` that carries it, one entry keyed on this page file, the
 * exact token and a fragment on the same line.
 *
 * **This plan does not write that entry**, and that is a deliberate refusal
 * rather than an omission: D-41.1-22 gives every edit under `scripts/` to a
 * wave's reconciliation plan, and this plan's own conversion rules say so in as
 * many words. Until 41.2-05 writes it, this line is the one thing on this
 * surface a declaration would redden — which is exactly why the line is left
 * with its class string byte-identical, so the entry written later matches on
 * the first run instead of refusing as stale.
 */
export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Role and status come from the session, not from a request header. Neither
  // changes what this page fetches or shows about an artist; `role` decides
  // whether the edit affordance below is drawn, and `status` only reaches the
  // nav. See the comment on that affordance for why the predicate is untouched.
  const { role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  // Fetch artist
  const { data: artist } = await supabase
    .from("artists")
    .select("id, name, slug, bio, photo_url, instagram_url, soundcloud_url, spotify_url, website_url")
    .eq("slug", slug)
    .single();

  if (!artist) {
    notFound();
  }

  // Fetch published events where this artist is in the lineup
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, date, cover_image")
    .eq("is_published", true)
    .contains("lineup", [artist.name])
    .order("date", { ascending: false });

  const socialLinks = [
    { url: artist.instagram_url, label: "Instagram", icon: "instagram" },
    { url: artist.soundcloud_url, label: "SoundCloud", icon: "soundcloud" },
    { url: artist.spotify_url, label: "Spotify", icon: "spotify" },
    { url: artist.website_url, label: "Website", icon: "globe" },
  ].filter((l) => l.url);

  return (
    <>
      {/*
        The declaring half of check E's pairing. The gate compares the files
        DECLARING the leading-edge column clearance against the files MOUNTING
        the responsive navigation form, in both directions, so a mount without
        this line is a red and this line without a mount is a red.

        It wraps the SHELL and the navigation is its SIBLING, which is the
        placement `(public)/gallery/page.tsx:110-132` settles: putting the
        navigation inside would still satisfy the textual pairing and would pad
        the column by its own clearance.

        Since D-41.1-01 the stylesheet's ambient value for that property is zero
        at every width, so without this line the content would slide UNDER the
        224px column from 768px up — the loud failure direction, visible at first
        look.

        The utility is written whole in the class list and is not spelled here:
        Tailwind scans comments, cannot tell a description from a use, and an
        abbreviated one emits a malformed rule and a build warning (DEF-41-01).
      */}
      <div className="md:[--nav-inset-inline-start:14rem]">
        <PageShell width="default">
          {/* A target as well as a label, so it declares the floor and carries
              the one focus expression — imported, never re-spelled. */}
          <Link
            href="/events"
            className={`mb-6 inline-flex min-h-11 items-center text-sm text-muted transition-all hover:text-ink active:scale-95 active:opacity-80 ${FOCUS_RING}`}
          >
            &larr; Back to events
          </Link>

          {/* Artist header — a hero, and the one place this surface diverges
              from the phase's common three-line header. */}
          <div className="flex flex-col items-center text-center mt-4">
            {artist.photo_url ? (
              <Image
                src={artist.photo_url}
                alt={artist.name}
                width={160}
                height={160}
                className="h-40 w-40 rounded-full object-cover border-2 border-line"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-full bg-surface text-muted border-2 border-line">
                <span className="text-5xl">&#127925;</span>
              </div>
            )}

            <PageTitle className="mt-4">{artist.name}</PageTitle>

            {/* Edit affordance for master/organizer.
                The predicate is deliberately UNCHANGED — only its source moved.

                It decides whether a button is DRAWN, and drawing is not
                protecting: `access-gating.md`, gate *coerenza
                navigazione/permessi*, requires every hidden entry to have its
                own server-side check. This one does. The modal calls
                `updateArtist`, which re-checks the catalogue-manage capability
                inside itself at `src/app/(admin)/admin/artists/actions.ts:207`
                (re-measured 2026-08-09, after the module moved out of the
                organizer tree), and the write is refused again by RLS —
                `artists_update_organizer` asks the catalogue-manage capability
                (`supabase/migrations/20260807010000_policies_to_capabilities.sql:82-85`),
                which is granted with `requires_approved = true`
                (`20260807000000_capability_model.sql:399-400`).

                So the button's predicate is WIDER than the write it leads to: a
                PENDING organizer sees it, the action lets them through, and RLS
                stops them. Narrowing the button to the capability would be an
                improvement — and improving a verdict is still changing one,
                which CAP-05 criterion 4 forbids in this phase. Phase 34
                (STAFF-03) owns both ends and changes them together. */}
            {(role === "master" || role === "organizer") && (
              <EditArtistButton artist={artist} />
            )}

            {/* Social links — external addresses, so they stay anchors. The
                button ladder's `href` branch renders a bare anchor, which is
                the correct element for a third-party destination and the reason
                `Chip` is not used here: `Chip.tsx`'s standing constraint is
                about INTERNAL navigation, where a bare anchor would lose
                client-side routing and the typed-route check. They keep the
                quiet rank they already had, on the ladder's terms — and on its
                44px floor rather than on a vertical padding. */}
            {socialLinks.length > 0 && (
              <div className="mt-3 flex gap-3">
                {socialLinks.map((link) => (
                  <Button
                    key={link.label}
                    href={link.url!}
                    variant="secondary"
                    size="sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Bio.

                The reading measure on this paragraph STAYS, and the whole line
                is byte-identical to what it was: it is the one own-maximum in
                this phase that wave 0 dispositioned as DECLARE rather than
                DELETE, and `TYPOGRAPHIC_MEASURES` is where that is recorded —
                by plan 41.2-05, which owns the gate file. `whitespace-pre-line`
                is the fragment the entry keys on, and it is semantic rather
                than stylistic: it preserves the line breaks an artist typed
                into their own bio, so no conversion pass has a reason to touch
                it. DEF-41-04 is the opposite outcome, recorded when the
                mechanism did not yet exist. */}
            {artist.bio && (
              <p className="mt-6 max-w-lg text-muted whitespace-pre-line text-left">
                {artist.bio}
              </p>
            )}
          </div>

          {/* Events.

              The list, its order and its membership are the query's, above.
              This block renders what came back and derives nothing: no sort, no
              numbering, no progressivo. */}
          {events && events.length > 0 && (
            <div className="mt-10">
              <SectionHeading>Events</SectionHeading>
              <div className="space-y-3">
                {events.map((event: { id: string; slug: string; title: string; date: string; cover_image: string | null }) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className={`flex min-h-11 items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-all hover:bg-raised active:scale-[0.98] active:opacity-80 ${FOCUS_RING}`}
                  >
                    {event.cover_image ? (
                      <Image
                        src={event.cover_image}
                        alt={event.title}
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-ground text-muted">
                        <span className="text-2xl">&#127925;</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {event.title}
                      </p>
                      <p className="text-xs text-muted">
                        {(() => { const d = new Date(event.date + "T00:00:00"); const M = ["January","February","March","April","May","June","July","August","September","October","November","December"]; return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`; })()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </PageShell>
      </div>

      <AppNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
