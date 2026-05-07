import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import MobileNav from "@/components/layout/MobileNav";
import EditArtistButton from "@/components/artists/EditArtistButton";
import { createClient } from "@/lib/supabase/server";
import type { UserRole, UserStatus } from "@/types/database";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Read role/status from middleware headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  // Fetch artist
  const { data: artist } = await supabase
    .from("artists")
    .select("id, name, slug, bio, photo_url, instagram_url, soundcloud_url, spotify_url, website_url")
    .eq("slug", slug)
    .single();

  if (!artist) {
    notFound();
  }

  // Fetch published events where this artist is in the lineup
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, date, cover_image")
    .eq("is_published", true)
    .contains("lineup", [artist.name])
    .order("date", { ascending: false });

  const socialLinks = [
    { url: artist.instagram_url, label: "Instagram", icon: "instagram" },
    { url: artist.soundcloud_url, label: "SoundCloud", icon: "soundcloud" },
    { url: artist.spotify_url, label: "Spotify", icon: "spotify" },
    { url: artist.website_url, label: "Website", icon: "globe" },
  ].filter((l) => l.url);

  return (
    <div className="min-h-dvh pb-24">
      <div className="px-6 pt-6">
        <Link
          href="/events"
          className="mb-6 inline-flex items-center text-sm text-muted hover:text-foreground transition-all active:scale-95 active:opacity-80"
        >
          &larr; Back to events
        </Link>

        {/* Artist header */}
        <div className="flex flex-col items-center text-center mt-4">
          {artist.photo_url ? (
            <Image
              src={artist.photo_url}
              alt={artist.name}
              width={160}
              height={160}
              className="h-40 w-40 rounded-full object-cover border-2 border-card-border"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-card text-muted border-2 border-card-border">
              <span className="text-5xl">&#127925;</span>
            </div>
          )}

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            {artist.name}
          </h1>

          {/* Edit button for admin/organizer */}
          {(role === "master" || role === "organizer") && (
            <EditArtistButton artist={artist} />
          )}

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="mt-3 flex gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-card border border-card-border px-4 py-2 text-sm text-muted hover:text-foreground transition-all active:scale-95 active:opacity-80"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {/* Bio */}
          {artist.bio && (
            <p className="mt-6 max-w-lg text-muted whitespace-pre-line text-left">
              {artist.bio}
            </p>
          )}
        </div>

        {/* Events */}
        {events && events.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
              Events
            </h2>
            <div className="space-y-3">
              {events.map((event: { id: string; slug: string; title: string; date: string; cover_image: string | null }) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="flex items-center gap-4 rounded-xl border border-card-border bg-card p-3 hover:bg-card/80 transition-all active:scale-[0.98] active:opacity-80"
                >
                  {event.cover_image ? (
                    <Image
                      src={event.cover_image}
                      alt={event.title}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-background text-muted">
                      <span className="text-2xl">&#127925;</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted">
                      {(() => { const d = new Date(event.date + "T00:00:00"); const M = ["January","February","March","April","May","June","July","August","September","October","November","December"]; return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`; })()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
