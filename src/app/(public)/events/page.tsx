import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import type { UserRole, UserStatus } from "@/types/database";
import EventTabs from "./EventTabs";

interface VenueInfo {
  venue_name: string | null;
  venue_text: string | null;
  venue_address: string | null;
  venue_google_maps_url: string | null;
  venue_secret: boolean;
  venue_secret_hint: string | null;
}

interface EventCard {
  slug: string;
  title: string;
  start_date: string;
  end_date: string;
  venues: VenueInfo[];
  lineup: string[];
  is_draft?: boolean;
}

/**
 * One active catalogue format, as the chip row and the filter read it.
 *
 * Four fields and no fifth: no `code`, no `number`, and nothing derived from
 * the nights. The Surface Disclosure Matrix says the code and the number never
 * reach a public surface, and the narrowest way to keep that true is not to
 * fetch them — a value that never leaves the database cannot be rendered by a
 * later edit that was not thinking about this rule.
 */
interface FormatOption {
  id: string;
  slug: string;
  name: string;
  color: string;
}

/**
 * The `searchParams` form used by four other pages in this repository
 * (`analytics/compare/page.tsx:15-36`, `members/growth/page.tsx:27-48`), and
 * deliberately not Next's global `PageProps` helper.
 *
 * The index signature is the honest type: a repeated parameter —
 * `?format=a&format=b` — arrives as `string[]`, and that is not a case with a
 * behaviour of its own. It is an unrecognised value, and an unrecognised value
 * means no filter.
 */
interface EventsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  // Role, status and capabilities from the SESSION. Resolved here, OUTSIDE the
  // try/catch below, on purpose: a resolver failure must reach Next's error
  // boundary rather than be turned into an empty event list by that catch.
  // `role` and `status` are presentation — they choose MobileNav's entries.
  const { capabilities, role, status } = await getAccessContext();

  // ===========================================================================
  // The address, read as untrusted input
  // ===========================================================================
  //
  // Two axes, two parameters, and each control preserves the other one. The
  // canonical bare address is `/events`: a default is never written into the
  // URL.
  const params = await searchParams;

  // `typeof … === "string"` and not a cast: an array reaches this line whenever
  // the parameter is repeated, and reading `params.tab[0]` would be inventing a
  // rule nobody wrote. Unrecognised means the default, here and below.
  const tabParam = typeof params.tab === "string" ? params.tab : undefined;
  const activeTab: "upcoming" | "past" = tabParam === "past" ? "past" : "upcoming";
  const formatParam = typeof params.format === "string" ? params.format : undefined;

  // The Supabase client is constructed here, outside the try, for the same
  // reason `getAccessContext()` above is: building it reads the cookie store,
  // which is not the database. The catch below was written for "DB unavailable"
  // and keeps covering exactly that — the query.
  const supabase = await createClient();

  // ===========================================================================
  // The catalogue — one query, one construction path, for everyone
  // ===========================================================================
  //
  // Deliberately OUTSIDE the try/catch below (D-36-13, D-36-16, T-36-11-07).
  // Two reasons, and the second is the one that matters:
  //
  //   * a failed catalogue read swallowed into an empty array would render a
  //     chip row indistinguishable from a healthy one — the silent-failure
  //     shape `meta-gates.md` forbids, and this project has no error tracking,
  //     so nothing else would ever say so;
  //   * the chip row must not vary with the data OR with the viewer. A staff
  //     viewer's *results* include drafts; their *chips* do not. Two
  //     construction paths become one at the first distracted edit, and the one
  //     that survives is always the richer.
  //
  // `listed` and `retired_at` are two different facts (D-36-17): `listed` says
  // a person decided this may be seen, `retired_at` says no new night may be
  // assigned to it. A forward-looking surface wants both. Note that RLS only
  // asks the first — `formats_select_listed` renders as `(listed = true)` — so
  // the `retired_at` filter is this page's, not the database's.
  //
  // No count, no join to the nights, no aggregate. A count is the one channel
  // that reveals an unannounced night WITHOUT SHOWING ANYTHING, so no visual
  // inspection of the page could ever catch one.
  const { data: formatRows, error: formatsError } = await supabase
    .from("formats")
    .select("id, slug, name, color")
    .eq("listed", true)
    .is("retired_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (formatsError) {
    throw new Error(
      `[events.catalogue_read_failed] ${formatsError.code || "transport"}: ${formatsError.message}`
    );
  }

  const formatOptions: FormatOption[] = formatRows ?? [];

  // The filter, validated by MEMBERSHIP OF THE ACTIVE CATALOGUE — an allow-list
  // drawn from the data, which is the narrowest form of validation available
  // here. Unknown, retired, unlisted, repeated or absent all resolve the same
  // way: no filter, the complete list, `All` current.
  //
  // AND NO REDIRECT, deliberately. If an unknown slug redirected and a known
  // one did not, the redirect itself would answer *"is this a real format?"*
  // one probe at a time. Uniform behaviour gives no oracle.
  const activeFormat =
    formatOptions.find((f) => f.slug === formatParam)?.slug ?? null;

  let upcoming: EventCard[] = [];
  let past: EventCard[] = [];

  // A refusal FROM THE DATABASE, as opposed to a transport failure. Recorded
  // here and thrown after the catch, because the catch cannot tell them apart
  // and would turn both into "no upcoming events" — see the block below it.
  let queryRefusalCode: string | null = null;

  try {
    const today = new Date().toISOString().split("T")[0];

    // Admin/organizer see drafts too. This NARROWS A QUERY, so it is a
    // data-access decision and becomes a capability question. `staff.manage`
    // is byte-equal to the `role === "master" || role === "organizer"` it
    // replaces, so no role's reach changes.
    //
    // MEASURED, and quoted rather than re-derived (33-RESEARCH.md): forging a
    // master identity header on this page returns the SAME two event slugs as
    // an anonymous request — AND STILL DOES WITH THE MIDDLEWARE STRIP REMOVED
    // — because RLS on `public.events` refuses unpublished rows to `anon`
    // regardless of what `canSeeDrafts` decides. So this conversion closes a
    // COUPLING, not a hole, and `/events` IS NOT A VALID CRITERION-2 PROBE:
    // it reports "no difference" because it cannot see one. That is the D-32-I
    // shape — a probe never shown to fire proves nothing — and it is written
    // here so the next person does not verify the phase against this page and
    // collect a meaningless green.
    //
    // THE FORMAT FILTER INHERITS THAT PROBLEM EXACTLY, and it is written here
    // rather than left to be rediscovered: a filter that does not show a draft
    // has not been shown to be INCAPABLE of showing one. `/events` reports "no
    // difference" because it cannot see one, so nothing observed on this page
    // proves FMT-06. The proof is the written manual procedure of plan 36-13,
    // run against a night seeded unpublished on purpose. What this page can do
    // — and what it does below — is leave the one channel that could leak a
    // draft WITHOUT showing it, a count, nowhere to appear.
    const canSeeDrafts = capabilities.has(CAP.STAFF_MANAGE);

    // The two embeds are the format axis, and the `!event_parties_series_id_fkey`
    // hint is NOT decoration. MEASURED against production with the anonymous key
    // on 2026-08-10: the unqualified form returns `HTTP 300 PGRST201`, *"more
    // than one relationship was found for 'event_parties' and 'party_series'"* —
    // because the migration declares two, the plain `series_id` reference and the
    // composite `event_parties_series_format_fk`. A green build says nothing about
    // this: no Supabase client here is parameterised with `Database`.
    //
    // Neither `code` nor `number` is selected, on either side. The disclosure
    // matrix says never, on any public surface, and a column that is not fetched
    // cannot be rendered by an edit that was not thinking about the rule.
    const query = supabase
      .from("events")
      .select("slug, title, date, venue_secret, lineup, is_published, event_parties(id, date, venue_text, sort_order, venue_secret, venue_secret_hint, lineup, format_id, series_id, venues(name, address, google_maps_url), formats(name, slug, color), party_series!event_parties_series_id_fkey(name))")
      .order("date", { ascending: true });

    if (!canSeeDrafts) {
      query.eq("is_published", true);
    }

    const { data: events, error: eventsError } = await query;

    // This error was DISCARDED before this phase, and adding two embeds is what
    // makes discarding it untenable: PostgREST answers a malformed or refused
    // embed with `data: null` and no exception, so the catch below never fires
    // and the page renders "no upcoming events" — a healthy-looking lie, on the
    // shop window, that nothing in this project would ever report
    // (`meta-gates.md`, zero silent failures; there is no error tracking here,
    // so a log alone reaches nobody).
    //
    // The two causes are separated because they deserve opposite answers. A
    // database-level refusal carries a SQLSTATE or a `PGRST…` code: it is a
    // defect, it will never fix itself, and it is thrown after the catch so it
    // reaches Next's error boundary. A transport failure carries no code, and
    // that is the transient case the catch was written for — its behaviour is
    // left exactly as it was.
    if (eventsError) {
      console.error(
        `[events.query_refused] ${eventsError.code || "transport"}: ${eventsError.message}`
      );
      if (eventsError.code) queryRefusalCode = eventsError.code;
    }

    function transformEvent(e: Record<string, unknown>): EventCard {
      const evt = e as {
        slug: string;
        title: string;
        date: string;
        venue_secret: boolean;
        lineup: string[] | null;
        is_published: boolean;
        event_parties: { id: string; date: string; venue_text: string | null; sort_order: number; venue_secret: boolean; venue_secret_hint: string | null; lineup: string[] | null; venues: { name: string; address: string | null; google_maps_url: string | null } | { name: string; address: string | null; google_maps_url: string | null }[] | null }[];
      };
      const parties = evt.event_parties ?? [];
      const sortedDates = parties.map((p) => p.date).sort();
      const startDate = sortedDates[0] ?? evt.date;
      const endDate = sortedDates[sortedDates.length - 1] ?? evt.date;

      // Build deduplicated venues array from all parties
      const seen = new Set<string>();
      const venues: VenueInfo[] = [];
      const sorted = [...parties].sort((a, b) => a.sort_order - b.sort_order);
      for (const p of sorted) {
        const venueData = p.venues;
        const venue = venueData ? (Array.isArray(venueData) ? venueData[0] ?? null : venueData) : null;
        const key = venue?.name ?? p.venue_text ?? "";
        if (!key && !p.venue_secret) continue;
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        venues.push({
          venue_name: venue?.name ?? null,
          venue_text: p.venue_text ?? null,
          venue_address: venue?.address ?? null,
          venue_google_maps_url: venue?.google_maps_url ?? null,
          venue_secret: p.venue_secret ?? false,
          venue_secret_hint: p.venue_secret_hint ?? null,
        });
      }

      // Collect unique lineup from parties, fallback to event-level
      const allLineup = new Set<string>();
      for (const p of sorted) {
        for (const a of p.lineup ?? []) allLineup.add(a);
      }
      if (allLineup.size === 0 && evt.lineup) {
        for (const a of evt.lineup) allLineup.add(a);
      }

      return {
        slug: evt.slug,
        title: evt.title,
        start_date: startDate,
        end_date: endDate,
        venues,
        lineup: [...allLineup].sort(),
        is_draft: !evt.is_published,
      };
    }

    const allEvents = (events ?? []).map(transformEvent);

    // An event is upcoming if its end_date >= today
    upcoming = allEvents
      .filter((e) => e.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    past = allEvents
      .filter((e) => e.end_date < today)
      .sort((a, b) => b.start_date.localeCompare(a.start_date));
  } catch {
    // Graceful fallback: render empty state if DB unavailable
    upcoming = [];
    past = [];
  }

  // Outside the catch on purpose — inside it, this throw would be caught by the
  // very block whose behaviour it exists to refuse.
  if (queryRefusalCode) {
    throw new Error(`[events.query_refused] ${queryRefusalCode}`);
  }

  return (
    <div className="min-h-dvh pb-24">
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <EventTabs upcoming={upcoming} past={past} />
      </AnimatedSection>

      {/* Presentation only. Cast at the page boundary because MobileNav is a
          client component and cannot import the resolver; phase 34 (STAFF-03)
          owns the nav vocabulary. */}
      <MobileNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
      />
    </div>
  );
}
