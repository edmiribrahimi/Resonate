import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import EventForm from "@/components/events/EventForm";
import { updateEvent } from "@/app/(organizer)/organizer/events/actions";
import type { UserRole, UserStatus } from "@/types/database";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id: eventId } = await params;

  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const userId = headersList.get("x-user-id") || "";

  // Defense in depth: verify organizer or master access
  if (role !== "organizer" && role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, title, description, date, time, location, location_secret, lineup, cover_image, capacity, is_published, created_by"
    )
    .eq("id", eventId)
    .single();

  if (error || !event) {
    notFound();
  }

  // Organizer (not master) can only edit their own events
  if (role === "organizer" && event.created_by !== userId) {
    redirect("/organizer/events");
  }

  // Create a bound action that includes the eventId
  async function boundUpdateEvent(
    formData: FormData
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    "use server";
    return updateEvent(eventId, formData);
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
      </header>

      <div className="px-6">
        <EventForm
          initialData={{
            id: event.id,
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time,
            location: event.location,
            location_secret: event.location_secret,
            lineup: event.lineup ?? [],
            cover_image: event.cover_image,
            capacity: event.capacity,
            is_published: event.is_published,
          }}
          action={boundUpdateEvent}
          submitLabel="Save Changes"
        />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
