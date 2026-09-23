import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MediaReviewGrid from "@/components/media/MediaReviewGrid";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import {
  signEventMedia,
  EVENT_MEDIA_REVIEW_SIGNATURE_SECONDS,
  type EventMediaSignatureResult,
} from "@/lib/media/sign-event-media";

/**
 * Media moderation for one event — the collapsed surface.
 *
 * ── Converted by plan 41.1-09, and the conversion touched presentation ONLY ───
 *
 * The shell owns the maximum, the gutter, the vertical rhythm and the navigation
 * clearance; the title carries the display role; the three status tiles stop
 * naming a palette. **The three reads are untouched, byte for byte** — the event
 * row, the status census and the pending list select the same columns, filter on
 * the same values and order the same way. No query changed, no column was added,
 * no capability check was touched and no action payload was altered, so a media
 * item that is hidden today is hidden after.
 *
 * *(That sentence was true of 41.1-09 and is no longer true of the file. Phase
 * 52, plan 52-12, changed the pending read on purpose: it selects the object's
 * key instead of a public address, it no longer embeds an uploader join that
 * never worked, and every read now checks its error — see the queue block
 * below.)*
 *
 * `width="default"` and not `wide`: §4's wide list is closed and does not name
 * this route. That is not a fallback — it is the answer for every surface nobody
 * had to argue about.
 *
 * ── The three tiles are NOT semantic, and that is a decision ──────────────────
 *
 * They used to be amber, green and red. None of the three survives, and no
 * `--sem-*` token replaces it:
 *
 *  - **Amber cannot mean *caution* here.** `globals.css:161-163` records that the
 *    warning semantic is also SunSet's identification colour, so an amber tile
 *    cannot say *pending* rather than *this is a SunSet night* by hue alone.
 *  - **Rejected is not critical.** A rejected upload is an ordinary moderation
 *    outcome, and the critical semantic is the one that says a thing has gone
 *    wrong. Spending it on a normal outcome is how a red stops meaning anything.
 *
 * So the three read as counts, with the label beside each doing the work the hue
 * was doing badly. Colour was never the only channel here (`40-UI-SPEC.md` §10)
 * and now it is not a channel at all.
 *
 * **They are not the `Card` primitive either**, and that is the same shape of
 * decision the membership register records for its error region: §8.4 fixes the
 * card's padding at 24px, and three tiles side by side inside a 390px phone
 * gutter do not fit at that padding. The card's own edge and ground tokens are
 * written out instead of overriding the one property the primitive decided.
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
      /*
        A branch, not a second surface: this and the return below are mutually
        exclusive, so exactly one page title ever reaches the browser (§7.1).
      */
      <PageShell width="default">
        <header className="pb-6">
          <PageTitle>Media review</PageTitle>
        </header>
        {/* §8.11's empty-state contract — a class string, not a component. */}
        <div className="px-6 py-12 text-center">
          <p className="text-base font-semibold text-ink">Event not found</p>
          <p className="mt-1 text-sm text-muted">
            This address names an event that does not exist, or one this account
            cannot read.
          </p>
          <Link
            href="/admin/events"
            className="mt-4 inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink"
          >
            &larr; Back to events
          </Link>
        </div>
      </PageShell>
    );
  }

  // Fetch status counts
  const { data: allMedia, error: countsError } = await supabase
    .from("event_media")
    .select("id, status")
    .eq("event_id", eventId);

  if (countsError) {
    console.error(
      `[media_review.counts_read_failed] code=${countsError.code ?? "unknown"} message=${countsError.message}`
    );
  }

  const counts = { pending: 0, approved: 0, rejected: 0 };
  (allMedia ?? []).forEach((m) => {
    const s = m.status as string;
    if (s === "pending" || s === "approved" || s === "rejected") {
      counts[s]++;
    }
  });

  // ── The pending queue — and the silent failure it used to be ─────────────────
  //
  // Until 2026-09-23 this read embedded
  // `profiles!event_media_uploaded_by_fkey(full_name)`. That foreign key points
  // at `auth.users`, NOT at `public.profiles` (read identically from the lab's
  // and production's catalogs, 52-01), so PostgREST answered 400 `PGRST200`;
  // the error was never looked at and the page drew "Nothing has been uploaded"
  // directly under a tile saying "2 Pending". No media could be approved or
  // rejected from the product — a moderation queue that failed in silence
  // (`meta-gates.md`).
  //
  // Now: the rows are read on their own, the uploaders' names by a second read
  // of `profiles` under the same session (`profiles_select_admin` admits
  // exactly `staff.manage`, the key this page is gated on — no policy is
  // widened and no service role is used), and each failure has its own
  // category and its own notice. A failed name read does NOT hide the queue:
  // the pictures are what must be judged, the name is context.
  //
  // NAV-07 (D-52-25): the rows carry the KEY, `storage_path`, never `url`, and
  // the thumbnails are signed for five minutes — what is under review is by
  // definition not approved (`EVENT_MEDIA_REVIEW_SIGNATURE_SECONDS`).
  const { data: pendingMedia, error: pendingError } = await supabase
    .from("event_media")
    .select("id, storage_path, type, file_size, created_at, uploaded_by")
    .eq("event_id", eventId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (pendingError) {
    console.error(
      `[media_review.pending_read_failed] code=${pendingError.code ?? "unknown"} message=${pendingError.message}`
    );
  }

  const pendingRows = (pendingMedia ?? []) as {
    id: string;
    storage_path: string | null;
    type: string;
    file_size: number | null;
    created_at: string;
    uploaded_by: string | null;
  }[];

  const uploaderIds = [
    ...new Set(
      pendingRows
        .map((m) => m.uploaded_by)
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  const uploaderNames = new Map<string, string | null>();
  let uploaderNamesFailed = false;
  if (uploaderIds.length > 0) {
    const { data: uploaders, error: uploadersError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", uploaderIds);
    if (uploadersError) {
      console.error(
        `[media_review.uploader_read_failed] code=${uploadersError.code ?? "unknown"} message=${uploadersError.message}`
      );
      uploaderNamesFailed = true;
    } else {
      for (const u of (uploaders ?? []) as { id: string; full_name: string | null }[]) {
        uploaderNames.set(u.id, u.full_name);
      }
    }
  }

  // The signer logs its own category (`[gallery.sign_failed]`); the page owes
  // the visible effect. A row it could not sign stays in the queue with an
  // empty address, and the grid says "could not be loaded" on that card.
  const signed: EventMediaSignatureResult =
    pendingRows.length > 0
      ? await signEventMedia(pendingRows, EVENT_MEDIA_REVIEW_SIGNATURE_SECONDS)
      : { ok: true, urls: {}, unsigned: 0 };
  const signFailed = !signed.ok;

  const items = pendingRows.map((m) => ({
    id: m.id,
    url: signed.ok ? (signed.urls[m.id] ?? "") : "",
    type: m.type as "photo" | "video",
    file_size: m.file_size,
    created_at: m.created_at,
    uploader_name: m.uploaded_by ? (uploaderNames.get(m.uploaded_by) ?? null) : null,
  }));

  const readFailed = Boolean(countsError || pendingError);

  return (
    <PageShell width="default">
      <header className="pb-6">
        <Link
          href="/admin/events"
          className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink"
        >
          &larr; Back to events
        </Link>
        <PageTitle className="mt-2">Media review</PageTitle>
        <p className="mt-1 text-sm text-muted">{event.title}</p>
      </header>

      {/*
        The status census. Each figure carries the data face, which already
        carries tabular figures at globals.css:308-310, so three counts of
        different widths still line up with each other.
      */}
      <div className="mb-6 flex gap-4">
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <p className="font-mono text-base font-semibold text-ink">
            {counts.pending}
          </p>
          <p className="text-xs text-muted">Pending</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <p className="font-mono text-base font-semibold text-ink">
            {counts.approved}
          </p>
          <p className="text-xs text-muted">Approved</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <p className="font-mono text-base font-semibold text-ink">
            {counts.rejected}
          </p>
          <p className="text-xs text-muted">Rejected</p>
        </div>
      </div>

      {/*
        Failures first, each in its own words, and never the empty state in
        their place: an empty queue under a failed read is the lie this page
        used to tell.
      */}
      {readFailed && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4"
        >
          <p className="text-sm font-semibold text-sem-crit">
            The media of this event could not be read
          </p>
          <p className="mt-1 text-xs text-muted">
            The counts and the queue below may be incomplete. Reload the page.
          </p>
        </div>
      )}
      {!readFailed && signFailed && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4"
        >
          <p className="text-sm font-semibold text-sem-crit">
            The pending pictures could not be loaded
          </p>
          <p className="mt-1 text-xs text-muted">
            The items are listed, but their previews failed. Reload the page
            before approving or rejecting.
          </p>
        </div>
      )}
      {!readFailed && uploaderNamesFailed && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-line bg-surface p-4"
        >
          <p className="text-sm font-semibold text-ink">
            Uploader names could not be read
          </p>
          <p className="mt-1 text-xs text-muted">
            The queue is complete; only who uploaded each item is missing.
          </p>
        </div>
      )}

      {/*
        The queue is empty on arrival. §8.11's class contract again, and §11's
        copy rule: a heading naming what is absent in this surface's own noun,
        and a body saying why the emptiness is normal rather than an error.

        This is NOT the same empty state the grid renders. That one appears when
        the last pending item has just been dismissed in the browser, and it says
        so in its own words; this one is the server's answer.
      */}
      {readFailed ? null : items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-base font-semibold text-ink">
            No pending media to review
          </p>
          <p className="mt-1 text-sm text-muted">
            {counts.approved + counts.rejected > 0
              ? `Everything uploaded has been decided — ${counts.approved} approved, ${counts.rejected} rejected.`
              : "Nothing has been uploaded for this event yet."}
          </p>
        </div>
      ) : (
        <MediaReviewGrid items={items} />
      )}
    </PageShell>
  );
}
