import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import type { Event, UserRole, UserStatus } from "@/types/database";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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

  // Fetch RSVP count for capacity display
  let spotsLeft: number | null = null;
  if (event.capacity) {
    const { count: rsvpCount } = await supabase
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);
    spotsLeft = event.capacity - (rsvpCount || 0);
  }

  const hasRSVP = false; // TODO: check user's RSVP status

  return (
    <div className="min-h-dvh pb-24">
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
            isAuthenticated ? (
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

        {/* RSVP - hidden for pending/rejected members */}
        {isAuthenticated && isApproved && (
          <div className="mb-6">
            <button
              className={`w-full rounded-full py-3 font-medium transition-colors ${
                hasRSVP
                  ? "border border-accent bg-transparent text-accent"
                  : "bg-accent text-white hover:bg-accent-hover"
              }`}
            >
              {hasRSVP ? "\u2713 I'm going" : "I'm going"}
            </button>
          </div>
        )}
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
