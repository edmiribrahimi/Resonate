import { headers } from "next/headers";
import MobileNav from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import type { UserRole, UserStatus } from "@/types/database";
import EventTabs from "./EventTabs";

interface EventCard {
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string | null;
  location_secret: boolean;
  capacity: number | null;
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

    const [upcomingResult, pastResult] = await Promise.all([
      supabase
        .from("events")
        .select("slug, title, date, time, location, location_secret, capacity")
        .eq("is_published", true)
        .gte("date", today)
        .order("date", { ascending: true }),
      supabase
        .from("events")
        .select("slug, title, date, time, location, location_secret, capacity")
        .eq("is_published", true)
        .lt("date", today)
        .order("date", { ascending: false }),
    ]);

    upcoming = (upcomingResult.data as EventCard[]) || [];
    past = (pastResult.data as EventCard[]) || [];
  } catch {
    // Graceful fallback: render empty state if DB unavailable
    upcoming = [];
    past = [];
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
      </header>

      <EventTabs upcoming={upcoming} past={past} />

      <MobileNav role={role} status={status} />
    </div>
  );
}
