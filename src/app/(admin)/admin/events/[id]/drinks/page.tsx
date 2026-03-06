import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import { getDrinkItems } from "@/app/(organizer)/organizer/events/actions";
import type { UserRole, UserStatus } from "@/types/database";
import DrinkMenuManager from "@/app/(organizer)/organizer/events/[id]/drinks/DrinkMenuManager";
import EventQRCode from "@/app/(public)/events/[slug]/menu/EventQRCode";

interface DrinksPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminDrinksPage({ params }: DrinksPageProps) {
  const { id: eventId } = await params;

  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  if (role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, slug")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    notFound();
  }

  const items = await getDrinkItems(eventId);

  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}/menu`;

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/admin/events"
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Drink Menu</h1>
        <p className="text-sm text-muted mt-1">{event.title}</p>
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
