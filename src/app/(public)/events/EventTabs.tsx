"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { StaggeredList, StaggeredItem } from "@/components/motion/StaggeredList";
import { MapPinIcon, LockClosedIcon } from "@/components/ui/Icons";

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

interface EventTabsProps {
  upcoming: EventCard[];
  past: EventCard[];
  /**
   * The tab `?tab=` asked for, already resolved by the page — `past` only when
   * the value is exactly that, `upcoming` for everything else.
   *
   * Optional, and only the initial value: this component still owns the tab as
   * local state, because that state drives `baseOffset` and therefore the
   * swipe animation, and a gesture that waits on a navigation is a broken
   * gesture on the page that is the shop window. Honouring the parameter on
   * first render is what makes a shared `?tab=past` link open on Past.
   *
   * The other half — writing the address back on every tap and swipe, and
   * resyncing when the prop changes — belongs to plan 36-12, which owns this
   * file. This prop is the seam that lets the format chips preserve the time
   * axis before that lands.
   */
  activeTab?: "upcoming" | "past";
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

function EventList({ events, isPast }: { events: EventCard[]; isPast: boolean }) {
  if (events.length === 0) {
    return (
      <p className="text-muted text-sm py-8 text-center">
        {isPast ? "No past events yet." : "No upcoming events -- check back soon."}
      </p>
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
}: EventTabsProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">(activeTabFromUrl);
  const [dragX, setDragX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const locked = useRef<"horizontal" | "vertical" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Base offset: 0% for upcoming, -50% for past
  const baseOffset = activeTab === "upcoming" ? 0 : -50;

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
      setIsAnimating(true);
      setDragX(0);
      setActiveTab("past");
      setTimeout(() => setIsAnimating(false), 300);
    } else if (dragX > threshold && activeTab === "past") {
      setIsAnimating(true);
      setDragX(0);
      setActiveTab("upcoming");
      setTimeout(() => setIsAnimating(false), 300);
    } else {
      setDragX(0);
    }

    touchStart.current = null;
    locked.current = null;
  }, [dragX, activeTab, isAnimating]);

  const switchTab = useCallback((tab: "upcoming" | "past") => {
    if (isAnimating || tab === activeTab) return;
    setIsAnimating(true);
    setDragX(0);
    setActiveTab(tab);
    setTimeout(() => setIsAnimating(false), 300);
  }, [isAnimating, activeTab]);

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
            <EventList events={upcoming} isPast={false} />
          </div>
          <div className="w-1/2 shrink-0 min-w-0 px-6 pb-4" style={{ minHeight: "60vh" }}>
            <EventList events={past} isPast={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
