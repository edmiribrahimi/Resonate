"use client";

import { useState } from "react";
import MediaGrid from "@/components/media/MediaGrid";
import Lightbox from "@/components/media/Lightbox";
import { Card } from "@/components/ui/Card";
import type { MediaGridItem } from "@/components/media/MediaGrid";

interface EventGroup {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventSlug: string;
  items: MediaGridItem[];
}

/**
 * The gallery's client half — converted by plan 41-08.
 *
 * **What a group's heading says is unchanged.** The title, the date and the
 * formatting that produces it are the ones that were here; nothing was
 * un-truncated, no field was surfaced, and no string gained a place name. This
 * is a public surface rendering event media, and a heading is a caption by
 * another name.
 *
 * The empty state follows §8.11's class contract rather than becoming a
 * component — D-41-11 decided that, and the reason is exactly what the copy
 * below shows: the sentence belongs to this surface and to no other. §11's rule
 * is one sentence naming what is absent in the surface's own noun and one
 * naming why the emptiness is normal. Never an error tone: an empty gallery and
 * an unreadable one are different facts.
 */
export default function GalleryClient({ groups }: { groups: EventGroup[] }) {
  const [lightboxItem, setLightboxItem] = useState<MediaGridItem | null>(null);

  if (groups.length === 0) {
    return (
      <Card className="px-6 py-12 text-center">
        <h2 className="text-base font-semibold text-ink">
          No photos or videos yet
        </h2>
        <p className="mt-2 text-sm text-muted">
          Media from an event appears here once it has been approved.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.eventId}>
            <a
              href={`/events/${group.eventSlug}`}
              className="mb-3 flex min-h-11 flex-col justify-center transition-colors hover:text-accent"
            >
              <h2 className="text-base font-semibold">{group.eventTitle}</h2>
              <p className="text-sm text-muted">
                {(() => { const d = new Date(group.eventDate + "T00:00:00"); const M = ["January","February","March","April","May","June","July","August","September","October","November","December"]; return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`; })()}
              </p>
            </a>
            <MediaGrid
              items={group.items}
              onItemClick={(item) => setLightboxItem(item)}
            />
          </div>
        ))}
      </div>
      <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
    </>
  );
}
