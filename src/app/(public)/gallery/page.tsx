import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { getAccessContext } from "@/lib/capabilities/server";
import GalleryClient from "./GalleryClient";
import type { UserRole, UserStatus } from "@/types/database";

export default async function GalleryPage() {
  // Role and status come from the session, not from a request header. Neither
  // gates anything here — the media query below filters on `status =
  // "approved"` (the moderation state of the row, not the viewer's) and is
  // unchanged. Both values go to MobileNav, a "use client" component.
  const { role, status } = await getAccessContext();

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
    <div className="min-h-dvh pb-24">
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
          <p className="mt-1 text-muted">Moments from our events</p>
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1} className="px-6">
        <GalleryClient groups={groups} />
      </AnimatedSection>

      <MobileNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
      />
    </div>
  );
}
