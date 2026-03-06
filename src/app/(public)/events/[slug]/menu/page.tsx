import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getDrinkItems } from "@/app/(organizer)/organizer/events/actions";
import type { UserRole, DrinkItem } from "@/types/database";
import GuestTokenDisplay from "./GuestTokenDisplay";
import GuestLoginBanner from "./GuestLoginBanner";
import EventQRCode from "./EventQRCode";
import PartyDrinkMenu from "./PartyDrinkMenu";

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

  // Check auth for QR code / management visibility
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const headersList = await headers();
  const role = headersList.get("x-user-role") as UserRole | null;

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

  // Determine if the user can manage drinks
  const canManage = role === "master" || role === "organizer";

  // Fetch parties for this event
  const { data: parties } = await serviceClient
    .from("event_parties")
    .select("id, title")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  const partyList = (parties ?? []) as { id: string; title: string }[];

  // Fetch drinks per party
  const drinksByParty = await Promise.all(
    partyList.map(async (party) => {
      if (canManage) {
        const allItems = await getDrinkItems(event.id, party.id);
        return {
          partyId: party.id,
          allItems,
          availableItems: allItems.filter((d: DrinkItem) => d.is_available),
        };
      } else {
        const { data: drinks } = await serviceClient
          .from("drink_items")
          .select("*")
          .eq("event_id", event.id)
          .eq("party_id", party.id)
          .eq("is_available", true)
          .order("sort_order");
        return {
          partyId: party.id,
          allItems: [] as DrinkItem[],
          availableItems: (drinks ?? []) as DrinkItem[],
        };
      }
    })
  );

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
        {canManage && (
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

        {/* Party drink menu with selector */}
        {partyList.length > 0 ? (
          <PartyDrinkMenu
            eventId={event.id}
            eventTitle={event.title}
            parties={partyList}
            drinksByParty={drinksByParty}
            canManage={canManage}
            isAuthenticated={!!user}
          />
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
