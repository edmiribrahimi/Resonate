import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MediaReviewGrid from "@/components/media/MediaReviewGrid";

/**
 * Media moderation for one event — the collapsed surface.
 *
 * ── Cache: declared, not inherited ───────────────────────────────────────────
 *
 * Operational data, and the name of whoever uploaded each file. It must never be
 * served from a cache: `nextjs-architecture.md`, gate *cache esplicita* — a
 * surface showing per-user or operational data declares itself uncacheable
 * instead of inheriting a default.
 *
 * It is not redundant with the `cookies()` call inside `getAccessContext()`.
 * That opt-out is real but implicit and one import away, so a refactor that
 * moved the resolution would silently make this page cacheable again. It came
 * from the organizer twin; the `/admin` version did not have it.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MediaReviewPage({ params }: PageProps) {
  const { id: eventId } = await params;

  // Identity and permission from the session, in one resolution.
  //
  // This replaces the `supabase.auth.getUser()` call and the bare signed-in
  // test that followed it. The state that test guarded — D-34-08 state 1, "no
  // session" — is kept below and asked of the same context that answers the
  // capability question, so the page resolves once instead of twice.
  //
  // The token is deliberately not spelled anywhere in this file's prose: a
  // criterion a comment can defeat is a criterion nobody can run (plan 34-03).
  const ctx = await getAccessContext();

  // Two causes, never collapsed into one. "Nobody is here" and "this person may
  // not" are different, and they were already distinguished on the twin's path.
  if (!ctx.userId) redirect("/login");

  // ── FINDING F1: this address had NO capability check of its own ──────────────
  //
  // Until this commit the `/admin` version of this page held exactly one guard
  // — a redirect to `/login` for an absent session — and nothing else. What kept
  // it shut was
  // the middleware's `/admin/*` → `admin.access` PREFIX RULE, and **D-34-02
  // dissolved that rule**: after the collapse `/admin` is an address, not an
  // authorisation. Left as it was, this media-moderation surface would have been
  // reachable by any signed-in account.
  //
  // **The gate below was taken from the organizer twin, not chosen.** That twin
  // already asked `staff.manage` at this exact point, and `staff.manage` is the
  // key `src/lib/routes/capability-routes.ts` binds to this address — so the
  // middleware and this page read the same entry and give the same verdict
  // (D-34-09). Nobody who could not already reach the twin gains anything: this
  // is a page getting its own check for the first time, not a widening.
  //
  // Its grants are `('master','staff.manage',false)` and
  // `('organizer','staff.manage',false)`
  // (`20260807000000_capability_model.sql:392-393`) — role only, status ignored,
  // so a `pending` organizer is not newly refused. The `staff` role is granted
  // `staff.manage` by no row: the key is named after the QUESTION *"may this
  // person manage a staff surface"*, never after the role that shares its word.
  //
  // Why not the neighbours, restated so the next reader does not re-derive it:
  //   * **Not `media.upload`.** Uploading and moderating are two questions, and a
  //     key is named after the question it answers. Handing moderation to a
  //     photographer assigned to one night would mint the key from the surface.
  //   * **Not `organizer.access`.** That is the routing question, and it is the
  //     one the dissolved prefix rule was standing in for.
  //   * It is also what the two actions this page invokes already demand —
  //     `updateMediaStatus` and `deleteMedia` both require `CAP.STAFF_MANAGE`.
  //     A page gate with a different predicate would draw a screen on which every
  //     button refuses, which looks like a fault rather than a refusal.
  //
  // **This comment is the gate's reason, and it is here so that nobody deletes
  // the gate as redundant** — the failure mode Phase 43's D-06 recorded for
  // `door.operate`. It is a defense-in-depth redirect and NOT the security
  // boundary: what may be READ is decided by this table's policies, unchanged by
  // this commit.
  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

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
        <Link href="/admin/events" className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-hover">
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
        href="/admin/events"
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
