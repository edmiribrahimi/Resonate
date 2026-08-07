import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import { getServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { getDrinkItems } from "@/app/(organizer)/organizer/events/actions";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import type { UserRole, UserStatus, DrinkItem } from "@/types/database";
import GuestTokenDisplay from "./GuestTokenDisplay";
// Login/signup invite for guests temporarily disabled — re-enable by
// restoring this import and the <GuestLoginBanner /> render below.
// import GuestLoginBanner from "./GuestLoginBanner";
import UserTokenDisplay from "./UserTokenDisplay";
import EventQRCode from "./EventQRCode";
import PartyDrinkMenu from "./PartyDrinkMenu";

// Inter — neutral, highly readable in low-light venues. Scoped to the menu
// page only so the rest of the app keeps Orbitron as its display font.
const menuFont = Inter({ subsets: ["latin"], display: "swap" });

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

  // Service client for public data (no RLS restriction). RETAINED, and which
  // client reads what is unchanged by this conversion: the page must render for
  // a logged-out visitor, and `events` / `event_parties` / `drink_items` are
  // not readable by `anon` under RLS. `access-gating.md`, gate *service role*:
  // a service-role read bypasses every policy, so on this path THE CODE IS THE
  // ONLY BOUNDARY — there is no second one behind it. That is precisely why
  // `canManage` below must be decided from the session and never from an
  // inbound header, which any client can send.
  const serviceClient = getServiceClient();

  // Identity, role, status and capabilities from the SESSION. One round trip,
  // memoised by `cache()` for this render. `userId` is the caller's own
  // `auth.uid()`, derived inside Postgres from the JWT, and is `string | null`
  // — never `""`. It replaces the `supabase.auth.getUser()` call that used to
  // stand here purely to learn who the visitor was.
  //
  // An anonymous visitor is a NORMAL case, not a failure: `my_access_context()`
  // is granted to `authenticated` only, so `anon` is refused with 42501 and the
  // resolver answers the empty context (no capabilities, null identity).
  const { capabilities, userId, role, status } = await getAccessContext();
  const isAuthenticated = userId !== null;

  // The cookie-bound client stays: the drink-token read below is per-user and
  // must remain under RLS.
  const supabase = await createClient();

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

  // Determine if the user can manage drinks — from the session, never from a
  // header. `staff.manage` is byte-equal to the
  // `role === "master" || role === "organizer"` it replaces (role only, status
  // ignored), so no role's reach changes: a pending organizer who manages this
  // menu today still manages it. `admin.access` would have narrowed it to
  // master and `catalogue.manage` would have required an approved status —
  // both are verdict changes and neither is this plan's.
  const canManage = capabilities.has(CAP.STAFF_MANAGE);

  // Fetch parties for this event
  const { data: parties } = await serviceClient
    .from("event_parties")
    .select("id, title, date, end_time, menu_closes_at")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  const partyList = (parties ?? []) as { id: string; title: string; date: string; end_time: string | null; menu_closes_at: string | null }[];

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

  // Fetch authenticated user's drink tokens for this event
  let userTokens: { id: string; drink_name: string; price: number; token: string; status: "purchased" | "redeemed"; redeemed_at: string | null }[] = [];
  // `userId` narrows to `string` inside this guard, so the filter below can
  // never receive a null. There is no `user?.id === x` comparison anywhere on
  // this page — the only identity use is this query filter — so the
  // `null === null` admission that the nullable identity introduces elsewhere
  // has no site here.
  if (userId) {
    const { data: tokens } = await supabase
      .from("drink_tokens")
      .select("id, drink_name, price, token, status, redeemed_at")
      .eq("user_id", userId)
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });
    userTokens = (tokens ?? []) as typeof userTokens;
  }

  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${slug}/menu`;

  return (
    <div className={`min-h-dvh bg-background ${menuFont.className}`}>
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
        className={`mx-auto max-w-lg px-4 ${isAuthenticated ? "pb-24" : "pb-8"} ${
          event.cover_image ? "-mt-12 relative z-10" : "pt-8"
        }`}
      >
        {/* Event title and date intentionally omitted — keep the menu focused
            on drinks. QR code is still shown to organizers/admins. */}
        <AnimatedSection>
          {canManage && (
            <div className="mt-6">
              <EventQRCode url={menuUrl} eventTitle={event.title} />
            </div>
          )}

          {/* Login/signup banner temporarily disabled. `user` no longer exists
              on this page — the identity is `userId` / `isAuthenticated` — so
              the disabled block below is kept compilable-on-re-enable. */}
          {/* {!isAuthenticated && (
            <div className="mt-6">
              <GuestLoginBanner slug={slug} />
            </div>
          )} */}
        </AnimatedSection>

        {/* Party drink menu with selector */}
        <AnimatedSection delay={0.1}>
        {partyList.length > 0 ? (
          <PartyDrinkMenu
            eventId={event.id}
            eventTitle={event.title}
            parties={partyList}
            drinksByParty={drinksByParty}
            canManage={canManage}
            isAuthenticated={isAuthenticated}
          />
        ) : (
          <div className="mt-6 rounded-xl border border-card-border bg-card p-6 text-center">
            <p className="text-sm text-muted">
              No drinks available for this event.
            </p>
          </div>
        )}
        </AnimatedSection>

        {/* Drink tokens */}
        {isAuthenticated ? (
          userTokens.length > 0 && (
            <div className="mt-6">
              <UserTokenDisplay tokens={userTokens} />
            </div>
          )
        ) : (
          <div className="mt-6">
            <GuestTokenDisplay
              eventId={event.id}
              initialOrderId={orderIdFromUrl ?? null}
            />
          </div>
        )}
      </div>

      {/* MobileNav hidden for guests so they don't navigate away from the
          menu and lose track of their tokens. */}
      {/* `role` / `status` are PRESENTATION here — they choose which nav
          entries `MobileNav` draws, nothing more. They keep their form and
          only their source changed. The cast is at the page boundary because
          `MobileNav` is a `"use client"` component that cannot import the
          resolver; phase 34 (STAFF-03) owns converting the nav itself. */}
      {isAuthenticated && (
        <MobileNav
          role={role as UserRole | null}
          status={status as UserStatus | null}
        />
      )}
    </div>
  );
}
