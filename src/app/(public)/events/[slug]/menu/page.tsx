import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { UserRole, DrinkItem } from "@/types/database";
import GuestDrinkMenu from "./GuestDrinkMenu";
import GuestTokenDisplay from "./GuestTokenDisplay";
import GuestLoginBanner from "./GuestLoginBanner";
import EventQRCode from "./EventQRCode";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getServiceClient();
  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("slug", slug)
    .single();
  return { title: event ? `${event.title} - Drink Menu` : "Drink Menu" };
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { slug } = await params;
  const { order: orderIdFromUrl } = await searchParams;

  // Service client for public data (no RLS restriction)
  const serviceClient = getServiceClient();

  // Fetch event by slug (must be published)
  const { data: event } = await serviceClient
    .from("events")
    .select("id, title, date, slug, cover_image, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!event) {
    notFound();
  }

  // Fetch available drinks
  const { data: drinks } = await serviceClient
    .from("drink_items")
    .select("*")
    .eq("event_id", event.id)
    .eq("is_available", true)
    .order("sort_order");

  // Check auth for QR code visibility
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const headersList = await headers();
  const role = headersList.get("x-user-role") as UserRole | null;
  const isOrganizerOrAdmin = role === "master" || role === "organizer";

  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${slug}/menu`;

  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-dvh bg-background">
      {/* Header section */}
      <div className="relative">
        {event.cover_image && (
          <div className="h-48 w-full overflow-hidden">
            <img
              src={event.cover_image}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          </div>
        )}
      </div>

      <div
        className={`mx-auto max-w-lg px-4 pb-24 ${
          event.cover_image ? "-mt-12 relative z-10" : "pt-8"
        }`}
      >
        {/* Event info */}
        <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
        <p className="mt-1 text-sm text-muted">{formattedDate}</p>

        {/* QR Code (organizer/admin only) */}
        {isOrganizerOrAdmin && (
          <div className="mt-6">
            <EventQRCode url={menuUrl} eventTitle={event.title} />
          </div>
        )}

        {/* Login suggestion banner (unauthenticated only) */}
        {!user && (
          <div className="mt-6">
            <GuestLoginBanner slug={slug} />
          </div>
        )}

        {/* Drink menu (always shown if drinks exist) */}
        {drinks && drinks.length > 0 ? (
          <div className="mt-6">
            <GuestDrinkMenu
              eventId={event.id}
              drinks={drinks as DrinkItem[]}
            />
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-card-border bg-card p-6 text-center">
            <p className="text-sm text-muted">
              No drinks available for this event.
            </p>
          </div>
        )}

        {/* Guest tokens (unauthenticated only, client-side) */}
        {!user && (
          <div className="mt-6">
            <GuestTokenDisplay
              eventId={event.id}
              initialOrderId={orderIdFromUrl ?? null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
