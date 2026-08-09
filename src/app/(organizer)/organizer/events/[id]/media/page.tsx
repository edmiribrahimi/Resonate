import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MediaReviewGrid from "@/components/media/MediaReviewGrid";

/**
 * Operational data, and the name of whoever uploaded each file. It must never be
 * served from a cache: `nextjs-architecture.md`, gate *cache esplicita* — a
 * surface showing per-user or operational data declares itself uncacheable
 * instead of inheriting a default.
 *
 * It is not redundant with the `cookies()` call inside `getAccessContext()`.
 * That opt-out is real but implicit and one import away, so a refactor that
 * moved the resolution would silently make this page cacheable again.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizerMediaReviewPage({ params }: PageProps) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  // Identity and permission from the session, in one resolution.
  //
  // Until this commit the ONLY check on this page was "is somebody logged in",
  // and everything else was delegated to the middleware's `organizer.access`
  // rule. The middleware decides where somebody may GO; it is not a boundary
  // (`CLAUDE.md`, operating principle 2), and a page that leans on it is a page
  // whose boundary moves whenever the middleware does — which plan 35-17 is
  // doing to that very rule, in this very wave.
  const ctx = await getAccessContext();

  // Two causes, never collapsed into one. "Nobody is here" and "this person may
  // not" are different, and they were already distinguished on this path.
  if (!ctx.userId) redirect("/login");

  // ── Why `staff.manage`, and why not the three obvious neighbours ────────────
  //
  //   * It is what the two actions this page invokes already demand.
  //     `updateMediaStatus` and `deleteMedia`
  //     (`src/app/(public)/events/[slug]/actions.ts`) both require
  //     `CAP.STAFF_MANAGE`. A page gate with a DIFFERENT predicate would render
  //     a screen on which every button refuses — a worse way to fail than a
  //     refusal, because it looks like a fault.
  //   * **Not `media.upload`.** Uploading and moderating are two questions, and
  //     a key is named after the question it answers (`keys.ts:38-45`). Handing
  //     moderation to a photographer assigned to one night would mint the key
  //     from the surface instead of from the question, and none of this phase's
  //     eight requirements asks for it.
  //   * **Not `organizer.access`.** That is the middleware's own rule — the one
  //     this task stops treating as sufficient.
  //
  // This is a **defense-in-depth redirect, not the security boundary**: what
  // decides what may be READ are this table's policies, unchanged by this
  // commit. Read with `venue-secrecy.md` in hand — this page shows files shot
  // inside a night's venue — the answer is that this change only ever narrows:
  // it adds a refusal and widens nothing.
  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    redirect("/dashboard");
  }

  // Nothing else on this page changes. Not the queries, not what is shown, and
  // deliberately **no per-night filter**: now that a media row carries its
  // night, filtering this review by night would change what an organizer SEES,
  // which is not a boundary change and is in none of the eight requirements.

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
