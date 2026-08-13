import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import EditVenueButton from "@/components/venues/EditVenueButton";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";

/**
 * The venue profile — moved out of `(public)` (D-37-23, plan 37-08).
 *
 * ── What moved, and what did NOT ─────────────────────────────────────────────
 *
 * The owner's decision: *«la pagina delle venue puo' solo vederla la produzione.
 * La pagina delle venue non e' pubblica»*. This file used to be
 * `src/app/(public)/venues/[slug]/page.tsx` and served `/venues/<slug>` to
 * anybody, signed in or not. It now serves `/admin/venues/<slug>`.
 *
 * **This closes a web ADDRESS, not a data path** (`CLAUDE.md` principio 2: the
 * route group picks where a request lands, RLS decides which rows come back).
 * The anonymous read of `public.venues` is closed by a different piece of work
 * in a different plan — the migration `20260810161000_venues_read_narrowed.sql`
 * (plan 37-02), which drops `venues_select_public` (`using (true)`) and leaves
 * `venues_select_staff` as the only SELECT arm. Believing that moving this file
 * closed the address is research pitfall P3, and it is written down because it
 * is the mistake this move invites.
 *
 * ── Reachability is the map's answer, never this directory's ─────────────────
 *
 * `admin` in the URL is an address, not an authorisation
 * (`nextjs-architecture.md`, gate *il gruppo non autorizza*). What decides is the
 * row `"/admin/venues/[slug]"` under `CAP.ORGANIZER_ACCESS` in
 * `src/lib/routes/capability-routes.ts`, next to its sister `"/admin/venues"` —
 * one entry read by the middleware, by the guard below and by the navigation, so
 * the three cannot disagree.
 *
 * ⚠️ `next build` would NOT have caught a missing row here: the backward
 * assertion covers only STATIC routes, and this one is dynamic
 * (`capability-routes.ts:60-77`). The check that sees it is
 * `npm run verify:routes`, which censuses `page.tsx` files from disk.
 *
 * ── R-WORK-ROUTES ────────────────────────────────────────────────────────────
 *
 * Only `page.tsx` and `loading.tsx` live under `(work)`. `EditVenueButton` stays
 * at `src/components/venues/` and the server actions it calls stay at
 * `src/app/(admin)/admin/venues/actions.ts`; both are imported by absolute
 * specifier.
 *
 * `MobileNav` is NOT mounted here: `(work)/layout.tsx` mounts it — and `StaffNav`
 * — once for every page in the group (D-34-07). The public version of this file
 * mounted its own; keeping that would have drawn two.
 *
 * ── The reader and the rows: the two sets coincide, measured ─────────────────
 *
 * This page reads `public.venues` with the caller's session. Once the narrowing
 * migration is applied the only granting arm is `venues_select_staff`, which asks
 * `staff.manage` (`20260810161000_venues_read_narrowed.sql:236-242`), while the
 * gate below asks `organizer.access`. Different keys — so the question was asked
 * rather than assumed, and plan 37-02 measured it against
 * `20260807000000_capability_model.sql:390-423`: the roles holding
 * `organizer.access` (master, organizer) are **exactly** those holding
 * `staff.manage`. Had they diverged, this page would open and render an empty
 * card — no error, no log, nothing for anyone to notice — which is the worst
 * available failure and the reason the check is written down instead of trusted.
 *
 * ── Converted onto the shell (plan 41.1-07), and what that did NOT touch ─────
 *
 * `default` and not `wide`: §4's wide list is closed and does not name this
 * route. That is not a fallback — it is the answer for every surface nobody had
 * to argue about. The shell owns the maximum, the gutter, the vertical rhythm
 * and the navigation clearance, so this file writes none of them.
 *
 * **This page renders a venue's ADDRESS to staff, so the conversion is bounded
 * by more than taste.** Nothing below changed a query, a filter, a capability
 * check or a visibility predicate: the withholding rule above still drops an
 * event whose party at this venue is secret and unrevealed, the address is still
 * inside the same conditional it was inside before, and the edit affordance is
 * still drawn on the same role test. A class string cannot reveal a venue; a
 * deleted conditional wrapper can, so the diff of this file is class strings,
 * JSX structure and imports and nothing else (`venue-secrecy.md`).
 */
export default async function VenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09).
  const { capabilities, role } = await getAccessContext();

  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch venue
  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, slug, bio, address, google_maps_url, photo_url, instagram_url, website_url")
    .eq("slug", slug)
    .single();

  if (!venue) {
    notFound();
  }

  // Fetch published events where at least one party has this venue_id.
  //
  // This filter is a page-level withholding rule, and it STAYS after the move.
  // `meta-gates.md` is explicit that the security boundary is RLS, never a page:
  // the rows dropped below stay readable to whoever else the policies admit, so
  // nothing here makes them private. What changed is only that the remedy this
  // comment used to describe as future work now exists as written code — the
  // narrowing of `public.venues` in
  // `supabase/migrations/20260810161000_venues_read_narrowed.sql` (plan 37-02).
  // Written, not yet deployed: at the time of writing only the sibling migration
  // `20260810160000_manual_venue_reveal.sql` is applied in production, so
  // `venues_select_public` (`using (true)`) is still in force there.
  //
  // The filter survives the narrowing for a reason the narrowing does not cover:
  // the reader of THIS page is entitled to the venue catalogue, which is not the
  // same as being entitled to a particular night at it. Putting a still-secret
  // party's event next to this venue's address would hand out the pairing that
  // `venue-secrecy.md` exists to withhold, and entitlement to an address is
  // per-ticket and per-RSVP, never per-venue.
  //
  // Predicate: a party at THIS venue withholds its event iff
  //   venue_secret === true && venue_reveal_email_sent !== true
  // `venue_secret` is `boolean NOT NULL DEFAULT false`
  // (`supabase/migrations/20260226400000_party_lineup_venue_secret.sql:6`);
  // `venue_reveal_email_sent` is `boolean DEFAULT false` and NULLABLE
  // (`supabase/migrations/20260305200000_venue_reveal_on_purchase.sql:10`),
  // set to `true` only after the reveal mail has gone out
  // (`src/app/api/cron/venue-reveal/route.ts:112,176`). So anything other than
  // an explicit `true` counts as "the reveal has not fired" — `venue-secrecy.md`,
  // gate *default chiuso*: when the reveal state is not determinable, hide.
  // This code only READS that flag; the monotone switch is untouched and
  // nothing here can make it easier to trip.
  //
  // Edge cases, all decided towards withholding — withholding costs
  // visibility, which is recoverable, and the other direction is not:
  //  - the event has further parties at other venues: irrelevant, only the
  //    party that links THIS venue is considered;
  //  - two parties at this same venue, one still secret and one revealed: the
  //    event is withheld, even though the revealed one may already name this
  //    venue elsewhere;
  //  - a past event whose party was never marked revealed (the cron may never
  //    have run for old rows): withheld. The cost is a shorter history on this
  //    page. No date-based exemption is added: a second predicate keyed on the
  //    date would fail open every time a date is wrong.
  const { data: partyLinks } = await supabase
    .from("event_parties")
    .select("event_id, venue_secret, venue_reveal_email_sent")
    .eq("venue_id", venue.id);

  type PartyLink = {
    event_id: string;
    venue_secret: boolean | null;
    venue_reveal_email_sent: boolean | null;
  };

  const links = (partyLinks ?? []) as PartyLink[];

  const withheldEventIds = new Set(
    links
      .filter((p) => p.venue_secret === true && p.venue_reveal_email_sent !== true)
      .map((p) => p.event_id)
  );

  const eventIds = [
    ...new Set(
      links.map((p) => p.event_id).filter((id) => !withheldEventIds.has(id))
    ),
  ];

  let events: { id: string; slug: string; title: string; date: string; cover_image: string | null }[] = [];
  if (eventIds.length > 0) {
    const { data: eventData } = await supabase
      .from("events")
      .select("id, slug, title, date, cover_image")
      .eq("is_published", true)
      .in("id", eventIds)
      .order("date", { ascending: false });
    events = eventData ?? [];
  }

  const socialLinks = [
    { url: venue.instagram_url, label: "Instagram" },
    { url: venue.website_url, label: "Website" },
  ].filter((l) => l.url);

  return (
    <PageShell width="default">
      <div>
        {/* Back to the sister listing, not to the public events index: this page
            is reached from `/admin/venues` now, and `/events` would send a
            member of production out of the work surface.

            It is a target as well as a label, so it declares the floor and
            carries the one focus expression — imported, never re-spelled. */}
        <Link
          href="/admin/venues"
          className={`mb-6 inline-flex min-h-11 items-center text-sm text-muted transition-all hover:text-ink active:scale-95 active:opacity-80 ${FOCUS_RING}`}
        >
          &larr; Back to venues
        </Link>

        {/* Venue header */}
        <div className="flex flex-col items-center text-center mt-4">
          {venue.photo_url ? (
            <Image
              src={venue.photo_url}
              alt={venue.name}
              width={160}
              height={160}
              className="h-40 w-40 rounded-2xl object-cover border-2 border-line"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-surface text-muted border-2 border-line">
              <span className="text-5xl">&#127963;</span>
            </div>
          )}

          <PageTitle className="mt-4">{venue.name}</PageTitle>

          {/* Edit affordance for master/organizer.
              The predicate is deliberately UNCHANGED by the move.

              It decides whether a button is DRAWN, and drawing is not
              protecting: `access-gating.md`, gate *coerenza
              navigazione/permessi*, requires every hidden entry to have its
              own server-side check. This one does. The modal calls
              `updateVenue`, which re-checks the catalogue-manage capability
              inside itself at `src/app/(admin)/admin/venues/actions.ts:198`,
              and the write is refused again by RLS — `venues_update_organizer`
              asks the catalogue-manage capability
              (`supabase/migrations/20260807010000_policies_to_capabilities.sql:414-417`),
              which is granted with `requires_approved = true`
              (`20260807000000_capability_model.sql:399-400`).

              So the predicate is WIDER than the write it leads to: a PENDING
              organizer sees the button, the action lets them through, and RLS
              stops them. The move does not narrow it and does not widen it —
              `organizer.access` is held by master and organizer only, so
              everybody who now reaches this page already satisfied the role
              test. Narrowing the button to the capability is a verdict change
              and belongs to whoever owns both ends of it; leaving a role test
              that is currently implied costs nothing and keeps the diff of this
              plan to the address. */}
          {(role === "master" || role === "organizer") && (
            <EditVenueButton venue={venue} />
          )}

          {/* Address */}
          {venue.address && (
            <p className="mt-2 text-sm text-muted">
              &#128205; {venue.address}
            </p>
          )}

          {/* Google Maps link.

              It keeps the emphasis it already had — it was the one accent-tinted
              control on this page and it stays the emphasised one — but on the
              ladder's terms: an accent FILL carries `--ground` as its ink at
              6.85 : 1, where the tint it replaces put accent ink on an accent
              wash. The rung is the ladder's, so the height is the 44px floor
              rather than a vertical padding that happened to compute to 36. The
              element is still an anchor to a third-party address, so it still
              opens in a new context with the same rel. */}
          {venue.google_maps_url && (
            <Button
              href={venue.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2"
            >
              Open in Google Maps
            </Button>
          )}

          {/* Social links — secondary, because they were the quiet pair here and
              re-ranking what a surface emphasises is not a conversion's to do. */}
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

              The reading measure this paragraph carried is GONE, and it is a
              loss rather than a tidy — the same one `(work)/formats/page.tsx`
              records. §4 gives the content maximum to the shell and a converted
              page writes none of its own; the gate reads that literally, so a
              typographic measure on a `<p>` and a container maximum on a page
              root are one string to it. DEF-41-04 is where the question of
              whether a MEASURE is a MAXIMUM is kept, and it is still open. */}
          {venue.bio && (
            <p className="mt-6 text-muted whitespace-pre-line text-left">
              {venue.bio}
            </p>
          )}
        </div>

        {/* Events at this venue.

            The list, its order and its membership are the query's, above. This
            block renders whatever survived the withholding rule and derives
            nothing: no sort, no numbering, no progressivo. */}
        {events.length > 0 && (
          <div className="mt-10">
            <SectionHeading>Events</SectionHeading>
            <div className="space-y-3">
              {events.map((event) => (
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
      </div>
    </PageShell>
  );
}
