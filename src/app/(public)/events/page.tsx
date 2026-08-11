import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import type { UserRole, UserStatus } from "@/types/database";
import EventTabs from "./EventTabs";
import FormatFilterRow from "./FormatFilterRow";

/**
 * DECLARED, not derived — and the declaration is the whole point.
 *
 * This page is already `ƒ` today, because `getAccessContext()` and
 * `createClient()` both read the cookie store and that alone excludes static
 * rendering. So this line changes NOTHING that is measurable right now. What it
 * changes is the reason: the dynamism stops being a side effect of how the
 * client happens to be built and becomes a decision somebody made, which means
 * removing it is visible in a diff instead of happening by accident three
 * refactors from now.
 *
 * Why it matters HERE and not on an arbitrary page: the venue predicate this
 * page depends on has a TIME COMPONENT that fires on its own, at a precise
 * instant, with nobody deploying anything — the reveal window of
 * `public.venue_for_parties`. A copy of this list rendered before that instant
 * and served after it shows the wrong side of a one-way switch, and
 * `venue-secrecy.md`'s *cache e pre-render* gate says a surface that can show a
 * venue is marked dynamic and uncacheable rather than observed to be so.
 */
export const dynamic = "force-dynamic";

/**
 * One venue marker on one card, and NO ADDRESS — which is a security boundary,
 * not a trimmed payload.
 *
 * This shape is handed to `EventTabs`, a `"use client"` component, so every
 * field here is serialised into the RSC payload and travels to every visitor,
 * SECRET NIGHTS INCLUDED, whether or not anything renders it. Until this phase
 * it also carried the street address and the Maps link of the venue, which no
 * surface in `src/` ever rendered: two dead props, readable by anyone who
 * opened `/events` and looked at the document instead of the page.
 *
 * Those two names are deliberately not spelled out anywhere in this file: an
 * automatic check counts their occurrences and expects none, and a mention in
 * prose would read fine to a human while quietly defeating the check.
 *
 * The rule the next person needs, because they will be tempted: if the list one
 * day has to show the address of a NON-secret night, it comes from
 * `public.venue_for_parties` like the name does — through the entitlement check
 * — and it is added here only once something actually renders it. A field
 * declared "for when we need it" is already published.
 */
interface VenueInfo {
  venue_name: string | null;
  venue_text: string | null;
  venue_secret: boolean;
  venue_secret_hint: string | null;
}

/**
 * One marker on one card: the identification colour, the name a visitor may
 * read, and the slug the filter compares against.
 *
 * `slug` is an axis, not a label — it is never rendered. `name` is already the
 * decided string: the venue gate in `transformEvent` chooses between the series
 * public name and the format name BEFORE the value reaches this shape, so no
 * later surface can pick the wider one by accident.
 */
interface CardFormat {
  slug: string;
  name: string;
  color: string;
}

interface EventCard {
  slug: string;
  title: string;
  start_date: string;
  end_date: string;
  venues: VenueInfo[];
  lineup: string[];
  formats: CardFormat[];
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
  const { capabilities, role, status, liveAssignmentCapabilities } =
    await getAccessContext();

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
  //
  // Resolved to the ROW rather than to the slug, because two children need two
  // different halves of it: the chip row compares the slug, and a filtered
  // empty state reads the name back to the visitor. One lookup, one answer —
  // two lookups would be two places for the allow-list to drift apart.
  const activeFormatOption =
    formatOptions.find((f) => f.slug === formatParam) ?? null;
  const activeFormat = activeFormatOption?.slug ?? null;

  let upcoming: EventCard[] = [];
  let past: EventCard[] = [];

  // A refusal FROM THE DATABASE, as opposed to a transport failure. Recorded
  // here and thrown after the catch, because the catch cannot tell them apart
  // and would turn both into "no upcoming events" — see the block below it.
  let queryRefusalCode: string | null = null;

  // Its own variable, and never merged with the one above. A refused catalogue
  // of nights and a refused set of venue names produce two different broken
  // pages, and collapsing distinct causes into one message is the shape
  // `meta-gates.md` forbids by name.
  let venueNamesRefusalCode: string | null = null;

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
    //
    // THE `venues(…)` EMBED IS GONE, and it was not removed for tidiness. After
    // `20260810161000_venues_read_narrowed.sql` an anonymous reader holds no
    // SELECT on `public.venues` at all, and a nested embed the reader is not
    // entitled to DOES NOT RAISE — PostgREST returns it empty, per element. The
    // night would still be here, its venue simply `null`, and every card would
    // quietly lose the name of the bar: no code, no exception, nothing for the
    // `error.code` branch below to catch, and no error tracking in this project
    // to notice afterwards. That is D-37-25's failure shape, and the road to the
    // name of a NON-secret venue that D-37-24 requires has to be BUILT rather
    // than hoped for. It is built below.
    const query = supabase
      .from("events")
      .select("slug, title, date, venue_secret, lineup, is_published, event_parties(id, date, venue_text, sort_order, venue_secret, venue_secret_hint, lineup, format_id, series_id, formats(name, slug, color), party_series!event_parties_series_id_fkey(name))")
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

    // =========================================================================
    // The venue names, resolved BY TITLE — one call for the whole page
    // =========================================================================
    //
    // `public.venue_for_parties(p_party_ids uuid[])` answers, per night, whether
    // THIS caller may be told the venue, and returns nothing for the nights
    // where the answer is no. Absent means NO TITLE: the card then renders
    // `Secret Venue` or the free-text venue, never a stand-in. The five arms of
    // that decision live in the migration, in SQL, once — this page does not
    // re-derive any of them, and must not start.
    //
    // ONE round trip for the entire list, not one per night: this is the most
    // visited public page of the site and it renders every night of every event.
    //
    // `.select("party_id, name")` is a column filter on the result set, and it
    // is the narrowest available form. The function returns six columns — the
    // two identifiers, the name, the slug, the street address and the Maps link
    // — and this page renders exactly one of them. Asking for two means the
    // other four never cross the wire at all, and a value that never leaves the
    // database cannot be leaked by a later edit: the same reasoning that keeps
    // `code` and `number` out of the query above.
    const partyIds: string[] = [];
    for (const e of events ?? []) {
      const parties =
        (e as { event_parties?: { id: string }[] | null }).event_parties ?? [];
      for (const p of parties) partyIds.push(p.id);
    }

    // `Map<partyId, name>` and not an array: the lookup below runs once per
    // night, and the absent key IS the answer rather than a value to test for.
    const venueNames = new Map<string, string>();

    // An empty argument would be a valid call answering nothing. Skipped because
    // a round trip that cannot change the outcome is a cost with no question
    // behind it — not because the empty case is unsafe.
    if (partyIds.length > 0) {
      const { data: venueRows, error: venueError } = await supabase
        .rpc("venue_for_parties", { p_party_ids: partyIds })
        .select("party_id, name");

      // Treated exactly like the events query above, and for the same written
      // reason: a database-level refusal carries a code, will never fix itself,
      // and is thrown past the catch so it reaches the error boundary. Its own
      // category, never folded into `events.query_refused`, because the two say
      // different things to whoever reads them — one means the list failed, this
      // one means the list is intact and every venue name on it is missing.
      //
      // AND IT IS THROWN RATHER THAN SWALLOWED because the silent alternative is
      // the exact defect this plan exists to prevent: a page that renders a
      // complete, healthy-looking list of nights with the venue quietly stripped
      // from all of them is a lie on the shop window that nothing here would
      // ever report.
      //
      // Note for whoever deploys this: until
      // `20260810161000_venues_read_narrowed.sql` is applied, this function DOES
      // NOT EXIST and PostgREST answers `PGRST202` — so this page fails loudly
      // rather than degrading. The code and that migration ship as ONE act.
      if (venueError) {
        console.error(
          `[events.venue_names_refused] ${venueError.code || "transport"}: ${venueError.message}`
        );
        if (venueError.code) venueNamesRefusalCode = venueError.code;
      }

      for (const row of (venueRows ?? []) as {
        party_id: string;
        name: string | null;
      }[]) {
        if (row.name) venueNames.set(row.party_id, row.name);
      }
    }

    function transformEvent(e: Record<string, unknown>): EventCard {
      const evt = e as {
        slug: string;
        title: string;
        date: string;
        venue_secret: boolean;
        lineup: string[] | null;
        is_published: boolean;
        event_parties: { id: string; date: string; venue_text: string | null; sort_order: number; venue_secret: boolean; venue_secret_hint: string | null; lineup: string[] | null; format_id: string | null; series_id: string | null; formats: { name: string; slug: string; color: string } | { name: string; slug: string; color: string }[] | null; party_series: { name: string } | { name: string }[] | null }[];
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
        // The name arrives from the entitlement decision, never from a join this
        // page performed itself. `undefined` — the night is not in the result —
        // means NO TITLE, which is the same answer as "no venue recorded" as far
        // as this card is concerned: `venue_secret` below decides what stands in
        // its place, and it is the STORED FLAG, not a computed verdict (D-36-11).
        const venueName = venueNames.get(p.id) ?? null;
        const key = venueName ?? p.venue_text ?? "";
        if (!key && !p.venue_secret) continue;
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        venues.push({
          venue_name: venueName,
          venue_text: p.venue_text ?? null,
          venue_secret: p.venue_secret ?? false,
          venue_secret_hint: p.venue_secret_hint ?? null,
        });
      }

      // =====================================================================
      // The format axis — one card per event, never one card per night
      // =====================================================================
      //
      // The formats travel the road venues and lineup already travel above:
      // collected from the nights, sorted by `sort_order`, deduplicated. A
      // double bill is one piece with two names, which is how it is
      // communicated, so two nights of the same format produce ONE marker.
      //
      // ── The venue gate on the name, which is not a display choice ─────────
      //
      // A series public name is a STORED STRING PUBLISHED ON EVERY SURFACE ITS
      // NIGHTS TOUCH, so a series named after a venue publishes that venue every
      // time it is rendered. If any night on this card is secret, every marker
      // on it degrades to the format name — which also produces the brand's own
      // string for a double bill without anyone special-casing it.
      //
      // THE PREDICATE IS THE STORED FLAG `venue_secret`, and saying which one is
      // half the decision, because two candidates exist and they are not the
      // same: the stored flag, and the time- and entitlement-dependent verdict
      // `isVenueVisible` returns on the night detail. This phase uses the stored
      // flag ON BOTH PUBLIC SURFACES, because it is the narrower of the two — a
      // night whose venue has since been revealed still shows the format name —
      // and `venue-secrecy.md`'s default-closed gate says the narrower wins.
      // Using a different predicate per surface would make the same night say
      // two different names in two places.
      //
      // `!== false` and not `=== true`: anything that is not a stored `false` —
      // a missing row, a failed join, an absent column — is treated as secret.
      // The fallback is always the narrower string.
      const anyNightSecret = sorted.some((p) => p.venue_secret !== false);

      const seenFormats = new Set<string>();
      const formats: CardFormat[] = [];
      for (const p of sorted) {
        const formatData = p.formats;
        const format = formatData ? (Array.isArray(formatData) ? formatData[0] ?? null : formatData) : null;

        // AN ABSENT FORMAT ROW MEANS NO MARKER, and that is the correct answer
        // rather than a defect to repair. The embed is refused by the same RLS
        // that refuses the catalogue — `formats_select_listed` — so an absent
        // row means an UNLISTED format, which means a format nobody has
        // announced. Rendering a placeholder here would announce it. Do not
        // "fix" this into a fallback label.
        if (!format) continue;
        if (seenFormats.has(format.slug)) continue;
        seenFormats.add(format.slug);

        const seriesData = p.party_series;
        const series = seriesData ? (Array.isArray(seriesData) ? seriesData[0] ?? null : seriesData) : null;

        formats.push({
          slug: format.slug,
          name: anyNightSecret ? format.name : series?.name ?? format.name,
          color: format.color,
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
        formats,
        is_draft: !evt.is_published,
      };
    }

    const allEvents = (events ?? []).map(transformEvent);

    // The filter is applied ON THE ARRAY ALREADY RENDERED, never as a second
    // query. A separate *"does this format have anything?"* read is exactly the
    // shape that would see a draft and turn it into a visible difference —
    // FMT-06 failing in the one place nobody would look for it. Whatever the
    // reader above was refused, this line cannot un-refuse.
    const shownEvents = activeFormat
      ? allEvents.filter((e) => e.formats.some((f) => f.slug === activeFormat))
      : allEvents;

    // An event is upcoming if its end_date >= today
    upcoming = shownEvents
      .filter((e) => e.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    past = shownEvents
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

  // Same placement, same reason, second category. Thrown AFTER the one above
  // because a refused list of nights is the more fundamental failure: if both
  // fire, the first message is the one worth reading.
  if (venueNamesRefusalCode) {
    throw new Error(`[events.venue_names_refused] ${venueNamesRefusalCode}`);
  }

  return (
    <div className="min-h-dvh pb-24">
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        </header>
      </AnimatedSection>

      {/* Above the tab row and outside the swipeable container, because that
          placement IS the semantics: the format filter applies to both halves
          of the time axis, and the tab picks which half. Inside the swipe
          container it would translate with the panels. */}
      <AnimatedSection delay={0.05}>
        <FormatFilterRow
          formats={formatOptions}
          activeFormat={activeFormat}
          activeTab={activeTab}
        />
      </AnimatedSection>

      {/* The two filtered arrays, the tab the address asked for, and the two
          fields of the active format — its slug, so every tab href preserves
          the other axis, and its name, so a filtered empty state can say which
          format it is empty for. Nothing else crosses this boundary: no total,
          no per-format tally, no "how many were hidden". A child cannot render
          a number it was never given. */}
      <AnimatedSection delay={0.1}>
        <EventTabs
          upcoming={upcoming}
          past={past}
          activeTab={activeTab}
          activeFormat={
            activeFormatOption
              ? { slug: activeFormatOption.slug, name: activeFormatOption.name }
              : null
          }
        />
      </AnimatedSection>

      {/* Presentation only. Cast at the page boundary because MobileNav is a
          client component and cannot import the resolver; phase 34 (STAFF-03)
          owns the nav vocabulary. */}
      <MobileNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </div>
  );
}
