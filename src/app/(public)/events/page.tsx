import { headers } from "next/headers";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { createClient } from "@/lib/supabase/server";
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

export default async function EventsPage() {
  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  let upcoming: EventCard[] = [];
  let past: EventCard[] = [];

  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Admin/organizer see drafts too
    const canSeeDrafts = role === "master" || role === "organizer";

    const query = supabase
      .from("events")
      .select("slug, title, date, venue_secret, lineup, is_published, event_parties(id, date, venue_text, sort_order, venue_secret, venue_secret_hint, lineup, venues(name, address, google_maps_url))")
      .order("date", { ascending: true });

    if (!canSeeDrafts) {
      query.eq("is_published", true);
    }

    const { data: events } = await query;

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

      <MobileNav role={role} status={status} />
    </div>
  );
}
