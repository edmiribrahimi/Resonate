import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import TierSelection from "./TierSelection";
import RsvpButton from "./RsvpButton";
import DrinkMenu from "./DrinkMenu";
import PendingIntentHandler from "./PendingIntentHandler";
import SecretVenueDialog from "./SecretVenueDialog";
import ShareButton from "./ShareButton";
import MediaGallerySection from "./MediaGallerySection";
import { formatTime } from "@/utils/formatTime";
import { CalendarIcon, ClockIcon, MapPinIcon, LockClosedIcon, MusicalNoteIcon } from "@/components/ui/Icons";
import type { UserRole, UserStatus, AccessType } from "@/types/database";

interface PartyVenue {
  id: string;
  name: string;
  slug: string;
  address: string | null;
}

interface PartyWithTiers {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  end_time: string | null;
  venue_text: string | null;
  venue: PartyVenue | null;
  lineup: string[];
  venue_secret: boolean;
  venue_secret_hint: string | null;
  venue_reveal_hours: number | null;
  venue_reveal_on_purchase: boolean;
  access_type: AccessType;
  capacity: number | null;
  sort_order: number;
  tiers: {
    id: string;
    name: string;
    price: number;
    quantity: number | null;
    sold: number;
    available: number | null;
    show_remaining?: boolean;
    starts_at?: string | null;
    expires_at?: string | null;
  }[];
  userTicket: { id: string; tier_id: string } | null;
  userRsvp: { id: string } | null;
  spotsLeft: number | null;
}

function isVenueVisible(opts: {
  partyDate: string;
  partyTime: string;
  venueSecret: boolean;
  hasTicketForParty: boolean;
  hasMasterTicket: boolean;
  isApproved: boolean;
  isOrganizer: boolean;
  isMasterRole: boolean;
  venueRevealHours: number | null;
  venueSecretHint: string | null;
  venueRevealOnPurchase: boolean;
}): { visible: boolean; hint: string | null } {
  if (!opts.venueSecret) return { visible: true, hint: null };
  if (opts.isMasterRole || opts.isOrganizer) return { visible: true, hint: null };
  // Ticket holders see venue immediately only if venue_reveal_on_purchase is true
  if (opts.venueRevealOnPurchase && (opts.hasTicketForParty || opts.hasMasterTicket)) {
    return { visible: true, hint: null };
  }
  const partyStart = new Date(`${opts.partyDate}T${opts.partyTime}`);
  const now = new Date();
  // Past event → visible for approved members
  if (now > partyStart && opts.isApproved) return { visible: true, hint: null };
  // Approved member with ticket/rsvp → visible X hours before
  if (opts.isApproved && (opts.hasTicketForParty || opts.hasMasterTicket)) {
    const hours = opts.venueRevealHours ?? 24;
    const hoursUntil = (partyStart.getTime() - now.getTime()) / 3600000;
    if (hoursUntil <= hours) return { visible: true, hint: null };
  }
  return { visible: false, hint: opts.venueSecretHint };
}

function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return "";
  const sorted = [...new Set(dates)].sort();
  if (sorted.length === 1) {
    return new Date(sorted[0] + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const start = new Date(sorted[0] + "T00:00:00");
  const end = new Date(sorted[sorted.length - 1] + "T00:00:00");
  const startStr = start.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const endStr = end.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${startStr} - ${endStr}`;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Check auth status
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const isApproved = status === "approved";
  const isMasterRole = role === "master";

  // Fetch event by slug — admin/organizer can see drafts too
  const canSeeDrafts = isMasterRole || role === "organizer";
  const eventQuery = supabase
    .from("events")
    .select("id, slug, title, description, date, venue_secret, lineup, cover_image, is_published, early_access_until, created_by")
    .eq("slug", slug);

  if (!canSeeDrafts) {
    eventQuery.eq("is_published", true);
  }

  const { data: event } = await eventQuery.single();

  if (!event) {
    notFound();
  }

  const isOrganizer = !!user && event.created_by === user.id;

  // Service client for counting tickets (anon users can't read tickets via RLS)
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch parties for this event (with venue join)
  const { data: rawParties } = await supabase
    .from("event_parties")
    .select("id, title, description, date, time, end_time, venue_text, lineup, venue_secret, venue_secret_hint, venue_reveal_hours, venue_reveal_on_purchase, access_type, capacity, sort_order, venues(id, name, slug, address)")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  // Check if user has a master ticket (event-level, party_id IS NULL)
  let hasMasterTicket = false;
  let masterTicketId: string | null = null;
  if (isAuthenticated && user) {
    const { data: masterTk } = await supabase
      .from("tickets")
      .select("id")
      .eq("event_id", event.id)
      .is("party_id", null)
      .eq("user_id", user.id)
      .maybeSingle();
    if (masterTk) {
      hasMasterTicket = true;
      masterTicketId = masterTk.id;
    }
  }

  const parties: PartyWithTiers[] = await Promise.all(
    (rawParties ?? []).map(async (rawParty: Record<string, unknown>) => {
      const party = rawParty as { id: string; title: string; description: string | null; date: string; time: string; end_time: string | null; venue_text: string | null; lineup: string[] | null; venue_secret: boolean; venue_secret_hint: string | null; venue_reveal_hours: number | null; venue_reveal_on_purchase: boolean | null; venues: PartyVenue | PartyVenue[] | null; access_type: string; capacity: number | null; sort_order: number };
      const venueData = party.venues;
      const venue: PartyVenue | null = venueData ? (Array.isArray(venueData) ? venueData[0] ?? null : venueData) : null;

      // Fetch tiers for paid parties (party-specific)
      let tiers: PartyWithTiers["tiers"] = [];
      if (party.access_type === "paid") {
        const { data: rawTiers } = await supabase
          .from("ticket_tiers")
          .select("*")
          .eq("party_id", party.id)
          .order("price", { ascending: true });

        tiers = await Promise.all(
          (rawTiers ?? []).map(async (tier: { id: string; name: string; price: number; quantity: number | null; show_remaining?: boolean; starts_at?: string | null; expires_at?: string | null }) => {
            const { count } = await serviceClient
              .from("tickets")
              .select("*", { count: "exact", head: true })
              .eq("tier_id", tier.id);
            const sold = count ?? 0;
            return { ...tier, sold, available: tier.quantity !== null ? tier.quantity - sold : null };
          })
        );
      }

      // Check if user has ticket/rsvp for this party
      let userTicket: { id: string; tier_id: string } | null = null;
      let userRsvp: { id: string } | null = null;

      if (isAuthenticated && user) {
        if (party.access_type === "paid") {
          const { data: ticket } = await supabase
            .from("tickets")
            .select("id, tier_id")
            .eq("party_id", party.id)
            .eq("user_id", user.id)
            .maybeSingle();
          userTicket = ticket;
        }

        if (party.access_type === "free_rsvp") {
          const { data: rsvp } = await supabase
            .from("rsvps")
            .select("id")
            .eq("party_id", party.id)
            .eq("user_id", user.id)
            .maybeSingle();
          userRsvp = rsvp;
        }
      }

      // Calculate spots left
      let spotsLeft: number | null = null;
      if (party.capacity) {
        if (party.access_type === "paid" && tiers.length > 0) {
          const totalSold = tiers.reduce((sum, t) => sum + t.sold, 0);
          spotsLeft = party.capacity - totalSold;
        } else if (party.access_type === "free_rsvp") {
          const { count: rsvpCount } = await serviceClient
            .from("rsvps")
            .select("*", { count: "exact", head: true })
            .eq("party_id", party.id);
          spotsLeft = party.capacity - (rsvpCount || 0);
        }
      }

      return {
        id: party.id,
        title: party.title,
        description: party.description,
        date: party.date,
        time: party.time,
        end_time: party.end_time,
        venue_text: party.venue_text,
        venue,
        lineup: party.lineup ?? [],
        venue_secret: party.venue_secret ?? false,
        venue_secret_hint: party.venue_secret_hint ?? null,
        venue_reveal_hours: party.venue_reveal_hours ?? null,
        venue_reveal_on_purchase: party.venue_reveal_on_purchase ?? true,
        access_type: party.access_type as AccessType,
        capacity: party.capacity,
        sort_order: party.sort_order,
        tiers,
        userTicket,
        userRsvp,
        spotsLeft,
      };
    })
  );

  // Fetch event-level tiers (party_id IS NULL)
  let eventTiers: { id: string; name: string; price: number; quantity: number | null; sold: number; available: number | null; show_remaining?: boolean; starts_at?: string | null; expires_at?: string | null }[] = [];
  {
    const { data: rawEventTiers } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("event_id", event.id)
      .is("party_id", null)
      .order("price", { ascending: true });

    eventTiers = await Promise.all(
      (rawEventTiers ?? []).map(async (tier: { id: string; name: string; price: number; quantity: number | null; show_remaining?: boolean; starts_at?: string | null; expires_at?: string | null }) => {
        const { count } = await serviceClient
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("tier_id", tier.id);
        const sold = count ?? 0;
        return { ...tier, sold, available: tier.quantity !== null ? tier.quantity - sold : null };
      })
    );
  }

  // Check if user has attended this event (scanned at entry)
  let hasAttended = false;
  if (isAuthenticated && user) {
    const { data: attendance } = await supabase
      .from("attendance")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    hasAttended = !!attendance;
  }

  // Fetch approved media for this event
  const { data: approvedMedia } = await supabase
    .from("event_media")
    .select("id, url, type, uploaded_by, created_at")
    .eq("event_id", event.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const mediaItems: { id: string; url: string; type: "photo" | "video"; uploaded_by?: string }[] =
    (approvedMedia ?? []).map((m: { id: string; url: string; type: string; uploaded_by: string }) => ({
      id: m.id,
      url: m.url,
      type: m.type as "photo" | "video",
      uploaded_by: m.uploaded_by,
    }));

  // Fetch available drink items for this event
  const { data: drinkItems } = await supabase
    .from("drink_items")
    .select("*")
    .eq("event_id", event.id)
    .eq("is_available", true)
    .order("sort_order");

  // Fetch artist profiles for lineup names (event-level + party-level)
  const allLineupNames = new Set<string>();
  if (event.lineup) {
    for (const name of event.lineup) allLineupNames.add(name);
  }
  for (const p of parties) {
    for (const name of p.lineup) allLineupNames.add(name);
  }
  const artistSlugs = new Map<string, string>();
  if (allLineupNames.size > 0) {
    const { data: artists } = await supabase
      .from("artists")
      .select("name, slug")
      .in("name", [...allLineupNames]);

    if (artists) {
      for (const a of artists) {
        artistSlugs.set(a.name, a.slug);
      }
    }
  }

  const canUpload = isAuthenticated && ((isApproved && hasAttended) || isOrganizer || isMasterRole);
  const partyDates = parties.map((p) => p.date);
  const dateRangeDisplay = formatDateRange(partyDates);
  const isUpcoming = parties.some((p) => p.date >= new Date().toISOString().split("T")[0]);

  function formatPartyDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="min-h-dvh pb-24">
      {isAuthenticated && <PendingIntentHandler eventSlug={slug} />}

      {/* Cover */}
      <div className="relative px-6 pt-6">
        <Link
          href="/events"
          className="absolute left-10 top-10 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm active:scale-95 active:opacity-80 transition-transform"
        >
          &larr;
        </Link>
        {event.cover_image ? (
          <Image
            src={event.cover_image}
            alt={event.title}
            width={800}
            height={400}
            className="w-full max-h-80 object-cover rounded-2xl"
            priority
          />
        ) : (
          <div className="flex h-48 items-center justify-center rounded-2xl bg-card text-muted">
            <MusicalNoteIcon className="h-12 w-12" />
          </div>
        )}
      </div>

      <div className="px-6 pt-6">
        {/* Date range */}
        <p className="mb-1 text-sm font-medium text-accent">
          {dateRangeDisplay}
        </p>

        {/* Title + Share */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {event.title}
          </h1>
          <ShareButton title={event.title} description={event.description} />
        </div>

        {/* Description */}
        {event.description && (
          <p className="mb-6 text-muted whitespace-pre-line">
            {event.description}
          </p>
        )}

        {/* Lineup (event-level only — party lineups are shown inside each party card) */}
        {(() => {
          const allPartyLineupNames = new Set(parties.flatMap((p) => p.lineup));
          const eventLineup = (event.lineup ?? []) as string[];
          const eventOnlyLineup = eventLineup.filter(
            (name) => !allPartyLineupNames.has(name)
          );
          // Show event-level lineup if it has unique names, or if no parties have lineups and event has lineup
          const lineupToShow: string[] =
            eventOnlyLineup.length > 0
              ? eventOnlyLineup
              : !allPartyLineupNames.size && eventLineup.length
                ? eventLineup
                : [];
          if (lineupToShow.length === 0) return null;
          const unique = [...new Set(lineupToShow)].sort();

          return (
            <div className="mb-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
                Lineup
              </h2>
              <div className="flex flex-wrap gap-2">
                {unique.map((artist: string) => {
                  const slug = artistSlugs.get(artist);
                  return slug ? (
                    <Link
                      key={artist}
                      href={`/artists/${slug}`}
                      className="rounded-full bg-accent/20 px-3 py-1 text-sm text-accent font-medium hover:bg-accent/30 transition-colors active:scale-95 active:opacity-80"
                    >
                      {artist}
                    </Link>
                  ) : (
                    <span
                      key={artist}
                      className="rounded-full bg-accent/20 px-3 py-1 text-sm text-accent font-medium"
                    >
                      {artist}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Event Pass section (event-level tiers) */}
        {eventTiers.length > 0 && (
          <div className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
            {hasMasterTicket ? (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
                <p className="text-sm font-medium text-green-400 mb-3">
                  You have an Event Pass
                </p>
                <Link
                  href={`/tickets/${masterTicketId}`}
                  className="inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:scale-95 active:opacity-80"
                >
                  View Your Event Pass
                </Link>
              </div>
            ) : isUpcoming && (!isAuthenticated || isApproved || status === "pending") ? (
              <TierSelection
                partyId={null}
                tiers={eventTiers}
                label="Event Pass"
                isAuthenticated={isAuthenticated}
                eventSlug={slug}
              />
            ) : null}
          </div>
        )}

        {/* Party sections */}
        {parties.map((party) => {
          const hasTicketForParty = !!party.userTicket;
          const { visible: venueVisible, hint: venueHint } = isVenueVisible({
            partyDate: party.date,
            partyTime: party.time,
            venueSecret: party.venue_secret,
            hasTicketForParty,
            hasMasterTicket,
            isApproved,
            isOrganizer,
            isMasterRole,
            venueRevealHours: party.venue_reveal_hours,
            venueSecretHint: party.venue_secret_hint,
            venueRevealOnPurchase: party.venue_reveal_on_purchase,
          });

          return (
            <div
              key={party.id}
              className="mb-6 rounded-xl border border-card-border bg-card p-4"
            >
              {/* Party header */}
              <div className="mb-3">
                <p className="text-foreground font-medium">{party.title}</p>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon /> {formatPartyDate(party.date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon /> {formatTime(party.time)}
                    {party.end_time && ` - ${formatTime(party.end_time)}`}
                  </span>
                </div>

                {/* Venue display with secret logic */}
                {(party.venue || party.venue_text || party.venue_secret) && (
                  <div className="mt-1">
                    {venueVisible ? (
                      party.venue ? (
                        <Link href={`/venues/${party.venue.slug}`} className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover active:scale-95 active:opacity-80 transition-transform">
                          <MapPinIcon /> {party.venue.name}
                        </Link>
                      ) : party.venue_text ? (
                        <p className="inline-flex items-center gap-1 text-sm text-muted">
                          <MapPinIcon /> {party.venue_text}
                        </p>
                      ) : null
                    ) : party.venue_secret ? (
                      <SecretVenueDialog
                        hint={venueHint}
                        isAuthenticated={isAuthenticated}
                        isApproved={isApproved}
                        revealHours={party.venue_reveal_hours}
                        revealOnPurchase={party.venue_reveal_on_purchase}
                      />
                    ) : null}
                  </div>
                )}

                {party.description && (
                  <p className="mt-2 text-sm text-muted whitespace-pre-line">
                    {party.description}
                  </p>
                )}
              </div>

              {/* Party lineup (inside the card) */}
              {party.lineup.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {[...party.lineup].sort().map((artist) => {
                    const slug = artistSlugs.get(artist);
                    return slug ? (
                      <Link
                        key={artist}
                        href={`/artists/${slug}`}
                        className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs text-accent font-medium hover:bg-accent/30 transition-colors active:scale-95 active:opacity-80"
                      >
                        {artist}
                      </Link>
                    ) : (
                      <span
                        key={artist}
                        className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs text-accent font-medium"
                      >
                        {artist}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Capacity — hidden for past parties */}
              {isUpcoming && party.capacity !== null && party.spotsLeft !== null && (
                <p
                  className={`mb-3 text-sm ${
                    party.spotsLeft <= 0
                      ? "text-red-400 font-medium"
                      : "text-muted"
                  }`}
                >
                  {party.spotsLeft <= 0 ? "Sold out" : `${party.spotsLeft} spots left`}
                </p>
              )}

              {/* Already has ticket for this party */}
              {isAuthenticated && party.userTicket && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
                  <p className="text-sm font-medium text-green-400 mb-3">
                    You have a ticket for this
                  </p>
                  <Link
                    href={`/tickets/${party.userTicket.id}`}
                    className="inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:scale-95 active:opacity-80"
                  >
                    View Your Ticket
                  </Link>
                </div>
              )}

              {/* Master ticket holder sees "covered" badge */}
              {isAuthenticated && hasMasterTicket && !party.userTicket && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-green-400">
                    Covered by your Event Pass
                  </p>
                </div>
              )}

              {/* Paid party: tier selection (upcoming only) */}
              {isUpcoming &&
                !party.userTicket &&
                !hasMasterTicket &&
                party.access_type === "paid" &&
                party.tiers.length > 0 &&
                (!isAuthenticated || isApproved || status === "pending") &&
                (
                  <TierSelection
                    partyId={party.id}
                    tiers={party.tiers}
                    isAuthenticated={isAuthenticated}
                    eventSlug={slug}
                  />
                )}

              {/* Free RSVP party: RSVP button (upcoming only) */}
              {isUpcoming &&
                party.access_type === "free_rsvp" &&
                (!isAuthenticated || isApproved) &&
                (
                  <RsvpButton
                    partyId={party.id}
                    eventId={event.id}
                    hasRsvp={!!party.userRsvp}
                    isAuthenticated={isAuthenticated}
                    eventSlug={slug}
                  />
                )}

              {/* Free public party: badge (upcoming only) */}
              {isUpcoming && party.access_type === "free_public" && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-green-400">
                    Free Entry
                  </p>
                </div>
              )}

            </div>
          );
        })}

        {/* Drinks section — authenticated users only */}
        {isAuthenticated && drinkItems && drinkItems.length > 0 && (
          <div className="mb-6">
            <DrinkMenu eventId={event.id} drinks={drinkItems as import("@/types/database").DrinkItem[]} />
          </div>
        )}

        {/* Event Gallery */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            Gallery
          </h2>
          <MediaGallerySection
            media={mediaItems}
            canUpload={canUpload}
            eventId={event.id}
          />
        </div>
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
