import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import { getDrinkItems } from "@/app/(organizer)/organizer/events/actions";
import type { UserRole, UserStatus } from "@/types/database";
import DrinkMenuManager from "./DrinkMenuManager";
import EventQRCode from "@/app/(public)/events/[slug]/menu/EventQRCode";

interface DrinksPageProps {
  params: Promise<{ id: string }>;
}

export default async function DrinksPage({ params }: DrinksPageProps) {
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
    .select("id, title, slug, created_by")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    notFound();
  }

  // Organizer (not master) can only manage their own events
  if (role === "organizer" && event.created_by !== userId) {
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

      <MobileNav role={role} status={status} />
    </div>
  );
}
