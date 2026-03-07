"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { deleteMedia } from "@/app/(public)/events/[slug]/actions";

interface MediaItem {
  id: string;
  url: string;
  type: "photo" | "video";
  status: "pending" | "approved" | "rejected";
  file_size: number | null;
  created_at: string;
}

interface EventGroup {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventSlug: string;
  items: MediaItem[];
}

interface MyMediaSectionProps {
  groups: EventGroup[];
}

export default function MyMediaSection({ groups }: MyMediaSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  function handleDelete(mediaId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this upload?"
    );
    if (!confirmed) return;

    setPendingDelete(mediaId);
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteMedia(mediaId);
        if (!result.success) {
          setError("Failed to delete media.");
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete media."
        );
      } finally {
        setPendingDelete(null);
      }
    });
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400",
      approved: "bg-green-500/20 text-green-400",
      rejected: "bg-red-500/20 text-red-400",
    };
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status] ?? "bg-muted/20 text-muted"}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  function formatEventDate(dateStr: string): string {
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  if (groups.length === 0) {
    return (
      <div>
        <p className="mb-3 text-sm text-muted">My Media</p>
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <p className="text-sm text-muted/60">
            You haven&apos;t uploaded any media yet. Attend an event and share
            your photos!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">My Media</p>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.eventId}
            className="rounded-2xl border border-card-border bg-card p-4"
          >
            {/* Event heading */}
            <a
              href={`/events/${group.eventSlug}`}
              className="block mb-3 hover:opacity-80 transition-opacity"
            >
              <p className="text-sm font-semibold text-foreground">
                {group.eventTitle}
              </p>
              <p className="text-xs text-muted">
                {formatEventDate(group.eventDate)}
              </p>
            </a>

            {/* Media grid */}
            <div className="grid grid-cols-3 gap-2">
              {group.items.map((item) => (
                <div key={item.id} className="relative group">
                  {/* Thumbnail */}
                  <button
                    type="button"
                    onClick={() =>
                      item.type === "photo" && setLightboxUrl(item.url)
                    }
                    className="block w-full aspect-square rounded-lg overflow-hidden bg-background active:scale-95 active:opacity-80 transition-transform"
                  >
                    {item.type === "photo" ? (
                      <Image
                        src={item.url}
                        alt="Your upload"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 33vw, 120px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-2xl">&#9654;</span>
                      </div>
                    )}
                  </button>

                  {/* Status badge */}
                  <div className="absolute top-1 left-1">
                    {statusBadge(item.status)}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending && pendingDelete === item.id}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-all active:scale-95 disabled:opacity-50"
                    title="Delete"
                  >
                    {pendingDelete === item.id ? "..." : "&#10005;"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 text-2xl text-white/80 hover:text-white active:scale-95 active:opacity-80 transition-transform"
          >
            &#10005;
          </button>
          <Image
            src={lightboxUrl}
            alt="Full size"
            width={1200}
            height={900}
            className="max-h-[85vh] w-auto rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
