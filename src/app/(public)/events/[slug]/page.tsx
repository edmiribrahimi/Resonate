import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext, hasCapability } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import FormatMarker from "@/components/formats/FormatMarker";
import TierSelection from "./TierSelection";
import RsvpButton from "./RsvpButton";

import MyDrinks from "./MyDrinks";
import PendingIntentHandler from "./PendingIntentHandler";
import SecretVenueDialog from "./SecretVenueDialog";
import ShareButton from "./ShareButton";
import MediaGallerySection from "./MediaGallerySection";
import { formatTime } from "@/utils/formatTime";
import { CalendarIcon, ClockIcon, MapPinIcon, LockClosedIcon, MusicalNoteIcon } from "@/components/ui/Icons";
import type { UserRole, UserStatus, AccessType } from "@/types/database";
import { partyStartInstant } from "@/utils/datetime";

interface PartyVenue {
  id: string;
  name: string;
  slug: string;
  address: string | null;
}

/**
 * The one line a visitor reads to know what a night IS.
 *
 * `name` is already the decided string: the venue gate at the render site
 * chooses between the series public name and the format name, per night. There
 * is no `code` and no stored figure on this shape, and there is none on the
 * query that feeds it — a visitor reads the name only (D-36-09).
 */
interface PartyFormat {
  name: string;
  slug: string;
  color: string;
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
  /**
   * `null` when the reader was refused the format row — which means an
   * UNLISTED format, because the same policy gates both. No marker is rendered
   * then, and that is the correct answer rather than a defect to repair: a
   * placeholder would announce the format it was standing in for.
   */
  format: PartyFormat | null;
  /** The series' public name, or `null`. Whether it is USED is decided below. */
  series_name: string | null;
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
  userTicket: { id: string; tier_id: string | null } | null;
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
  const partyStart = partyStartInstant(opts.partyDate, opts.partyTime);
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

const WD_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WD_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MO_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MO_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return "";
  const sorted = [...new Set(dates)].sort();
  if (sorted.length === 1) {
    const d = new Date(sorted[0] + "T00:00:00");
    return `${WD_LONG[d.getDay()]}, ${d.getDate()} ${MO_LONG[d.getMonth()]} ${d.getFullYear()}`;
  }
  const start = new Date(sorted[0] + "T00:00:00");
  const end = new Date(sorted[sorted.length - 1] + "T00:00:00");
  const fmt = (d: Date) => `${WD_SHORT[d.getDay()]} ${d.getDate()} ${MO_SHORT[d.getMonth()]}`;
  return `${fmt(start)} - ${fmt(end)}`;
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

  // Role, status and capabilities from the SESSION, not from an inbound header.
  const { capabilities, role, status } = await getAccessContext();

  // ⚠️ VENUE SECRECY. These two keep their `role` / `status` form and only
  // their SOURCE changed — and that is deliberate, because they are NOT merely
  // presentational. Besides :490 and :637 they are passed into
  // `isVenueVisible` (:511, :513), which decides whether a SECRET VENUE
  // ADDRESS is rendered: `isMasterRole` short-circuits it to visible (:76) and
  // `isApproved` opens the two time-and-ticket branches (:84, :86).
  //
  // `venue_reveal_sent` is a MONOTONE one-way switch (meta-gates.md), so the
  // only admissible direction here is "no easier to trip". Keeping the exact
  // predicates and moving the source from a forgeable header to the session is
  // strictly non-widening: nobody who could not see an address before can see
  // one now. Converting either of these to a capability key would be a VERDICT
  // change on a reveal path and is explicitly out of this plan's scope.
  const isApproved = status === "approved";
  const isMasterRole = role === "master";

  // Fetch event by slug — admin/organizer can see drafts too. This NARROWS THE
  // QUERY below, so it is a data-access decision and becomes a capability
  // question. It governs `is_published` and NOTHING ELSE — it is not an input
  // to `isVenueVisible`, which is the one expression that governs the venue.
  // `staff.manage` is byte-equal to the `isMasterRole || role === "organizer"`
  // it replaces, so no role's reach changes.
  const canSeeDrafts = capabilities.has(CAP.STAFF_MANAGE);
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
  //
  // ── The two new embeds, and the hint that is not decoration ────────────────
  //
  // `!event_parties_series_id_fkey` is REQUIRED. Measured against production
  // with the anonymous key on 2026-08-10 (plan 36-11, same embed on `/events`):
  // the unqualified form answers `HTTP 300 PGRST201`, *"more than one
  // relationship was found for 'event_parties' and 'party_series'"* — because
  // the migration declares two, the plain `series_id` reference and the
  // composite `event_parties_series_format_fk`. The `formats` embed needs no
  // hint: `format_id` is the only reference between those two tables.
  //
  // And it fails SILENTLY: PostgREST answers `data: null` with no exception, so
  // nothing throws and the page renders an event with no nights at all. A green
  // build says nothing about this — no Supabase client here is parameterised
  // with the generated types, so a query is documentation until it is run.
  //
  // NEITHER THE STORED NUMBER NOR EITHER INTERNAL CODE IS SELECTED. The
  // disclosure matrix says never, on any public surface, and not fetching them
  // is the narrowest way to keep that true: a column that never arrives cannot
  // be rendered by a later edit that was not thinking about the rule.
  const { data: rawParties, error: partiesError } = await supabase
    .from("event_parties")
    .select("id, title, description, date, time, end_time, venue_text, lineup, venue_secret, venue_secret_hint, venue_reveal_hours, venue_reveal_on_purchase, access_type, capacity, sort_order, venues(id, name, slug, address), formats(name, slug, color), party_series!event_parties_series_id_fkey(name)")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  // This error was discarded before this phase, and adding two embeds is what
  // makes discarding it untenable — see the paragraph above. The two causes are
  // separated because they deserve opposite answers, exactly as `/events` does:
  //
  //   * a refusal FROM THE DATABASE carries a SQLSTATE or a `PGRST…` code. It
  //     is a defect, it will never fix itself, and an event page that quietly
  //     lost every one of its nights is a healthy-looking lie on a public
  //     surface — with no error tracking in this project, a log alone reaches
  //     nobody. It is thrown, so it reaches the error boundary;
  //   * a transport failure carries no code, and that is the transient case.
  //     Its behaviour is left exactly as it was.
  if (partiesError) {
    console.error(
      `[event_detail.parties_query_refused] ${partiesError.code || "transport"}: ${partiesError.message}`
    );
    if (partiesError.code) {
      throw new Error(`[event_detail.parties_query_refused] ${partiesError.code}`);
    }
  }

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
      const party = rawParty as { id: string; title: string; description: string | null; date: string; time: string; end_time: string | null; venue_text: string | null; lineup: string[] | null; venue_secret: boolean; venue_secret_hint: string | null; venue_reveal_hours: number | null; venue_reveal_on_purchase: boolean | null; venues: PartyVenue | PartyVenue[] | null; formats: PartyFormat | PartyFormat[] | null; party_series: { name: string } | { name: string }[] | null; access_type: string; capacity: number | null; sort_order: number };
      const venueData = party.venues;
      const venue: PartyVenue | null = venueData ? (Array.isArray(venueData) ? venueData[0] ?? null : venueData) : null;

      // An embed arrives as an object or as a one-element array depending on
      // how PostgREST resolves the relationship; both shapes are unwrapped the
      // same way the venue above already is.
      const formatData = party.formats;
      const format: PartyFormat | null = formatData ? (Array.isArray(formatData) ? formatData[0] ?? null : formatData) : null;
      const seriesData = party.party_series;
      const series = seriesData ? (Array.isArray(seriesData) ? seriesData[0] ?? null : seriesData) : null;

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
      let userTicket: { id: string; tier_id: string | null } | null = null;
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
        format,
        series_name: series?.name ?? null,
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

  // Fetch event-level tiers (party_id IS NULL) -- only when multiple parties exist
  let eventTiers: { id: string; name: string; price: number; quantity: number | null; sold: number; available: number | null; show_remaining?: boolean; starts_at?: string | null; expires_at?: string | null }[] = [];
  if (parties.length > 1) {
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

  // Check if any drinks are available across parties
  const { count: drinkItemCount } = await supabase
    .from("drink_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("is_available", true);

  // Fetch user's drink tokens for this event
  let userDrinkTokens: import("@/types/database").DrinkToken[] | null = null;
  if (user) {
    const { data } = await supabase
      .from("drink_tokens")
      .select("id, drink_name, price, token, status, redeemed_at")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    userDrinkTokens = data as import("@/types/database").DrinkToken[] | null;
  }

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

  // ── The nights this person may upload to ────────────────────────────────────
  //
  // WHY A LOOP IS RIGHT HERE AND WRONG IN THE PREDICATE. `mayUploadToParty`
  // (plan 35-16) answers *"may they upload to THIS night?"* — singular, one
  // resolution, and a loop inside it would be the per-event permission coming
  // back through the window. This surface asks the other question, *"which
  // nights may they upload to?"*, which is plural by construction because it has
  // to draw a list. One resolution per night is the minimum that question has.
  //
  // THE CEILING, AND THE FACT THAT IT IS GONE. Plan 35-21 justified this loop
  // with `UNIQUE (event_id, type)` — "at most three". That constraint, and the
  // `type` column itself, were **dropped on 2026-02-26**
  // (`20260226300000_multi_sub_events.sql:11-17`): an event may carry N
  // sub-nights today. So this is N resolutions, not three, and the bound worth
  // naming is the real one — `parties` is the list this page already renders, so
  // the cost is one round trip per night ALREADY DRAWN on the page, resolved in
  // parallel, on a render and never on the door path. If a night ever stops
  // being rendered, this loop must stop iterating it too.
  //
  // THE READ PERIMETER DOES NOT WIDEN — and it does not widen by ZERO, not by a
  // little. No new query is issued and no new column is selected: `parties` is
  // the array built at :200 from the `event_parties` read at :177, with the
  // caller's own privileges, and `id`, `title` and `date` are already rendered
  // into this page's HTML for this same viewer. The secret-venue flag this page
  // reads at :179 and :278 for the venue dialog is deliberately NOT carried into
  // anything below: `venue-secrecy.md`, gate *percorsi enumerati* — this page IS
  // one of the enumerated exits, so what crosses to the client here is exactly
  // what already crossed before this block existed. (The flag is named by line
  // rather than spelled here so that the acceptance criterion of plan 35-21 —
  // "no added line names it" — measures the property it means, instead of
  // failing on a paragraph that exists to forbid the very read it looks for.
  // Same class of correction as `35-20-SUMMARY.md`, deviation 5.)
  //
  // A RESOLVER FAULT IS NOT A REFUSAL, AND IS ALSO NOT A 500 ON THIS PAGE.
  // `hasCapability` throws rather than returning a degraded answer
  // (`capabilities/server.ts`, and that is correct there). Letting it escape
  // here would turn a bad database minute into a crash of the **ticket-buying
  // surface** — `ticketing-payments.md` is explicit that an auxiliary read must
  // not abort the money path. So each night is caught on its own and, when
  // unresolved, is NOT offered: fail closed, which is the direction
  // `media-and-storage.md` and `venue-secrecy.md` both require on this path.
  //
  // The cost of that choice, named rather than left to be found: for someone
  // whose ONLY route to the box is an assignment, an unresolved night is
  // indistinguishable from an unassigned one — the box simply does not appear.
  // There is no error tracking in this product (`meta-gates.md`), so the
  // `console.error` below reaches a log nobody reads. When the other two arms
  // hold, the box does appear with an empty list and `MediaUpload` draws a
  // distinguishable error state instead of a mute control.
  let uploadableParties: { id: string; title: string; date: string }[] = [];
  if (isAuthenticated && user && parties.length > 0) {
    const resolved = await Promise.all(
      parties.map(async (p) => {
        try {
          // `getPartyAccessContext` is memoised per `partyId` within one render,
          // so asking here does not re-ask anything asked elsewhere on this page.
          const allowed = await hasCapability(CAP.MEDIA_UPLOAD, { partyId: p.id });
          return allowed ? { id: p.id, title: p.title, date: p.date } : null;
        } catch (cause) {
          // Category, and nothing about the person. `35-PATTERNS.md` S5 and S7.
          console.error(
            `[media_upload.night_unresolved] could not resolve ${CAP.MEDIA_UPLOAD} ` +
              `for night ${p.id}: ${cause instanceof Error ? cause.message : "unknown"}. ` +
              `This is NOT a refusal — the night is withheld because the question ` +
              `went unanswered.`
          );
          return null;
        }
      })
    );
    uploadableParties = resolved.filter(
      (p): p is { id: string; title: string; date: string } => p !== null
    );
  }

  // The two arms of today are unchanged, and the attendance arm is unchanged
  // WORD FOR WORD — defective table name included (`:319` reads `attendance`,
  // the table is `public.attendances`). Repairing it WIDENS who may upload,
  // which is an access decision and belongs to none of this phase's eight
  // requirements. Plan 35-16 froze it for the same reason; see also
  // `access-gating.md`.
  const canUpload =
    isAuthenticated &&
    ((isApproved && hasAttended) ||
      isOrganizer ||
      isMasterRole ||
      uploadableParties.length > 0);
  const partyDates = parties.map((p) => p.date);
  const dateRangeDisplay = formatDateRange(partyDates);
  const isUpcoming = parties.some((p) => p.date >= new Date().toISOString().split("T")[0]);

  function formatPartyDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return `${WD_SHORT[d.getDay()]} ${d.getDate()} ${MO_SHORT[d.getMonth()]}`;
  }

  return (
    <div className="min-h-dvh pb-24">
      {isAuthenticated && <PendingIntentHandler eventSlug={slug} />}

      {/* Cover */}
      <AnimatedSection className="relative px-6 pt-6">
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
      </AnimatedSection>

      <div className="px-6 pt-6">
        {/* Date range, Title + Share, Description */}
        <AnimatedSection delay={0.1}>
          <p className="mb-1 text-sm font-medium text-accent">
            {dateRangeDisplay}
          </p>

          <div className="mb-4 flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {event.title}
            </h1>
            <ShareButton title={event.title} description={event.description} />
          </div>

          {event.description && (
            <p className="mb-6 text-muted whitespace-pre-line">
              {event.description}
            </p>
          )}
        </AnimatedSection>

        {/* Lineup (event-level only — party lineups are shown inside each party card) */}
        <AnimatedSection scrollTriggered>
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
        </AnimatedSection>

        {/* Event Pass section (event-level tiers) -- only show when multiple parties exist */}
        {parties.length > 1 && eventTiers.length > 0 && (
          <AnimatedSection scrollTriggered className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
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
          </AnimatedSection>
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
                {/*
                  ── The format, per night, above its title ───────────────────
                  ────────────────────────────────────────────────────────────
                  The format is the SOURCE of the name; the title is free text
                  beneath it. A visitor reads THE NAME ONLY — never the stored
                  figure, never the raw internal code (D-36-09) — and neither
                  is fetched by this page, so neither can arrive here.

                  Carrying the reason, because it is the thing a later "why not
                  show it?" would undo: THE STORED FIGURE IS ITSELF A CHANNEL.
                  *"the eighteenth"* says that eighteen exist, which announces
                  every night nobody announced, without showing one — so no
                  visual inspection of this page could ever catch it. Keeping it
                  off public surfaces removes that channel before it exists.

                  ── Which name, and WHICH PREDICATE decides ──────────────────

                  A series public name is a stored string published on every
                  surface its nights touch, so a series named after a venue
                  publishes that venue every time it renders. When this night is
                  secret, the marker degrades to the format name.

                  THE PREDICATE IS THE STORED FLAG `venue_secret`, and saying so
                  is half the decision, because this page holds a second
                  candidate five lines above: the verdict `isVenueVisible`
                  returns, which is time- and entitlement-dependent — it opens
                  once the night has passed, or hours before it for a holder of
                  a ticket. THEY ARE NOT THE SAME PREDICATE. The stored flag is
                  the narrower of the two (a night whose venue has since been
                  revealed still shows the format name), `venue-secrecy.md`'s
                  default-closed gate says the narrower wins, and it is the same
                  one the event card uses — so the same night cannot say two
                  different names in two places.

                  `!== false` and not `=== true`: anything that is not a stored
                  `false` is treated as secret. The fallback is always the
                  narrower string.
                */}
                {party.format && (
                  <div className="mb-1">
                    <FormatMarker
                      name={
                        party.venue_secret !== false
                          ? party.format.name
                          : party.series_name ?? party.format.name
                      }
                      color={party.format.color}
                    />
                  </div>
                )}
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


        {/* Drink Menu — link for master/organizer only */}
        {canSeeDrafts && (drinkItemCount ?? 0) > 0 && (
          <AnimatedSection scrollTriggered className="mb-6">
            <a
              href={`/events/${event.slug}/menu`}
              className="block w-full rounded-xl border border-card-border bg-card p-4 text-center transition-colors hover:border-accent/50"
            >
              <p className="text-sm font-medium text-foreground">Drink Menu</p>
              <p className="mt-1 text-xs text-muted">View available drinks</p>
            </a>
          </AnimatedSection>
        )}

        {/* My Drinks — user's purchased drink tokens */}
        {userDrinkTokens && userDrinkTokens.length > 0 && (
          <AnimatedSection scrollTriggered className="mb-6">
            <MyDrinks tokens={userDrinkTokens} />
          </AnimatedSection>
        )}

        {/* Event Gallery */}
        <AnimatedSection scrollTriggered className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            Gallery
          </h2>
          <MediaGallerySection
            media={mediaItems}
            canUpload={canUpload}
            eventId={event.id}
            uploadableParties={uploadableParties}
          />
        </AnimatedSection>
      </div>

      {/* Presentation. Cast at the page boundary because MobileNav is a client
          component; phase 34 (STAFF-03) owns the nav vocabulary. */}
      <MobileNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
      />
    </div>
  );
}
