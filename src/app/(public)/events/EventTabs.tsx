"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StaggeredList, StaggeredItem } from "@/components/motion/StaggeredList";
import { MapPinIcon, LockClosedIcon } from "@/components/ui/Icons";
import FormatMarker from "@/components/formats/FormatMarker";

/**
 * One venue marker on one card — four fields, and the two that are missing are
 * the point of this docblock.
 *
 * THIS FILE IS `"use client"`, so every field declared here is serialised into
 * the RSC payload and shipped to the browser of every visitor, for every night
 * on the page, SECRET ONES INCLUDED — whether or not anything renders it. That
 * is `nextjs-architecture.md`, gate *segreti nel bundle*: everything in a client
 * component ends up in the browser.
 *
 * Until this phase this interface also declared the street address and the Maps
 * link of the venue. Nothing in `src/` ever rendered either of them — the only
 * rendering of a venue on this page is the `venue_secret ? "Secret Venue" :
 * venue_name ?? venue_text` below — so they were dead props that travelled
 * anyway, readable by anyone who opened `/events` and looked at the document
 * rather than at the page. Removing them changes NO PIXEL; it changes what
 * leaves the server.
 *
 * Their names are deliberately not written out here: an automatic check counts
 * occurrences in this file and expects none, and a prose mention would satisfy
 * a reader while defeating the check.
 *
 * The rule for the next person, who will want to show an address here: it does
 * not get declared ahead of a renderer. It comes from
 * `public.venue_for_parties`, through the same per-night entitlement check the
 * name already goes through, and it arrives in the same commit as the thing
 * that displays it. A field added "for when we need it" is already published.
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
 * `name` is already the decided string — the page's venue gate chose between
 * the series public name and the format name BEFORE the value reached this
 * component, so nothing here can pick the wider one by accident. `slug` is an
 * axis and is never rendered as a label.
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
 * The format the address selected, already validated by the page against the
 * active catalogue — so `null` covers absent, unknown, retired and repeated
 * alike, which is what makes this page no oracle for whether a format exists.
 *
 * Two fields and no third: the `name` is only ever read back to a visitor in
 * an empty state, and the `slug` only ever travels in an href. There is no
 * results total here, and there is nothing to derive one from.
 */
interface ActiveFormat {
  slug: string;
  name: string;
}

interface EventTabsProps {
  upcoming: EventCard[];
  past: EventCard[];
  /**
   * The tab `?tab=` asked for, already resolved by the page — `past` only when
   * the value is exactly that, `upcoming` for everything else.
   *
   * It is the INITIAL value and the resync source, not the live one: this
   * component still owns the tab as local state, because that state drives
   * `baseOffset` and therefore the swipe animation, and a gesture that waits
   * on a navigation is a broken gesture on the page that is the shop window.
   * See `goToTab` below for the two halves of every change.
   */
  activeTab?: "upcoming" | "past";
  /**
   * The other axis, so every tab href can preserve it. Picking Past must not
   * silently drop the format a visitor chose, and picking a format must not
   * silently return them to Upcoming — the second half is `FormatFilterRow`'s.
   */
  activeFormat?: ActiveFormat | null;
}

const WEEKDAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WEEKDAYS_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function formatDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    const d = new Date(startDate + "T00:00:00");
    return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
  }
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function EventList({
  events,
  isPast,
  activeFormat,
}: {
  events: EventCard[];
  isPast: boolean;
  activeFormat: ActiveFormat | null;
}) {
  if (events.length === 0) {
    // =======================================================================
    // The four empty states, and the one sentence that had to be chosen
    // =======================================================================
    //
    // COMPUTED FROM THE ARRAY ALREADY ON SCREEN — `events.length === 0` — and
    // never from a second read. A separate *"does this format have anything?"*
    // query is exactly the shape that would see a night nobody has announced
    // and turn it into a visible difference, in the one place where nobody
    // would look for it.
    //
    // The filtered sentence is THE SAME STRING FOR EVERY FORMAT, and that is
    // the whole point of it. A sentence that differed per format — anything
    // warmer for one, anything apologetic for another — would be a tally with
    // one bit of resolution, and would leak the same fact a tally leaks.
    //
    // The wording states what is true, that nothing has been ANNOUNCED,
    // without asserting anything about what exists. Do not "improve" it into
    // a claim about the database.
    //
    // No figure appears here, in any state, in any attribute.
    return (
      <div className="py-8 text-center">
        {activeFormat ? (
          <>
            {/*
              `normal-case` is not decoration here. This is the ONE place on
              this surface where a format name is rendered outside
              `FormatMarker`, which carries that declaration itself — and the
              property is INHERITED, so "we did not ask for a transform" holds
              only until an ancestor asks for one. Two elements on this very
              page transform their labels. A name shouted or flattened here is
              published to every visitor at once.
            */}
            <p className="text-muted text-sm normal-case">
              {isPast
                ? `No past events for ${activeFormat.name}`
                : `Nothing announced for ${activeFormat.name}`}
            </p>
            {/*
              Clears the format and keeps the tab. Deliberately NOT in the
              interaction accent: that hue is reserved for the active tab, the
              lineup pills, the venue link and the focus ring, and the format
              axis never borrows it.
            */}
            <Link
              href={isPast ? "/events?tab=past" : "/events"}
              className="mt-2 inline-block text-sm text-foreground underline underline-offset-4 transition-opacity active:opacity-80"
            >
              Show all events
            </Link>
          </>
        ) : isPast ? (
          <p className="text-muted text-sm">No past events yet</p>
        ) : (
          <>
            <p className="text-muted text-sm">No upcoming events</p>
            <p className="text-muted text-sm">Check back soon.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <StaggeredList className="flex flex-col gap-4">
      {events.map((event) => (
        <StaggeredItem key={event.slug}>
          <Link href={`/events/${event.slug}`}>
            <div
              className={`rounded-2xl border border-card-border p-5 transition-all hover:border-accent/50 active:scale-[0.98] active:opacity-80 ${
                isPast
                  ? "bg-card/50 opacity-70 hover:opacity-100"
                  : "bg-card"
              }`}
            >
              <p className="mb-1 text-sm text-muted">
                {formatDateRange(event.start_date, event.end_date)}
              </p>
              {/*
                The format row sits BETWEEN the date and the title, because the
                format is the source of the name and the title is free text
                beneath it. One marker per distinct format, in the order the
                page collected them (`sort_order`), duplicates already
                collapsed: a double bill is one piece with two names, which is
                how it is communicated, so two nights of one format make one
                marker.

                The name each marker shows was decided by the page's venue
                gate, not here. Nothing on this card renders a stored figure or
                a raw internal code, and neither ever reaches this component:
                the page does not fetch them.
              */}
              {event.formats.length > 0 && (
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {event.formats.map((format, i) => (
                    <span
                      key={format.slug}
                      className="inline-flex items-center gap-1.5"
                    >
                      {/*
                        The joiner is supplied by the UI and is the brand's own
                        form for a double bill. It is `aria-hidden` because it
                        is punctuation between two names, not a name. The
                        lower-case letter that appears INSIDE a series name is
                        a different glyph and comes from the stored string — it
                        is never synthesised here.
                      */}
                      {i > 0 && (
                        <span aria-hidden="true" className="text-xs text-muted">
                          &#215;
                        </span>
                      )}
                      <FormatMarker name={format.name} color={format.color} />
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-semibold">{event.title}</h3>
                {event.is_draft && (
                  <span className="shrink-0 rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                    Draft
                  </span>
                )}
              </div>
              {event.lineup.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {event.lineup.map((artist) => (
                    <span
                      key={artist}
                      className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent font-medium"
                    >
                      {artist}
                    </span>
                  ))}
                </div>
              )}
              {event.venues.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted flex-wrap">
                  {event.venues.map((v, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="mx-0.5">+</span>}
                      {v.venue_secret ? (
                        <><LockClosedIcon /> Secret Venue</>
                      ) : (
                        <><MapPinIcon /> {v.venue_name ?? v.venue_text}</>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        </StaggeredItem>
      ))}
    </StaggeredList>
  );
}

export default function EventTabs({
  upcoming,
  past,
  activeTab: activeTabFromUrl = "upcoming",
  activeFormat = null,
}: EventTabsProps) {
  const router = useRouter();
  // The pending flag is deliberately not read: nothing on this page waits for
  // the navigation, which is the entire reason the navigation is in here.
  const [, startTabNavigation] = useTransition();

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">(activeTabFromUrl);
  const [dragX, setDragX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const locked = useRef<"horizontal" | "vertical" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // The object identity of the prop changes on every render; the slug does
  // not. Depending on the string is what keeps the callbacks below stable.
  const activeFormatSlug = activeFormat?.slug ?? null;

  // Base offset: 0% for upcoming, -50% for past
  const baseOffset = activeTab === "upcoming" ? 0 : -50;

  // What makes a SHARED LINK and the BACK BUTTON work. The address is the
  // source of truth between renders; the local state is the source of truth
  // during a gesture. This is the line that reconciles them, and without it
  // going Back would move the address while the panel stayed put.
  useEffect(() => {
    setActiveTab(activeTabFromUrl);
  }, [activeTabFromUrl]);

  // ===========================================================================
  // Every tab change does BOTH things, and the order is the whole design
  // ===========================================================================
  //
  //   1. `setActiveTab` immediately, so the panel translates at the speed of a
  //      finger. `baseOffset` is derived from this state and from nothing
  //      else, so the animation never waits on anything.
  //   2. `router.replace` INSIDE A TRANSITION, so the address follows without
  //      the navigation blocking the gesture. `/events` is a Request-time
  //      page: a navigation here is a real round trip, and a swipe that waits
  //      on the network is a broken swipe on the page that is the shop window.
  //
  // Both lists stay props, so the navigation does not change what this
  // component holds and the re-render costs nothing on the content.
  //
  // `replace` and NOT `push`: a view toggle is not a destination, and
  // `handleTouchEnd` can fire on every gesture, which would fill the history
  // stack with the same page. The format chips are the opposite case — choosing
  // a format is a deliberate act worth a Back — and they push, from anchors, in
  // `FormatFilterRow`.
  //
  // THE ADDRESS IS WRITTEN HERE AND READ NOWHERE HERE. The tab arrives as a
  // prop, resolved once by the Server Component; this file holds no client-side
  // reader of the query string, deliberately. Reading it here would force a
  // `<Suspense>` boundary and move the read out of the single construction path
  // this phase requires — one query, one path, the same row for everybody.
  //
  // Each href is a template literal AT THE CALL SITE, with a ternary so every
  // branch is one: a bare `string` variable does not compile under this
  // project's typed routes. The other axis is carried through, and a default is
  // never written into the address — the canonical bare address stays
  // `/events`.
  const goToTab = useCallback(
    (tab: "upcoming" | "past") => {
      setIsAnimating(true);
      setDragX(0);
      setActiveTab(tab);
      setTimeout(() => setIsAnimating(false), 300);

      startTabNavigation(() => {
        if (tab === "past") {
          router.replace(
            activeFormatSlug
              ? `/events?format=${encodeURIComponent(activeFormatSlug)}&tab=past`
              : "/events?tab=past",
            { scroll: false }
          );
        } else {
          router.replace(
            activeFormatSlug
              ? `/events?format=${encodeURIComponent(activeFormatSlug)}`
              : "/events",
            { scroll: false }
          );
        }
      });
    },
    [router, activeFormatSlug]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    locked.current = null;
    setDragX(0);
  }, [isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || isAnimating) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    if (!locked.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      locked.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }

    if (locked.current === "horizontal") {
      const resist =
        (dx > 0 && activeTab === "upcoming") ||
        (dx < 0 && activeTab === "past");
      setDragX(resist ? dx * 0.2 : dx);
    }
  }, [activeTab, isAnimating]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || locked.current !== "horizontal" || isAnimating) {
      touchStart.current = null;
      locked.current = null;
      setDragX(0);
      return;
    }

    const threshold = 80;

    if (dragX < -threshold && activeTab === "upcoming") {
      goToTab("past");
    } else if (dragX > threshold && activeTab === "past") {
      goToTab("upcoming");
    } else {
      setDragX(0);
    }

    touchStart.current = null;
    locked.current = null;
  }, [dragX, activeTab, isAnimating, goToTab]);

  const switchTab = useCallback((tab: "upcoming" | "past") => {
    if (isAnimating || tab === activeTab) return;
    goToTab(tab);
  }, [isAnimating, activeTab, goToTab]);

  const viewportWidth = containerRef.current?.offsetWidth ?? 1;
  const dragPercent = (dragX / viewportWidth) * 50;
  const translateX = baseOffset + dragPercent;

  return (
    <div>
      {/* Tab Switcher */}
      <div className="flex gap-6 px-6 mb-6 border-b border-card-border">
        <button
          onClick={() => switchTab("upcoming")}
          className={`pb-3 text-sm font-semibold uppercase tracking-widest transition-all active:scale-95 active:opacity-80 ${
            activeTab === "upcoming"
              ? "text-accent border-b-2 border-accent"
              : "text-muted"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => switchTab("past")}
          className={`pb-3 text-sm font-semibold uppercase tracking-widest transition-all active:scale-95 active:opacity-80 ${
            activeTab === "past"
              ? "text-accent border-b-2 border-accent"
              : "text-muted"
          }`}
        >
          Past
        </button>
      </div>

      {/* Two-panel swipeable content */}
      <div
        ref={containerRef}
        className="overflow-hidden"
        style={{ touchAction: locked.current === "horizontal" ? "none" : "auto" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex"
          style={{
            width: "200%",
            transform: `translateX(${translateX}%)`,
            transition: dragX === 0 ? "transform 300ms ease-out" : "none",
          }}
        >
          <div className="w-1/2 shrink-0 min-w-0 px-6 pb-4" style={{ minHeight: "60vh" }}>
            <EventList events={upcoming} isPast={false} activeFormat={activeFormat} />
          </div>
          <div className="w-1/2 shrink-0 min-w-0 px-6 pb-4" style={{ minHeight: "60vh" }}>
            <EventList events={past} isPast={true} activeFormat={activeFormat} />
          </div>
        </div>
      </div>
    </div>
  );
}
