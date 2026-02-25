import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import EventList from "@/components/events/EventList";
import type { UserRole, UserStatus } from "@/types/database";

// Extract creator name from Supabase join result
// The join may return a single object or an array depending on FK detection
function extractCreatorName(creator: unknown): string | null {
  if (!creator) return null;
  if (Array.isArray(creator)) {
    const first = creator[0] as { full_name?: string } | undefined;
    return first?.full_name || null;
  }
  return (creator as { full_name?: string }).full_name || null;
}

export default async function AdminEventsPage() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  // Defense in depth: verify master access
  if (role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: rawEvents, error } = await supabase
    .from("events")
    .select(
      "id, title, date, is_published, capacity, created_by, creator:profiles!created_by(full_name)"
    )
    .order("date", { ascending: false });

  if (error) {
    return (
      <div className="min-h-dvh pb-24">
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Event Management
          </h1>
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

  // Flatten the creator join data
  const events = (rawEvents ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    is_published: e.is_published,
    capacity: e.capacity,
    created_by: e.created_by,
    creator_name: extractCreatorName(e.creator),
  }));

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Event Management
        </h1>
      </header>

      <div className="px-6">
        <EventList events={events} showCreator={true} basePath="/admin/events" />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
