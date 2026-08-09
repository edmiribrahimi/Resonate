"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MediaGrid from "@/components/media/MediaGrid";
import type { MediaGridItem } from "@/components/media/MediaGrid";
import Lightbox from "@/components/media/Lightbox";
import MediaUpload from "@/components/media/MediaUpload";

interface MediaGallerySectionProps {
  media: MediaGridItem[];
  canUpload: boolean;
  eventId: string;
  /**
   * The nights this viewer may upload to, resolved on the server
   * (`page.tsx`, the `uploadableParties` block). Carried through untouched: this
   * component is a pass-through and decides nothing about permission —
   * `nextjs-architecture.md`, gate *gruppo = pubblico*: a shared component
   * receives its permissions as input, it does not work them out.
   */
  uploadableParties: { id: string; title: string; date: string }[];
}

export default function MediaGallerySection({
  media,
  canUpload,
  eventId,
  uploadableParties,
}: MediaGallerySectionProps) {
  const [selectedItem, setSelectedItem] = useState<MediaGridItem | null>(null);
  const router = useRouter();

  const handleUploadComplete = () => {
    router.refresh();
  };

  const hasMedia = media.length > 0;

  return (
    <div>
      {/* Gallery grid */}
      {hasMedia && (
        <MediaGrid
          items={media}
          onItemClick={(item) => setSelectedItem(item)}
        />
      )}

      {/* Empty states */}
      {!hasMedia && !canUpload && (
        <p className="py-8 text-center text-sm text-muted">
          No photos or videos yet
        </p>
      )}
      {!hasMedia && canUpload && (
        <p className="mb-4 text-center text-sm text-muted">
          Be the first to share photos from this event!
        </p>
      )}

      {/* Upload area for eligible members */}
      {canUpload && (
        <div className="mt-4">
          <MediaUpload
            eventId={eventId}
            uploadableParties={uploadableParties}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        item={
          selectedItem
            ? { url: selectedItem.url, type: selectedItem.type }
            : null
        }
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
