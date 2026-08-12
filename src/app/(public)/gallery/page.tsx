import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/layout/AppNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { getAccessContext } from "@/lib/capabilities/server";
import GalleryClient from "./GalleryClient";
import type { UserRole, UserStatus } from "@/types/database";

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
 * **The read is untouched, byte for byte.** Not as a courtesy — as the
 * requirement. This surface renders event media, so what it fetches, how it
 * filters, how it orders and how much it takes are the difference between a
 * gallery and a disclosure. `venue_reveal_sent` is monotone: a layout change
 * that surfaced one more field, un-truncated one more string or rendered one
 * more group could show a place before its night reveals it, and there is no
 * un-revealing. The filter below is on the **moderation state of the row**, not
 * on the viewer, and it is the same filter it was.
 */
export default async function GalleryPage() {
  // Role and status come from the session, not from a request header. Neither
  // gates anything here — the media query below filters on `status =
  // "approved"` (the moderation state of the row, not the viewer's) and is
  // unchanged. Both values go to the navigation, a "use client" component.
  const { role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  const supabase = await createClient();

  // Fetch approved media with event info, most recent first
  const { data: media } = await supabase
    .from("event_media")
    .select("id, url, type, event_id, events(id, title, date, slug)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(200);

  // Group by event, preserving order of most recent media
  const groupMap = new Map<string, {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    eventSlug: string;
    items: { id: string; url: string; type: "photo" | "video" }[];
  }>();

  for (const m of media ?? []) {
    const ev = m.events as unknown as { id: string; title: string; date: string; slug: string } | null;
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
    group.items.push({
      id: m.id,
      url: m.url,
      type: m.type as "photo" | "video",
    });
  }

  const groups = [...groupMap.values()];

  return (
    <>
      <PageShell width="wide">
        <AnimatedSection>
          <header className="pb-6">
            <PageTitle>Gallery</PageTitle>
            <p className="mt-1 text-sm text-muted">Moments from our events</p>
          </header>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <GalleryClient groups={groups} />
        </AnimatedSection>
      </PageShell>

      <AppNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
