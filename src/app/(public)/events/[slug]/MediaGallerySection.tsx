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
}

export default function MediaGallerySection({
  media,
  canUpload,
  eventId,
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
