import Link from "next/link";
import MobileNav from "@/components/layout/MobileNav";

// TODO: fetch from Supabase based on slug
// TODO: check auth status for secret location logic

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Mock data - will be replaced with Supabase query
  const event = {
    slug,
    title: "Resonate Vol. 1",
    description: "An immersive music experience in an unexpected location.",
    date: "2026-03-15",
    time: "23:00",
    location: null,
    location_secret: true,
    lineup: ["Artist A", "Artist B", "Artist C"],
    cover_image: null,
    capacity: 150,
  };

  const isMember = false; // TODO: check auth
  const hasRSVP = false; // TODO: check RSVP status

  return (
    <div className="min-h-dvh pb-24">
      {/* Cover */}
      <div className="relative h-64 bg-card">
        {event.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <span className="text-6xl">🎵</span>
          </div>
        )}
        <Link
          href="/eventi"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm"
        >
          ←
        </Link>
      </div>

      <div className="px-6 pt-6">
        {/* Date & Time */}
        <p className="mb-2 text-sm font-medium text-accent">
          {new Date(event.date).toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · {event.time}
        </p>

        {/* Title */}
        <h1 className="mb-4 text-3xl font-bold tracking-tight">{event.title}</h1>

        {/* Location */}
        <div className="mb-6 rounded-xl border border-card-border bg-card p-4">
          {event.location_secret ? (
            isMember ? (
              <div>
                <p className="text-sm text-muted">📍 Secret Location</p>
                <p className="mt-1 text-sm text-foreground">
                  Riceverai l&apos;indirizzo 24h prima dell&apos;evento
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted">📍 Secret Location</p>
                <Link
                  href="/registrati"
                  className="mt-2 inline-block text-sm font-medium text-accent hover:text-accent-hover"
                >
                  Diventa membro per ricevere l&apos;indirizzo →
                </Link>
              </div>
            )
          ) : (
            <p className="text-sm">📍 {event.location}</p>
          )}
        </div>

        {/* Description */}
        <p className="mb-6 text-muted">{event.description}</p>

        {/* Lineup */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            Lineup
          </h2>
          <div className="flex flex-col gap-2">
            {event.lineup.map((artist) => (
              <div
                key={artist}
                className="rounded-xl border border-card-border bg-card px-4 py-3 font-medium"
              >
                {artist}
              </div>
            ))}
          </div>
        </div>

        {/* RSVP */}
        <div className="mb-6">
          {isMember ? (
            <button
              className={`w-full rounded-full py-3 font-medium transition-colors ${
                hasRSVP
                  ? "border border-accent bg-transparent text-accent"
                  : "bg-accent text-white hover:bg-accent-hover"
              }`}
            >
              {hasRSVP ? "✓ Ci sarò" : "Ci sarò"}
            </button>
          ) : (
            <Link
              href="/registrati"
              className="block w-full rounded-full bg-accent py-3 text-center font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Diventa membro per confermare la presenza
            </Link>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
