import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MediaReviewGrid from "@/components/media/MediaReviewGrid";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizerMediaReviewPage({ params }: PageProps) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch event title
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (!event) {
    return (
      <div className="min-h-dvh px-6 pt-12">
        <p className="text-muted">Event not found.</p>
        <Link href="/organizer/events" className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-hover">
          Back to events
        </Link>
      </div>
    );
  }

  // Fetch status counts
  const { data: allMedia } = await supabase
    .from("event_media")
    .select("id, status")
    .eq("event_id", eventId);

  const counts = { pending: 0, approved: 0, rejected: 0 };
  (allMedia ?? []).forEach((m) => {
    const s = m.status as string;
    if (s === "pending" || s === "approved" || s === "rejected") {
      counts[s]++;
    }
  });

  // Fetch pending media with uploader name
  const { data: pendingMedia } = await supabase
    .from("event_media")
    .select("id, url, type, file_size, created_at, uploaded_by, profiles!event_media_uploaded_by_fkey(full_name)")
    .eq("event_id", eventId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const items = (pendingMedia ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      url: m.url,
      type: m.type as "photo" | "video",
      file_size: m.file_size,
      created_at: m.created_at,
      uploader_name: (profile as { full_name: string } | null)?.full_name ?? null,
    };
  });

  return (
    <div className="min-h-dvh px-6 pt-12 pb-24">
      <Link
        href="/organizer/events"
        className="mb-6 inline-block text-sm text-muted hover:text-foreground transition-colors"
      >
        &larr; Back to events
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Media Review
      </h1>
      <p className="text-sm text-muted mb-6">{event.title}</p>

      {/* Status counts */}
      <div className="flex gap-4 mb-6">
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2">
          <p className="text-lg font-bold text-yellow-400">{counts.pending}</p>
          <p className="text-xs text-muted">Pending</p>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2">
          <p className="text-lg font-bold text-green-400">{counts.approved}</p>
          <p className="text-xs text-muted">Approved</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2">
          <p className="text-lg font-bold text-red-400">{counts.rejected}</p>
          <p className="text-xs text-muted">Rejected</p>
        </div>
      </div>

      {/* Pending media grid */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-card-border bg-card p-8 text-center">
          <p className="text-muted">
            No pending media to review.
          </p>
          {counts.approved > 0 && (
            <p className="mt-2 text-xs text-muted">
              {counts.approved} media item{counts.approved !== 1 ? "s" : ""} approved.
            </p>
          )}
        </div>
      ) : (
        <MediaReviewGrid items={items} />
      )}
    </div>
  );
}
