import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import { getDrinkItems } from "@/app/(admin)/admin/events/actions";
import type { UserRole, UserStatus } from "@/types/database";
import DrinkMenuManager from "@/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager";
import EventQRCode from "@/app/(public)/events/[slug]/menu/EventQRCode";

interface DrinksPageProps {
  params: Promise<{ id: string }>;
}

export default async function DrinksPage({ params }: DrinksPageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
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
    .select("id, title, slug, created_by")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    notFound();
  }

  // Ownership — one call, never a re-inlined comparison. Master short-circuits
  // before the row is considered; a null identity and an unowned row both refuse.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/organizer/events");
  }

  const items = await getDrinkItems(eventId);

  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}/menu`;

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href={`/organizer/events/${eventId}/edit`}
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
          Back to Edit
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Drink Menu</h1>
        <p className="mt-1 text-sm text-muted">{event.title}</p>
      </header>

      <div className="px-6">
        <DrinkMenuManager
          eventId={eventId}
          eventTitle={event.title}
          initialItems={items}
        />

        {/* Menu QR Code */}
        <div className="mt-8">
          <EventQRCode url={menuUrl} eventTitle={event.title} />
        </div>
      </div>

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
