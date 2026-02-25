import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import TierSelection from "./TierSelection";
import type { Event, UserRole, UserStatus } from "@/types/database";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  // Payment result from SumUp redirect
  const paymentResult = query.payment as string | undefined;

  // Check auth status -- reads cookies only, no DB call, fast
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const isApproved = status === "approved";

  // Fetch event by slug
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single<Event>();

  if (!event) {
    notFound();
  }

  // Fetch ticket tiers for this event
  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select("id, name, price, quantity")
    .eq("event_id", event.id)
    .order("price", { ascending: true });

  const hasTiers = tiers && tiers.length > 0;

  // For each tier, get sold count and compute available
  const tiersWithAvailability = await Promise.all(
    (tiers ?? []).map(async (tier) => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("tier_id", tier.id);
      const sold = count ?? 0;
      return { ...tier, sold, available: tier.quantity - sold };
    })
  );

  // Calculate capacity from ticket sales when tiers exist
  let spotsLeft: number | null = null;
  if (hasTiers && event.capacity) {
    const totalTicketsSold = tiersWithAvailability.reduce(
      (sum, t) => sum + t.sold,
      0
    );
    spotsLeft = event.capacity - totalTicketsSold;
  } else if (!hasTiers && event.capacity) {
    // Fallback to RSVP count for events without tiers
    const { count: rsvpCount } = await supabase
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);
    spotsLeft = event.capacity - (rsvpCount || 0);
  }

  // Fetch user's ticket for this event (if authenticated)
  let userTicket: { id: string; tier_id: string } | null = null;
  if (isAuthenticated && user) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("id, tier_id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();
    userTicket = ticket;
  }

  return (
    <div className="min-h-dvh pb-24">
      {/* Payment result banners */}
      {paymentResult === "success" && (
        <div className="mx-6 mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-sm font-medium text-green-400">
            Payment received! Your ticket is being processed.
          </p>
        </div>
      )}
      {paymentResult === "cancelled" && (
        <div className="mx-6 mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium text-yellow-400">
            Payment was cancelled. You can try again.
          </p>
        </div>
      )}

      {/* Cover */}
      <div className="relative px-6 pt-6">
        <Link
          href="/events"
          className="absolute left-10 top-10 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm"
        >
          &larr;
        </Link>
        {event.cover_image ? (
          <Image
            src={event.cover_image}
            alt={event.title}
            width={800}
            height={400}
            className="w-full max-h-80 object-cover rounded-2xl"
            priority
          />
        ) : (
          <div className="flex h-48 items-center justify-center rounded-2xl bg-card text-muted">
            <span className="text-5xl">&#127925;</span>
          </div>
        )}
      </div>

      <div className="px-6 pt-6">
        {/* Date & Time */}
        <p className="mb-1 text-sm font-medium text-accent">
          {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          &middot; {event.time}
        </p>

        {/* Capacity -- subtle secondary text */}
        {event.capacity !== null && spotsLeft !== null && (
          <p
            className={`mb-2 text-sm ${
              spotsLeft <= 0
                ? "text-red-400 font-medium"
                : "text-muted"
            }`}
          >
            {spotsLeft <= 0 ? "Sold out" : `${spotsLeft} spots left`}
          </p>
        )}

        {/* Title */}
        <h1 className="mb-4 text-3xl font-bold tracking-tight">
          {event.title}
        </h1>

        {/* Location */}
        <div className="mb-6 rounded-xl border border-card-border bg-card p-4">
          {event.location_secret ? (
            userTicket ? (
              <div>
                <p className="text-sm text-muted">
                  &#128205; Location
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {event.location}
                </p>
              </div>
            ) : isAuthenticated ? (
              <div>
                <p className="text-sm text-muted">
                  &#128274; Secret Location
                </p>
                <p className="mt-2 text-sm font-medium text-accent">
                  Buy a ticket to reveal the address
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted">
                  &#128274; Secret Location
                </p>
                <Link
                  href="/register"
                  className="mt-2 inline-block text-sm font-medium text-accent hover:text-accent-hover"
                >
                  Sign up to become a member &rarr;
                </Link>
              </div>
            )
          ) : (
            <p className="text-sm">&#128205; {event.location}</p>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="mb-6 text-muted whitespace-pre-line">
            {event.description}
          </p>
        )}

        {/* Lineup */}
        {event.lineup && event.lineup.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
              Lineup
            </h2>
            <div className="flex flex-wrap gap-2">
              {event.lineup.map((artist) => (
                <span
                  key={artist}
                  className="rounded-full bg-accent/20 px-3 py-1 text-sm text-accent font-medium"
                >
                  {artist}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Already has ticket */}
        {isAuthenticated && userTicket && (
          <div className="mb-6">
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
              <p className="text-sm font-medium text-green-400 mb-3">
                You have a ticket for this event
              </p>
              <Link
                href={`/tickets/${userTicket.id}`}
                className="inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                View Your Ticket
              </Link>
            </div>
          </div>
        )}

        {/* Tier selection and buy button -- approved members only, without existing ticket */}
        {isAuthenticated &&
          isApproved &&
          !userTicket &&
          hasTiers && (
            <div className="mb-6">
              <TierSelection
                eventId={event.id}
                tiers={tiersWithAvailability}
              />
            </div>
          )}

        {/* Pending member guard (TICK-07) */}
        {isAuthenticated &&
          !isApproved &&
          status === "pending" &&
          hasTiers && (
            <div className="mb-6">
              <p className="text-sm text-muted text-center">
                Your account is pending approval. You&apos;ll be able to
                purchase tickets once approved.
              </p>
            </div>
          )}

        {/* RSVP fallback for events without tiers */}
        {isAuthenticated && isApproved && !hasTiers && (
          <div className="mb-6">
            <button
              className="w-full rounded-full bg-accent py-3 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              I&apos;m going
            </button>
          </div>
        )}

        {/* Unauthenticated CTA */}
        {!isAuthenticated && (
          <div className="mb-6">
            <Link
              href="/register"
              className="block w-full rounded-full bg-accent py-3 text-center font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Sign up to confirm attendance
            </Link>
          </div>
        )}
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
