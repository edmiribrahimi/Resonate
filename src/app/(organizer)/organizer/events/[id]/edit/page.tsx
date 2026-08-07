import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import EventForm from "@/components/events/EventForm";
import { updateEvent } from "@/app/(organizer)/organizer/events/actions";
import type { UserRole, UserStatus, AccessType } from "@/types/database";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  //
  // This page renders `venue_secret`, `venue_secret_hint` and the reveal settings
  // of every party, so the two gates below are the only thing between an address
  // and a browser. `venue_reveal_sent` is monotone (`meta-gates.md`): a reveal
  // cannot be undone, so neither gate may become easier to pass. Neither does —
  // see the ownership note below for the truth table.
  const ctx = await getAccessContext();

  // `MobileNav` is a `"use client"` component that still takes role and status as
  // props; phase 34 (STAFF-03) converts it. No decision on this page reads them.
  const navRole = ctx.role as UserRole | null;
  const navStatus = ctx.status as UserStatus | null;

  // Defense in depth: may this person reach the organizer area at all.
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, title, description, date, venue_secret, lineup, cover_image, is_published, created_by"
    )
    .eq("id", eventId)
    .single();

  if (error || !event) {
    notFound();
  }

  // Ownership — one call, never a re-inlined comparison.
  //
  // Nobody gains sight of a venue by this change. Master: refused-or-admitted
  // identically, only sooner (step 1, before the row is read). Organizer: admitted
  // only on `created_by === auth.uid()`, where the old line compared against a
  // header the client could send. Row with a null `created_by`: refused, as before
  // — and refused by a stated rule instead of by `null !== ""` happening to differ.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/organizer/events");
  }

  // Fetch parties for this event (with venue join)
  const { data: parties } = await supabase
    .from("event_parties")
    .select("id, title, description, date, time, end_time, menu_closes_at, venue_text, access_type, capacity, sort_order, venue_id, lineup, venue_secret, venue_secret_hint, venue_reveal_hours, venue_reveal_on_purchase, venues(name)")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

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
            venue_secret: event.venue_secret,
            lineup: event.lineup ?? [],
            cover_image: event.cover_image,
            is_published: event.is_published,
            parties: (parties ?? []).map((p: Record<string, unknown>) => {
              const venues = p.venues as { name: string } | { name: string }[] | null;
              const venueName = venues ? (Array.isArray(venues) ? venues[0]?.name : venues.name) : null;
              return {
                id: p.id as string,
                title: p.title as string,
                description: p.description as string | null,
                date: p.date as string,
                time: p.time as string,
                end_time: p.end_time as string | null,
                menu_closes_at: p.menu_closes_at as string | null,
                venue_text: p.venue_text as string | null,
                venue_id: p.venue_id as string | null,
                venue_name: venueName,
                lineup: (p.lineup as string[]) ?? [],
                venue_secret: (p.venue_secret as boolean) ?? false,
                venue_secret_hint: (p.venue_secret_hint as string | null) ?? null,
                venue_reveal_hours: (p.venue_reveal_hours as number | null) ?? null,
                venue_reveal_on_purchase: (p.venue_reveal_on_purchase as boolean) ?? true,
                access_type: p.access_type as AccessType,
                capacity: p.capacity as number | null,
                sort_order: p.sort_order as number,
              };
            }),
          }}
          action={boundUpdateEvent}
          submitLabel="Save Changes"
        />

        <Link
          href={`/organizer/events/${eventId}/drinks`}
          className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:border-accent/50 transition-colors mt-4"
        >
          Manage Drink Menu
        </Link>
      </div>

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
