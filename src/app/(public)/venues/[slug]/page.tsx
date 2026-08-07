import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import EditVenueButton from "@/components/venues/EditVenueButton";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import type { UserRole, UserStatus } from "@/types/database";

export default async function VenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Role and status come from the session, not from a request header.
  //
  // NOTHING below reads either value to decide what is shown about the venue.
  // `venue.address` and `venue.google_maps_url` render on the same condition
  // they always did — the field being non-empty — for every visitor including
  // an anonymous one, and this conversion does not touch that condition.
  // `venue_reveal_sent` is a one-way switch (`venue-secrecy.md`): it lives on
  // `tickets` / `rsvps`, is not read here, and nothing here can trip it.
  const { role, status } = await getAccessContext();

  // Fetch venue
  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, slug, bio, address, google_maps_url, photo_url, instagram_url, website_url")
    .eq("slug", slug)
    .single();

  if (!venue) {
    notFound();
  }

  // Fetch published events where at least one party has this venue_id
  const { data: partyLinks } = await supabase
    .from("event_parties")
    .select("event_id")
    .eq("venue_id", venue.id);

  const eventIds = [...new Set((partyLinks ?? []).map((p: { event_id: string }) => p.event_id))];

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
    <div className="min-h-dvh pb-24">
      <div className="px-6 pt-6">
        <Link
          href="/events"
          className="mb-6 inline-flex items-center text-sm text-muted hover:text-foreground transition-all active:scale-95 active:opacity-80"
        >
          &larr; Back to events
        </Link>

        {/* Venue header */}
        <div className="flex flex-col items-center text-center mt-4">
          {venue.photo_url ? (
            <Image
              src={venue.photo_url}
              alt={venue.name}
              width={160}
              height={160}
              className="h-40 w-40 rounded-2xl object-cover border-2 border-card-border"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-card text-muted border-2 border-card-border">
              <span className="text-5xl">&#127963;</span>
            </div>
          )}

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            {venue.name}
          </h1>

          {/* Edit affordance for master/organizer.
              The predicate is deliberately UNCHANGED — only its source moved.

              It decides whether a button is DRAWN, and drawing is not
              protecting: `access-gating.md`, gate *coerenza
              navigazione/permessi*, requires every hidden entry to have its
              own server-side check. This one does. The modal calls
              `updateVenue`, which re-checks identity and role inside itself at
              `src/app/(organizer)/organizer/venues/actions.ts:125-137`, and
              the write is refused again by RLS — `venues_update_organizer`
              asks the catalogue-manage capability
              (`supabase/migrations/20260807010000_policies_to_capabilities.sql:414-417`),
              which is granted with `requires_approved = true`
              (`20260807000000_capability_model.sql:399-400`).

              So the button's predicate is WIDER than the write it leads to: a
              PENDING organizer sees it, the action lets them through, and RLS
              stops them. Narrowing the button to the capability would be an
              improvement — and improving a verdict is still changing one,
              which CAP-05 criterion 4 forbids in this phase. Phase 34
              (STAFF-03) owns both ends and changes them together. */}
          {(role === "master" || role === "organizer") && (
            <EditVenueButton venue={venue} />
          )}

          {/* Address */}
          {venue.address && (
            <p className="mt-2 text-sm text-muted">
              &#128205; {venue.address}
            </p>
          )}

          {/* Google Maps link */}
          {venue.google_maps_url && (
            <a
              href={venue.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block rounded-full bg-accent/20 px-4 py-2 text-sm text-accent font-medium hover:bg-accent/30 transition-all active:scale-95 active:opacity-80"
            >
              Open in Google Maps
            </a>
          )}

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="mt-3 flex gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-card border border-card-border px-4 py-2 text-sm text-muted hover:text-foreground transition-all active:scale-95 active:opacity-80"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {/* Bio */}
          {venue.bio && (
            <p className="mt-6 max-w-lg text-muted whitespace-pre-line text-left">
              {venue.bio}
            </p>
          )}
        </div>

        {/* Events at this venue */}
        {events.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
              Events
            </h2>
            <div className="space-y-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="flex items-center gap-4 rounded-xl border border-card-border bg-card p-3 hover:bg-card/80 transition-all active:scale-[0.98] active:opacity-80"
                >
                  {event.cover_image ? (
                    <Image
                      src={event.cover_image}
                      alt={event.title}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-background text-muted">
                      <span className="text-2xl">&#127925;</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
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

      <MobileNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
      />
    </div>
  );
}
