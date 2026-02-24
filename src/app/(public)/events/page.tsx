import Link from "next/link";
import MobileNav from "@/components/layout/MobileNav";

// TODO: fetch from Supabase
const mockEvents = {
  upcoming: [
    {
      slug: "event-1",
      title: "Resonate Vol. 1",
      date: "2026-03-15",
      time: "23:00",
      location: null,
      location_secret: true,
      lineup: ["Artist A", "Artist B", "Artist C"],
      cover_image: null,
    },
  ],
  past: [
    {
      slug: "event-0",
      title: "Resonate Opening",
      date: "2026-02-01",
      time: "22:00",
      location: "Warehouse District",
      location_secret: false,
      lineup: ["Artist X", "Artist Y"],
      cover_image: null,
    },
  ],
};

export default function EventiPage() {
  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Eventi</h1>
      </header>

      <section className="px-6 mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">
          Upcoming
        </h2>
        <div className="flex flex-col gap-4">
          {mockEvents.upcoming.map((event) => (
            <Link key={event.slug} href={`/eventi/${event.slug}`}>
              <div className="rounded-2xl border border-card-border bg-card p-5 transition-colors hover:border-accent/50">
                <p className="mb-1 text-sm text-muted">
                  {new Date(event.date).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  · {event.time}
                </p>
                <h3 className="mb-2 text-xl font-semibold">{event.title}</h3>
                <p className="text-sm text-muted">
                  {event.location_secret ? "📍 Secret Location" : `📍 ${event.location}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.lineup.map((artist) => (
                    <span
                      key={artist}
                      className="rounded-full bg-background px-3 py-1 text-xs text-muted"
                    >
                      {artist}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
          Past Events
        </h2>
        <div className="flex flex-col gap-4">
          {mockEvents.past.map((event) => (
            <Link key={event.slug} href={`/eventi/${event.slug}`}>
              <div className="rounded-2xl border border-card-border bg-card/50 p-5 opacity-70 transition-colors hover:opacity-100">
                <p className="mb-1 text-sm text-muted">
                  {new Date(event.date).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <h3 className="mb-2 text-xl font-semibold">{event.title}</h3>
                <p className="text-sm text-muted">📍 {event.location}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <MobileNav />
    </div>
  );
}
