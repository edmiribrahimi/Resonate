"use client";

import { useState } from "react";
import MediaGrid from "@/components/media/MediaGrid";
import Lightbox from "@/components/media/Lightbox";
import type { MediaGridItem } from "@/components/media/MediaGrid";

interface EventGroup {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventSlug: string;
  items: MediaGridItem[];
}

export default function GalleryClient({ groups }: { groups: EventGroup[] }) {
  const [lightboxItem, setLightboxItem] = useState<MediaGridItem | null>(null);

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-8 text-center">
        <p className="text-muted">
          No photos or videos yet. Media from events will appear here once approved.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.eventId}>
            <a
              href={`/events/${group.eventSlug}`}
              className="mb-3 block hover:text-accent transition-colors"
            >
              <h2 className="text-lg font-semibold">{group.eventTitle}</h2>
              <p className="text-sm text-muted">
                {new Date(group.eventDate + "T00:00:00").toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
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
