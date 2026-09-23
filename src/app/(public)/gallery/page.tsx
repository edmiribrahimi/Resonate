import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/layout/AppNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import {
  EVENT_MEDIA_SIGNATURE_SECONDS,
  signEventMedia,
} from "@/lib/media/sign-event-media";
import GalleryClient from "./GalleryClient";
import type { UserRole } from "@/types/database";

/**
 * The public gallery — converted whole by plan 41-08.
 *
 * ── What changed, and the one thing that deliberately did not ────────────────
 *
 * The layout: the shell owns the maximum, the gutter and the navigation
 * clearance; the title carries the display role; and this is the first
 * **page-level** navigation mount to move off the phone-locked wrapper, which
 * is what gives a public surface the side column from tablet width up.
 *
 * **Amended 2026-08-13 (D-41.1-01), and the amendment follows from that last
 * clause.** The shell still APPLIES the clearance, but it no longer inherits the
 * number from the stylesheet: being one of only two pages that mount the
 * responsive form, this page now DECLARES it, on the wrapper added below. The
 * ambient default is zero everywhere precisely so that the eleven sites which
 * mount the bar-locked wrapper — and every route that mounts no navigation —
 * cannot inherit a column they do not have.
 *
 * **The read was untouched, byte for byte, until phase 52** — and what changed
 * then is one column, named below. Not as a courtesy — as the requirement. This surface renders event media, so what it fetches, how it
 * filters, how it orders and how much it takes are the difference between a
 * gallery and a disclosure. `venue_reveal_sent` is monotone: a layout change
 * that surfaced one more field, un-truncated one more string or rendered one
 * more group could show a place before its night reveals it, and there is no
 * un-revealing. The filter below is on the **moderation state of the row**, not
 * on the viewer, and it is the same filter it was.
 *
 * ── Phase 52: the gallery is a tool now (NAV-02, D-52-13) ────────────────────
 *
 * Until phase 52 this page had no guard of its own and its tab was drawn to
 * everyone. **This is the phase that builds the gate**: the entry moved into the
 * Management panel under `gallery.view`, an anonymous caller is bounced to
 * sign-in with a way back, and the page asks the key itself before reading
 * anything. The note on reopening it sits beside the guard, below.
 *
 * ── Phase 52: keys, not addresses (NAV-07, D-52-25) ──────────────────────────
 *
 * The read selects `storage_path` and **never `url`**: `url` is a public
 * address on a bucket that M2 makes private, and drawing it would keep the
 * side channel open for as long as the bucket stays public. Each key is signed
 * through the viewer's own session (`src/lib/media/sign-event-media.ts`), so
 * the object policy — a SELECT admitted only when the row is visible to that
 * session — decides, and not this page. What reaches the client components is
 * `id → signed address`, never a key. Same rows, same filter, same order, same
 * cap: the only difference is the column and what is done with it.
 */
export default async function GalleryPage() {
  // ── The gate — phase 52, NAV-02, D-52-13 ───────────────────────────────────
  //
  // This is the phase that builds it. The Gallery entry is no longer drawn to
  // everyone: it sits in the Management panel under `gallery.view`, and this
  // address is gated in three pieces that give the same verdict because they
  // read the same key — the capability-route map entry (plan 52-06), the
  // `/gallery` prefix in `PROTECTED_PREFIXES` with its `?next=` pattern
  // (`src/lib/routes/next-redirect.ts`), and the guard below.
  //
  // The guard sits BEFORE the client is created and before any read. The
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone. Neither is the security boundary: the row policy on
  // `event_media` and, after M2, the object policy on the bucket are.
  //
  // ⚠ **For whoever reopens the gallery to the public (D-52-14).** Reopening is
  // not one line. It means removing this guard, the map entry, the prefix and
  // its pattern — and, since NAV-07, **a migration too**: the row policy
  // `event_media_select_gallery` (written by M2, plan 52-13) and the bucket,
  // which is private from M2 on and serves pictures only through a signature
  // minted under a session. The key
  // `gallery.view` stays either way. A reopening that removed the four code
  // pieces and not the migration would ship a public page that draws nothing.
  //
  // Role and the live-assignment set are read here for the navigation only,
  // which is a "use client" component; they gate nothing on this page.
  const { role, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  if (!capabilities.has(CAP.GALLERY_VIEW)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch approved media with event info, most recent first. The KEY, never
  // the public address — see the docblock.
  const { data: media, error: readError } = await supabase
    .from("event_media")
    .select("id, storage_path, type, event_id, events(id, title, date, slug)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(200);

  if (readError) {
    // Its own category and its own sentence: a gallery that could not be read
    // is not an empty gallery, and must not wear the empty state's face.
    console.error(
      `[gallery.read_failed] code=${readError.code ?? "unknown"} message=${readError.message}`
    );
  }

  const rows = (media ?? []) as unknown as {
    id: string;
    storage_path: string | null;
    type: string;
    events: { id: string; title: string; date: string; slug: string } | null;
  }[];

  // Only rows this session already received are signed — the signer takes
  // rows, not paths, and signs under the same session's policy.
  const signatures = await signEventMedia(rows, EVENT_MEDIA_SIGNATURE_SECONDS);
  const signedUrls = signatures.ok ? signatures.urls : {};

  // Group by event, preserving order of most recent media
  const groupMap = new Map<string, {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    eventSlug: string;
    items: { id: string; url: string; type: "photo" | "video" }[];
  }>();

  for (const m of rows) {
    const ev = m.events;
    if (!ev) continue;

    let group = groupMap.get(ev.id);
    if (!group) {
      group = {
        eventId: ev.id,
        eventTitle: ev.title,
        eventDate: ev.date,
        eventSlug: ev.slug,
        items: [],
      };
      groupMap.set(ev.id, group);
    }
    // A row without a signature stays in the list with an empty address: the
    // grid draws it as "could not be loaded" instead of dropping it, so a hole
    // is visible as a hole.
    group.items.push({
      id: m.id,
      url: signedUrls[m.id] ?? "",
      type: m.type as "photo" | "video",
    });
  }

  const groups = [...groupMap.values()];

  return (
    <>
      {/*
        This wrapper is the other half of the pairing check E of
        scripts/verify-conversion.mjs asserts in both directions: the files
        declaring the leading-edge column clearance are exactly the files
        mounting the responsive navigation form. This page and the work-surface
        layout are the two; every other mount site reaches the navigation through
        the phone-locked wrapper and has no column at any width.

        It carries an arbitrary-property utility at the md tier setting
        --nav-inset-inline-start to fourteen rems, which the shell below reads
        with its own inline-start padding. Since D-41.1-01 the stylesheet's
        ambient value is zero at every width, so without this line the content
        would slide UNDER the 224 px column from 768 px up — visible at first
        look, which is why the failure direction that catches its absence is the
        loud one.

        The utility is written whole in the class list and is not spelled here:
        Tailwind scans comments, cannot tell a description from a use, and an
        abbreviated one emits a malformed rule and a build warning.
      */}
      <div className="md:[--nav-inset-inline-start:14rem]">
        <PageShell width="wide">
          <AnimatedSection>
            <header className="pb-6">
              <PageTitle>Gallery</PageTitle>
              <p className="mt-1 text-sm text-muted">Moments from our events</p>
            </header>
          </AnimatedSection>

          {/*
            Two failures, two sentences. A failed read means what is below
            cannot be trusted to be complete; a failed signature means the
            entries are there and only the pictures are missing. Neither is the
            empty state.
          */}
          {readError ? (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4"
            >
              <p className="text-sm text-sem-crit">
                The gallery could not be read. Reload the page; nothing has been
                removed.
              </p>
            </div>
          ) : !signatures.ok ? (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4"
            >
              <p className="text-sm text-sem-crit">
                The pictures could not be signed for, so none is drawn below.
                Reload the page; nothing has been removed.
              </p>
            </div>
          ) : null}

          {/*
            After a failed read the empty state is not drawn: "No photos or
            videos yet" would be a false sentence under the alert above.
          */}
          {readError ? null : (
            <AnimatedSection delay={0.1}>
              <GalleryClient groups={groups} />
            </AnimatedSection>
          )}
        </PageShell>
      </div>

      <AppNav
        role={role as UserRole | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
