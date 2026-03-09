import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import StaffNav from "@/components/staff/StaffNav";
import EventList from "@/components/events/EventList";
import type { UserRole, UserStatus } from "@/types/database";

export default async function OrganizerEventsPage() {
  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const userId = headersList.get("x-user-id") || "";

  // Defense in depth: verify organizer or master access
  if (role !== "organizer" && role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Organizer sees own events; master sees all
  const query = supabase
    .from("events")
    .select("id, title, date, is_published, created_by")
    .order("date", { ascending: false });

  if (role === "organizer") {
    query.eq("created_by", userId);
  }

  const { data: events, error } = await query;

  if (error) {
    return (
      <div className="min-h-dvh pb-24">
        <header className="flex items-center justify-between px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        </header>
        <div className="px-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">
              Failed to load events: {error.message}
            </p>
          </div>
        </div>
        <MobileNav role={role} status={status} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Organizer</h1>
        <Link
          href="/organizer/events/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Create Event
        </Link>
      </header>

      <StaffNav role={role} context="organizer" />

      <div className="px-6">
        <EventList events={events ?? []} />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
